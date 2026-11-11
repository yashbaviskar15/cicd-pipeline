#!/bin/sh
# Entrypoint: optionally apply pending database migrations before boot.
# In ECS/K8s the migration is normally run as a separate one-off task, but
# RUN_MIGRATIONS=true keeps local docker-compose turnkey.
set -e

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "[entrypoint] Applying database migrations (prisma migrate deploy)..."
  npx prisma migrate deploy
fi

exec "$@"
