FROM node:25-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY ./src ./src
COPY tsconfig.json ./
RUN npx tsc
FROM node:25-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist/ ./dist
EXPOSE 16666
CMD ["node", "dist/main.js"]
