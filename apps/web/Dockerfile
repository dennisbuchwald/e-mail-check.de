# Build context: repository root
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @emc/web...
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @emc/web build

FROM caddy:2-alpine
COPY infra/caddy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist /srv
