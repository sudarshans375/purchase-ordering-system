# Purchase Ordering System

A production-grade purchase ordering module for small businesses. Built with Next.js 16, TypeScript, Prisma 6, PostgreSQL, and Redis.

![Status](https://img.shields.io/badge/status-production--ready-green)
![Tests](https://img.shields.io/badge/tests-58%20passing-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)

## What it does

A purchasing manager maintains suppliers and the products each supplier sells (with prices), raises purchase orders against a supplier, moves a PO through `DRAFT → PLACED → RECEIVED` (with cancellation), has stock update automatically on receipt, and can see which products are below their reorder level.

## Features

- **Supplier Management** — Maintain supplier profiles and contact information
- **Product Catalog** — Inventory with SKU tracking and reorder levels
- **Supplier Pricing** — Link products to suppliers with current prices and lead times
- **Purchase Orders** — Full lifecycle: DRAFT → PLACED → RECEIVED, with cancellation
- **Price Snapshots** — Line item prices are captured at line-add time and never change
- **Stock Management** — Automatic stock updates on receipt with full audit trail
- **Stock Movement History** — Append-only event log with reconciliation drift detection
- **Low Stock Monitoring** — Products below reorder level are flagged
- **Idempotent Receiving** — Safe to retry without duplicate stock updates
- **Concurrent Safety** — Postgres row locks prevent race conditions on receive
- **Dashboard** — Spend trends, status mix, top suppliers, recent activity
- **Command Palette** — Global Ctrl/Cmd-K navigation
- **Responsive UI** — Desktop, tablet, mobile
- **Toast Notifications** — User feedback for every mutation

## Quick Start

### Prerequisites

- Node.js 22+
- npm 10+
- PostgreSQL 14+ (or [Neon](https://neon.tech) connection string)
- Redis 6+ (or [Upstash](https://upstash.com) connection string)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/sudarshans375/purchase-ordering-system.git
cd purchase-ordering-system

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env: set DATABASE_URL, REDIS_URL, JWT_SECRET (48-byte base64)

# 4. Generate Prisma client + run migrations
npm run db:generate
npm run db:migrate:dev -- --name init

# 5. Seed the database
npm run db:seed

# 6. Start the dev server
npm run dev
```

The app is at [http://localhost:3000](http://localhost:3000).

Login: `admin@posystem.com` / `admin123` (seeded — **change in production**).

### Docker (full stack)

```bash
docker compose up -d
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run db:seed
```

Brings up Postgres + Redis + app on `localhost:3000`.

## Stack

| Tech | Purpose |
|------|---------|
| Next.js 16 | Frontend + API routes (App Router) |
| TypeScript | Type safety (strict mode) |
| Prisma 6 | ORM + database migrations |
| PostgreSQL | Primary database |
| Redis (ioredis) | Caching and rate limiting |
| Zod | Request validation |
| React Query | Server state management |
| Tailwind v4 | Styling |
| Radix UI | Accessible primitives |
| Recharts | Dashboard visualizations |
| cmdk | Command palette |
| Vitest | Unit + integration testing |
| Playwright | E2E testing |
| Docker | Containerization |

## API Endpoints

All endpoints (except `/api/auth/login` and `/api/health`) require authentication via session cookie.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/login` | Login (rate-limited) |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |
| GET | `/api/dashboard/summary` | Dashboard aggregations |
| GET | `/api/suppliers` | List suppliers |
| POST | `/api/suppliers` | Create supplier |
| GET | `/api/suppliers/:id` | Supplier detail |
| PATCH | `/api/suppliers/:id` | Update supplier |
| GET | `/api/suppliers/:id/products` | Supplier's products |
| POST | `/api/suppliers/:id/products` | Link product |
| DELETE | `/api/suppliers/:id/products/:productId` | Unlink |
| GET | `/api/products` | List products |
| POST | `/api/products` | Create product |
| GET | `/api/products/:id` | Product detail |
| PATCH | `/api/products/:id` | Update product |
| GET | `/api/products/low-stock` | Low stock products |
| GET | `/api/pos` | List POs |
| POST | `/api/pos` | Create PO |
| GET | `/api/pos/:id` | PO detail |
| POST | `/api/pos/:id/lines` | Add line item (snapshots price) |
| DELETE | `/api/pos/:id/lines/:lineId` | Remove line item |
| POST | `/api/pos/:id/place` | Place PO (locks lines) |
| POST | `/api/pos/:id/cancel` | Cancel PO |
| POST | `/api/pos/:id/receive` | Receive PO (atomic + idempotent) |
| GET | `/api/stock-movements` | Stock movement history |
| GET | `/api/users` | List users (admin) |
| POST | `/api/users` | Create user (admin) |
| PATCH | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

## Scripts

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run start            # Run production build
npm run lint             # ESLint
npm run lint:fix         # ESLint with --fix
npm run typecheck        # tsc --noEmit
npm run format           # Prettier write
npm run format:check     # Prettier check
npm test                 # All tests (unit + integration)
npm run test:unit        # Domain unit tests only
npm run test:integration # Integration tests (requires DATABASE_URL)
npm run test:e2e         # Playwright e2e tests
npm run reconcile:stock  # Drift detector — run as a CI cron
npm run db:generate      # Prisma generate
npm run db:migrate:dev   # Prisma migrate dev
npm run db:migrate:deploy # Prisma migrate deploy (production)
npm run db:seed          # Seed sample data
npm run db:studio        # Prisma Studio
npm run docker:up        # docker compose up -d
npm run docker:down      # docker compose down
npm run docker:logs      # docker compose logs -f app
npm run deploy           # scripts/deploy.sh deploy (default)
```

## Architecture

```
src/
├── app/                 # Next.js App Router
│   ├── (auth)/          # Login routes (route group)
│   ├── (main)/          # Authenticated routes
│   │   ├── stock-movements/
│   │   ├── products/[id]/
│   │   ├── purchase-orders/[id]/
│   │   └── ...
│   └── api/             # REST API
├── domain/              # Pure business logic
│   ├── po-state.ts      # State machine
│   ├── stock.ts         # Stock math
│   └── pricing.ts       # Money math (BigInt)
├── services/            # Orchestration + transactions
├── repositories/        # Prisma data access
├── lib/                 # Prisma, Redis, errors, env, utils
├── validators/          # Zod schemas
├── components/          # UI library (Radix + CVA)
│   ├── ui/              # Design system primitives
│   └── layout/          # Navbar, sidebar
├── hooks/               # React Query hooks
├── providers/           # QueryClient provider
├── features/            # Feature-specific components
└── types/               # Type definitions
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full request flow and design rationale.

## Decisions & Trade-offs

See [PLAN.md](PLAN.md) for the full design document. Five core decisions:

1. **Snapshot pricing** — line item prices are copied at line-add time and never mutated. The total reflects what was agreed, not the supplier's current price.
2. **Hybrid stock** — stored column + immutable event log, kept in sync inside one transaction. Drift detector (`scripts/reconcile-stock.ts`) is the cheap insurance.
3. **Idempotent + atomic receive** — DB-backed idempotency + Postgres row lock. No Redis distributed lock for correctness.
4. **State machine as pure function** — routes never set status directly. `assertCanTransition(from, to)` is the single source of truth.
5. **Redis for performance, not correctness** — idempotency cache, rate limiting, list caching. The system is correct with Redis down.

## Testing

58 unit + integration tests pass. The most important is the **concurrent-receive test** (`tests/integration/receive-concurrent.test.ts`) — it verifies that two simultaneous receive attempts on the same PO result in exactly one success and one 409 conflict, with stock incremented exactly once.

```bash
npm test                                  # all
npm run test:integration -- receive-concurrent  # the critical one
```

## Deployment

See [DEPLOY.md](DEPLOY.md) for the full guide. Quick deploy to an Azure VM:

```bash
AZURE_VM=20.193.148.140 \
AZURE_USER=azureuser \
SSH_KEY_PATH=$HOME/.ssh/<key> \
bash scripts/deploy.sh deploy
```

The script supports multiple modes: `deploy` | `rollback` | `migrate-only` | `logs` | `status`.

## Documentation

- [PLAN.md](PLAN.md) — Design document (written before code, per the brief)
- [ARCHITECTURE.md](ARCHITECTURE.md) — Layered design and request flow
- [DEPLOY.md](DEPLOY.md) — Deployment guide
- [CONTRIBUTING.md](CONTRIBUTING.md) — How to contribute
- [SECURITY.md](SECURITY.md) — Vulnerability disclosure

## License

MIT — see [LICENSE](LICENSE).

## Author

Sudarshan Sonawane — [github.com/sudarshans375](https://github.com/sudarshans375)