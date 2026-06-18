# DEPLOY.md — Production Deployment Guide

> Target: Azure VM (20.193.148.140) · Ubuntu · Docker Compose · Caddy · SSL

This guide covers deploying the Purchase Ordering System to a production Azure VM with Docker, Caddy reverse proxy, and SSL certificates.

## Architecture

```
Internet → Caddy (443) → Next.js App (3000) → Neon PostgreSQL
                                           → Upstash Redis
```

- **Caddy** handles HTTPS termination and reverse proxying
- **Next.js** runs as a Docker container
- **Neon PostgreSQL** is the managed database
- **Upstash Redis** is the managed cache

## Prerequisites

- Azure VM with Ubuntu 22.04+
- SSH access to the VM
- Docker and Docker Compose installed
- Domain name pointing to the VM IP (optional)
- Neon PostgreSQL connection string
- Upstash Redis connection string

## Server Setup

### 1. Initial Server Configuration

```bash
# SSH into the VM
ssh azureuser@20.193.148.140

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Logout and back in for group changes
exit

# Verify
ssh azureuser@20.193.148.140
docker --version
docker compose version
```

### 2. Create Application Directory

```bash
sudo mkdir -p /opt/purchase-ordering
sudo chown $USER:$USER /opt/purchase-ordering
cd /opt/purchase-ordering
```

### 3. Install Caddy

```bash
sudo apt install debian-keyring debian-archive-keyring -y
sudo curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy -y
```

### 4. Configure Caddy

Create `/etc/caddy/Caddyfile`:

```caddy
purchase-ordering.example.com {
    reverse_proxy localhost:3000

    # Security headers
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        X-XSS-Protection "1; mode=block"
        Referrer-Policy strict-origin-when-cross-origin
    }

    # Compression
    encode gzip

    # Logs
    log {
        output file /var/log/caddy/purchase-ordering.log
    }
}
```

For IP-only access:

```caddy
20.193.148.140 {
    reverse_proxy localhost:3000

    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
    }

    encode gzip
}
```

Restart Caddy:

```bash
sudo systemctl restart caddy
```

### 5. Configure Environment

```bash
cd /opt/purchase-ordering
cat > .env << 'EOF'
DATABASE_URL=postgresql://neondb_owner:npg_9B2ntHoChUFe@ep-cool-butterfly-at2lking-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require
REDIS_URL=redis://default:gQAAAAAAAfkrAAIgcDE3NjBhYmMyNWU4YTg0NTE5YTA1MzI4YWQyNmU0MTM4Yg@neutral-moose-129323.upstash.io:6379
NODE_ENV=production
APP_URL=https://purchase-ordering.example.com
NEXT_PUBLIC_APP_URL=https://purchase-ordering.example.com
PORT=3000
EOF

# Protect secrets
chmod 600 .env
```

### 6. Deploy the Application

```bash
cd /opt/purchase-ordering

# Clone the repository
git clone https://github.com/sudarshans375/purchase-ordering-system.git .
# OR copy from local machine:
# scp -r . azureuser@20.193.148.140:/opt/purchase-ordering/

# Start the application
docker compose up -d

# Check status
docker compose ps
docker compose logs -f
```

## Deployment Commands

### Initial Deploy

```bash
ssh azureuser@20.193.148.140
cd /opt/purchase-ordering
git pull origin main
docker compose build
docker compose down
docker compose up -d
```

### Update Deployment

```bash
# From local machine
bash scripts/deploy.sh
```

### Run Migrations

```bash
docker compose run --rm app npx prisma migrate deploy
```

### View Logs

```bash
docker compose logs -f app
```

### Restart

```bash
docker compose restart app
```

### Stop

```bash
docker compose down
```

### Full Reset

```bash
docker compose down --volumes
docker compose up -d
docker compose run --rm app npx prisma migrate deploy
docker compose run --rm app npm run db:seed
```

## Rollback

```bash
# Revert to previous commit
cd /opt/purchase-ordering
git log --oneline -5
git checkout <previous-commit-hash>
docker compose build
docker compose down
docker compose up -d

# Verify
curl -s http://localhost:3000/api/health
```

## Monitoring

### Health Check

```bash
# Application health
curl -s http://localhost:3000/api/health

# Database connectivity
curl -s http://localhost:3000/api/health | jq
```

### Logs

```bash
# Application logs
docker compose logs -f app

# Caddy access logs
sudo tail -f /var/log/caddy/purchase-ordering.log
```

### Backups

Database backups are handled by Neon PostgreSQL (automatic daily backups with point-in-time recovery).

## SSL Certificates

Caddy automatically provisions and renews SSL certificates via Let's Encrypt. No manual intervention required.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `NODE_ENV` | Environment (production) | Yes |
| `APP_URL` | Application URL | Yes |
| `NEXT_PUBLIC_APP_URL` | Public-facing URL | Yes |
| `PORT` | Internal port (3000) | Yes |

## Troubleshooting

### Application won't start

```bash
# Check logs
docker compose logs app

# Verify database connection
docker compose run --rm app npx prisma db push --accept-data-loss

# Check environment variables
docker compose run --rm app env | grep -E "DATABASE|REDIS"
```

### Database connection failed

```bash
# Test connection directly
docker compose run --rm app npx prisma db execute --stdin <<< "SELECT 1;"

# Verify DATABASE_URL is correct
docker compose run --rm app env | grep DATABASE_URL
```

### HTTPS not working

```bash
# Check Caddy status
sudo systemctl status caddy

# View Caddy logs
sudo journalctl -u caddy -f

# Verify Caddyfile syntax
sudo caddy validate /etc/caddy/Caddyfile
```

## Releases

### Creating a Release

```bash
# Tag the release
git tag -a v1.0.0 -m "v1.0.0 - Initial release"
git push origin v1.0.0
```

### Release Checklist

- [ ] All tests pass
- [ ] TypeScript compilation succeeds
- [ ] Docker build succeeds
- [ ] Database migrations applied
- [ ] Seed data verified
- [ ] Health check passes
- [ ] SSL certificate valid
- [ ] Backups configured
- [ ] Monitoring in place

## Security Notes

1. Never commit `.env` files to version control
2. Use strong, unique passwords for all services
3. Regularly rotate database credentials
4. Keep Docker and system packages updated
5. Monitor application logs for suspicious activity
6. Use Caddy's built-in rate limiting for production
