FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/svc-billing/package.json ./services/svc-billing/
RUN pnpm install --frozen-lockfile --shamefully-hoist

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/services/svc-billing/node_modules ./services/svc-billing/node_modules
COPY packages/shared ./packages/shared
COPY services/svc-billing ./services/svc-billing
RUN pnpm --filter @attendance/shared prisma:generate
WORKDIR /app/services/svc-billing
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/services/svc-billing/.next/standalone ./
COPY --from=builder /app/services/svc-billing/.next/static ./services/svc-billing/.next/static
USER nextjs
EXPOSE 3007
ENV PORT=3007
CMD ["node", "services/svc-billing/server.js"]
