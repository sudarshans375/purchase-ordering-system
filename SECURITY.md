# Security Policy

## Supported versions

| Version | Supported          |
|---------|--------------------|
| 1.x     | ✅ Active          |
| < 1.0   | ❌ EOL             |

## Reporting a vulnerability

**Please do not file a public issue.** Email `security@your-domain.com` (replace with your real address) with:

- A description of the vulnerability
- Steps to reproduce
- Impact assessment
- Suggested fix (if any)

We will acknowledge within 48 hours and provide a fix timeline within 7 days for critical issues.

## Security model

### What's in scope

- Authentication bypass (JWT tampering, session hijacking)
- Authorization flaws (unauthorized mutations)
- Injection (SQL, command, NoSQL)
- Cross-site request forgery (CSRF) on cookie-authenticated routes
- Rate-limit / brute-force on `/api/auth/login`
- Server-side request forgery (SSRF)
- Stock integrity bugs (the receive path)

### What's out of scope

- Denial of service (we use rate limiting; report high-volume abuse)
- UI/UX bugs that don't expose data

## Security features

- **Password storage**: bcrypt, cost 12.
- **Session**: JWT (HS256), 24h expiry, HttpOnly cookie, `SameSite=Lax`.
- **Login rate limit**: 5 attempts per IP per minute (Redis sliding window).
- **Receive rate limit**: per-PO, Redis-backed.
- **CSRF mitigation**: `SameSite=Lax` cookie + same-origin checks. We don't currently implement CSRF tokens — see [Contributing](CONTRIBUTING.md) if you need to extend.
- **Security headers**: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` (production only).
- **BigInt money**: no floating-point arithmetic on currency.
- **Row locks**: receive uses `SELECT FOR UPDATE` in Postgres to serialize concurrent attempts.
- **Immutable audit log**: `StockMovement` is append-only; `scripts/reconcile-stock.ts` detects drift.
- **Idempotency**: receive endpoint accepts `Idempotency-Key`; safe to retry.

## Operational

- Rotate `JWT_SECRET` periodically (every 90 days). Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"`.
- Database backups handled by Neon (managed) or your local Postgres backup strategy.
- Logs go to container stdout. Capture with `docker compose logs -f app`.
- Caddy handles TLS termination; cert auto-renewal via Let's Encrypt.

## Disclosure timeline

1. **Day 0**: Vulnerability reported privately.
2. **Day 1-2**: Acknowledge and triage.
3. **Day 3-7**: Develop and test fix.
4. **Day 8-14**: Coordinate disclosure with reporter; release fix.
5. **Day 14+**: Public disclosure (CVE / advisory if warranted).

## Recognition

We maintain a [Hall of Fame](SECURITY_HALL_OF_FAME.md) for reporters who follow responsible disclosure. (Placeholder — add to as needed.)