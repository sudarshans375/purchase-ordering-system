// src/repositories/supplier-repo.ts — Supplier data access
// Author: Sudarshan Sonawane

import { prisma, type PrismaTx } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";
import type { Prisma } from "@prisma/client";

function tx(db: PrismaTx | undefined) {
  return db ?? prisma;
}

// ─── Queries ──────────────────────────────────────────

export async function listSuppliers(params: {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
}) {
  const { page, pageSize, search, isActive } = params;
  const skip = (page - 1) * pageSize;

  const where: Prisma.SupplierWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const [items, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true, pos: true },
        },
      },
    }),
    prisma.supplier.count({ where }),
  ]);

  return {
    items: items.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      isActive: s.isActive,
      productCount: s._count.products,
      poCount: s._count.pos,
      createdAt: s.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getSupplierById(id: string, db?: PrismaTx) {
  const client = tx(db);
  const supplier = await client.supplier.findUnique({
    where: { id },
    include: {
      products: {
        include: {
          product: true,
        },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: { pos: true },
      },
    },
  });

  if (!supplier) {
    throw new NotFoundError("Supplier", id);
  }

  return {
    id: supplier.id,
    name: supplier.name,
    email: supplier.email,
    phone: supplier.phone,
    address: supplier.address,
    isActive: supplier.isActive,
    products: supplier.products.map((sp) => ({
      productId: sp.productId,
      productName: sp.product.name,
      productSku: sp.product.sku,
      supplierSku: sp.supplierSku,
      currentPriceCents: sp.currentPriceCents,
      leadTimeDays: sp.leadTimeDays,
      isPreferred: sp.isPreferred,
    })),
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
  };
}

export async function createSupplier(
  data: { name: string; email?: string; phone?: string; address?: string },
  db?: PrismaTx
) {
  const client = tx(db);
  return client.supplier.create({ data });
}

export async function updateSupplier(
  id: string,
  data: { name?: string; email?: string; phone?: string; address?: string },
  db?: PrismaTx
) {
  const client = tx(db);
  const existing = await client.supplier.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Supplier", id);

  return client.supplier.update({ where: { id }, data });
}

export async function linkProduct(
  supplierId: string,
  data: {
    productId: string;
    supplierSku?: string;
    currentPriceCents: bigint;
    leadTimeDays?: number;
    isPreferred?: boolean;
  },
  db?: PrismaTx
) {
  const client = tx(db);
  const supplier = await client.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw new NotFoundError("Supplier", supplierId);

  const product = await client.product.findUnique({ where: { id: data.productId } });
  if (!product) throw new NotFoundError("Product", data.productId);

  return client.supplierProduct.create({
    data: {
      supplierId,
      productId: data.productId,
      supplierSku: data.supplierSku,
      currentPriceCents: data.currentPriceCents,
      leadTimeDays: data.leadTimeDays,
      isPreferred: data.isPreferred ?? false,
    },
  });
}

export async function unlinkProduct(supplierId: string, productId: string, db?: PrismaTx) {
  const client = tx(db);
  await client.supplierProduct.delete({
    where: { supplierId_productId: { supplierId, productId } },
  });
}

export async function getSupplierProducts(supplierId: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw new NotFoundError("Supplier", supplierId);

  return prisma.supplierProduct.findMany({
    where: { supplierId },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });
}
