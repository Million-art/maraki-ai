# Multi-stage Dockerfile for Maraki Telegram Bot
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files and build TypeScript
COPY . .
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled JavaScript code from builder stage
COPY --from=builder /app/dist ./dist

# Expose port (if web server endpoint is used)
EXPOSE 1000

# Start bot
CMD ["node", "dist/index.js"]
