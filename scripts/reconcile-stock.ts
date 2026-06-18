// scripts/reconcile-stock.ts — CI-ready drift detector for stock.
// Compares Product.currentStock against the SUM of all StockMovement.delta
// per product. Exits 1 on any mismatch (so a CI cron can alert).
// Author: Sudarshan Sonawane

import { config } from "dotenv";
config({ path: ".env" });
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("→ Reconciling stock against StockMovement log…");
  // Compute the expected balance from movements (sum of all deltas)
  const aggregated = await prisma.$queryRaw<
    Array<{ productId: string; expectedBalance: bigint }>
  >`
    SELECT "productId", COALESCE(SUM(delta), 0) as "expectedBalance"
    FROM stock_movements
    GROUP BY "productId"
  `;

  const expectedMap = new Map(
    aggregated.map((row) => [row.productId, row.expectedBalance])
  );

  const products = await prisma.product.findMany({
    select: { id: true, sku: true, name: true, currentStock: true },
  });

  const drifts: Array<{
    productId: string;
    sku: string;
    name: string;
    stored: number;
    expected: bigint;
    diff: bigint;
  }> = [];

  for (const p of products) {
    const expected = expectedMap.get(p.id) ?? BigInt(0);
    const stored = BigInt(p.currentStock);
    if (stored !== expected) {
      drifts.push({
        productId: p.id,
        sku: p.sku,
        name: p.name,
        stored: p.currentStock,
        expected,
        diff: stored - expected,
      });
    }
  }

  // Products with stored stock but no movements: handled above (expected=0).
  // Products with movements but no longer existing: not actionable from here.

  if (drifts.length === 0) {
    console.log(`✅ Stock is consistent across ${products.length} products.`);
    process.exit(0);
  }

  console.error(`❌ Found ${drifts.length} product(s) with stock drift:`);
  for (const d of drifts) {
    console.error(
      `  - ${d.sku} (${d.name}): stored=${d.stored}, expected=${d.expected}, diff=${d.diff}`
    );
  }
  console.error(
    "\nAction: investigate recent manual DB edits or failed transactions."
  );
  process.exit(1);
}

main()
  .catch((e) => {
    console.error("Reconcile failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());