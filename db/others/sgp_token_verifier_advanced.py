import requests
import json
import logging
from typing import Dict, Optional, Union, Tuple
from dataclasses import dataclass
from enum import Enum
import time
from functools import wraps


class Environment(Enum):
    """SGP API 환경 설정"""
    DEV = "https://api-dev.onstove.com/member"
    DEV2 = "https://api-dev2.onstove.com/member"
    QA = "https://api-qa.onstove.com/member"
    QA2 = "https://api-qa2.onstove.com/member"
    SANDBOX = "https://api.gate8.com/member"
    LIVE = "https://api.onstove.com/member"


class SGPErrorCode(Enum):
    """SGP API 에러 코드"""
    SUCCESS = 0
    BAD_REQUEST = 40000
    INVALID_GAME_ID = 41002
    DEVICE_NOT_REGISTERED = 46217
    UNKNOWN_ERROR = 50000


@dataclass
class TokenValidationResult:
    """토큰 검증 결과"""
    is_valid: bool
    member_no: Optional[int] = None
    guid: Optional[int] = None
    error_code: Optional[int] = None
    error_message: Optional[str] = None
    is_guest: bool = False
    device_registered: bool = True
    response_time_ms: float = 0.0


def retry_on_failure(max_retries: int = 3, delay: float = 1.0):
    """재시도 데코레이터"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except (requests.exceptions.RequestException, requests.exceptions.Timeout) as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        logging.warning(f"API 호출 실패 (시도 {attempt + 1}/{max_retries}): {str(e)}")
                        time.sleep(delay * (2 ** attempt))  # 지수 백오프
                    else:
                        logging.error(f"최대 재시도 횟수 초과: {str(e)}")
                        
            # 모든 재시도 실패 시 예외 발생
            raise last_exception
            
        return wrapper
    return decorator


class SGPTokenVerifierAdvanced:
    """고급 SGP 인증 토큰 검증 클래스"""
    
    def __init__(self, 
                 api_access_token: str, 
                 game_id: str,
                 environment: Environment = Environment.DEV,
                 caller_id: str = "STOVEAPP-2.5.0",
                 timeout: int = 30,
                 enable_logging: bool = True):
        """
        SGP 토큰 검증기 초기화
        
        Args:
            api_access_token: API 서버 인증 토큰 (Bearer 토큰)
            game_id: 게임 ID (예: STOVE_GAME)
            environment: API 환경 (DEV, QA, SANDBOX, LIVE 등)
            caller_id: API 호출자 정보
            timeout: 요청 타임아웃 (초)
            enable_logging: 로깅 활성화 여부
        """
        self.api_access_token = api_access_token
        self.game_id = game_id
        self.base_url = environment.value
        self.caller_id = caller_id
        self.timeout = timeout
        
        # 로깅 설정
        if enable_logging:
            logging.basicConfig(level=logging.INFO)
            self.logger = logging.getLogger(__name__)
        else:
            self.logger = logging.getLogger(__name__)
            self.logger.disabled = True
            
        # 통계 정보
        self.stats = {
            "total_requests": 0,
            "successful_validations": 0,
            "failed_validations": 0,
            "average_response_time": 0.0
        }
    
    def _get_error_description(self, error_code: int) -> str:
        """에러 코드에 대한 한국어 설명 반환"""
        error_descriptions = {
            40000: "잘못된 요청 데이터 (Authorization 헤더 값 문제 또는 사용자 인증 토큰 만료)",
            41002: "잘못된 게임 ID (요청 게임 ID와 서버 인증 토큰의 게임 ID가 다름)",
            46217: "기기등록 게임이지만 기기가 등록되어 있지 않음",
            50000: "알 수 없는 서버 오류"
        }
        return error_descriptions.get(error_code, f"정의되지 않은 에러 코드: {error_code}")
    
    def _is_guest_account(self, result: Dict) -> bool:
        """게스트 계정 여부 판단"""
        value = result.get("value", {})
        # GUID만 있고 member_no가 없는 경우 또는 guest_member_no인 경우 게스트로 판단
        return "member_no" not in value or value.get("member_no", 0) < 200000000000
    
    @retry_on_failure(max_retries=3, delay=1.0)
    def verify_token(self, user_access_token: str) -> TokenValidationResult:
        """
        사용자 인증 토큰을 검증합니다 (재시도 기능 포함)
        
        Args:
            user_access_token: 검증할 사용자 인증 토큰
            
        Returns:
            TokenValidationResult: 검증 결과
        """
        start_time = time.time()
        self.stats["total_requests"] += 1
        
        url = f"{self.base_url}/v3.0/{self.game_id}/token/verify"
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_access_token}",
            "caller-id": self.caller_id
        }
        
        payload = {
            "access_token": user_access_token
        }
        
        self.logger.info(f"토큰 검증 요청: {self.game_id}")
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=self.timeout)
            response.raise_for_status()
            
            data = response.json()
            response_time = (time.time() - start_time) * 1000  # 밀리초 변환
            
            # 통계 업데이트
            self._update_stats(response_time)
            
            # 성공 케이스
            if data.get("code") == 0:
                value = data.get("value", {})
                is_guest = self._is_guest_account(data)
                
                result = TokenValidationResult(
                    is_valid=True,
                    member_no=value.get("member_no"),
                    guid=value.get("guid"),
                    is_guest=is_guest,
                    response_time_ms=response_time
                )
                
                self.stats["successful_validations"] += 1
                self.logger.info(f"토큰 검증 성공: member_no={result.member_no}, guid={result.guid}, guest={is_guest}")
                
                return result
            
            # 에러 케이스
            else:
                error_code = data.get("code")
                error_message = data.get("message")
                
                # 기기등록 에러 특별 처리
                device_registered = error_code != 46217
                
                result = TokenValidationResult(
                    is_valid=False,
                    error_code=error_code,
                    error_message=error_message,
                    device_registered=device_registered,
                    response_time_ms=response_time
                )
                
                self.stats["failed_validations"] += 1
                self.logger.warning(f"토큰 검증 실패: 코드={error_code}, 메시지={error_message}")
                self.logger.warning(f"에러 설명: {self._get_error_description(error_code)}")
                
                return result
                
        except requests.exceptions.RequestException as e:
            response_time = (time.time() - start_time) * 1000
            self.stats["failed_validations"] += 1
            
            error_msg = f"네트워크 오류: {str(e)}"
            self.logger.error(error_msg)
            
            return TokenValidationResult(
                is_valid=False,
                error_message=error_msg,
                response_time_ms=response_time
            )
        except json.JSONDecodeError as e:
            response_time = (time.time() - start_time) * 1000
            self.stats["failed_validations"] += 1
            
            error_msg = f"JSON 파싱 오류: {str(e)}"
            self.logger.error(error_msg)
            
            return TokenValidationResult(
                is_valid=False,
                error_message=error_msg,
                response_time_ms=response_time
            )
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            self.stats["failed_validations"] += 1
            
            error_msg = f"알 수 없는 오류: {str(e)}"
            self.logger.error(error_msg)
            
            return TokenValidationResult(
                is_valid=False,
                error_message=error_msg,
                response_time_ms=response_time
            )
    
    def _update_stats(self, response_time: float):
        """통계 정보 업데이트"""
        current_avg = self.stats["average_response_time"]
        total_requests = self.stats["total_requests"]
        
        # 이동 평균 계산
        self.stats["average_response_time"] = (
            (current_avg * (total_requests - 1) + response_time) / total_requests
        )
    
    def batch_verify_tokens(self, tokens: list) -> Dict[str, TokenValidationResult]:
        """
        여러 토큰을 일괄 검증
        
        Args:
            tokens: 검증할 토큰 리스트
            
        Returns:
            Dict: 토큰별 검증 결과
        """
        results = {}
        
        self.logger.info(f"일괄 토큰 검증 시작: {len(tokens)}개")
        
        for i, token in enumerate(tokens):
            self.logger.info(f"토큰 검증 진행: {i+1}/{len(tokens)}")
            results[token] = self.verify_token(token)
            
        self.logger.info("일괄 토큰 검증 완료")
        return results
    
    def is_token_valid(self, user_access_token: str) -> bool:
        """토큰 유효성만 간단히 확인"""
        result = self.verify_token(user_access_token)
        return result.is_valid
    
    def get_user_info(self, user_access_token: str) -> Dict[str, Union[int, None, bool]]:
        """토큰에서 사용자 정보 추출"""
        result = self.verify_token(user_access_token)
        
        if result.is_valid:
            return {
                "member_no": result.member_no,
                "guid": result.guid,
                "is_guest": result.is_guest,
                "device_registered": result.device_registered
            }
        else:
            return {
                "member_no": None,
                "guid": None,
                "is_guest": False,
                "device_registered": True
            }
    
    def get_stats(self) -> Dict:
        """검증 통계 정보 반환"""
        return self.stats.copy()
    
    def reset_stats(self):
        """통계 정보 초기화"""
        self.stats = {
            "total_requests": 0,
            "successful_validations": 0,
            "failed_validations": 0,
            "average_response_time": 0.0
        }
        self.logger.info("통계 정보가 초기화되었습니다")


# 사용 예제
if __name__ == "__main__":
    # 설정
    api_token = "your_api_access_token_here"
    game_id = "YOUR_GAME_ID"
    user_tokens = [
        "user_access_token_1",
        "user_access_token_2",
        "user_access_token_3"
    ]
    
    # 고급 검증기 생성
    verifier = SGPTokenVerifierAdvanced(
        api_access_token=api_token,
        game_id=game_id,
        environment=Environment.DEV,
        timeout=30,
        enable_logging=True
    )
    
    # 단일 토큰 검증
    result = verifier.verify_token(user_tokens[0])
    
    if result.is_valid:
        print("✅ 토큰이 유효합니다!")
        print(f"회원번호: {result.member_no}")
        print(f"GUID: {result.guid}")
        print(f"게스트 여부: {result.is_guest}")
        print(f"기기 등록 여부: {result.device_registered}")
        print(f"응답 시간: {result.response_time_ms:.2f}ms")
    else:
        print("❌ 토큰이 유효하지 않습니다.")
        print(f"에러 코드: {result.error_code}")
        print(f"에러 메시지: {result.error_message}")
        if result.error_code:
            print(f"에러 설명: {verifier._get_error_description(result.error_code)}")
    
    # 일괄 토큰 검증 (예제 - 실제로는 유효한 토큰 사용)
    # batch_results = verifier.batch_verify_tokens(user_tokens)
    # print(f"일괄 검증 결과: {len(batch_results)}개 토큰 처리")
    
    # 통계 정보 출력
    stats = verifier.get_stats()
    print(f"\n📊 검증 통계:")
    print(f"총 요청 수: {stats['total_requests']}")
    print(f"성공한 검증: {stats['successful_validations']}")
    print(f"실패한 검증: {stats['failed_validations']}")
    print(f"평균 응답 시간: {stats['average_response_time']:.2f}ms") 