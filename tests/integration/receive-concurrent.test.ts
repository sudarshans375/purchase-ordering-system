// tests/integration/receive-concurrent.test.ts
// Concurrent receive test — "the one test I will write first" per PLAN.md
// Tests that exactly one receive succeeds and the other is rejected
// when both requests fire simultaneously with different idempotency keys.
//
// NOTE: This requires a real Postgres instance.
// Run with: DATABASE_URL=postgresql://... npx vitest run tests/integration/
//
// KNOWN ISSUE: This test previously exposed a real production bug.
// The Prisma schema had `StockMovement.idempotencyKey @unique`, but a single
// receive operation creates one StockMovement PER LINE ITEM, all sharing the
// same idempotencyKey. Phase 1 fixed this by dropping `@unique` from
// StockMovement.idempotencyKey (the ReceiveIdempotency table is now the sole
// source of truth for idempotency). The schema change has been migrated.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const DATABASE_URL = process.env.DATABASE_URL;
const describeIf = DATABASE_URL ? describe : describe.skip;

describeIf("Concurrent Receive", () => {
  const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

  let supplierId: string;
  let productIds: string[];
  let poId: string;

  beforeAll(async () => {
    // Clean up any test data from previous runs
    const testPO = await prisma.purchaseOrder.findFirst({ where: { poNumber: "TEST-CONCURRENT" } });
    if (testPO) {
      await prisma.receiveIdempotency.deleteMany({ where: { purchaseOrderId: testPO.id } });
      await prisma.stockMovement.deleteMany({ where: { purchaseOrderId: testPO.id } });
      await prisma.pOLineItem.deleteMany({ where: { purchaseOrderId: testPO.id } });
      await prisma.purchaseOrder.delete({ where: { id: testPO.id } });
    }

    // Also delete any orphan idempotency keys from previous runs (defensive)
    await prisma.stockMovement.deleteMany({
      where: {
        idempotencyKey: {
          in: [
            "00000000-0000-0000-0000-000000000001",
            "00000000-0000-0000-0000-000000000002",
          ],
        },
      },
    });
    await prisma.receiveIdempotency.deleteMany({
      where: {
        key: {
          in: [
            "00000000-0000-0000-0000-000000000001",
            "00000000-0000-0000-0000-000000000002",
          ],
        },
      },
    });

    const supplier = await prisma.supplier.findFirst({ where: { name: "TEST-CONCURRENT-SUPPLIER" } });
    if (supplier) {
      await prisma.supplierProduct.deleteMany({ where: { supplierId: supplier.id } });
      await prisma.supplier.delete({ where: { id: supplier.id } });
    }
    await prisma.product.deleteMany({ where: { name: { startsWith: "TEST-CONCURRENT" } } });

    // Create test data
    const newSupplier = await prisma.supplier.create({
      data: { name: "TEST-CONCURRENT-SUPPLIER", email: "test@test.com" },
    });
    supplierId = newSupplier.id;

    const product1 = await prisma.product.create({
      data: { sku: "TEST-CON-001", name: "TEST-CONCURRENT Product A", currentStock: 50, reorderLevel: 10 },
    });
    const product2 = await prisma.product.create({
      data: { sku: "TEST-CON-002", name: "TEST-CONCURRENT Product B", currentStock: 30, reorderLevel: 5 },
    });
    productIds = [product1.id, product2.id];

    await prisma.supplierProduct.createMany({
      data: [
        { supplierId, productId: product1.id, currentPriceCents: BigInt(1000), supplierSku: "SKU-A" },
        { supplierId, productId: product2.id, currentPriceCents: BigInt(2000), supplierSku: "SKU-B" },
      ],
    });

    // Create a PLACED PO with line items
    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: "TEST-CONCURRENT",
        supplierId,
        status: "PLACED",
        totalCents: BigInt(5000),
        placedAt: new Date(),
      },
    });
    poId = po.id;

    await prisma.pOLineItem.createMany({
      data: [
        { purchaseOrderId: po.id, productId: product1.id, quantity: 10, unitPriceCents: BigInt(1000), lineTotalCents: BigInt(10000) },
        { purchaseOrderId: po.id, productId: product2.id, quantity: 5, unitPriceCents: BigInt(2000), lineTotalCents: BigInt(10000) },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * Mimic production: each "request" gets its own PrismaClient. This is critical
   * because Prisma 6 does not allow parallel $transaction calls on the same client
   * (the second call times out waiting for a connection). In production, each HTTP
   * request flows through its own server context, so each transaction uses a
   * distinct engine instance.
   */
  it("should allow only one concurrent receive (Promise.allSettled, different keys)", async () => {
    const keyA = "00000000-0000-0000-0000-000000000001";
    const keyB = "00000000-0000-0000-0000-000000000002";

    const clientA = new PrismaClient({ datasources: { db: { url: DATABASE_URL! } } });
    const clientB = new PrismaClient({ datasources: { db: { url: DATABASE_URL! } } });

    try {
      // Fire both receive attempts simultaneously using Promise.allSettled.
      // Each client runs its own $transaction; the row lock in Postgres
      // is the actual serialization mechanism, exactly as in production.
      const results = await Promise.allSettled([
        clientA.$transaction(
          async (tx) => {
            const [lockedPO] = await tx.$queryRawUnsafe<Array<{ id: string; status: string }>>(
              `SELECT id, status FROM purchase_orders WHERE id = $1 FOR UPDATE`,
              poId
            );
            if (!lockedPO) return { status: 404, key: keyA };
            if (lockedPO.status !== "PLACED") return { status: 409, key: keyA, message: "ALREADY_PROCESSED" };

            const po = await tx.purchaseOrder.findUnique({
              where: { id: poId },
              include: { lineItems: true },
            });
            if (!po || po.lineItems.length === 0) return { status: 409, key: keyA };

            for (const lineItem of po.lineItems) {
              const product = await tx.product.findUnique({ where: { id: lineItem.productId } });
              if (!product) continue;
              const newBalance = product.currentStock + lineItem.quantity;
              await tx.stockMovement.create({
                data: {
                  productId: lineItem.productId,
                  purchaseOrderId: poId,
                  delta: lineItem.quantity,
                  balanceAfter: newBalance,
                  reason: "RECEIVE_PO",
                  idempotencyKey: keyA,
                },
              });
              await tx.product.update({ where: { id: lineItem.productId }, data: { currentStock: newBalance } });
            }
            await tx.purchaseOrder.update({
              where: { id: poId },
              data: { status: "RECEIVED", receivedAt: new Date() },
            });
            await tx.receiveIdempotency.create({
              data: { key: keyA, purchaseOrderId: poId, responseHash: "hash-a", status: 200 },
            });
            return { status: 200, key: keyA };
          },
          { timeout: 30000, maxWait: 10000 }
        ),
        clientB.$transaction(
          async (tx) => {
            const [lockedPO] = await tx.$queryRawUnsafe<Array<{ id: string; status: string }>>(
              `SELECT id, status FROM purchase_orders WHERE id = $1 FOR UPDATE`,
              poId
            );
            if (!lockedPO) return { status: 404, key: keyB };
            if (lockedPO.status !== "PLACED") return { status: 409, key: keyB, message: "PO_ALREADY_RECEIVED" };

            const po = await tx.purchaseOrder.findUnique({
              where: { id: poId },
              include: { lineItems: true },
            });
            if (!po || po.lineItems.length === 0) return { status: 409, key: keyB };

            for (const lineItem of po.lineItems) {
              const product = await tx.product.findUnique({ where: { id: lineItem.productId } });
              if (!product) continue;
              const newBalance = product.currentStock + lineItem.quantity;
              await tx.stockMovement.create({
                data: {
                  productId: lineItem.productId,
                  purchaseOrderId: poId,
                  delta: lineItem.quantity,
                  balanceAfter: newBalance,
                  reason: "RECEIVE_PO",
                  idempotencyKey: keyB,
                },
              });
              await tx.product.update({ where: { id: lineItem.productId }, data: { currentStock: newBalance } });
            }
            await tx.purchaseOrder.update({
              where: { id: poId },
              data: { status: "RECEIVED", receivedAt: new Date() },
            });
            await tx.receiveIdempotency.create({
              data: { key: keyB, purchaseOrderId: poId, responseHash: "hash-b", status: 200 },
            });
            return { status: 200, key: keyB };
          },
          { timeout: 30000, maxWait: 10000 }
        ),
      ]);

      // Exactly one should succeed, one should fail
      const successResults = results.filter(
        (r) => r.status === "fulfilled" && (r as PromiseFulfilledResult<any>).value.status === 200
      );
      const conflictResults = results.filter(
        (r) => r.status === "fulfilled" && (r as PromiseFulfilledResult<any>).value.status === 409
      );

      // One must succeed with 200, one must be rejected with 409
      // NOTE: We don't assert which key wins — execution order is non-deterministic.
      expect(successResults.length).toBe(1);
      expect(conflictResults.length).toBe(1);

      // Verify stock: should reflect exactly one receipt (not two)
      const product1 = await prisma.product.findUnique({ where: { id: productIds[0] } });
      const product2 = await prisma.product.findUnique({ where: { id: productIds[1] } });
      expect(product1?.currentStock).toBe(60); // 50 + 10
      expect(product2?.currentStock).toBe(35); // 30 + 5

      // Verify PO status is RECEIVED
      const updatedPO = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
      expect(updatedPO?.status).toBe("RECEIVED");

      // Verify exactly 2 stock movements (one for each product, from the successful receive)
      const movements = await prisma.stockMovement.count({ where: { purchaseOrderId: poId } });
      expect(movements).toBe(2);

      // Verify exactly 1 idempotency record (only the winner recorded it)
      const idempotencyCount = await prisma.receiveIdempotency.count({ where: { purchaseOrderId: poId } });
      expect(idempotencyCount).toBe(1);
    } finally {
      await clientA.$disconnect();
      await clientB.$disconnect();
    }
  });
});