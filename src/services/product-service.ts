// src/services/product-service.ts — Product business logic
// Author: Sudarshan Sonawane

import { prisma } from "@/lib/prisma";
import { translatePrisma } from "@/lib/prisma-error";
import * as productRepo from "@/repositories/product-repo";
import { invalidateListCache } from "@/lib/redis";

export async function listProducts(params: {
  page: number;
  pageSize: number;
  search?: string;
  isActive?: boolean;
  lowStock?: boolean;
}) {
  return productRepo.listProducts(params);
}

export async function getProductById(id: string) {
  return productRepo.getProductById(id);
}

export async function createProduct(data: {
  sku: string;
  name: string;
  description?: string;
  reorderLevel?: number;
}) {
  const product = await translatePrisma(() =>
    productRepo.createProduct({
      ...data,
      reorderLevel: data.reorderLevel ?? 10,
    })
  );
  await invalidateListCache("products");
  return product;
}

export async function updateProduct(
  id: string,
  data: { reorderLevel: number }
) {
  const updated = await translatePrisma(() => productRepo.updateProduct(id, data));
  await invalidateListCache("products");
  return updated;
}

export async function getLowStockProducts() {
  return productRepo.getLowStockProducts();
}