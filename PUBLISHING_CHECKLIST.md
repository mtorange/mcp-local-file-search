# 퍼블리싱 체크리스트

## 📋 퍼블리싱 전 확인사항

### 1. **필수 파일 확인**
- [ ] `package.json` - 모든 필드 작성 완료
- [ ] `README.md` - 설치/사용법 포함
- [ ] `LICENSE` - 라이선스 파일 존재
- [ ] `.gitignore` - 불필요한 파일 제외
- [ ] `.npmignore` - npm 패키지에서 제외할 파일 지정

### 2. **package.json 검증**
- [ ] `name` - 고유한 패키지 이름 (npm search로 확인)
- [ ] `version` - 시맨틱 버전 (1.0.0)
- [ ] `description` - 명확한 설명
- [ ] `author` - 작성자 정보
- [ ] `license` - 라이선스 (MIT)
- [ ] `repository` - GitHub 저장소 URL
- [ ] `homepage` - 프로젝트 홈페이지
- [ ] `keywords` - 검색에 도움되는 키워드들
- [ ] `engines` - Node.js 버전 요구사항
- [ ] `files` - 패키지에 포함될 파일 목록

### 3. **코드 품질 확인**
- [ ] 모든 기능 테스트 완료
- [ ] 에러 처리 구현
- [ ] 코드 주석 작성
- [ ] 성능 최적화 확인

### 4. **문서화**
- [ ] README.md 완성
  - [ ] 설치 방법
  - [ ] 사용법 예제
  - [ ] API 문서
  - [ ] 지원 파일 형식 목록
  - [ ] 문제 해결 가이드
- [ ] 버전 히스토리 (CHANGELOG.md)
- [ ] 라이선스 정보

### 5. **테스트**
- [ ] 로컬 테스트 완료
- [ ] 다양한 파일 형식 테스트
- [ ] 다국어 검색 테스트
- [ ] 에러 상황 테스트

## 📦 배포 방법별 가이드

### NPM 퍼블리싱
```bash
# 1. 패키지 이름 확인
npm view mcp-local-file-search

# 2. 로그인
npm login

# 3. 테스트 실행
npm test

# 4. 퍼블리싱
npm publish

# 5. 확인
npm view mcp-local-file-search
```

### GitHub 릴리스
```bash
# 1. 저장소 생성 및 코드 업로드
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/mcp-local-file-search.git
git push -u origin main

# 2. 태그 생성
git tag v1.0.0
git push origin v1.0.0

# 3. GitHub에서 릴리스 생성
```

### Docker 이미지
```bash
# 1. 이미지 빌드
docker build -t mcp-local-file-search .

# 2. 테스트
docker run -v $(pwd)/test:/data mcp-local-file-search search "test"

# 3. Docker Hub에 업로드
docker tag mcp-local-file-search yourusername/mcp-local-file-search
docker push yourusername/mcp-local-file-search
```

### 바이너리 배포
```bash
# 1. 바이너리 빌드
npm run build:all

# 2. 테스트
./dist/mcp-local-file-search-linux --version

# 3. GitHub 릴리스에 바이너리 첨부
```

## 🎯 배포 후 확인사항

- [ ] 설치 테스트 (`npm install -g mcp-local-file-search`)
- [ ] 기본 기능 테스트 (`local-file --help`)
- [ ] 문서 업데이트 (다운로드 통계, 피드백 반영)
- [ ] 이슈 트래커 모니터링

## 📈 마케팅 및 홍보

### 커뮤니티 공유
- [ ] Reddit (r/node, r/programming)
- [ ] Hacker News
- [ ] 개발자 블로그/미디움 포스팅
- [ ] 트위터/LinkedIn 공유

### 문서 사이트
- [ ] GitHub Pages 설정
- [ ] 온라인 데모 사이트
- [ ] 사용 사례 문서

### SEO 최적화
- [ ] npm 키워드 최적화
- [ ] GitHub 토픽 설정
- [ ] 검색 엔진 최적화

## 🔄 지속적인 유지보수

### 버전 관리
- [ ] 시맨틱 버전 규칙 준수
- [ ] CHANGELOG.md 업데이트
- [ ] 호환성 유지

### 커뮤니티 관리
- [ ] 이슈 대응
- [ ] PR 검토
- [ ] 문서 업데이트
- [ ] 보안 업데이트

### 모니터링
- [ ] 다운로드 통계 확인
- [ ] 사용자 피드백 수집
- [ ] 성능 모니터링
- [ ] 에러 추적 