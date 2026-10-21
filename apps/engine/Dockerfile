# Build context: repository root
FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4 AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/engine/package.json apps/engine/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --prod --filter @emc/engine...

FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4
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
