# Detection Worker Dockerfile
# Build: docker build -t resq-detection-worker -f workers/Dockerfile .
# Run: docker run --env-file .env.production resq-detection-worker

FROM node:22-alpine AS base

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

# Install pnpm
RUN corepack enable pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY workers/package.json ./workers/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy worker source
COPY workers/detection-worker.ts ./workers/
COPY supabase/migrations ./supabase/migrations/

# Build TypeScript
RUN pnpm exec tsc workers/detection-worker.ts --esModuleInterop --module commonjs --target ES2022 --outDir ./dist

# Production image
FROM node:22-alpine AS runner

WORKDIR /app

# Copy built files
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./

# Run worker
CMD ["node", "dist/detection-worker.js"]