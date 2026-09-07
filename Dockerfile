# Optimized Dockerfile for AWS Graviton (ARM64)
FROM public.ecr.aws/docker/library/node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package manifests, pre-pruned production dependencies, and compiled dist
COPY package*.json ./
COPY node_modules ./node_modules
COPY dist ./dist

EXPOSE 1000

CMD ["node", "dist/index.js"]
