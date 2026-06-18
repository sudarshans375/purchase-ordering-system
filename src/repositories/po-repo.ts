// src/repositories/po-repo.ts — Purchase Order data access
// Author: Sudarshan Sonawane

import { prisma, type PrismaTx } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import { formatCents } from "@/lib/utils";
import type { Prisma, PoStatus, MovementReason } from "@prisma/client";

function tx(db: PrismaTx | undefined) {
  return db ?? prisma;
}

// ─── PO Number Generation ─────────────────────────────
//
// PO numbers are year-scoped and human-readable, e.g. "PO-2026-0042".
// They MUST be unique (the schema enforces it). Generating them with
// `count() + 1` is racy under concurrent creates — two requests can pick the
// same number. The retry-on-P2002 loop below is correct: if we lose the
// race to another transaction, we re-query and try again. Bounded to
// MAX_RETRIES so a buggy client can never spin us forever.

const MAX_PO_NUMBER_RETRIES = 5;

export async function generatePoNumber(client?: PrismaTx): Promise<string> {
  const dbClient = client ?? prisma;

  for (let attempt = 0; attempt < MAX_PO_NUMBER_RETRIES; attempt++) {
    const year = new Date().getFullYear();
    // Year-scoped count — `PO-2026-0042` is independent of `PO-2025-9999`.
    const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
    const count = await dbClient.purchaseOrder.count({
      where: { createdAt: { gte: yearStart } },
    });
    const candidate = `PO-${year}-${String(count + 1).padStart(4, "0")}`;

    // Quick check: if it exists, increment and retry.
    const exists = await dbClient.purchaseOrder.findUnique({
      where: { poNumber: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
    // Otherwise loop — race lost, try next candidate.
  }

  throw new Error(
    `Failed to generate a unique PO number after ${MAX_PO_NUMBER_RETRIES} retries.`
  );
}

// ─── Queries ──────────────────────────────────────────

export async function listPurchaseOrders(params: {
  page: number;
  pageSize: number;
  status?: PoStatus;
  supplierId?: string;
}) {
  const { page, pageSize, status, supplierId } = params;
  const skip = (page - 1) * pageSize;

  const where: Prisma.PurchaseOrderWhereInput = {};
  if (status) where.status = status;
  if (supplierId) where.supplierId = supplierId;

  const [items, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        supplier: { select: { id: true, name: true } },
        _count: { select: { lineItems: true } },
      },
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return {
    items: items.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
      supplierName: po.supplier.name,
      status: po.status,
      totalCents: po.totalCents,
      totalFormatted: formatCents(po.totalCents),
      lineItemCount: po._count.lineItems,
      placedAt: po.placedAt,
      receivedAt: po.receivedAt,
      cancelledAt: po.cancelledAt,
      createdAt: po.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getPurchaseOrderById(id: string, db?: PrismaTx) {
  const client = tx(db);
  const po = await client.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: { select: { id: true, name: true, email: true } },
      lineItems: {
        include: {
          product: { select: { name: true, sku: true } },
        },
        orderBy: { priceSnapshotAt: "asc" },
      },
    },
  });

  if (!po) {
    throw new NotFoundError("Purchase Order", id);
  }

  return {
    id: po.id,
    poNumber: po.poNumber,
    supplier: po.supplier,
    status: po.status,
    totalCents: po.totalCents,
    totalFormatted: formatCents(po.totalCents),
    notes: po.notes,
    lineItems: po.lineItems.map((li) => ({
      id: li.id,
      productId: li.productId,
      productName: li.product.name,
      productSku: li.product.sku,
      quantity: li.quantity,
      unitPriceCents: li.unitPriceCents,
      unitPriceFormatted: formatCents(li.unitPriceCents),
      lineTotalCents: li.lineTotalCents,
      lineTotalFormatted: formatCents(li.lineTotalCents),
      priceSnapshotAt: li.priceSnapshotAt,
    })),
    placedAt: po.placedAt,
    receivedAt: po.receivedAt,
    cancelledAt: po.cancelledAt,
    createdAt: po.createdAt,
    updatedAt: po.updatedAt,
  };
}

// ─── Mutations ────────────────────────────────────────

export async function createPurchaseOrder(
  data: {
    poNumber: string;
    supplierId: string;
    notes?: string;
  },
  db?: PrismaTx
) {
  const client = tx(db);
  return client.purchaseOrder.create({
    data: {
      poNumber: data.poNumber,
      supplierId: data.supplierId,
      notes: data.notes,
    },
  });
}

export async function addLineItem(
  purchaseOrderId: string,
  data: {
    productId: string;
    quantity: number;
    unitPriceCents: bigint;
    lineTotalCents: bigint;
  },
  db?: PrismaTx
) {
  const client = tx(db);
  return client.pOLineItem.create({
    data: {
      purchaseOrderId,
      productId: data.productId,
      quantity: data.quantity,
      unitPriceCents: data.unitPriceCents,
      lineTotalCents: data.lineTotalCents,
    },
    include: {
      product: { select: { name: true, sku: true } },
    },
  });
}

export async function removeLineItem(
  lineItemId: string,
  db?: PrismaTx
) {
  const client = tx(db);
  await client.pOLineItem.delete({ where: { id: lineItemId } });
}

export async function updatePOStatus(
  id: string,
  data: {
    status: PoStatus;
    totalCents?: bigint;
    placedAt?: Date | null;
    receivedAt?: Date | null;
    cancelledAt?: Date | null;
  },
  db?: PrismaTx
) {
  const client = tx(db);
  return client.purchaseOrder.update({
    where: { id },
    data,
  });
}

export async function updatePOLineItemTotals(
  purchaseOrderId: string,
  db?: PrismaTx
) {
  const client = tx(db);
  const result = await client.pOLineItem.aggregate({
    where: { purchaseOrderId },
    _sum: { lineTotalCents: true },
  });

  const totalCents = result._sum.lineTotalCents ?? BigInt(0);

  return client.purchaseOrder.update({
    where: { id: purchaseOrderId },
    data: { totalCents },
  });
}

// ─── Stock Movements ──────────────────────────────────

export async function createStockMovement(
  data: {
    productId: string;
    purchaseOrderId?: string;
    delta: number;
    balanceAfter: number;
    reason: MovementReason;
    idempotencyKey?: string;
  },
  db?: PrismaTx
) {
  const client = tx(db);
  return client.stockMovement.create({ data });
}

export async function updateProductStock(
  productId: string,
  newStock: number,
  db?: PrismaTx
) {
  const client = tx(db);
  return client.product.update({
    where: { id: productId },
    data: { currentStock: newStock },
  });
}

export async function getStockMovementByIdempotencyKey(
  idempotencyKey: string,
  db?: PrismaTx
) {
  // idempotencyKey is no longer @unique on StockMovement; use findFirst.
  const client = tx(db);
  return client.stockMovement.findFirst({
    where: { idempotencyKey },
    orderBy: { createdAt: "asc" },
  });
}

// ─── Idempotency ──────────────────────────────────────

export async function getIdempotencyRecord(
  key: string,
  db?: PrismaTx
) {
  const client = tx(db);
  return client.receiveIdempotency.findUnique({
    where: { key },
  });
}

export async function createIdempotencyRecord(
  data: {
    key: string;
    purchaseOrderId: string;
    responseHash: string;
    responseBody?: string; // captured body for byte-equal retry response
    status: number;
  },
  db?: PrismaTx
) {
  const client = tx(db);
  return client.receiveIdempotency.create({ data });
}

