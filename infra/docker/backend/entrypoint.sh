#!/usr/bin/env bash
# =============================================================================
# OpenFCM backend entrypoint
# -----------------------------------------------------------------------------
# Shared by app / queue / scheduler. Bootstrap steps (migrations, config cache)
# run ONCE, on the container whose CONTAINER_ROLE=app, so multiple queue
# replicas never race to migrate the database.
# =============================================================================
set -euo pipefail

ROLE="${CONTAINER_ROLE:-app}"

echo "[entrypoint] starting role=${ROLE} env=${APP_ENV:-production}"

# Wait for the database to accept connections before touching artisan. depends_on
# healthchecks already gate this, but this makes the container self-healing on
# transient restarts.
wait_for_db() {
  local retries=30
  until php -r '
    try {
      new PDO(
        sprintf("mysql:host=%s;port=%s", getenv("DB_HOST"), getenv("DB_PORT") ?: 3306),
        getenv("DB_USERNAME"), getenv("DB_PASSWORD")
      );
    } catch (Throwable $e) { exit(1); }
  ' >/dev/null 2>&1; do
    retries=$((retries - 1))
    if [ "$retries" -le 0 ]; then
      echo "[entrypoint] database not reachable, giving up" >&2
      exit 1
    fi
    echo "[entrypoint] waiting for database..."
    sleep 2
  done
}

if [ "$ROLE" = "app" ]; then
  wait_for_db

  # Generate an app key only if one was not injected via the environment.
  if [ -z "${APP_KEY:-}" ]; then
    echo "[entrypoint] APP_KEY empty — generating ephemeral key (set APP_KEY in .env for stable sessions/encryption)"
    php artisan key:generate --force || true
  fi

  echo "[entrypoint] running migrations"
  php artisan migrate --force --no-interaction

  if [ "${APP_ENV:-production}" = "production" ]; then
    echo "[entrypoint] caching config/routes/events/views"
    php artisan config:cache
    php artisan route:cache
    php artisan event:cache
    php artisan view:cache
  else
    # Dev: make sure no stale caches shadow bind-mounted source.
    php artisan optimize:clear || true
  fi

  # Ensure storage symlink exists for any publicly served assets.
  php artisan storage:link || true
fi

echo "[entrypoint] handing off to: $*"
exec "$@"
