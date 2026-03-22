# For ECS Fargate (x86_64), build with: docker build --platform linux/amd64
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
# Use npm install when package-lock.json is missing; use npm ci when present for faster, reproducible builds
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build

FROM nginx:alpine

# ECS container health check uses curl
RUN apk add --no-cache curl

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
