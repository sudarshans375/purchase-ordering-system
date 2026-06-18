# Purchase Ordering System

A production-grade purchase ordering module for small businesses. Built with Next.js 16, TypeScript, Prisma 6, PostgreSQL, and Redis.

## Features

- **Supplier Management** — Maintain supplier profiles and contact information
- **Product Catalog** — Manage inventory with SKU tracking and reorder levels
- **Supplier Pricing** — Link products to suppliers with current pricing and lead times
- **Purchase Orders** — Full lifecycle: Draft → Placed → Received, with cancellation
- **Price Snapshots** — Line item prices are captured at order time and never change
- **Stock Management** — Automatic stock updates on receipt with full audit trail
- **Low Stock Monitoring** — Products below reorder level are flagged for attention
- **Idempotent Receiving** — Safe to retry receive operations without duplicate stock updates
- **Concurrency Safety** — Postgres row locks prevent race conditions on receive
- **Responsive UI** — Professional, accessible interface that works on all devices

## Architecture

```
src/
├── app/               # Next.js App Router pages and API routes
│   ├── api/           # REST API endpoints
│   └── page.tsx       # Dashboard
├── components/        # Reusable UI components
│   ├── layout/        # Navigation and shell
│   └── ui/            # Design system (Button, Card, Table, etc.)
├── domain/            # Pure business logic (state machine, stock, pricing)
├── features/          # Feature-specific components
├── hooks/             # React Query hooks for API data fetching
├── lib/               # Shared utilities (Prisma, Redis, errors)
├── providers/         # React Query provider
├── repositories/      # Data access layer
├── server/            # API error and response helpers
├── services/          # Business logic orchestration
├── types/             # TypeScript type definitions
└── validators/        # Zod validation schemas
```

## Tech Stack

| Tech | Purpose |
|------|---------|
| Next.js 16 | Frontend + API routes |
| TypeScript | Type safety (strict mode) |
| Prisma 6 | ORM + database migrations |
| PostgreSQL | Primary database |
| Redis (ioredis) | Caching and rate limiting |
| Zod | Request validation |
| React Query | Server state management |
| Tailwind CSS v4 | Styling |
| Radix UI | Accessible primitives |
| Vitest | Unit testing |
| Docker | Containerization |

## Quick Start

### Prerequisites

- Node.js 22+
- npm
- PostgreSQL (or Neon connection string)
- Redis (or Upstash connection string)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/sudarshans375/purchase-ordering-system.git
cd purchase-ordering-system

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and REDIS_URL

# 4. Generate Prisma client
npm run db:generate

# 5. Run migrations
npm run db:migrate:dev -- --name init

# 6. Seed the database
npm run db:seed

# 7. Start development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Docker

```bash
# Build and start the app (uses Neon + Upstash)
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| GET | `/api/suppliers` | List suppliers |
| POST | `/api/suppliers` | Create supplier |
| GET | `/api/suppliers/:id` | Supplier detail |
| GET | `/api/suppliers/:id/products` | Supplier's products |
| POST | `/api/suppliers/:id/products` | Link product to supplier |
| GET | `/api/products` | List products |
| POST | `/api/products` | Create product |
| GET | `/api/products/low-stock` | Low stock products |
| GET | `/api/products/:id` | Product detail |
| PATCH | `/api/products/:id` | Update product |
| GET | `/api/pos` | List purchase orders |
| POST | `/api/pos` | Create PO |
| GET | `/api/pos/:id` | PO detail |
| POST | `/api/pos/:id/lines` | Add line item |
| DELETE | `/api/pos/:id/lines/:lineId` | Remove line item |
| POST | `/api/pos/:id/place` | Place PO |
| POST | `/api/pos/:id/cancel` | Cancel PO |
| POST | `/api/pos/:id/receive` | Receive PO (idempotent) |

## Testing

```bash
# Run unit tests
npm test

# Run with watch mode
npm run test:watch

# Type check
npm run typecheck

# Lint
npm run lint
```

## Deployment

See [DEPLOY.md](./DEPLOY.md) for full deployment instructions to an Azure VM with Docker, Caddy, and SSL.

## Key Design Decisions

1. **Price Snapshots** — Line item prices are copied from the supplier's price when the line is created and never change, preserving the audit trail.
2. **Hybrid Stock Model** — `Product.currentStock` (fast reads) + `StockMovement` event log (audit trail), updated in the same transaction.
3. **Idempotent Receiving** — The receive endpoint accepts an `Idempotency-Key` header and is safe to retry safely.
4. **Postgres Row Locks** — `SELECT FOR UPDATE` serializes concurrent receive attempts on the same PO.
5. **Redis for Performance** — Redis caches idempotency keys, rate-limits receive attempts, and caches supplier/product lists. Postgres is the source of truth.

## License

MIT

## Author

Sudarshan Sonawane
