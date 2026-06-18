# Contributing to the Purchase Ordering System

Thanks for your interest in contributing! This document covers local development setup, code conventions, and the pull request process.

## Local development

### Prerequisites

- Node.js 22+
- npm 10+
- PostgreSQL 14+ (or a Neon connection string)
- Redis 6+ (or an Upstash connection string)

### Setup

```bash
git clone https://github.com/sudarshans375/purchase-ordering-system.git
cd purchase-ordering-system
cp .env.example .env
# Edit .env: set DATABASE_URL, REDIS_URL, JWT_SECRET (48-byte base64)

npm install
npm run db:generate
npm run db:migrate:dev
npm run db:seed

# In one terminal
npm run dev

# In another — run tests
npm test
```

The app runs at http://localhost:3000.

### Optional: full local stack via Docker

```bash
docker compose up -d
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run db:seed
```

Brings up Postgres + Redis + app on `localhost:3000`.

## Code conventions

### Layered architecture

```
route → service → repository → prisma
                    ↓
                  domain  (pure functions, no I/O)
```

- **Route handlers** (src/app/api/): thin. Parse with Zod → call service → shape response. No business logic.
- **Services** (src/services/): orchestration. Open transactions, call domain functions, call repositories.
- **Repositories** (src/repositories/): Prisma queries. Accept an optional `tx` parameter so they can run inside a transaction.
- **Domain** (src/domain/): pure functions. No imports from prisma or redis. 100% unit-testable without a DB.

### State transitions

PO status changes go through `assertCanTransition(from, to)` from `src/domain/po-state.ts`. **Never set `status` directly** in a Prisma `update` call — always call the dedicated service (`placePurchaseOrder`, `cancelPurchaseOrder`, `receivePurchaseOrder`).

### Idempotency

The receive endpoint accepts an `Idempotency-Key` header (UUID). All idempotency logic lives in `src/services/po-service.ts` → `receivePurchaseOrder`. Tests in `tests/integration/receive-concurrent.test.ts` verify the row-lock-based concurrency control.

### Money

All monetary values are `bigint` cents. Format only at the UI edge via `formatCents()`. Never convert to `number` for arithmetic.

### Error handling

- Throw `DomainError` subclasses from `src/lib/errors.ts` (e.g. `NotFoundError`, `ConflictError`, `ValidationError`).
- The `handleApiError()` helper in `src/server/api-error.ts` translates to the standard error envelope (`{ error: { code, message, details? } }`).
- For Prisma errors, wrap in `translatePrisma()` to map to domain errors.

## Testing

- Domain tests: `tests/domain/*.test.ts` — pure, fast, no I/O.
- Integration tests: `tests/integration/*.test.ts` — real Postgres required (set `DATABASE_URL`).
- E2E tests: `tests/e2e/*.spec.ts` — Playwright.

```bash
npm test                 # all
npm run test:unit        # domain only
npm run test:integration # integration only
npm run test:e2e         # Playwright
```

The concurrent-receive integration test is the most important one — it verifies the design's correctness under concurrent requests.

## Commits & PRs

- Atomic commits per logical concern.
- Use [Conventional Commits](https://www.conventionalcommits.org/) prefixes:
  - `feat:` new feature
  - `fix:` bug fix
  - `refactor:` code change that doesn't add a feature or fix a bug
  - `docs:` documentation only
  - `test:` test additions/changes
  - `chore:` tooling / config / dependency changes
- PR title mirrors the commit message.
- PR description includes:
  - What changed and why
  - Test plan (how you verified)
  - Screenshots if the UI changed
  - Migration notes if `prisma/migrations/` changed

## Code style

- Prettier (config in `.prettierrc`) handles formatting. Run `npm run format` before committing.
- ESLint config in `eslint.config.mjs` (Next.js defaults). Run `npm run lint`.
- TypeScript strict mode. `npm run typecheck` must pass.

## Release process

1. Bump version in `package.json`
2. Update `CHANGELOG.md`
3. Open PR to `master`
4. After merge, tag with `git tag -a vX.Y.Z -m "..."` and `git push origin vX.Y.Z`
5. Deploy via `bash scripts/deploy.sh deploy`

## Questions?

Open an issue or email `ops@your-domain.com` (placeholder — see SECURITY.md for security disclosures).