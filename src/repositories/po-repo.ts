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

export async function generatePoNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.purchaseOrder.count();
  return `PO-${year}-${String(count + 1).padStart(4, "0")}`;
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
  const client = tx(db);
  return client.stockMovement.findUnique({
    where: { idempotencyKey },
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
    status: number;
  },
  db?: PrismaTx
) {
  const client = tx(db);
  return client.receiveIdempotency.create({ data });
}

