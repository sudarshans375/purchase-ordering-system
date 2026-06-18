#!/bin/sh
# scripts/start.sh — Production entrypoint
# Author: Sudarshan Sonawane

set -e

echo "⏳ Running database migrations..."
npx prisma migrate deploy
echo "✅ Migrations applied"

echo "🚀 Starting application..."
exec node server.js
