# SGP 인증 토큰 검증기

SGP(Stove Game Platform)에서 사용자 인증 토큰을 검증하는 Python 라이브러리입니다.

## 설치

```bash
pip install -r sgp_requirements.txt
```

## 주요 기능

- 🔐 SGP 사용자 인증 토큰 검증
- 🎮 GUID 및 MemberNo 기반 게임 지원
- 🔄 자동 재시도 기능
- 📊 검증 통계 정보
- 🛡️ 게스트 계정 및 기기 등록 상태 확인
- 🌍 다중 환경 지원 (DEV, QA, SANDBOX, LIVE)

## 사용법

### 기본 사용법

```python
from sgp_token_verifier import SGPTokenVerifier, Environment

# 검증기 생성
verifier = SGPTokenVerifier(
    api_access_token="your_api_access_token",
    game_id="YOUR_GAME_ID",
    environment=Environment.DEV
)

# 토큰 검증
result = verifier.verify_token("user_access_token")

if result.is_valid:
    print(f"✅ 유효한 토큰")
    print(f"회원번호: {result.member_no}")
    print(f"GUID: {result.guid}")
else:
    print(f"❌ 무효한 토큰: {result.error_message}")
```

### 고급 사용법

```python
from sgp_token_verifier_advanced import SGPTokenVerifierAdvanced, Environment

# 고급 검증기 생성 (재시도, 로깅, 통계 기능 포함)
verifier = SGPTokenVerifierAdvanced(
    api_access_token="your_api_access_token",
    game_id="YOUR_GAME_ID",
    environment=Environment.LIVE,
    timeout=30,
    enable_logging=True
)

# 토큰 검증
result = verifier.verify_token("user_access_token")

if result.is_valid:
    print(f"✅ 유효한 토큰")
    print(f"회원번호: {result.member_no}")
    print(f"GUID: {result.guid}")
    print(f"게스트 계정: {result.is_guest}")
    print(f"기기 등록됨: {result.device_registered}")
    print(f"응답 시간: {result.response_time_ms:.2f}ms")
else:
    print(f"❌ 무효한 토큰")
    print(f"에러 코드: {result.error_code}")
    print(f"에러 메시지: {result.error_message}")
```

### 일괄 검증

```python
# 여러 토큰을 한 번에 검증
tokens = ["token1", "token2", "token3"]
results = verifier.batch_verify_tokens(tokens)

for token, result in results.items():
    print(f"토큰 {token[:10]}...: {'유효' if result.is_valid else '무효'}")
```

### 통계 정보 확인

```python
# 검증 통계 확인
stats = verifier.get_stats()
print(f"총 요청 수: {stats['total_requests']}")
print(f"성공 검증: {stats['successful_validations']}")
print(f"실패 검증: {stats['failed_validations']}")
print(f"평균 응답 시간: {stats['average_response_time']:.2f}ms")
```

## 환경 설정

지원하는 환경:

- `Environment.DEV`: 개발 환경
- `Environment.DEV2`: 개발2 환경
- `Environment.QA`: QA 환경
- `Environment.QA2`: QA2 환경
- `Environment.SANDBOX`: 샌드박스 환경
- `Environment.LIVE`: 라이브 환경

## 에러 코드

| 코드 | 설명 |
|------|------|
| 0 | 성공 |
| 40000 | 잘못된 요청 데이터 |
| 41002 | 잘못된 게임 ID |
| 46217 | 기기 등록 필요 |
| 50000 | 알 수 없는 서버 오류 |

## 주의사항

1. **API Access Token 필요**: SGP API를 사용하기 위해서는 유효한 API Access Token이 필요합니다.
2. **게임 ID 설정**: 검증하려는 게임의 정확한 게임 ID를 설정해야 합니다.
3. **환경 선택**: 실제 운영 환경에서는 `Environment.LIVE`를 사용하세요.
4. **기기 등록**: 모바일 게임의 경우 기기 등록 상태를 확인해야 할 수 있습니다.

## 예제 코드

자세한 사용 예제는 각 파일의 `if __name__ == "__main__":` 섹션을 참조하세요.

## 라이선스

이 코드는 SGP API 문서를 기반으로 작성되었으며, 실제 사용 시에는 해당 API의 이용 약관을 준수해야 합니다. 