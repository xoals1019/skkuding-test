# Dockerfile
FROM node:14-alpine

# 앱 디렉터리 설정
WORKDIR /usr/src/app

# package.json과 소스 파일 복사
COPY package*.json ./
COPY app.js .

# 의존성 설치
RUN npm install

# 애플리케이션 실행
CMD ["node", "app.js"]
