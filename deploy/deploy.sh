#!/usr/bin/env bash
# Deploys one image version on the server. Run by GitHub Actions over SSH (or by hand):
#   cd /opt/eavto/deploy && ./deploy.sh <image-tag>          e.g. ./deploy.sh 3f2c1ab...   (git commit SHA)
#   ./deploy.sh --rollback                                   back to the previously deployed tag
#
# Steps: database backup → pull images → migrate + start → healthcheck → keep the tag, or roll back the
# api/web containers to the previous tag if the new version is not healthy.
# Note: migrations are not undone by a rollback. Keep them backward compatible (expand → contract).
set -euo pipefail
cd "$(dirname "$0")"

ENV_FILE=.env.production
[ -f "$ENV_FILE" ] || { echo "Missing deploy/$ENV_FILE (copy .env.production.example and fill it in)" >&2; exit 1; }
# shellcheck disable=SC1090
set -a; . "./$ENV_FILE"; set +a
: "${IMAGE_REGISTRY:?Set IMAGE_REGISTRY in $ENV_FILE, e.g. ghcr.io/<github-owner>}"

compose() { docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" "$@"; }
log() { echo "[deploy $(date +%H:%M:%S)] $*"; }

STATE=.deployed_tag
PREVIOUS="$(cat "$STATE" 2>/dev/null || true)"

healthy() {
  for _ in $(seq 1 30); do
    if curl -fsS --max-time 5 http://127.0.0.1:5000/api/health >/dev/null && curl -fsS --max-time 5 http://127.0.0.1:8080/ >/dev/null; then
      return 0
    fi
    sleep 4
  done
  return 1
}

start() { # $1 = tag; migrations run first (the api waits for them)
  export IMAGE_TAG="$1"
  compose up -d --no-build --remove-orphans
}

if [ "${1:-}" = "--rollback" ]; then
  [ -n "$PREVIOUS" ] || { echo "No previous version recorded" >&2; exit 1; }
  ROLLBACK_TO="$(cat .previous_tag 2>/dev/null || true)"
  [ -n "$ROLLBACK_TO" ] || { echo "No earlier version to roll back to" >&2; exit 1; }
  log "Rolling back $PREVIOUS → $ROLLBACK_TO"
  export IMAGE_TAG="$ROLLBACK_TO"
  compose up -d --no-build --no-deps api web
  healthy && { echo "$ROLLBACK_TO" > "$STATE"; log "Rolled back to $ROLLBACK_TO"; exit 0; }
  log "Rollback is not healthy either: check 'docker compose logs api'"; exit 1
fi

TAG="${1:?Usage: deploy.sh <image-tag> | --rollback}"
log "Deploying $TAG (previous: ${PREVIOUS:-none})"

# 1. Backup before anything changes (only once the database exists).
mkdir -p backups
if compose ps --status running db 2>/dev/null | grep -q db; then
  file="backups/pre-deploy-$(date +%Y%m%d-%H%M%S).dump"
  compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner > "$file"
  log "Backup: $file ($(wc -c < "$file") bytes)"
  # Keep the newest 14.
  ls -1t backups/pre-deploy-*.dump 2>/dev/null | tail -n +15 | xargs -r rm --
fi

# 2. Pull the new images (built and pushed by CI).
export IMAGE_TAG="$TAG"
compose pull migrate api web

# 3. Migrate and start.
start "$TAG"

# 4. Healthcheck, then keep or roll back.
if healthy; then
  [ -n "$PREVIOUS" ] && [ "$PREVIOUS" != "$TAG" ] && echo "$PREVIOUS" > .previous_tag
  echo "$TAG" > "$STATE"
  log "OK: $TAG is live"
  # Free disk: drop unused images (the current and previous tags stay in use / tagged).
  docker image prune -f >/dev/null || true
  exit 0
fi

log "New version is NOT healthy. Last API log lines:"
compose logs --tail=50 api || true
if [ -n "$PREVIOUS" ]; then
  log "Rolling back api/web to $PREVIOUS"
  export IMAGE_TAG="$PREVIOUS"
  compose up -d --no-build --no-deps api web
  healthy && log "Rolled back to $PREVIOUS" || log "Rollback is not healthy either: check the server now"
fi
exit 1
