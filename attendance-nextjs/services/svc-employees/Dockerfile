FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/svc-employees/package.json ./services/svc-employees/
RUN pnpm install --frozen-lockfile --shamefully-hoist

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/services/svc-employees/node_modules ./services/svc-employees/node_modules
COPY packages/shared ./packages/shared
COPY services/svc-employees ./services/svc-employees
RUN pnpm --filter @attendance/shared prisma:generate
WORKDIR /app/services/svc-employees
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/services/svc-employees/.next/standalone ./
COPY --from=builder /app/services/svc-employees/.next/static ./services/svc-employees/.next/static
USER nextjs
EXPOSE 3002
ENV PORT=3002
CMD ["node", "services/svc-employees/server.js"]
