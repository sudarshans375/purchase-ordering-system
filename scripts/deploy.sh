#!/bin/bash
# scripts/deploy.sh — Production deployment script
# Author: Sudarshan Sonawane
#
# Usage: bash scripts/deploy.sh
#
# Prerequisites:
#   - SSH access to the Azure VM
#   - Docker and Docker Compose installed on the VM
#   - Environment variables configured on the VM

set -e

echo "================================================"
echo "  Purchase Ordering System - Deployment"
echo "================================================"

# ─── Configuration ─────────────────────────────────
AZURE_VM="20.193.148.140"
AZURE_USER="azureuser"
REMOTE_DIR="/opt/purchase-ordering"

echo ""
echo "📦 Building Docker image locally..."
docker compose build

echo ""
echo "💾 Saving image..."
docker save purchase-ordering-app:latest -o /tmp/po-app.tar

echo ""
echo "🔄 Copying to server..."
scp /tmp/po-app.tar ${AZURE_USER}@${AZURE_VM}:${REMOTE_DIR}/po-app.tar
scp docker-compose.yml ${AZURE_USER}@${AZURE_VM}:${REMOTE_DIR}/docker-compose.yml
scp .env.production ${AZURE_USER}@${AZURE_VM}:${REMOTE_DIR}/.env

echo ""
echo "🚀 Deploying on server..."
ssh ${AZURE_USER}@${AZURE_VM} << 'EOF'
  cd /opt/purchase-ordering

  # Load the image
  docker load -i po-app.tar

  # Apply migrations
  docker compose run --rm app npx prisma migrate deploy

  # Restart the app
  docker compose down
  docker compose up -d

  # Wait and verify
  sleep 15
  echo ""
  echo "✅ Health check:"
  curl -s http://localhost:3000/api/health

  # Cleanup
  rm -f po-app.tar
EOF

echo ""
echo "================================================"
echo "  ✅ Deployment complete!"
echo "  🌐 https://purchase-ordering.example.com"
echo "================================================"
