#!/usr/bin/env bash
# scripts/deploy.sh — Deploy to Azure VM with multiple modes.
#
# Modes:
#   deploy         (default) Git pull, build, restart app on the remote VM
#   rollback       Revert to previous commit and restart
#   migrate-only   Run prisma migrate deploy without restarting the app
#   logs           Tail remote app logs
#   status         Print remote container + image status
#
# Required env:
#   AZURE_VM          e.g. 20.193.148.140
#   AZURE_USER        e.g. azureuser (default: azureuser)
#   SSH_KEY_PATH      path to the SSH private key (default: ~/.ssh/id_rsa)
#   REMOTE_DIR        remote working directory (default: /opt/purchase-ordering)
#   IMAGE_NAME        Docker image name (default: purchase-ordering-app)

set -euo pipefail

# ─── Resolve env ───────────────────────────────────────────
: "${AZURE_VM:?Set AZURE_VM (e.g. 20.193.148.140)}"
: "${AZURE_USER:=azureuser}"
: "${SSH_KEY_PATH:=$HOME/.ssh/id_rsa}"
: "${REMOTE_DIR:=/opt/purchase-ordering}"
: "${IMAGE_NAME:=purchase-ordering-app}"

MODE="${1:-deploy}"
SSH_TARGET="${AZURE_USER}@${AZURE_VM}"
SSH_OPTS=(-i "${SSH_KEY_PATH}" -o StrictHostKeyChecking=accept-new -o LogLevel=ERROR)

log()  { printf "\033[1;34m[deploy]\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m[deploy]\033[0m %s\n" "$*" >&2; }
err()  { printf "\033[1;31m[deploy]\033[0m %s\n" "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || err "Required command not found: $1"
}

require_cmd git
require_cmd docker
require_cmd ssh

remote_exec() {
  ssh "${SSH_OPTS[@]}" "${SSH_TARGET}" "$@"
}

# ─── Pre-flight ───────────────────────────────────────────
log "Target:    ${SSH_TARGET}"
log "Remote:    ${REMOTE_DIR}"
log "Image:     ${IMAGE_NAME}"
log "Mode:      ${MODE}"

if ! ssh "${SSH_OPTS[@]}" -o ConnectTimeout=10 "${SSH_TARGET}" "echo ok" >/dev/null 2>&1; then
  err "Cannot reach ${SSH_TARGET}. Check SSH config and connectivity."
fi

# ─── deploy ────────────────────────────────────────────────
deploy() {
  log "Pulling latest code on remote..."
  remote_exec "cd ${REMOTE_DIR} && git pull --ff-only origin master"

  log "Building Docker image on remote..."
  remote_exec "cd ${REMOTE_DIR} && docker compose build --pull"

  log "Applying database migrations..."
  remote_exec "cd ${REMOTE_DIR} && docker compose run --rm app npx prisma migrate deploy"

  log "Restarting app..."
  remote_exec "cd ${REMOTE_DIR} && docker compose up -d"

  log "Waiting for health check..."
  sleep 10
  HEALTH=$(remote_exec "curl -fsS http://localhost:3000/api/health || echo FAILED")
  if [[ "$HEALTH" == *"FAILED"* ]]; then
    err "Health check failed. Rolling back automatically."
    rollback
  fi

  log "✅ Deployment complete!"
  log "   Health: ${HEALTH}"
}

# ─── rollback ──────────────────────────────────────────────
rollback() {
  log "Rolling back to previous commit..."
  remote_exec "cd ${REMOTE_DIR} && git log --oneline -5"
  PREVIOUS=$(remote_exec "cd ${REMOTE_DIR} && git rev-parse HEAD~1")
  log "Reverting to: ${PREVIOUS}"
  remote_exec "cd ${REMOTE_DIR} && git checkout ${PREVIOUS}"

  log "Rebuilding image..."
  remote_exec "cd ${REMOTE_DIR} && docker compose build"

  log "Restarting with previous image..."
  remote_exec "cd ${REMOTE_DIR} && docker compose up -d"

  sleep 10
  HEALTH=$(remote_exec "curl -fsS http://localhost:3000/api/health || echo FAILED")
  log "Post-rollback health: ${HEALTH}"
}

# ─── migrate-only ──────────────────────────────────────────
migrate_only() {
  log "Pulling latest code on remote..."
  remote_exec "cd ${REMOTE_DIR} && git pull --ff-only origin master"
  log "Applying database migrations (no app restart)..."
  remote_exec "cd ${REMOTE_DIR} && docker compose run --rm app npx prisma migrate deploy"
  log "✅ Migrations applied."
}

# ─── Dispatch ─────────────────────────────────────────────
case "$MODE" in
  deploy)        deploy ;;
  rollback)      rollback ;;
  migrate-only)  migrate_only ;;
  logs)          remote_exec "cd ${REMOTE_DIR} && docker compose logs -f app" ;;
  status)        remote_exec "cd ${REMOTE_DIR} && docker compose ps && echo '---' && docker images ${IMAGE_NAME} --format 'table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}'" ;;
  *)             err "Unknown mode: $MODE (expected: deploy | rollback | migrate-only | logs | status)" ;;
esac