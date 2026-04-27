FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/svc-admin/package.json ./services/svc-admin/
RUN pnpm install --frozen-lockfile --shamefully-hoist

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/services/svc-admin/node_modules ./services/svc-admin/node_modules
COPY packages/shared ./packages/shared
COPY services/svc-admin ./services/svc-admin
RUN pnpm --filter @attendance/shared prisma:generate
WORKDIR /app/services/svc-admin
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/services/svc-admin/.next/standalone ./
COPY --from=builder /app/services/svc-admin/.next/static ./services/svc-admin/.next/static
USER nextjs
EXPOSE 3008
ENV PORT=3008
CMD ["node", "services/svc-admin/server.js"]
