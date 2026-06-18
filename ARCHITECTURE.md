# Architecture

## Overview

A lightweight purchase ordering module for small businesses. Suppliers → Products → Purchase Orders → Stock. The interesting parts are the edges (idempotency, concurrency, snapshot pricing), not the CRUD.

## Request flow

```
Browser
  │  fetch('/api/...')
  ▼
Next.js middleware (src/middleware.ts)
  │  verifies JWT cookie, sets req.userId
  ▼
Route handler (src/app/api/.../route.ts)
  │  Zod-validated input
  ▼
Service (src/services/*.ts)
  │  orchestration + transactions
  ▼
Repository (src/repositories/*.ts)
  │  Prisma queries (accept tx)
  ▼
Postgres (source of truth)
  ▲
  │  Redis (cache + rate limit + idempotency fast-path)
```

## Layered design

### Routes (`src/app/api/`)
Thin. Parse input with Zod → call service → shape response. No business logic.

### Services (`src/services/`)
Orchestrate: open `prisma.$transaction`, call domain functions, call repositories, invalidate caches.

### Repositories (`src/repositories/`)
Prisma data access. Accept an optional `tx` parameter so they run inside an enclosing transaction.

### Domain (`src/domain/`)
Pure functions. No imports from Prisma, Redis, or Next.js. 100% unit-testable.
- `po-state.ts` — state machine: `assertCanTransition(from, to)`
- `stock.ts` — stock math: `assertValidStockMovement`, `getStockDelta`
- `pricing.ts` — money math: `calculateLineTotalCents`, `validateQuantity`

## Key design decisions

### 1. Snapshot pricing on PO line items
**`POLineItem.unitPriceCents` is copied from `SupplierProduct.currentPriceCents` at line-add time and never mutated.** The total reflects what was agreed, not the supplier's current price. See `PLAN.md §3`.

### 2. Hybrid stock model
`Product.currentStock` is a stored column kept in sync with `StockMovement` (immutable event log) inside one transaction. Drift detected by `scripts/reconcile-stock.ts`. See `PLAN.md §4`.

### 3. Idempotent + atomic receive
`POST /api/pos/:id/receive` requires `Idempotency-Key`. Inside a single Postgres transaction:
1. `SELECT FOR UPDATE` locks the PO row
2. State machine check (must be PLACED)
3. Insert StockMovement rows (one per line item, sharing one idempotency key)
4. Update Product.currentStock
5. Update PO status to RECEIVED
6. Insert ReceiveIdempotency row

Retries with the same key get the byte-equal original response. Retries with different keys return 409. See `PLAN.md §5`.

### 4. Pure-function state machine
`assertCanTransition(from, to)` in `src/domain/po-state.ts`. Routes never set `status` directly. See `PLAN.md §6`.

### 5. Redis = convenience, not correctness
- Idempotency-key cache (fast path)
- Per-PO rate limit on receive
- Login rate limit (5/min/IP)
- List caching for read-heavy endpoints

If Redis is down, the system stays correct (just slower / unprotected). Postgres is the source of truth.

## Data model

```
Supplier ──┬── SupplierProduct ──┬── Product
           │                     │
           └── PurchaseOrder     └── POLineItem ─── PurchaseOrder
                    │
                    └── StockMovement ── Product
                    
PurchaseOrder ──── ReceiveIdempotency
User (auth)
```

Schema in `prisma/schema.prisma`. Money as `BigInt` cents throughout.

## Caching strategy

| Cache | Key | TTL | Invalidated on |
|-------|-----|-----|----------------|
| Idempotency body | `idempotency:{key}` | 24h | Receive success |
| Receive rate limit | `ratelimit:receive:{poId}` | 60s | Expires |
| Login rate limit | `ratelimit:login:{ip}` | 60s | Expires |
| Supplier list | `list:suppliers` | 60s | Supplier create/update/delete |
| Product list | `list:products` | 60s | Product create/update/delete |
| PO list | `list:pos` | 60s | PO create/update/receive/cancel |

Redis is graceful-degraded: if unavailable, all endpoints still work without caching.

## Testing strategy

```
Unit (no I/O):         tests/domain/*.test.ts
Integration (DB):      tests/integration/*.test.ts
E2E (browser):         tests/e2e/*.spec.ts
Drift detector:        scripts/reconcile-stock.ts
```

## Deployment

See [DEPLOY.md](DEPLOY.md). Caddy + Docker Compose on an Azure VM, or any platform with HTTPS termination + Docker support.

## Security

See [SECURITY.md](SECURITY.md). Login rate-limited, JWT-based sessions, security headers via next.config.ts + Caddy, BigInt money throughout (no float).

## Open questions / future work

Documented in `PLAN.md §9`:
- Partial receipts (`PARTIALLY_RECEIVED` state)
- Multi-currency
- Supplier portal
- Background stock-reconciliation cron
- Email/Slack notifications
- Real-time updates (WebSocket / SSE)