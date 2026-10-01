# syntax=docker/dockerfile:1.7
# Template Repo Dockerfile — multi-stage, pnpm, Node 24 LTS (generic for Vite/Next.js/monorepo)
# Usage:
#   docker build -t template-repo .
#   docker run --rm -it -p 3000:3000 template-repo
#   docker run --rm -it -p 5173:5173 template-repo # Vite
#   docker compose up --build

ARG NODE_VERSION=24

# ---------- Base ----------
FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# ---------- Deps ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ---------- Build ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# BuildKit cache mounts for Vite (.vite), Next.js (.next/cache), Turbo (.turbo), and generic .cache
# These caches speed up Vite (esbuild) and Next.js (webpack) builds without conflicting with existing settings
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    --mount=type=cache,id=next-cache,target=/app/.next/cache \
    --mount=type=cache,id=next-cache-apps,target=/app/apps/web/.next/cache \
    --mount=type=cache,id=vite-cache,target=/app/node_modules/.vite \
    --mount=type=cache,id=turbo-cache,target=/app/.turbo/cache \
    --mount=type=cache,id=generic-cache,target=/app/.cache \
    pnpm build

# ---------- Production ----------
FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src
COPY --from=build /app/scripts ./scripts
CMD ["pnpm", "start"]

# ---------- Development ----------
FROM base AS development
ENV NODE_ENV=development
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install
COPY . .
EXPOSE 3000 5173
CMD ["pnpm", "dev"]
