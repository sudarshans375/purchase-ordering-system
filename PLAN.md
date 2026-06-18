# PLAN.md — Purchase Ordering Module

> **Stack:** Next.js 16 · TypeScript (strict) · Prisma 6 · PostgreSQL · Redis (ioredis) · Zod · @tanstack/react-query · Tailwind v4 + Radix · Docker
> **Timebox:** 3 days · **Author:** Sudarshan · **Status:** Written first, before any code.

---

## TL;DR (the one-page version)

A lightweight Purchase Ordering module: suppliers + their products (with prices), POs with line items, `DRAFT → PLACED → RECEIVED` lifecycle (plus `CANCELLED`), automatic stock update on receipt, and a low-stock view. The interesting parts are the edges: **(1)** line-item prices are snapshotted at line-add time, never live; **(2)** stock is a hybrid — a stored `Product.currentStock` column kept in sync with an immutable `StockMovement` event log inside one transaction; **(3)** the receive endpoint is idempotent via a unique constraint on `(purchaseOrderId, idempotencyKey)` and atomic via a Postgres `SELECT FOR UPDATE` row lock — no Redis distributed lock; **(4)** the PO state machine is a pure function `assertCanTransition(from, to)` called by every transition, routes never set `status` directly; **(5)** Redis earns its place for idempotency-key caching, per-PO rate limiting on receive, and supplier/product list caching — not for correctness. The receive path with its concurrency test is the Day 1 deliverable; everything else is additive. Out of scope: auth, multi-currency, partial receipts, supplier portal, notifications, dashboards, mobile polish, GraphQL.

---

## 1. Brief restatement & approach

The task is a lightweight PO module for a small business. A manager maintains suppliers and the products each supplier sells (with prices), raises purchase orders against a supplier, moves a PO through `draft → placed → received` (with cancellation where it makes sense), has stock update automatically on receipt, and can see which products are below their reorder level. That is the entire functional surface.

The brief is explicit about what is actually being graded: **not the CRUD**, but the edges. What happens if a PO is received twice? What if two operators hit receive at the same instant? Where does a line item's price come from when the supplier's price changes tomorrow? Those questions are the real task. I am treating them as the spine of the design, not as afterthoughts.

My approach is **domain-first**. Business rules — state transitions, stock math, price snapshotting — live in plain, pure, fully unit-testable TypeScript functions in `src/domain/`. Route handlers in `src/app/api/` stay thin: parse with Zod, call the domain layer inside a transaction, shape the response. Nothing business-critical lives in a route handler. This is the only way the edge cases stay auditable; if a teammate wants to know "can a PLACED PO go back to DRAFT?", the answer is one function lookup, not a grep across route files.

**Five principles** govern every decision below:

1. **Thin routes, fat domain** — business logic in pure functions.
2. **Transactions around every state change with a side-effect** — receiving a PO updates status, inserts stock movements, and increments balances in one atomic unit.
3. **Idempotency at the boundary** — the receive endpoint accepts an idempotency key and is safe to retry.
4. **Money is integers, always** — every monetary value is a `BigInt` of minor units (cents), never a float, never a decimal.
5. **Postgres is the source of truth, Redis is a convenience** — nothing correctness-critical depends on Redis being available.

---

## 2. Data model — Prisma schema + ER diagram

Seven tables. The two non-obvious choices are (a) **`SupplierProduct`** as a real M:N join table rather than a `Product.supplierId` column, because the same physical product can be sourced from multiple suppliers at different prices, and (b) a separate **`StockMovement`** table as an immutable event log alongside the stored `Product.currentStock` — this is the hybrid approach defended in §4.

Money is modeled as `BigInt` in minor units everywhere (`currentPriceCents`, `unitPriceCents`, `lineTotalCents`, `totalCents`). Prisma 6 supports `BigInt` natively against Postgres `bigint` columns. I am not using `Decimal` because the brief says "integers, never floats" and `Decimal` in TS is a footgun (it's an object, not a primitive, and arithmetic on it is verbose). Integer cents are trivially correct to add, subtract, and compare.

```prisma
// prisma/schema.prisma — enums + Supplier + Product + SupplierProduct

enum PoStatus       { DRAFT PLACED RECEIVED CANCELLED }
enum MovementReason { RECEIVE_PO CANCEL_PO ADJUSTMENT_INITIAL }

model Supplier {
  id        String   @id @default(cuid())
  name      String
  email     String?
  products  SupplierProduct[]
  pos       PurchaseOrder[]
  createdAt DateTime @default(now())
}

model Product {
  id            String   @id @default(cuid())
  sku           String   @unique
  name          String
  currentStock  Int      // stored, fast-read. See §4.
  reorderLevel  Int      // below this => low-stock alert
  suppliers     SupplierProduct[]
  lineItems     POLineItem[]
  movements     StockMovement[]
  updatedAt     DateTime @updatedAt
}

// M:N join — same product from multiple suppliers at different prices
model SupplierProduct {
  supplierId          String
  productId           String
  supplier            Supplier @relation(fields: [supplierId], references: [id])
  product             Product  @relation(fields: [productId],  references: [id])
  supplierSku         String?
  currentPriceCents   BigInt   // live price, mutates over time
  leadTimeDays        Int?
  createdAt           DateTime @default(now())
  @@id([supplierId, productId])
  @@unique([supplierId, supplierSku])   // supplier's own SKU must be unique
}
```

```prisma
// prisma/schema.prisma — PurchaseOrder + POLineItem (snapshot price)

model PurchaseOrder {
  id            String   @id @default(cuid())
  poNumber      String   @unique          // human-readable, e.g. PO-2025-0042
  supplierId    String
  supplier      Supplier @relation(fields: [supplierId], references: [id])
  status        PoStatus @default(DRAFT)
  totalCents    BigInt   @default(0)      // snapshot, sum of line totals
  placedAt      DateTime?
  receivedAt    DateTime?
  cancelledAt   DateTime?
  lineItems     POLineItem[]
  movements     StockMovement[]
  idempotency   ReceiveIdempotency[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model POLineItem {
  id                String   @id @default(cuid())
  purchaseOrderId   String
  purchaseOrder     PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])
  productId         String
  product           Product  @relation(fields: [productId], references: [id])
  quantity          Int
  unitPriceCents    BigInt   // SNAPSHOT — see §3. Set once at line-add.
  lineTotalCents    BigInt   // quantity * unitPriceCents, denormalised for reads
  priceSnapshotAt   DateTime @default(now())
  @@unique([purchaseOrderId, productId])  // one line per product per PO
}
```

```prisma
// prisma/schema.prisma — StockMovement (immutable log) + ReceiveIdempotency

// Immutable event log — append-only. Source of truth for stock reconciliation.
model StockMovement {
  id               String   @id @default(cuid())
  productId        String
  product          Product  @relation(fields: [productId], references: [id])
  purchaseOrderId  String?
  purchaseOrder    PurchaseOrder? @relation(fields: [purchaseOrderId], references: [id])
  delta            Int      // signed: +N for receive, -N for cancel
  balanceAfter     Int      // Product.currentStock AFTER this movement
  reason           MovementReason
  idempotencyKey   String? @unique   // null for non-receive movements
  createdAt        DateTime @default(now())
  @@index([productId, createdAt])
  @@index([purchaseOrderId])
}

// Idempotency cache (DB-backed). Redis is the fast path; this is the truth.
model ReceiveIdempotency {
  key              String   @id        // client-supplied Idempotency-Key header
  purchaseOrderId  String
  purchaseOrder    PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])
  responseHash     String              // hash of the response body we returned
  status           Int                 // HTTP status we returned (200 or 409)
  createdAt        DateTime @default(now())
  @@index([purchaseOrderId])
}
```

An ER diagram visualising the same schema is at `download/er-diagram.png`. Note the `SNAP` marker on `POLineItem.unitPriceCents` — that column is written once at line creation and never mutated, even if `SupplierProduct.currentPriceCents` changes later.

---

## 3. Decision Point 1 — Line-item price: snapshot, not live

**Decision:** a PO line item stores a *snapshot* of the supplier's price at the moment the line is added. `POLineItem.unitPriceCents` is copied from `SupplierProduct.currentPriceCents` when the line is created, and never mutated afterwards — not when the PO is placed, not when it is received, not when the supplier changes their price next week.

**Why.** A purchase order is a historical record of an agreement between two parties: "on Tuesday, we agreed to buy 50 units at $1.20 each." If the supplier raises their price to $1.40 on Wednesday and our PO total silently recomputes, we have lost the audit trail of what was actually agreed. Finance reconciliation, tax filing, and dispute resolution all depend on the PO total being stable from the moment the line was added.

**Consequences I accept.**

1. The line-item create path has to look up the current supplier price and copy it — a trivial extra read inside the line-add transaction.
2. Existing POs do not reflect supplier price changes; if a manager wants to renegotiate, they cancel the DRAFT PO and start a new one (or, post-MVP, edit the line which re-snapshots — explicitly, never silently).
3. The UI should show both the snapshot price and the supplier's current price on a draft PO, so the manager sees drift before placing.
4. `POLineItem.lineTotalCents` and `PurchaseOrder.totalCents` are also snapshots, computed by summing line totals — never recomputed from live supplier prices.

**Alternatives considered — and rejected.**

- **(a) Live join:** compute the PO total as `SUM(quantity * SupplierProduct.currentPriceCents)` at read time. *Rejected:* total drifts when supplier prices change, breaking audit.
- **(b) Periodic re-snapshot:** nightly job updates `POLineItem` prices from supplier prices. *Rejected:* confuses everyone — the line shows $1.20 in the morning and $1.40 after lunch with no user action.
- **(c) Hybrid:** snapshot for placed/received POs, live for drafts. *Rejected:* the total visibly changes when the PO is placed, which feels broken.

Snapshot-on-add is the only model that is internally consistent.

---

## 4. Decision Point 2 — Stock: hybrid (stored column + movement log)

**Decision:** current stock is a stored column (`Product.currentStock`) updated inside the same transaction as the corresponding `StockMovement` insert. The `StockMovement` table is an immutable, append-only event log that records every change with its reason, signed delta, and resulting balance. Either one can be used to reconstruct the other; they are kept in sync by the domain layer.

**Why hybrid, not pure-derived.** Deriving stock on every read as `SUM(delta) FROM StockMovement WHERE productId = ?` is appealingly simple — one source of truth, no drift possible — but it walks an unbounded index on every product list view. For a small business that is fine; for any future scale it is not, and the refactor is painful. Worse, the "low stock" query becomes a join-and-aggregate over the entire movements table for every product. Reads should be O(1).

**Why hybrid, not pure-stored.** A single stored column with no log is the fastest possible read, but it has no audit trail. If `currentStock` is somehow wrong (a bug, a manual DB edit, a partial transaction commit), there is no way to reconstruct what happened. Stock is the kind of number where "why is this 47 and not 52?" gets asked eventually — usually by an auditor — and the answer needs to exist.

**The hybrid contract.** Every stock change is two writes in one transaction: insert a `StockMovement` with the signed delta and the new balance, then set `Product.currentStock` to that same balance. If the transaction commits, both are durable; if it rolls back, neither is. The domain function `applyStockMovement(productId, delta, reason, tx)` is the *only* path that touches stock — route handlers call it, never write to `currentStock` directly.

**Drift detection — the cheap insurance policy.** A nightly reconciliation job (out of scope for the 3-day build but designed for) runs `SELECT productId, SUM(delta) FROM StockMovement GROUP BY productId` and compares against `Product.currentStock`. Any mismatch raises an alert. This is the only way the hybrid model can ever silently drift, and the job makes drift visible within 24 hours. The job itself is trivial — 20 lines of SQL — but its existence is what makes the hybrid defensible vs. pure-derived.

---

## 5. Decision Point 3 — Receiving: idempotent + atomic

**Decision.** The receive endpoint is `POST /api/pos/:id/receive` with a required `Idempotency-Key` header. The handler executes inside a single Postgres transaction that:

1. Locks the PO row with `SELECT FOR UPDATE`.
2. Asserts the PO is in `PLACED` status.
3. Inserts one `StockMovement` per line item with the unique `(purchaseOrderId, idempotencyKey)` constraint enforced by `ON CONFLICT DO NOTHING`.
4. Increments `Product.currentStock` for each product.
5. Sets the PO status to `RECEIVED` with `receivedAt = now()`.
6. Inserts a `ReceiveIdempotency` row recording the response.

All six steps commit atomically or none do.

**Idempotency mechanics.** The client sends a UUID in the `Idempotency-Key` header. The unique constraint on `StockMovement.idempotencyKey` means a second call with the same key cannot insert duplicate movements — `ON CONFLICT DO NOTHING` makes the second insert a no-op. After the conflict, the handler reads the existing `ReceiveIdempotency` row for that key and returns the cached response (same status code, same body). From the client's perspective, the second call is indistinguishable from the first.

**Concurrency: two operators, same PO, same instant.** Both requests arrive. The first one to acquire the `SELECT FOR UPDATE` lock on the PO row proceeds; the second blocks. When the first commits, the PO is now `RECEIVED` and the `ReceiveIdempotency` row exists (assuming the second request used the same key) or doesn't (different key). Either way: the second request acquires the lock, re-reads the PO, sees `RECEIVED`, and either returns the cached response (same key) or returns `409 Conflict` with `PO_ALREADY_RECEIVED` (different key). **No double stock increment is possible** — the row lock serializes the two requests against the same PO.

**Why not a Redis distributed lock?** A Redis lock (e.g. `SET po:{id} NX EX 30`) is the textbook answer to "don't receive the same PO twice". I am **not** using it as the primary correctness mechanism, for two reasons. (1) Postgres row locks are strictly stronger here: they serialize at the data itself, so they cannot be bypassed by a stale Redis key, a Redis failover, or a client that talks to Postgres directly. (2) Adding Redis to the correctness path means Redis availability is now a correctness requirement, not just a performance one — a Redis outage should not let stock go wrong. Redis still earns its place in this design (see §7) for caching and rate-limiting, but *not* for the receive lock.

**Partial receipt** is out of scope for this build — the receive endpoint marks the whole PO as received and increments stock for all line items. Partial receipt (receive 30 of 50 units, receive the remaining 20 later) is a real-world need but adds a `PARTIALLY_RECEIVED` state and per-line-item receipt tracking. Documented in §9; cut for the 3-day timebox per the "scope down, not quality down" rule.

---

## 6. Decision Point 4 — State machine: pure function, no direct mutation

**Decision.** PO status is a Prisma enum (`DRAFT | PLACED | RECEIVED | CANCELLED`) with the legal transitions encoded in a pure function `assertCanTransition(from, to)` in `src/domain/po-state.ts`. Routes never set `status` directly. Each transition has a dedicated domain function (`placePo`, `receivePo`, `cancelPo`) that asserts the transition is legal, applies it, and performs any side-effects — all inside one transaction.

**Legal transitions.**

| From | To | Trigger |
|------|----|---------|
| DRAFT | PLACED | `placePo()` — locks lines |
| DRAFT | CANCELLED | `cancelPo()` — no stock effect |
| PLACED | RECEIVED | `receivePo()` — increments stock atomically |
| PLACED | CANCELLED | `cancelPo()` — no stock effect (was never received) |

**Illegal (rejected with 409):** `PLACED → DRAFT`, `RECEIVED → *`, `CANCELLED → *`, `DRAFT → RECEIVED`.

`RECEIVED` and `CANCELLED` are *terminal* — no outgoing transitions. A placed PO cannot be un-placed (cancel and re-create instead). You must place before you can receive.

**Why a pure function and not a state-machine library.** Libraries like `xstate` are excellent for client-side orchestration but overkill for a 4-state lifecycle with 4 transitions. A pure function with a transition table is 30 lines, trivially testable, and auditable at a glance. The interviewer can read the entire state model in one screen. Adding a library would be resume-driven development.

**Enforcement is by convention enforced by tests.** The rule "routes never set status directly" is enforced by (1) the domain functions being the only exporters from `src/domain/po-state.ts`, (2) an ESLint rule (or code review) prohibiting `status:` in Prisma update calls outside `src/domain/`, and (3) integration tests that attempt illegal transitions and assert 409 responses. If a future teammate bypasses the domain layer, the tests catch it.

A state-machine diagram is at `download/state-machine.png`.

---

## 7. Decision Point 5 — Redis: three uses, all justified

**Decision.** Redis (via `ioredis`) is used for three things, each of which has to justify itself against the brief's "use it where it actually helps" bar. It is **not** used as a correctness mechanism anywhere — the system remains correct with Redis unavailable, just slower and less protected against abuse.

### (1) Idempotency-key cache (fast path)
When the receive endpoint sees an `Idempotency-Key`, it first checks Redis for a cached response. Hit: return immediately, no DB read. Miss: proceed with the transactional flow, then write the response to Redis with a 24h TTL. The DB `ReceiveIdempotency` table is still the source of truth — if Redis is empty (post-restart, post-eviction), the DB lookup still works correctly. Redis just makes the common case (client retries within minutes) sub-millisecond instead of sub-10ms.

### (2) Rate limiting on the receive endpoint
A per-PO rate limit (max 5 receive attempts per minute, sliding window) catches double-clicks, buggy retry loops, and the kind of client that fires `setInterval(receive, 1000)` "just to be safe". Implemented with a Redis sorted-set per PO id. Over-budget requests return `429 Too Many Requests` with a `Retry-After` header. This is defence-in-depth — the idempotency mechanism already makes retries harmless — but it protects Postgres from a misbehaving client hammering the row lock.

### (3) Supplier/product list cache
The supplier list and the product list (with current stock and low-stock status) are read-heavy and change rarely. They are cached in Redis with a 60s TTL and tag-based invalidation on write. Cache miss falls through to Postgres, then backfills. This is the least critical of the three uses — Postgres handles these queries fine — but it removes the read load from the DB and lets Postgres spend its time on the write-heavy receive path.

### Where I deliberately did NOT use Redis

- **Distributed lock on PO receive.** Postgres `SELECT FOR UPDATE` is strictly stronger (§5).
- **Session/auth store.** Out of scope for this task; single-user mode.
- **Job queue.** No background jobs in the MVP — the nightly reconciliation job (§4) would use `BullMQ` if I had time, but it's cut.
- **Pub/sub.** No real-time updates needed in the MVP.

Each absence is a deliberate "no" — Redis has a way of accumulating uses that don't pay rent, and I want to keep this deployment simple.

---

## 8. API surface

All endpoints are Next.js 16 App Router route handlers under `/app/api/`. Every request body is validated with Zod at the boundary; every response uses a consistent JSON envelope. Successful responses return the resource directly; errors return `{ error: { code, message, details? } }` with the appropriate HTTP status. The client uses `@tanstack/react-query` for caching, mutations, and optimistic updates where it makes sense.

| Method | Path | Purpose | Status codes |
|---|---|---|---|
| GET | `/api/suppliers` | List suppliers (paginated) | 200 |
| POST | `/api/suppliers` | Create supplier | 201, 400, 422 |
| GET | `/api/suppliers/:id/products` | Supplier's products with current prices | 200, 404 |
| GET | `/api/products` | List products with stock + low-stock flag | 200 |
| PATCH | `/api/products/:id` | Update `reorderLevel` (only mutable field) | 200, 404, 422 |
| GET | `/api/products/low-stock` | Products where `currentStock < reorderLevel` | 200 |
| GET | `/api/pos` | List POs (filter by status, supplierId) | 200 |
| POST | `/api/pos` | Create a `DRAFT` PO against a supplier | 201, 422 |
| GET | `/api/pos/:id` | PO detail with line items and snapshot prices | 200, 404 |
| POST | `/api/pos/:id/lines` | Add line item (snapshots current supplier price) | 201, 404, 409 |
| DELETE | `/api/pos/:id/lines/:lineId` | Remove line item (only if PO is `DRAFT`) | 204, 404, 409 |
| POST | `/api/pos/:id/place` | Transition `DRAFT → PLACED` (locks lines) | 200, 404, 409 |
| POST | `/api/pos/:id/cancel` | Transition `DRAFT`/`PLACED → CANCELLED` | 200, 404, 409 |
| POST | `/api/pos/:id/receive` | Receive PO. Header: `Idempotency-Key`. Atomic + idempotent. | 200, 404, 409, 422, 429 |

**Error envelope** (every error response):

```json
{
  "error": {
    "code": "PO_ALREADY_RECEIVED",
    "message": "Purchase order po_abc123 has already been received.",
    "details": { "poId": "po_abc123", "receivedAt": "2025-06-17T10:30:00Z" }
  }
}
```

Status codes used: `200` OK, `201` Created, `204` No Content, `400` Bad Request, `404` Not Found, `409` Conflict (illegal state transition, duplicate idempotency), `422` Unprocessable (Zod validation failure), `429` Too Many Requests (rate limit, `Retry-After` header set), `500` Internal (logged, never leaks DB details).

---

## 9. Out of scope (and why each cut is safe)

Every item here is a deliberate scope reduction to fit the 3-day timebox without sacrificing quality on what remains. The "scope down, not quality down" rule from the brief is the guiding principle: it is better to ship a smaller, correct, well-tested module than a larger one with rough edges on the critical path.

- **Authentication & multi-tenancy.** Single-user mode. The brief is about the PO domain, not auth. Adding NextAuth + sessions would burn half a day for zero domain value. Auth is a thin middleware layer I would add next.
- **Multi-currency.** All prices in USD cents. Multi-currency adds a currency column, FX rates, and display formatting — real work, not in scope. The schema is currency-agnostic (cents are cents), so adding it later is additive.
- **Partial receipts.** Receive is all-or-nothing for the whole PO. Partial receipt (30 of 50 units now, 20 later) adds a `PARTIALLY_RECEIVED` state, per-line-item received quantities, and a more complex stock reconciliation. Cut for time; documented as the obvious next feature.
- **Supplier portal / self-service.** Suppliers do not log in. The manager maintains supplier prices. A supplier portal is a separate product surface.
- **Email / Slack notifications.** No "PO received" emails. A webhook emitter would be the right abstraction if needed — emit on state transition, let the consumer decide. Not in MVP.
- **Audit log beyond `StockMovement`.** `StockMovement` is the audit log for stock. There is no general-purpose audit log of "who edited what when". For a small business PO module, that is acceptable; for an enterprise module, it would not be.
- **Reporting dashboards.** No "spend by supplier this quarter" charts. The data is all there (PO + line items + snapshot prices); dashboards are a separate read-model concern.
- **Mobile-responsive UI polish.** The brief explicitly says "UI polish isn't graded; correct state handling is". The UI is desktop-first, functional, and accessible. Tailwind + Radix make it usable on mobile by accident, but I am not spending time tuning breakpoints.
- **GraphQL.** REST route handlers are sufficient. GraphQL adds a schema, resolver layer, and N+1 risk for no benefit at this scale.

---

## 10. Test strategy

Three layers: pure-unit tests of the domain (no DB, no I/O), integration tests against a real throwaway Postgres (via testcontainers), and a small E2E smoke test with Playwright. The integration layer is where the edge-case correctness lives — the unit tests prove the domain logic; the integration tests prove the transactions actually serialise under concurrency.

**Unit tests (Vitest, no DB):**

- `assertCanTransition`: every legal transition returns; every illegal transition throws with the right error code. 16 cases (4 states × 4 targets).
- `applyStockMovement`: positive delta increments, negative decrements, `balanceAfter` is correctly computed, negative-stock guard for non-receive reasons.
- `snapshotPrice`: at line creation, `unitPriceCents` equals the supplier's current price; later supplier price changes do not affect existing lines.
- Money math: `lineTotalCents = quantity * unitPriceCents` never produces a float; BigInt arithmetic throughout.
- Error shaping: every domain error maps to the right `{ code, message, details }` and the right HTTP status.

**Integration tests (Vitest + testcontainers Postgres):**

- **Receive happy path.** `PLACED` PO with 2 line items → POST receive → status becomes `RECEIVED`, both products' `currentStock` incremented, two `StockMovement` rows inserted with the right deltas and `balanceAfter`.
- **Idempotent receive, same key.** Call receive twice with the same `Idempotency-Key`. Second call returns the same response body and status. No duplicate `StockMovement` rows. Stock unchanged after the second call.
- **Idempotent receive, different key.** Call receive with key A (succeeds), then with key B (different). Second call returns 409 `PO_ALREADY_RECEIVED` with details. No duplicate stock.
- **Concurrent receives.** Fire two receive requests in parallel with `Promise.all`, different keys. Exactly one returns 200, the other returns 409. Final stock equals one receipt, not two. *This is the test that proves the design.*
- **Cancel `PLACED` PO.** POST cancel on a `PLACED` PO → status becomes `CANCELLED`, `cancelledAt` set. No stock effect.
- **Cancel `RECEIVED` PO.** POST cancel on a `RECEIVED` PO → 409 `PO_ALREADY_RECEIVED`. Status unchanged.
- **Place `DRAFT` PO with zero line items.** 409 `PO_HAS_NO_LINES`. Status stays `DRAFT`.
- **Price snapshot survives supplier price change.** Add a line at $1.20. Update supplier price to $1.40. Place PO. Receive PO. `lineTotalCents` still reflects $1.20.

**E2E smoke test (Playwright):** full flow — create supplier → add 2 products with prices → create PO → add 2 line items → place → receive → verify stock updated and PO shows `RECEIVED` in the UI. One happy-path script, ~50 lines.

> **The one test I will write first:** concurrent receives, different keys, `Promise.all`. This single test is the proof that the entire design holds. If it passes, the row lock works, the idempotency unique constraint works, and the state machine guards work. If it fails, the rest of the build doesn't matter. I am writing it on Day 1, before the UI exists.

---

## 11. Deployment plan (DEPLOY.md summary)

**Platform: Railway.** Managed Postgres, managed Redis, and the Next.js app all on one platform. Railway runs migrations as part of the build, exposes env vars through a dashboard, and gives me a live HTTPS URL out of the box. For a 3-day timebox where the goal is "a URL that works when they open it", this is the fastest path with the fewest moving parts.

**Why not a VPS with Caddy + Docker Compose.** That route is more impressive on paper (full control, real HTTPS via Caddy, no platform lock-in) but it costs half a day of setup: provision, SSH, install Docker, write Caddyfile, configure systemd, set up backup scripts. If I had 5 days I would do it. With 3, Railway is the pragmatic choice — the brief explicitly lists Railway/Render/Fly as acceptable. The Docker Compose file still exists for local dev and is documented enough that deploying to a VPS later is a config change, not a rewrite.

**Migration on release.** Railway runs the build command `npm run db:migrate:deploy && npm run build`, then starts the app with `npm run start`. `db:migrate:deploy` is `prisma migrate deploy` — it applies pending migrations in order and exits. It is idempotent and safe to run on every deploy. Migrations are committed to the repo under `prisma/migrations/`; the deploy does not generate migrations, only applies them.

**Environment variables.** Listed in `.env.example` and set in Railway's dashboard: `DATABASE_URL`, `REDIS_URL`, `NEXT_PUBLIC_API_BASE_URL`, `NODE_ENV`, `SENTRY_DSN` (optional). No secrets in the repo. Railway redacts them in build logs.

**Shipping a code change (the exact runbook):**

```bash
# 1. Local: make the change, run migrations if schema changed
npm run db:migrate:dev -- --name add_partial_receipt_state

# 2. Commit. Atomic commits per concern.
git commit -m "feat(po): add PARTIALLY_RECEIVED state and per-line receipt"
git commit -m "test(po): integration test for partial receipt"

# 3. Push to main
git push origin main

# 4. Railway auto-deploys on push to main:
#    - Build: npm install
#    - Migrate: npm run db:migrate:deploy  (applies new migration)
#    - Start: npm run start
#    - Health check on /api/health
#    - If health check fails: auto-rollback to previous deploy

# 5. To ship a migration WITHOUT code changes (rare):
#    - Commit the migration files only
#    - Push — Railway runs db:migrate:deploy on the existing build
#    - Verify with: psql $DATABASE_URL -c "SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;"

# Rollback:
#    - Railway dashboard → Deploys → Redeploy previous commit
#    - NOTE: backward-incompatible migrations (DROP COLUMN, etc.) require
#      a two-phase deploy: first deploy code that tolerates both schemas,
#      then deploy the migration. Plan ahead.

# Smoke test after every deploy:
curl -s https://<app>.up.railway.app/api/health
curl -s https://<app>.up.railway.app/api/products/low-stock
```

---

## 12. 3-day plan

The hardest part (idempotent concurrent receive) is scheduled for Day 1. If I only ship that one thing working, with tests, the submission is already defensible. Everything else is additive. This ordering reflects the principle: *prove the hard edge cases first, then build outward.*

| Day | Block | Deliverable |
|---|---|---|
| 1 | Morning | Prisma schema + first migration committed. Seed script with 3 suppliers, 8 products, prices. Domain layer skeleton: `assertCanTransition`, `applyStockMovement`, `snapshotPrice`. Unit tests for all three. |
| 1 | Afternoon | **Receive endpoint:** `POST /api/pos/:id/receive` with `Idempotency-Key`, row lock, `ON CONFLICT`, atomic stock update. **The concurrent-receive integration test passes.** This is the "submission is defensible" milestone. |
| 2 | Morning | Rest of the API: suppliers CRUD, products, PO create/list/detail, line add/remove, place, cancel. Zod schemas at every boundary. Error envelope. Integration tests for state-machine rejections. |
| 2 | Afternoon | UI: supplier list, product list with low-stock badge, PO list with status filter, PO detail with line items, receive button (sends `Idempotency-Key`). `react-query` for all data. Tailwind + Radix components, minimal styling. |
| 3 | Morning | Docker Compose: Postgres + Redis + app, one-command up. `.env.example` with every variable documented. README with clone-to-running steps. Smoke-test the compose setup from clean. |
| 3 | Afternoon | Deploy to Railway. `DEPLOY.md` written. Run smoke tests against the live URL. Commit history review — squash typos, ensure atomic commits. Final pass on `PLAN.md` to match what shipped. |

The Day 1 afternoon milestone is the "submission is defensible" checkpoint — if nothing else ships, that one thing working is enough to discuss in the interview.

---

## 13. Decisions & trade-offs — summary

The five decision points reduce to five sentences: **(1)** snapshot the line-item price at line creation; **(2)** stock is a stored column kept in sync with an immutable movement log; **(3)** receive is idempotent via a unique constraint on the idempotency key, atomic via a Postgres row lock inside one transaction; **(4)** the state machine is a pure function called by every transition, never bypassed by routes; **(5)** Redis earns its place for idempotency caching, rate-limiting, and list caching — not for correctness.

The meta-decision is that the edge cases are the task. CRUD is a delivery vehicle for the receive path. Every hour spent making the receive path provably correct under concurrency is worth ten hours spent polishing the supplier create form. The 3-day plan reflects this: the receive path is done by end of Day 1, before any UI exists.

**What I would revisit with more time.** Partial receipts are the obvious next feature — the schema already has `StockMovement.purchaseOrderId` and the domain layer is structured to add a `PARTIALLY_RECEIVED` state without rewriting the receive flow. Multi-currency is a schema-and-display concern, not a domain concern — the cents-as-BigInt model transfers cleanly. A real audit log (who edited what when) would live in a separate `AuditEvent` table keyed by resource type and id. Background reconciliation via BullMQ would replace the nightly cron. OpenTelemetry traces on every receive call would make production debugging trivial. None of these are in the 3-day build; all are documented as deliberate next steps.

**The one thing I want the reviewer to test.** Open two browser tabs on the same `PLACED` PO. Click "Receive" in both, as close to simultaneously as you can. One will return 200 with the receipt; the other will return 409 with `PO_ALREADY_RECEIVED`. Refresh the product list. Stock will reflect exactly one receipt. That is the design holding up under the exact stress the brief asked about.
