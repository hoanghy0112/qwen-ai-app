# Dockerfile for FE
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
COPY pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .

EXPOSE 3000
CMD ["pnpm", "dev", "--host"]
