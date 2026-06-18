// src/app/api/products/low-stock/route.ts — Low stock products
// Author: Sudarshan Sonawane

import { handleApiError, apiSuccess } from "@/server/api-error";
import * as productService from "@/services/product-service";

export async function GET() {
  try {
    const products = await productService.getLowStockProducts();
    return apiSuccess(products);
  } catch (error) {
    return handleApiError(error);
  }
}
