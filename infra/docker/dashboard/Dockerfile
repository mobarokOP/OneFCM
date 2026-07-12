# =============================================================================
# OpenFCM dashboard image — Vite React SPA
# -----------------------------------------------------------------------------
# Multi-stage:
#   1. deps        — install npm dependencies (cached on lockfile)
#   2. development — Vite dev server with HMR (used by docker-compose.override)
#   3. build       — produce the static production bundle
#   4. production  — serve the static bundle with nginx (default target)
#
# Built from the repo ROOT (context: .) so we can COPY dashboard/ in.
# =============================================================================

ARG NODE_VERSION=20

# -----------------------------------------------------------------------------
# Stage 1 — dependencies (cached until package*.json changes)
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY dashboard/package*.json ./
# `npm ci` for reproducible installs when a lockfile exists; fall back to
# `npm install` for the scaffold-in-progress dashboard that has no lock yet.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# -----------------------------------------------------------------------------
# Stage 2 — development (Vite dev server / HMR). Source is bind-mounted.
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY dashboard/ ./
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# -----------------------------------------------------------------------------
# Stage 3 — production build
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
# The API base URL is baked into the bundle at build time (Vite inlines
# VITE_* env vars). Defaults to the edge proxy's relative /v1 prefix.
ARG VITE_API_BASE_URL=/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY dashboard/ ./
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 4 — production static server (default)
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS production
# SPA-aware nginx config (try_files fallback to index.html).
COPY infra/docker/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
# Vite outputs to dist/.
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
# nginx:alpine's default entrypoint launches the server.
