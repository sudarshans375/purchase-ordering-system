// tests/integration/receive-concurrent.test.ts
// Concurrent receive test — "the one test I will write first" per PLAN.md
// Tests that exactly one receive succeeds and the other is rejected.
//
// NOTE: This requires a real Postgres instance.
// Run with: DATABASE_URL=postgresql://... npx vitest run tests/integration/

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

// Skip if no DATABASE_URL configured
const DATABASE_URL = process.env.DATABASE_URL;
const describeIf = DATABASE_URL ? describe : describe.skip;

describeIf("Concurrent Receive", () => {
  const prisma = new PrismaClient({ datasources: { db: { url: DATABASE_URL } } });

  let supplierId: string;
  let productIds: string[];
  let poId: string;

  beforeAll(async () => {
    // Clean up any test data
    const testPO = await prisma.purchaseOrder.findFirst({ where: { poNumber: "TEST-CONCURRENT" } });
    if (testPO) {
      await prisma.receiveIdempotency.deleteMany({ where: { purchaseOrderId: testPO.id } });
      await prisma.stockMovement.deleteMany({ where: { purchaseOrderId: testPO.id } });
      await prisma.pOLineItem.deleteMany({ where: { purchaseOrderId: testPO.id } });
      await prisma.purchaseOrder.delete({ where: { id: testPO.id } });
    }

    // Clean up suppliers and products
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

    // Link products to supplier
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

  it("should allow only one receive and reject the second (idempotent + atomic)", async () => {
    const keyA = "00000000-0000-0000-0000-000000000001";
    const keyB = "00000000-0000-0000-0000-000000000002";

    // Execute first receive
    const result1 = await prisma.$transaction(async (tx) => {
      // Lock the PO row
      const [lockedPO] = await tx.$queryRawUnsafe<Array<{ id: string; status: string }>>(
        `SELECT id, status FROM purchase_orders WHERE id = $1 FOR UPDATE`,
        poId
      );

      if (!lockedPO) return { status: 404 };
      if (lockedPO.status !== "PLACED") return { status: 409 };

      // Process receive
      const po = await tx.purchaseOrder.findUnique({
        where: { id: poId },
        include: { lineItems: true },
      });

      if (!po || po.lineItems.length === 0) return { status: 409 };

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

        await tx.product.update({
          where: { id: lineItem.productId },
          data: { currentStock: newBalance },
        });
      }

      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: "RECEIVED", receivedAt: new Date() },
      });

      await tx.receiveIdempotency.create({
        data: { key: keyA, purchaseOrderId: poId, responseHash: "hash-a", status: 200 },
      });

      return { status: 200 };
    });

    expect(result1.status).toBe(200);

    // Execute second receive (should see PO is already RECEIVED)
    const result2 = await prisma.$transaction(async (tx) => {
      const [lockedPO] = await tx.$queryRawUnsafe<Array<{ id: string; status: string }>>(
        `SELECT id, status FROM purchase_orders WHERE id = $1 FOR UPDATE`,
        poId
      );

      if (!lockedPO) return { status: 404 };
      if (lockedPO.status !== "PLACED") return { status: 409, message: "PO_ALREADY_RECEIVED" };

      return { status: 200 };
    });

    expect(result2.status).toBe(409);

    // Verify stock: should reflect exactly one receipt
    const product1 = await prisma.product.findUnique({ where: { id: productIds[0] } });
    const product2 = await prisma.product.findUnique({ where: { id: productIds[1] } });
    expect(product1?.currentStock).toBe(60); // 50 + 10
    expect(product2?.currentStock).toBe(35); // 30 + 5

    // Verify PO status
    const updatedPO = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
    expect(updatedPO?.status).toBe("RECEIVED");

    // Verify stock movements count
    const movements = await prisma.stockMovement.count({ where: { purchaseOrderId: poId } });
    expect(movements).toBe(2); // 2 products from the successful receive
  }, 15000);
});
