#!/usr/bin/env bash
# Deploys the current working tree to the server. Run only after Dennis' approval.
# Usage: DEPLOY_HOST=<server-ip> scripts/deploy.sh
# First time on the server: cp .env.example .env and fill it (see docs/DEPLOYMENT.md).
set -euo pipefail
HOST="${DEPLOY_HOST:?DEPLOY_HOST fehlt, z. B. DEPLOY_HOST=203.0.113.10 scripts/deploy.sh}"
DIR=/opt/e-mail-check
cd "$(dirname "$0")/.."

echo "→ Tests"
pnpm --filter @emc/engine test >/dev/null

echo "→ Dateien nach $HOST:$DIR"
rsync -az --delete \
	--exclude node_modules --exclude .git --exclude 'apps/web/dist' --exclude 'apps/web/.astro' \
	--exclude research --exclude design --exclude test-results --exclude playwright-report \
	--exclude .env --exclude 'data' \
	./ "deploy@$HOST:$DIR/"

echo "→ Bauen und starten"
ssh "deploy@$HOST" "cd $DIR && test -f .env || { echo '.env fehlt auf dem Server'; exit 1; } && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --remove-orphans && docker compose -f docker-compose.yml -f docker-compose.prod.yml ps"

echo "→ Gesundheit"
sleep 5
curl -fsS "https://$(ssh "deploy@$HOST" "grep ^SITE_DOMAIN= $DIR/.env | cut -d= -f2")/api/health" && echo " ok"
