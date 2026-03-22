# For ECS Fargate (x86_64), build with: docker build --platform linux/amd64
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:20-alpine

# ECS container health check uses curl
RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --omit=dev; fi

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]
