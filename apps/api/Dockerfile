# syntax=docker/dockerfile:1.7

# ── Build stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Copy workspace metadata so npm can resolve the monorepo layout, then install
# only what apps/api needs (production deps + its devDeps for the TS compile).
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN npm ci --include=dev

# Copy sources and build
COPY packages ./packages
COPY apps/api ./apps/api

RUN npm run build --workspace=apps/api

# Drop dev deps for the runtime image
RUN npm prune --omit=dev --workspace=apps/api

# ── Runtime stage ───────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Run as non-root for hardening
RUN addgroup -S app && adduser -S app -G app

COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=app:app /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=app:app /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=app:app /app/packages ./packages

USER app

ENV PORT=3000
EXPOSE 3000

# Lightweight liveness check — runs every 30s once the container is healthy.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:${PORT}/api/health || exit 1

CMD ["node", "apps/api/dist/server.js"]
