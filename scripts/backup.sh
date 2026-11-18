#!/bin/sh
# Daily backup of the database and uploaded files.
# Run on the server, from the project folder:
#   sh scripts/backup.sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
STAMP="$(date +%F-%H%M)"
OUT="${BACKUP_DIR:-$ROOT/backups}"
mkdir -p "$OUT"

COMPOSE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-deploy/.env.prod}"

echo "Writing database backup..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE" exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-codebharat}" "${POSTGRES_DB:-codebharat}" \
  | gzip > "$OUT/db-$STAMP.sql.gz"

echo "Copying stored files..."
docker run --rm \
  -v codebharat_minio:/data:ro \
  -v "$OUT:/backup" \
  alpine:3.20 \
  tar -C /data -czf "/backup/files-$STAMP.tar.gz" .

find "$OUT" -name 'db-*.sql.gz' -mtime +14 -delete
find "$OUT" -name 'files-*.tar.gz' -mtime +14 -delete
echo "Backup saved in $OUT"
