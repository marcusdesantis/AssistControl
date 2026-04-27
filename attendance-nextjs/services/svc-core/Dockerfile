FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── Install dependencies ───────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/svc-core/package.json ./services/svc-core/
RUN pnpm install --frozen-lockfile --shamefully-hoist

# ── Build ──────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/services/svc-core/node_modules ./services/svc-core/node_modules
# Copy source
COPY packages/shared ./packages/shared
COPY services/svc-core ./services/svc-core
# Generate Prisma client
RUN pnpm --filter @attendance/shared prisma:generate
# Build Next.js
WORKDIR /app/services/svc-core
RUN pnpm build

# ── Runtime ────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/services/svc-core/.next/standalone ./
COPY --from=builder /app/services/svc-core/.next/static ./services/svc-core/.next/static

USER nextjs
EXPOSE 3001
ENV PORT=3001
CMD ["node", "services/svc-core/server.js"]
