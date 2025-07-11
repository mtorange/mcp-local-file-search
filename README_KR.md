# MCP Local File Search

로컬 파일을 인덱싱하고 검색하는 MCP (Model Context Protocol) 서버입니다.

## 기능

- 다양한 파일 포맷 지원 (txt, md, doc, docx, pdf, xls, xlsx, pptx 등)
- BM25 알고리즘을 사용한 고급 검색
- 파일 변경 감지 및 증분 인덱싱
- MCP 프로토콜을 통한 AI 도구 통합
- 명령줄 인터페이스 제공

## 설치

```bash
# 전역 설치 (권장)
npm install -g @mtorange/mcp-local-file-search
```

설치 후 `local-file` 명령어를 사용할 수 있습니다.

## 사용법

### 명령어

#### 1. MCP 모드 실행
```bash
# 전역 설치 후
local-file mcp --dir=/path/to/file

# 또는 npx로 바로 사용
npx @mtorange/mcp-local-file-search mcp --dir=/path/to/file
```

#### 2. 텍스트 검색
```bash
# 전역 설치 후
local-file search "검색할 텍스트" --dir=/path/to/file

# 또는 npx로 바로 사용
npx @mtorange/mcp-local-file-search search "검색할 텍스트" --dir=/path/to/file
```

#### 3. 파일 인덱싱
```bash
# 전역 설치 후
local-file index --dir=/path/to/file

# 또는 npx로 바로 사용
npx @mtorange/mcp-local-file-search index --dir=/path/to/file
```

#### 4. 강제 재인덱싱
```bash
# 전역 설치 후
local-file index --dir=/path/to/file --force

# 또는 npx로 바로 사용
npx @mtorange/mcp-local-file-search index --dir=/path/to/file --force
```

### 옵션

- `--dir=<directory>`: 인덱싱할 디렉토리 지정
- `--debug-log=<file>`: 디버그 로그를 파일에 출력
- `--force`: 파일 변경 여부와 관계없이 강제 재인덱싱
- `--help`: 도움말 표시

### MCP 도구

MCP 모드에서 다음 도구들을 사용할 수 있습니다:

1. **search-local**: 로컬 파일에서 텍스트 검색
2. **search-in-file**: 특정 파일에서 텍스트 검색
3. **get-index-stats**: 인덱스 통계 조회
4. **find-similar-files**: 유사한 파일 찾기
5. **reindex**: 파일 재인덱싱

## 지원 파일 형식

- 텍스트: `.txt`, `.md`, `.json`, `.js`, `.ts`, `.html`, `.css`, `.xml`, `.csv`
- 문서: `.doc`, `.docx`, `.pdf`
- 스프레드시트: `.xls`, `.xlsx`
- 프레젠테이션: `.pptx`

## 예제

### 1. 기본 사용법
```bash
# 현재 디렉토리 인덱싱
local-file index

# 특정 텍스트 검색
local-file search "JavaScript"

# MCP 서버 실행
local-file mcp --debug-log=debug.log
```

### 2. 특정 디렉토리 작업
```bash
# 문서 디렉토리 인덱싱
local-file index --dir=~/Documents

# 문서에서 검색
local-file search "프로젝트" --dir=~/Documents

# MCP 서버 실행
local-file mcp --dir=~/Documents
```

### 3. 디버그 모드
```bash
# 디버그 로그와 함께 MCP 서버 실행
local-file mcp --dir=~/Documents --debug-log=debug.log
```

### 4. npx로 바로 사용
```bash
# 전역 설치 없이 바로 사용
npx @mtorange/mcp-local-file-search mcp --dir=/path/to/file
npx @mtorange/mcp-local-file-search search "검색어" --dir=/path/to/file
```

## 인덱스 파일

인덱스는 대상 디렉토리에 `.local-file-index.json` 파일로 저장됩니다. 이 파일은 다음 정보를 포함합니다:

- 파일 내용과 메타데이터
- 용어 빈도 통계
- BM25 계산을 위한 전역 통계

인덱스 파일 index 명령으로 실행하거나 mcp명령으로 실행될 때도 생성됩니다.
따라서 mcp명령으로 최초 실행시 시간이 소요될 수 있습니다.

## 성능 최적화

- 파일 변경 감지를 통한 증분 인덱싱
- 숨김 파일 및 `node_modules` 디렉토리 제외
- 지원하지 않는 파일 형식 자동 필터링

## 언어 지원

애플리케이션은 시스템 언어를 자동으로 감지하고 메시지를 해당 언어로 표시합니다.

### 지원 언어

- **영어 (en)** - 기본 언어
- **한국어 (ko)** - 한국어 지원
- **일본어 (ja)** - 일본어 지원
- **중국어 (zh)** - 중국어 지원

### 언어 감지 우선순위

1. **MCP_LANG** 환경 변수 (최우선)
2. **LANGUAGE** 환경 변수
3. **LC_ALL** 환경 변수
4. **LC_MESSAGES** 환경 변수
5. **LANG** 환경 변수
6. **Node.js Intl API** (시스템 로케일)
7. **영어** (기본 폴백)

### 언어 설정

환경 변수를 사용하여 언어를 설정할 수 있습니다:

```bash
# 한국어 사용 (전역 설치)
MCP_LANG=ko local-file search "검색어"

# 한국어 사용 (npx)
MCP_LANG=ko npx @mtorange/mcp-local-file-search search "검색어"

# 영어 사용 (전역 설치)
MCP_LANG=en local-file search "search term"

# 영어 사용 (npx)
MCP_LANG=en npx @mtorange/mcp-local-file-search search "search term"

# 일본어 사용 (전역 설치)
MCP_LANG=ja local-file search "検索語"

# 일본어 사용 (npx)
MCP_LANG=ja npx @mtorange/mcp-local-file-search search "検索語"

# 시스템 전체 언어 설정
export LANG=ko_KR.UTF-8
local-file search "검색어"
# 또는 npx로
export LANG=ko_KR.UTF-8
npx @mtorange/mcp-local-file-search search "검색어"
```

### 언어 감지 정보 확인

현재 언어 감지 정보를 확인하세요:

```bash
# 전역 설치 시
local-file lang-info

# npx 사용 시
npx @mtorange/mcp-local-file-search lang-info
```

이 명령어는 다음을 보여줍니다:
- 현재 감지된 로케일
- 환경 변수들
- 현재 언어의 테스트 메시지


## 문제 해결

### 인덱스 파일이 없다는 오류
```bash
# 전역 설치 시
local-file index --dir=/path/to/file

# npx 사용 시
npx @mtorange/mcp-local-file-search index --dir=/path/to/file
```

### 검색 결과가 없는 경우
- 파일이 올바르게 인덱싱되었는지 확인
- 지원하는 파일 형식인지 확인
- 검색어를 다르게 시도

### 파일 파싱 오류
- 파일이 손상되지 않았는지 확인
- 해당 파일 형식이 지원되는지 확인
- `--force` 옵션으로 재인덱싱 시도:
```bash
# 전역 설치 시
local-file index --dir=/path/to/file --force

# npx 사용 시
npx @mtorange/mcp-local-file-search index --dir=/path/to/file --force
```

## 라이선스

MIT License 