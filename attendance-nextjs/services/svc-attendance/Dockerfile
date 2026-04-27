FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/svc-attendance/package.json ./services/svc-attendance/
RUN pnpm install --frozen-lockfile --shamefully-hoist

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/services/svc-attendance/node_modules ./services/svc-attendance/node_modules
COPY packages/shared ./packages/shared
COPY services/svc-attendance ./services/svc-attendance
RUN pnpm --filter @attendance/shared prisma:generate
WORKDIR /app/services/svc-attendance
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/services/svc-attendance/.next/standalone ./
COPY --from=builder /app/services/svc-attendance/.next/static ./services/svc-attendance/.next/static
USER nextjs
EXPOSE 3003
ENV PORT=3003
CMD ["node", "services/svc-attendance/server.js"]
