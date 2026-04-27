FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY services/svc-comms/package.json ./services/svc-comms/
RUN pnpm install --frozen-lockfile --shamefully-hoist

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/services/svc-comms/node_modules ./services/svc-comms/node_modules
COPY packages/shared ./packages/shared
COPY services/svc-comms ./services/svc-comms
RUN pnpm --filter @attendance/shared prisma:generate
WORKDIR /app/services/svc-comms
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/services/svc-comms/.next/standalone ./
COPY --from=builder /app/services/svc-comms/.next/static ./services/svc-comms/.next/static
USER nextjs
EXPOSE 3006
ENV PORT=3006
CMD ["node", "services/svc-comms/server.js"]
