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
ARG PUBLIC_UMAMI_ID=""
ENV PUBLIC_UMAMI_ID=$PUBLIC_UMAMI_ID
RUN pnpm --filter @emc/web build

FROM caddy:2-alpine
COPY infra/caddy/Caddyfile infra/caddy/Caddyfile.prod infra/caddy/site.caddy /etc/caddy/
COPY --from=build /app/apps/web/dist /srv
