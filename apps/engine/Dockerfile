# Build context: repository root
FROM node:24-alpine@sha256:6a1c190e17215d844926b0677f4bf87273ff7d5e54db06d3b5b5863ab0b09a3d AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/engine/package.json apps/engine/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --prod --filter @emc/engine...

FROM node:24-alpine@sha256:6a1c190e17215d844926b0677f4bf87273ff7d5e54db06d3b5b5863ab0b09a3d
WORKDIR /app
ENV NODE_ENV=production DB_PATH=/data/e-mail-check.sqlite
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/engine/node_modules ./apps/engine/node_modules
COPY packages/shared ./packages/shared
COPY apps/engine/package.json apps/engine/
COPY apps/engine/src apps/engine/src
RUN mkdir /data && chown node:node /data
USER node
WORKDIR /app/apps/engine
EXPOSE 2525 8787
CMD ["node", "--disable-warning=ExperimentalWarning", "src/main.ts"]
