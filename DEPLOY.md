# DEPLOY.md — Production Deployment Guide

> Target: Azure VM (20.193.148.140) · Ubuntu 22.04 · Docker Compose · Caddy · Let's Encrypt SSL
> Author: Sudarshan Sonawane

This guide covers deploying the Purchase Ordering System to a production Azure VM with Docker, Caddy reverse proxy, and Let's Encrypt SSL.

---

## 1. Architecture

```
Internet → Caddy (443) → Next.js App (3000) → Postgres (managed or local)
                                          → Redis (managed or local)
```

- **Caddy** handles HTTPS termination and reverse proxy.
- **Next.js** runs as a Docker container (Next standalone output).
- **Postgres + Redis** can be managed (Neon + Upstash) or run locally via docker-compose.

---

## 2. Prerequisites

- Azure VM with Ubuntu 22.04+
- SSH access to the VM
- Docker + Docker Compose installed on the VM
- A domain name pointing to the VM IP (for Caddy auto-TLS) OR an IP-only deployment
- All environment variables from `.env` (see §6 below)

---

## 3. Server Setup

### 3.1 Initial server configuration

```bash
ssh azureuser@20.193.148.140

sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Logout / log back in for group changes
exit
ssh azureuser@20.193.148.140
docker --version
docker compose version
```

### 3.2 Create app directory

```bash
sudo mkdir -p /opt/purchase-ordering
sudo chown $USER:$USER /opt/purchase-ordering
cd /opt/purchase-ordering
```

### 3.3 Install Caddy (reverse proxy + auto-TLS)

```bash
sudo apt install debian-keyring debian-archive-keyring -y
sudo curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy -y
```

### 3.4 Configure Caddy

The repo includes a [`Caddyfile`](../Caddyfile). Copy it to the VM:

```bash
scp Caddyfile azureuser@20.193.148.140:/tmp/Caddyfile
ssh azureuser@20.193.148.140 "sudo mv /tmp/Caddyfile /etc/caddy/Caddyfile"
```

Edit `/etc/caddy/Caddyfile` on the VM to replace `purchase-ordering.example.com` with your real domain.

```bash
sudo systemctl restart caddy
```

Caddy auto-issues and renews Let's Encrypt certificates.

---

## 4. Configure Environment

Create `.env` on the VM (NOT in git):

```bash
cd /opt/purchase-ordering
cat > .env << 'EOF'
NODE_ENV=production
APP_URL=https://purchase-ordering.example.com
NEXT_PUBLIC_APP_URL=https://purchase-ordering.example.com
PORT=3000

DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
REDIS_URL=redis://default:pass@host:6379

JWT_SECRET=<paste-48-byte-base64-string>
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<strong-password>
EOF

chmod 600 .env
```

Generate a JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

---

## 5. Deploy

### 5.1 First deploy

On your **local machine** (where you have git + ssh-key configured):

```bash
git clone https://github.com/sudarshans375/purchase-ordering-system.git
cd purchase-ordering-system

# Run the deploy script (mode = deploy is the default)
AZURE_VM=20.193.148.140 \
AZURE_USER=azureuser \
SSH_KEY_PATH=$HOME/.ssh/<your-key> \
bash scripts/deploy.sh deploy
```

This will:

1. SSH to the VM
2. `git pull` the latest code
3. `docker compose build` (with `--pull` to refresh base images)
4. `prisma migrate deploy` (idempotent)
5. `docker compose up -d`
6. Curl `/api/health` — **on failure, auto-rollback to previous commit**

### 5.2 Update deploy

Same as first deploy — just run the script again. The remote pulls, rebuilds, and restarts.

### 5.3 Rollback

```bash
bash scripts/deploy.sh rollback
```

This reverts to `HEAD~1` (the previous commit), rebuilds, and restarts.

### 5.4 Migrations only (no restart)

```bash
bash scripts/deploy.sh migrate-only
```

Useful when a migration lands before the corresponding code change.

### 5.5 View logs

```bash
bash scripts/deploy.sh logs
```

### 5.6 Status

```bash
bash scripts/deploy.sh status
```

Shows running containers and locally-cached image tags.

---

## 6. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes (prod) | Postgres connection string |
| `REDIS_URL` | Yes (prod) | Redis connection string |
| `JWT_SECRET` | Yes (prod) | At least 32 chars. `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |
| `ADMIN_EMAIL` | Yes (prod) | Initial admin email |
| `ADMIN_PASSWORD` | No | If unset, a random password is generated and printed ONCE on first boot. Set in production. |
| `NODE_ENV` | No | Default `development`. Set to `production` for prod. |
| `APP_URL` | No | Server-side app URL |
| `NEXT_PUBLIC_APP_URL` | No | Public-facing URL (browser-exposed) |
| `PORT` | No | Default `3000` |
| `NEXT_PUBLIC_DEMO_MODE` | No | Default `false`. When `true`, login page pre-fills demo credentials. **Dev only — do not enable in production.** |

The app **refuses to start** in production if `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, or `ADMIN_EMAIL` is missing.

---

## 7. Backup & Restore

### Postgres (Neon — managed)

Neon handles automatic daily backups with point-in-time recovery (up to 7 days on the free plan, longer on paid plans). No action required from you.

### Postgres (local docker-compose)

Add a `postgres_backup` sidecar that runs `pg_dump` to S3/Azure Blob on a cron. Out of scope for this guide — left as an exercise.

### Redis (Upstash — managed)

Upstash handles replication and persistence. Local Redis is ephemeral; treat its contents as a cache that can be lost.

---

## 8. Smoke Tests (after every deploy)

```bash
# Health
curl -fsS https://purchase-ordering.example.com/api/health

# Low stock (sanity check on DB connection + data)
curl -fsS https://purchase-ordering.example.com/api/products/low-stock \
  -H "Cookie: session=$YOUR_SESSION_COOKIE"

# Login
curl -fsS https://purchase-ordering.example.com/api/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"..."}'
```

---

## 9. Release Checklist

- [ ] All tests pass (`npm test`)
- [ ] TypeScript clean (`npm run typecheck`)
- [ ] Production build succeeds (`npm run build`)
- [ ] `.env` on VM has all required vars + new `JWT_SECRET` if rotating
- [ ] Migrations committed to repo (`prisma/migrations/`)
- [ ] `git log` shows atomic commits with clear messages
- [ ] Smoke test `/api/health` after deploy
- [ ] Caddy still serves TLS (test `https://...`)
- [ ] Old Docker images pruned on VM (`docker image prune -f`)

---

## 10. Security Notes

1. **Never commit `.env`** — gitignored. Rotation: regenerate `JWT_SECRET`, redeploy.
2. **Login rate-limited** to 5 attempts per IP per minute (Redis sliding window).
3. **Receive rate-limited** per PO via Redis.
4. **HSTS** sent in production. Caddy handles the actual TLS.
5. **CSRF:** not implemented. The cookie is `SameSite=Lax`, which mitigates most CSRF for cross-site requests. If exposing sensitive state-changing endpoints to third-party origins, add CSRF tokens.
6. **Bcrypt cost 12** for password hashing.
7. **JWT expiry** 24h.
8. **Row-level locks** (`SELECT FOR UPDATE`) on PO receive — serializes concurrent receives in Postgres, no race conditions.
9. **BigInt money** throughout — no floating-point arithmetic.
10. **Audit trail:** `StockMovement` is immutable + append-only. Drift detection: `npx tsx scripts/reconcile-stock.ts` (added in Phase 4).

---

## 11. Troubleshooting

### App won't start

```bash
ssh -i key.pem azureuser@20.193.148.140
cd /opt/purchase-ordering
docker compose logs app
```

Common causes: missing env vars, wrong DB URL, expired cert.

### Health check returns 503

```bash
docker compose exec app npx prisma db execute --stdin <<< "SELECT 1;"
```

DB unreachable. Check `DATABASE_URL` and network.

### HTTPS not working

```bash
sudo systemctl status caddy
sudo journalctl -u caddy -n 50
sudo caddy validate --config /etc/caddy/Caddyfile
```

### Receive endpoint always returns 409

This is the **idempotency cache hit** — the second call with the same `Idempotency-Key` returns the cached response (status 200) or 409 if the PO was received by a different key. This is **correct behaviour** — see `PLAN.md §5`.

---

## 12. Local Development (no cloud)

For local dev without cloud services, use the bundled docker-compose which spins up Postgres + Redis + app on `localhost:3000`:

```bash
cp .env.example .env
# Edit .env: set JWT_SECRET to a 48-byte base64 string.
docker compose up -d
docker compose exec app npx prisma migrate deploy
docker compose exec app npx tsx prisma/seed.ts
```

Open http://localhost:3000.