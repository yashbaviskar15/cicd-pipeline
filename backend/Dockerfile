# syntax=docker/dockerfile:1

# ---- Stage 1: install dependencies + generate Prisma client ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
# postinstall runs `prisma generate` (prisma is a production dependency)
RUN npm ci --omit=dev

# ---- Stage 2: runtime ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

# Run as a non-root user (defense in depth).
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --chown=appuser:appgroup --from=deps /app/node_modules ./node_modules
COPY --chown=appuser:appgroup package*.json ./
COPY --chown=appuser:appgroup prisma ./prisma
COPY --chown=appuser:appgroup src ./src
COPY --chown=appuser:appgroup docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh

USER appuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/health/live',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "src/index.js"]
