#!/usr/bin/env bash
# Deploys a committed state to the server. Run only after Dennis' approval.
#   DEPLOY_HOST=<server-ip> scripts/deploy.sh             deploys HEAD of main (clean, pushed)
#   DEPLOY_HOST=<server-ip> DEPLOY_REF=deploy-… scripts/deploy.sh   rollback: deploys an earlier tag
# Every deploy of HEAD gets a tag deploy-YYYYMMDD-HHMM, so the previous state is always one command away.
# First time on the server: cp .env.example .env and fill it (see docs/DEPLOYMENT.md).
set -euo pipefail
HOST="${DEPLOY_HOST:?DEPLOY_HOST fehlt, z. B. DEPLOY_HOST=203.0.113.10 scripts/deploy.sh}"
DIR=/opt/e-mail-check
cd "$(dirname "$0")/.."

REF="${DEPLOY_REF:-}"
if [ -z "$REF" ]; then
	# Only what is committed and on GitHub goes live: no stray local edits, nothing that only exists here.
	[ "$(git rev-parse --abbrev-ref HEAD)" = main ] || { echo "Deploy nur von main"; exit 1; }
	git diff --quiet && git diff --cached --quiet || { echo "Arbeitsstand nicht sauber: erst committen"; exit 1; }
	git fetch -q origin main
	[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { echo "HEAD ist nicht gepusht (origin/main weicht ab)"; exit 1; }
	REF=HEAD
fi
COMMIT="$(git rev-parse --verify "$REF^{commit}")"

echo "→ Tests ($COMMIT)"
pnpm --filter @emc/engine test >/dev/null

# Export exactly the commit (git archive): ignored files like research/ or .env can never slip through.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git archive "$COMMIT" | tar -x -C "$TMP"
echo "$COMMIT" > "$TMP/.deployed-commit"

# The only lasting data is the all-time counter (results are deleted after 7 days anyway):
# keep a copy here before every deploy. Restore: MAILS_CHECKED_SEED=<value> in .env (see docs/DEPLOYMENT.md).
mkdir -p backups
ssh "deploy@$HOST" "cd $DIR && docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T engine node --disable-warning=ExperimentalWarning -e \"const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync(process.env.DB_PATH,{readOnly:true});console.log(JSON.stringify(d.prepare('SELECT * FROM counters').all()))\"" > "backups/counters-$(date +%Y%m%d-%H%M).json" 2>/dev/null && echo "→ Zähler gesichert" || echo "→ Zähler nicht gesichert (Engine lief nicht?)"

echo "→ Dateien nach $HOST:$DIR"
rsync -az --delete \
	--exclude /.env --exclude /data --exclude /apps/engine/data --exclude /.deploy-zugang.txt --exclude /backups \
	"$TMP/" "deploy@$HOST:$DIR/"

echo "→ Bauen und starten"
ssh "deploy@$HOST" "cd $DIR && test -f .env || { echo '.env fehlt auf dem Server'; exit 1; }
	# Statistics on: the Umami secrets must be real values.
	if grep -q '^COMPOSE_PROFILES=.*stats' .env; then
		grep -Eq '^UMAMI_APP_SECRET=.{32,}' .env && grep -Eq '^UMAMI_DB_PASSWORD=.{16,}' .env || { echo 'UMAMI_APP_SECRET (>= 32) oder UMAMI_DB_PASSWORD (>= 16) fehlt in .env'; exit 1; }
	fi
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --remove-orphans && docker compose -f docker-compose.yml -f docker-compose.prod.yml ps"

echo "→ Gesundheit"
sleep 5
curl -fsS "https://$(ssh "deploy@$HOST" "grep ^SITE_DOMAIN= $DIR/.env | cut -d= -f2")/api/health" && echo " ok"

if [ "$REF" = HEAD ]; then
	TAG="deploy-$(date +%Y%m%d-%H%M)"
	git tag "$TAG" "$COMMIT" && git push -q origin "$TAG" && echo "→ Tag $TAG (Rollback: DEPLOY_REF=<älterer Tag> scripts/deploy.sh)"
fi
