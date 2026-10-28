# Build context: repository root
FROM node:26-alpine@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797 AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/engine/package.json apps/engine/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --prod --filter @emc/engine...

FROM node:26-alpine@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797
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
