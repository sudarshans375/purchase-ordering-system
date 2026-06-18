#!/bin/sh
# scripts/start.sh — Production entrypoint
# Author: Sudarshan Sonawane
#
# Runs migrations on every start (idempotent).
# Creates default admin user if missing (never wipes data).

set -e

echo "⏳ Running database migrations..."
npx prisma migrate deploy
echo "✅ Migrations applied"

echo "👤 Checking admin user..."
npx tsx scripts/init-user.ts

echo "🚀 Starting application..."
exec node server.js
