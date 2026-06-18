#!/bin/sh
# scripts/start.sh — Container entrypoint (POSIX sh, works on Alpine).
# Runs Prisma migrations + admin init on every start, then launches Next.js.
# Idempotent — safe to run repeatedly.

set -e

echo "==========================================="
echo "  Purchase Ordering System - startup"
echo "==========================================="

# Apply pending migrations (idempotent).
echo ""
echo "-> Applying Prisma migrations..."
npx prisma migrate deploy

# Create the initial admin user if no users exist (idempotent - non-destructive).
echo ""
echo "-> Ensuring admin user exists..."
npx tsx scripts/init-user.ts || echo "  (init-user skipped or failed - continuing)"

echo ""
echo "-> Starting Next.js..."
exec node server.js