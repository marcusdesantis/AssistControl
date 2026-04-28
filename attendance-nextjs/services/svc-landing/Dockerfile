FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY services/svc-landing/package.json ./services/svc-landing/
RUN pnpm install --frozen-lockfile --shamefully-hoist

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services/svc-landing/node_modules ./services/svc-landing/node_modules
COPY services/svc-landing ./services/svc-landing
WORKDIR /app/services/svc-landing
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/services/svc-landing/.next/standalone ./
COPY --from=builder /app/services/svc-landing/.next/static ./services/svc-landing/.next/static
USER nextjs
EXPOSE 3010
ENV PORT=3010
CMD ["node", "services/svc-landing/server.js"]
