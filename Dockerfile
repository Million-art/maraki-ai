# Optimized Dockerfile for AWS Graviton (ARM64)
FROM public.ecr.aws/docker/library/node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install Python3, pip, and required system libraries for Pillow
RUN apk add --no-cache python3 py3-pip py3-pillow ttf-dejavu fontconfig

# Install qrcode using pip
RUN pip3 install --break-system-packages qrcode

# Copy package manifests, pre-pruned production dependencies, and compiled dist
COPY package*.json ./
COPY node_modules ./node_modules
COPY dist ./dist
COPY assets ./assets
COPY scripts ./scripts

EXPOSE 1000

CMD ["node", "dist/index.js"]
