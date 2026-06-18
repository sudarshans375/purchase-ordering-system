// src/services/po-service.ts — Purchase Order business logic with transactions
// Author: Sudarshan Sonawane

import { prisma } from "@/lib/prisma";
import {
  NotFoundError,
  ConflictError,
  ErrorCodes,
  ValidationError,
} from "@/lib/errors";
import * as poRepo from "@/repositories/po-repo";
import * as productRepo from "@/repositories/product-repo";
import * as supplierRepo from "@/repositories/supplier-repo";
import { assertCanTransition } from "@/domain/po-state";
import { assertValidStockMovement, getStockDelta } from "@/domain/stock";
import { calculateLineTotalCents, assertValidQuantity } from "@/domain/pricing";
import { invalidateListCache } from "@/lib/redis";
import { createHash } from "crypto";
import type { PoStatus } from "@prisma/client";

// ─── List ─────────────────────────────────────────────

export async function listPurchaseOrders(params: {
  page: number;
  pageSize: number;
  status?: PoStatus;
  supplierId?: string;
}) {
  return poRepo.listPurchaseOrders(params);
}

// ─── Get by ID ────────────────────────────────────────

export async function getPurchaseOrderById(id: string) {
  return poRepo.getPurchaseOrderById(id);
}

// ─── Create ───────────────────────────────────────────

export async function createPurchaseOrder(data: {
  supplierId: string;
  notes?: string;
}) {
  // Verify supplier exists
  await supplierRepo.getSupplierById(data.supplierId);

  const poNumber = await poRepo.generatePoNumber();

  const po = await poRepo.createPurchaseOrder({
    poNumber,
    supplierId: data.supplierId,
    notes: data.notes,
  });

  await invalidateListCache("pos");

  return poRepo.getPurchaseOrderById(po.id);
}

// ─── Add Line Item ────────────────────────────────────

export async function addLineItem(
  purchaseOrderId: string,
  data: { productId: string; quantity: number }
) {
  return prisma.$transaction(async (tx) => {
    // Get PO and verify it's DRAFT
    const po = await poRepo.getPurchaseOrderById(purchaseOrderId, tx);
    if (po.status !== "DRAFT") {
      throw new ConflictError(
        ErrorCodes.PO_NOT_DRAFT,
        `Cannot add items to a purchase order that is "${po.status.toLowerCase()}". ` +
        `Only draft purchase orders can be edited.`,
        { purchaseOrderId, currentStatus: po.status }
      );
    }

    // Validate quantity
    assertValidQuantity(data.quantity);

    // Get supplier product price (snapshot)
    const supplierProducts = await supplierRepo.getSupplierProducts(po.supplier.id);
    const supplierProduct = supplierProducts.find(
      (sp) => sp.productId === data.productId
    );

    if (!supplierProduct) {
      throw new ConflictError(
        "PRODUCT_NOT_FROM_SUPPLIER",
        `This product is not available from the purchase order's supplier. ` +
        `Please link the product to the supplier first.`,
        { productId: data.productId, supplierId: po.supplier.id }
      );
    }

    // Snapshot the price at line-add time
    const unitPriceCents = supplierProduct.currentPriceCents;
    const lineTotalCents = calculateLineTotalCents(data.quantity, unitPriceCents);

    // Add line item
    const lineItem = await poRepo.addLineItem(
      purchaseOrderId,
      {
        productId: data.productId,
        quantity: data.quantity,
        unitPriceCents,
        lineTotalCents,
      },
      tx
    );

    // Recalculate PO total
    await poRepo.updatePOLineItemTotals(purchaseOrderId, tx);

    await invalidateListCache("pos");

    return lineItem;
  });
}

// ─── Remove Line Item ─────────────────────────────────

export async function removeLineItem(
  purchaseOrderId: string,
  lineItemId: string
) {
  return prisma.$transaction(async (tx) => {
    const po = await poRepo.getPurchaseOrderById(purchaseOrderId, tx);
    if (po.status !== "DRAFT") {
      throw new ConflictError(
        ErrorCodes.PO_NOT_DRAFT,
        `Cannot remove items from a purchase order that is "${po.status.toLowerCase()}".`,
        { purchaseOrderId, currentStatus: po.status }
      );
    }

    await poRepo.removeLineItem(lineItemId, tx);
    await poRepo.updatePOLineItemTotals(purchaseOrderId, tx);
    await invalidateListCache("pos");
  });
}

// ─── Place ────────────────────────────────────────────

export async function placePurchaseOrder(purchaseOrderId: string) {
  return prisma.$transaction(async (tx) => {
    const po = await poRepo.getPurchaseOrderById(purchaseOrderId, tx);

    assertCanTransition(po.status as PoStatus, "PLACED");

    // Verify PO has line items
    if (po.lineItems.length === 0) {
      throw new ConflictError(
        ErrorCodes.PO_HAS_NO_LINES,
        "Cannot place a purchase order with no line items. " +
        "Please add at least one product before placing.",
        { purchaseOrderId }
      );
    }

    await poRepo.updatePOStatus(
      purchaseOrderId,
      { status: "PLACED", placedAt: new Date() },
      tx
    );

    await invalidateListCache("pos");

    return poRepo.getPurchaseOrderById(purchaseOrderId, tx);
  });
}

// ─── Cancel ───────────────────────────────────────────

export async function cancelPurchaseOrder(purchaseOrderId: string) {
  return prisma.$transaction(async (tx) => {
    const po = await poRepo.getPurchaseOrderById(purchaseOrderId, tx);

    assertCanTransition(po.status as PoStatus, "CANCELLED");

    await poRepo.updatePOStatus(
      purchaseOrderId,
      { status: "CANCELLED", cancelledAt: new Date() },
      tx
    );

    await invalidateListCache("pos");

    return poRepo.getPurchaseOrderById(purchaseOrderId, tx);
  });
}

// ─── Receive (the critical one) ──────────────────────

export async function receivePurchaseOrder(
  purchaseOrderId: string,
  idempotencyKey: string
) {
  // Check idempotency cache (Redis fast path) - done in route handler
  // DB-backed idempotency check happens inside the transaction

  return prisma.$transaction(async (tx) => {
    // Step 1: Lock the PO row with SELECT FOR UPDATE
    // This serializes concurrent receive attempts on the same PO
    const lockedPO = await tx.$queryRawUnsafe<Array<{ id: string; status: string }>>(
      `SELECT id, status FROM purchase_orders WHERE id = $1 FOR UPDATE`,
      purchaseOrderId
    );

    if (!lockedPO || lockedPO.length === 0) {
      throw new NotFoundError("Purchase Order", purchaseOrderId);
    }

    const currentStatus = lockedPO[0].status as PoStatus;

    // Step 2: Assert state transition is legal
    assertCanTransition(currentStatus, "RECEIVED");

    // Step 3: Check idempotency (DB source of truth)
    const existingIdempotency = await poRepo.getIdempotencyRecord(idempotencyKey, tx);
    if (existingIdempotency) {
      // This key was already used - return cached response
      return {
        idempotentCached: true,
        status: existingIdempotency.status,
        responseHash: existingIdempotency.responseHash,
      };
    }

    // Step 4: Check if StockMovement with this idempotency key already exists
    const existingMovement = await poRepo.getStockMovementByIdempotencyKey(
      idempotencyKey,
      tx
    );
    if (existingMovement) {
      // Stock was already updated - PO must be RECEIVED already
      await poRepo.updatePOStatus(
        purchaseOrderId,
        { status: "RECEIVED", receivedAt: new Date() },
        tx
      );
      return {
        idempotentCached: true,
        status: 200,
        responseHash: "",
      };
    }

    // Step 5: Load PO with line items and supplier info
    const po = await poRepo.getPurchaseOrderById(purchaseOrderId, tx);

    if (po.lineItems.length === 0) {
      throw new ConflictError(
        ErrorCodes.PO_HAS_NO_LINES,
        "Cannot receive a purchase order that has no line items.",
        { purchaseOrderId }
      );
    }

    // Step 6: Process each line item - update stock and create movements
    for (const lineItem of po.lineItems) {
      const delta = getStockDelta("RECEIVE_PO", lineItem.quantity);

      // Get current stock and calculate new balance
      const product = await tx.product.findUnique({
        where: { id: lineItem.productId },
        select: { id: true, currentStock: true },
      });

      if (!product) {
        throw new NotFoundError("Product", lineItem.productId);
      }

      // Validate stock movement (will throw if negative stock)
      assertValidStockMovement(product.currentStock, delta, "RECEIVE_PO");

      const newBalance = product.currentStock + delta;

      // Create stock movement record
      await poRepo.createStockMovement(
        {
          productId: lineItem.productId,
          purchaseOrderId,
          delta,
          balanceAfter: newBalance,
          reason: "RECEIVE_PO",
          idempotencyKey,
        },
        tx
      );

      // Update product stock
      await poRepo.updateProductStock(lineItem.productId, newBalance, tx);
    }

    // Step 7: Update PO status
    await poRepo.updatePOStatus(
      purchaseOrderId,
      { status: "RECEIVED", receivedAt: new Date() },
      tx
    );

    // Step 8: Create idempotency record
    const responseBody = JSON.stringify({
      data: {
        id: po.id,
        poNumber: po.poNumber,
        status: "RECEIVED",
        receivedAt: new Date().toISOString(),
        lineItems: po.lineItems.map((li) => ({
          productId: li.productId,
          productName: li.productName,
          quantity: li.quantity,
          unitPriceFormatted: li.unitPriceFormatted,
          lineTotalFormatted: li.lineTotalFormatted,
        })),
        totalFormatted: po.totalFormatted,
      },
    });

    const responseHash = createHash("sha256").update(responseBody).digest("hex");

    await poRepo.createIdempotencyRecord(
      {
        key: idempotencyKey,
        purchaseOrderId,
        responseHash,
        status: 200,
      },
      tx
    );

    await invalidateListCache("pos");
    await invalidateListCache("products");

    return {
      idempotentCached: false,
      status: 200,
      responseBody,
    };
  });
}
