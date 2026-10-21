# Build context: repository root
FROM node:24-alpine@sha256:6a1c190e17215d844926b0677f4bf87273ff7d5e54db06d3b5b5863ab0b09a3d AS build
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
RUN pnpm --filter @emc/web build && node apps/web/scripts/precompress.mjs apps/web/dist

FROM caddy:2-alpine@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f
COPY infra/caddy/Caddyfile infra/caddy/Caddyfile.prod infra/caddy/site.caddy /etc/caddy/
COPY --from=build /app/apps/web/dist /srv
