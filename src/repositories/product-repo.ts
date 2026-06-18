// src/repositories/product-repo.ts — Product data access
// Author: Sudarshan Sonawane

import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import type { Prisma } from "@prisma/client";

// ─── Queries ──────────────────────────────────────────

export async function listProducts(params: {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
  lowStock?: boolean;
}) {
  const { page, pageSize, search, isActive, lowStock } = params;
  const skip = (page - 1) * pageSize;

  const where: Prisma.ProductWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (lowStock) {
    // Cannot compare two columns in a single Prisma where clause; use raw SQL
    // via $queryRaw so the DB does the comparison server-side.
    // (Prisma's `prisma.product.fields.reorderLevel` is not a valid reference
    // for cross-column comparison in a typed where.)
    const lowStockIds = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM products
      WHERE "currentStock" < "reorderLevel"
        AND "isActive" = true
    `;
    const ids = lowStockIds.map((r) => r.id);
    where.id = { in: ids.length > 0 ? ids : ["__none__"] };
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { suppliers: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: items.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      description: p.description,
      currentStock: p.currentStock,
      reorderLevel: p.reorderLevel,
      isLowStock: p.currentStock < p.reorderLevel,
      isActive: p.isActive,
      supplierCount: p._count.suppliers,
      updatedAt: p.updatedAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      suppliers: {
        include: {
          supplier: true,
        },
        orderBy: { isPreferred: "desc" },
      },
      _count: {
        select: { lineItems: true },
      },
    },
  });

  if (!product) {
    throw new NotFoundError("Product", id);
  }

  return product;
}

export async function createProduct(data: {
  sku: string;
  name: string;
  description?: string;
  currentStock?: number;
  reorderLevel?: number;
}) {
  return prisma.product.create({ data });
}

export async function updateProduct(
  id: string,
  data: { reorderLevel?: number }
) {
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Product", id);

  return prisma.product.update({ where: { id }, data });
}

export async function getLowStockProducts() {
  const products = await prisma.$queryRaw<
    Array<{
      id: string;
      sku: string;
      name: string;
      description: string | null;
      currentStock: number;
      reorderLevel: number;
      isActive: boolean;
      updatedAt: Date;
    }>
  >`
    SELECT id, sku, name, description, "currentStock", "reorderLevel", "isActive", "updatedAt"
    FROM products
    WHERE "isActive" = true AND "currentStock" < "reorderLevel"
    ORDER BY "currentStock" ASC
  `;

  const supplierCounts = await prisma.supplierProduct.groupBy({
    by: ["productId"],
    _count: { productId: true },
    where: { productId: { in: products.map((p) => p.id) } },
  });
  const supplierCountMap = new Map(
    supplierCounts.map((s) => [s.productId, s._count.productId])
  );

  return products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    description: p.description,
    currentStock: p.currentStock,
    reorderLevel: p.reorderLevel,
    isLowStock: true,
    isActive: p.isActive,
    supplierCount: supplierCountMap.get(p.id) ?? 0,
    deficit: p.reorderLevel - p.currentStock,
    updatedAt: p.updatedAt,
  }));
}
