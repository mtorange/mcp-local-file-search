FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 소스 코드 복사
COPY src/ ./src/
COPY README.md LICENSE ./

# 볼륨 마운트 포인트
VOLUME ["/data"]

# 기본 포트 (MCP는 stdio 사용하므로 필요 없음)
# EXPOSE 3000

# 실행 명령
ENTRYPOINT ["node", "src/main.js"]
CMD ["mcp", "--dir=/data"] 