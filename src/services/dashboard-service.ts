// src/services/dashboard-service.ts — Aggregations for the dashboard.
// Author: Sudarshan Sonawane

import { prisma } from "@/lib/prisma";
import { subDays } from "date-fns";

/**
 * Single endpoint that returns everything the dashboard needs.
 * Replaces N+1 "pageSize: 1 just to get totals" queries that the old page made.
 */
export async function getDashboardSummary() {
  const now = new Date();
  const last30Days = subDays(now, 30);

  const [
    supplierCount,
    productCount,
    poCount,
    totalInventoryAgg,
    lowStockCount,
    recentOrders,
    recentMovements,
    statusMixRaw,
    topSuppliersRaw,
    spendTrendRaw,
  ] = await Promise.all([
    prisma.supplier.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.purchaseOrder.count(),
    prisma.product.aggregate({ _sum: { currentStock: true } }),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint as count
      FROM products
      WHERE "isActive" = true AND "currentStock" < "reorderLevel"
    `,
    prisma.purchaseOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        supplier: { select: { name: true } },
        _count: { select: { lineItems: true } },
      },
    }),
    prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        product: { select: { name: true, sku: true } },
      },
    }),
    prisma.purchaseOrder.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.$queryRaw<
      Array<{ supplierId: string; supplierName: string; spend: bigint }>
    >`
      SELECT
        po."supplierId",
        s.name as "supplierName",
        SUM(po."totalCents") as spend
      FROM "purchase_orders" po
      JOIN suppliers s ON s.id = po."supplierId"
      WHERE po.status IN ('PLACED', 'RECEIVED')
        AND po."createdAt" >= ${last30Days}
      GROUP BY po."supplierId", s.name
      ORDER BY spend DESC
      LIMIT 5
    `,
    // Spend trend: total cents received per day, last 30 days
    prisma.$queryRaw<Array<{ day: Date; total: bigint }>>`
      SELECT DATE_TRUNC('day', "createdAt") as day, SUM("totalCents") as total
      FROM "purchase_orders"
      WHERE "status" IN ('PLACED', 'RECEIVED')
        AND "createdAt" >= ${last30Days}
      GROUP BY day
      ORDER BY day ASC
    `,
  ]);

  // ─── Shape the response ────────────────────────────
  return {
    totals: {
      suppliers: supplierCount,
      products: productCount,
      purchaseOrders: poCount,
      totalInventory: totalInventoryAgg._sum.currentStock ?? 0,
      lowStockCount: Number(lowStockCount[0]?.count ?? 0),
    },
    recentOrders: recentOrders.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      supplierName: po.supplier.name,
      status: po.status,
      totalCents: po.totalCents.toString(),
      totalFormatted: `$${(Number(po.totalCents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      lineItemCount: po._count.lineItems,
      createdAt: po.createdAt.toISOString(),
    })),
    recentMovements: recentMovements.map((m) => ({
      id: m.id,
      productName: m.product.name,
      productSku: m.product.sku,
      delta: m.delta,
      balanceAfter: m.balanceAfter,
      reason: m.reason,
      purchaseOrderId: m.purchaseOrderId,
      createdAt: m.createdAt.toISOString(),
    })),
    statusMix: statusMixRaw.map((s) => ({
      status: s.status,
      count: s._count.status,
    })),
    topSuppliers: topSuppliersRaw.map((s) => ({
      supplierId: s.supplierId,
      supplierName: s.supplierName,
      spendCents: s.spend.toString(),
      spendFormatted: `$${(Number(s.spend) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    })),
    spendTrend: spendTrendRaw.map((row) => ({
      day: row.day.toISOString().slice(0, 10),
      totalCents: row.total.toString(),
    })),
  };
}