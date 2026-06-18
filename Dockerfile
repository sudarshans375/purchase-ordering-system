# Dockerfile — Purchase Ordering System
# Author: Sudarshan Sonawane

# ─── Build stage ───────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
# Install ALL dependencies (including devDeps like next for building)
RUN npm ci

# Copy prisma schema and generate client
COPY prisma/ ./prisma/
RUN npx prisma generate

# Copy source
COPY . .

# Build Next.js app
RUN npm run build

# ─── Production stage ──────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# Copy start script and init script
COPY scripts/ ./scripts/
RUN chmod +x ./scripts/start.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["./scripts/start.sh"]
