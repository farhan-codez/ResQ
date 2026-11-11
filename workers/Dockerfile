# Detection Worker Dockerfile
# Build: docker build -t resq-detection-worker -f workers/Dockerfile .
# Run: docker run --env-file .env.production resq-detection-worker

FROM node:22-alpine AS base

RUN corepack enable pnpm

WORKDIR /app

COPY workers/package.json ./package.json
RUN pnpm install --prod=false

COPY workers/detection-worker.ts ./detection-worker.ts
RUN pnpm exec tsc detection-worker.ts --esModuleInterop --module commonjs --target ES2022 --outDir ./dist

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json

CMD ["node", "dist/detection-worker.js"]
