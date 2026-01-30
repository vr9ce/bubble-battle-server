FROM node:25-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY ./src ./src
RUN npx tsc
FROM node:25-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist/ ./dist
EXPOSE 16666
CMD ["node", "dist/main.js"]
