// src/services/supplier-service.ts — Supplier business logic
// Author: Sudarshan Sonawane

import { prisma } from "@/lib/prisma";
import { ConflictError, ErrorCodes } from "@/lib/errors";
import { translatePrisma } from "@/lib/prisma-error";
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
  const supplier = await translatePrisma(() => supplierRepo.createSupplier(data));
  await invalidateListCache("suppliers");
  return supplier;
}

export async function updateSupplier(
  id: string,
  data: { name?: string; email?: string; phone?: string; address?: string }
) {
  const updated = await translatePrisma(() => supplierRepo.updateSupplier(id, data));
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
  const result = await translatePrisma(() =>
    prisma.$transaction(async (tx) => {
      return supplierRepo.linkProduct(
        supplierId,
        {
          ...data,
          currentPriceCents: BigInt(data.currentPriceCents),
        },
        tx
      );
    })
  );
  await invalidateListCache("suppliers");
  return result;
}

export async function unlinkProduct(supplierId: string, productId: string) {
  await translatePrisma(() => supplierRepo.unlinkProduct(supplierId, productId));
  await invalidateListCache("suppliers");
}

export async function getSupplierProducts(supplierId: string) {
  return supplierRepo.getSupplierProducts(supplierId);
}
