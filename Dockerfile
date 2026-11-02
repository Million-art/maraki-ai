# Multi-stage build: works on Railway (clean git checkout) and in GitHub Actions
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
# postinstall runs the TypeScript build, so skip scripts here and build explicitly below
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev --ignore-scripts

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install Python3, pip, and required system libraries for Pillow
RUN apk add --no-cache python3 py3-pip py3-pillow ttf-dejavu fontconfig

# Install qrcode using pip
RUN pip3 install --break-system-packages qrcode

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY assets ./assets
COPY scripts ./scripts

EXPOSE 1000

CMD ["node", "dist/index.js"]
