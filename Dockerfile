# Build stage
FROM node:20 AS builder

WORKDIR /build

# Copy package files first to leverage Docker cache
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies for TypeScript compilation)
RUN npm install

# Copy source code
COPY src ./src

# Build the project (compile TypeScript to dist directory)
RUN ./node_modules/.bin/tsc

# Runtime stage
FROM node:20-slim

WORKDIR /app

# Install only runtime dependencies (ws and ajv)
RUN npm install --no-save ws@8.19.0 ajv@8.17.1

# Copy the compiled dist directory from builder stage
COPY --from=builder /build/dist ./dist

# Expose the WebSocket port
EXPOSE 16666

# Run the application
CMD ["node", "dist/main.js"]
