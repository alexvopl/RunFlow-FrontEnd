#!/usr/bin/env sh
set -eu

WAIT_SECONDS="${1:-0}"
DEADLINE=$(( $(date +%s) + WAIT_SECONDS ))

until curl --fail --silent --show-error --max-time 5 http://127.0.0.1:8080/healthz >/dev/null \
  && curl --fail --silent --show-error --max-time 5 http://127.0.0.1:8080/api/health/live >/dev/null; do
  if [ "$(date +%s)" -ge "$DEADLINE" ]; then
    echo "[runflow-web-healthcheck] frontend or proxied API is unhealthy" >&2
    exit 1
  fi
  sleep 2
done

echo "[runflow-web-healthcheck] frontend and proxied API are healthy"
