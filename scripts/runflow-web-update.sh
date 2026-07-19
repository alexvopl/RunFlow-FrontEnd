#!/usr/bin/env bash
set -Eeuo pipefail

REPO_DIR="${RUNFLOW_WEB_REPO_DIR:-/opt/runflow/frontend}"
REMOTE_NAME="${RUNFLOW_WEB_GIT_REMOTE:-origin}"
BRANCH="${RUNFLOW_WEB_DEPLOY_BRANCH:-main}"
COMPOSE_FILE="${RUNFLOW_WEB_COMPOSE_FILE:-$REPO_DIR/deploy/compose/runflow-web.compose.yml}"
ENV_FILE="${RUNFLOW_FRONTEND_ENV_FILE:-/etc/runflow/frontend.env}"
LOCK_FILE="${RUNFLOW_WEB_UPDATE_LOCK_FILE:-/run/runflow-web-update.lock}"
HEALTHCHECK_SCRIPT="${RUNFLOW_WEB_HEALTHCHECK_SCRIPT:-$REPO_DIR/scripts/runflow-web-healthcheck.sh}"
FORCE=0

if [[ "${1:-}" == "--force" ]]; then
  FORCE=1
elif [[ $# -gt 0 ]]; then
  echo "Usage: runflow-web-update.sh [--force]" >&2
  exit 2
fi

log() {
  printf '[runflow-web-update] %s\n' "$*"
}

die() {
  printf '[runflow-web-update] ERROR: %s\n' "$*" >&2
  exit 1
}

repo_git() {
  local repo_owner
  repo_owner="$(stat -c '%U' "$REPO_DIR" 2>/dev/null || true)"
  if [[ "$EUID" -eq 0 && -n "$repo_owner" && "$repo_owner" != "root" ]] \
    && command -v runuser >/dev/null 2>&1; then
    runuser -u "$repo_owner" -- git -C "$REPO_DIR" "$@"
    return
  fi
  git -c "safe.directory=$REPO_DIR" -C "$REPO_DIR" "$@"
}

command -v git >/dev/null 2>&1 || die "git is not installed"
command -v docker >/dev/null 2>&1 || die "docker is not installed"
command -v flock >/dev/null 2>&1 || die "flock is not installed"
command -v curl >/dev/null 2>&1 || die "curl is not installed"
docker compose version >/dev/null 2>&1 || die "docker compose is not available"

[[ -d "$REPO_DIR/.git" ]] || die "repo checkout not found at $REPO_DIR"
[[ -f "$COMPOSE_FILE" ]] || die "compose file not found at $COMPOSE_FILE"
[[ -f "$ENV_FILE" ]] || die "environment file not found at $ENV_FILE"

mkdir -p "$(dirname "$LOCK_FILE")"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "another update is already running; skipping"
  exit 0
fi

if [[ -n "$(repo_git status --porcelain --untracked-files=no)" ]]; then
  die "repo has local changes; refusing to deploy over a dirty checkout"
fi

log "fetching $REMOTE_NAME/$BRANCH"
repo_git fetch "$REMOTE_NAME" "$BRANCH"

CURRENT_SHA="$(repo_git rev-parse HEAD)"
TARGET_SHA="$(repo_git rev-parse "$REMOTE_NAME/$BRANCH")"

if [[ "$CURRENT_SHA" == "$TARGET_SHA" && "$FORCE" -eq 0 ]]; then
  log "already up to date at $CURRENT_SHA"
  "$HEALTHCHECK_SCRIPT" 30
  exit 0
fi

log "updating $CURRENT_SHA -> $TARGET_SHA"
repo_git pull --ff-only "$REMOTE_NAME" "$BRANCH"

log "building and deploying frontend"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build --remove-orphans
"$HEALTHCHECK_SCRIPT" 180
