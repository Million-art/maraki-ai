# Optimized Dockerfile for AWS Graviton (ARM64)
FROM public.ecr.aws/docker/library/node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package manifests and install runtime-only dependencies without postinstall scripts
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts

# Copy pre-compiled JavaScript dist directory
COPY dist ./dist

EXPOSE 1000

CMD ["node", "dist/index.js"]
