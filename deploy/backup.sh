#!/usr/bin/env sh
# Logical backup of the production database (custom format, compressed).
#   deploy/backup.sh [output-dir]      -> <dir>/eavto-YYYYmmdd-HHMMSS.dump
# Requires pg_dump >= the server's major version, and DATABASE_URL (postgresql://user:pass@host:5432/db).
set -eu
: "${DATABASE_URL:?Set DATABASE_URL}"
dir="${1:-./backups}"
mkdir -p "$dir"
file="$dir/eavto-$(date +%Y%m%d-%H%M%S).dump"
pg_dump --format=custom --no-owner --dbname="${DATABASE_URL%%\?*}" --file="$file"
echo "Backup written: $file ($(wc -c < "$file") bytes)"
# Keep the newest 14 backups.
ls -1t "$dir"/eavto-*.dump 2>/dev/null | tail -n +15 | while read -r old; do rm -- "$old"; done
