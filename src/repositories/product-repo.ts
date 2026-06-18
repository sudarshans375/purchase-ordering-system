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
    where.currentStock = { lt: prisma.product.fields.reorderLevel };
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
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      currentStock: { lt: prisma.product.fields.reorderLevel },
    },
    orderBy: [{ currentStock: "asc" }],
    include: {
      _count: { select: { suppliers: true } },
    },
  });

  return products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    description: p.description,
    currentStock: p.currentStock,
    reorderLevel: p.reorderLevel,
    isLowStock: true,
    isActive: p.isActive,
    supplierCount: p._count.suppliers,
    deficit: p.reorderLevel - p.currentStock,
    updatedAt: p.updatedAt,
  }));
}
