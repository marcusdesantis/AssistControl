FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/svc-support/package.json ./services/svc-support/
RUN pnpm install --frozen-lockfile --shamefully-hoist

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/services/svc-support/node_modules ./services/svc-support/node_modules
COPY packages/shared ./packages/shared
COPY services/svc-support ./services/svc-support
RUN pnpm --filter @attendance/shared prisma:generate
WORKDIR /app/services/svc-support
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/services/svc-support/.next/standalone ./
COPY --from=builder /app/services/svc-support/.next/static ./services/svc-support/.next/static
USER nextjs
EXPOSE 3009
ENV PORT=3009
CMD ["node", "services/svc-support/server.js"]
