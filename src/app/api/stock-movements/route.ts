// src/app/api/stock-movements/route.ts — Stock movements history
// Author: Sudarshan Sonawane

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/server/api-error";
import { prisma } from "@/lib/prisma";
import { Prisma, type MovementReason } from "@prisma/client";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20).catch(20),
  productId: z.string().optional().catch(undefined),
  reason: z
    .enum(["RECEIVE_PO", "CANCEL_PO", "ADJUSTMENT_INITIAL"])
    .optional()
    .catch(undefined),
  purchaseOrderId: z.string().optional().catch(undefined),
  since: z.coerce.date().optional().catch(undefined),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse({
      page: searchParams.get("page"),
      pageSize: searchParams.get("pageSize"),
      productId: searchParams.get("productId"),
      reason: searchParams.get("reason"),
      purchaseOrderId: searchParams.get("purchaseOrderId"),
      since: searchParams.get("since"),
    });

    const where: Prisma.StockMovementWhereInput = {
      ...(params.productId && { productId: params.productId }),
      ...(params.reason && { reason: params.reason as MovementReason }),
      ...(params.purchaseOrderId && { purchaseOrderId: params.purchaseOrderId }),
      ...(params.since && { createdAt: { gte: params.since } }),
    };

    const [items, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { name: true, sku: true } },
          purchaseOrder: { select: { poNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return NextResponse.json({
      data: {
        items: items.map((m) => ({
          id: m.id,
          productId: m.productId,
          productName: m.product.name,
          productSku: m.product.sku,
          delta: m.delta,
          balanceAfter: m.balanceAfter,
          reason: m.reason,
          purchaseOrderId: m.purchaseOrderId,
          purchaseOrderNumber: m.purchaseOrder?.poNumber ?? null,
          createdAt: m.createdAt.toISOString(),
        })),
        total,
        page: params.page,
        pageSize: params.pageSize,
        totalPages: Math.ceil(total / params.pageSize),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}