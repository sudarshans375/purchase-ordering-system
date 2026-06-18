// src/services/supplier-service.ts — Supplier business logic
// Author: Sudarshan Sonawane

import { prisma } from "@/lib/prisma";
import { ConflictError, ErrorCodes } from "@/lib/errors";
import * as supplierRepo from "@/repositories/supplier-repo";
import { invalidateListCache } from "@/lib/redis";

export async function listSuppliers(params: {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
}) {
  return supplierRepo.listSuppliers(params);
}

export async function getSupplierById(id: string) {
  return supplierRepo.getSupplierById(id);
}

export async function createSupplier(data: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}) {
  const supplier = await supplierRepo.createSupplier(data);
  await invalidateListCache("suppliers");
  return supplier;
}

export async function updateSupplier(
  id: string,
  data: { name?: string; email?: string; phone?: string; address?: string }
) {
  const updated = await supplierRepo.updateSupplier(id, data);
  await invalidateListCache("suppliers");
  return updated;
}

export async function linkProduct(
  supplierId: string,
  data: {
    productId: string;
    supplierSku?: string;
    currentPriceCents: number;
    leadTimeDays?: number;
    isPreferred?: boolean;
  }
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      return supplierRepo.linkProduct(supplierId, {
        ...data,
        currentPriceCents: BigInt(data.currentPriceCents),
      }, tx);
    });
    await invalidateListCache("suppliers");
    return result;
  } catch (error: any) {
    if (error?.code === "P2002" && error?.meta?.target?.includes("supplierSku")) {
      throw new ConflictError(
        ErrorCodes.SUPPLIER_SKU_DUPLICATE,
        `A product with this supplier SKU already exists for this supplier.`,
        { supplierId, supplierSku: data.supplierSku }
      );
    }
    throw error;
  }
}

export async function unlinkProduct(supplierId: string, productId: string) {
  await supplierRepo.unlinkProduct(supplierId, productId);
  await invalidateListCache("suppliers");
}

export async function getSupplierProducts(supplierId: string) {
  return supplierRepo.getSupplierProducts(supplierId);
}
