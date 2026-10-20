#!/usr/bin/env sh
# Restores a dump into the database named by DATABASE_URL. DESTRUCTIVE: existing objects are dropped first.
# Rehearse on a scratch database before you ever need it:
#   DATABASE_URL=<scratch> CONFIRM_RESTORE=yes deploy/restore.sh backups/x.dump
set -eu
: "${DATABASE_URL:?Set DATABASE_URL}"
dump="${1:?Usage: restore.sh <file.dump>}"
[ -f "$dump" ] || { echo "No such file: $dump" >&2; exit 1; }
if [ "${CONFIRM_RESTORE:-}" != "yes" ]; then
  echo "This will overwrite data in: ${DATABASE_URL%%\?*}" >&2
  echo "Re-run with CONFIRM_RESTORE=yes to proceed." >&2
  exit 2
fi
pg_restore --clean --if-exists --no-owner --dbname="${DATABASE_URL%%\?*}" "$dump"
echo "Restore finished. Run 'npm run smoke' in backend/ and check /api/health."
