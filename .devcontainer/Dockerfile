ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-alpine
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apk add --no-cache git openssh curl bash
WORKDIR /app
USER node
