// src/app/api/products/route.ts — Product API routes
// Author: Sudarshan Sonawane

import { NextRequest } from "next/server";
import { handleApiError, apiCreated, apiSuccess } from "@/server/api-error";
import { createProductSchema, productQuerySchema } from "@/validators/product";
import * as productService from "@/services/product-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = productQuerySchema.parse({
      page: searchParams.get("page"),
      pageSize: searchParams.get("pageSize"),
      search: searchParams.get("search"),
      isActive: searchParams.get("isActive"),
      lowStock: searchParams.get("lowStock"),
    });

    const result = await productService.listProducts(params);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createProductSchema.parse(body);
    const product = await productService.createProduct(data);
    return apiCreated(product);
  } catch (error) {
    return handleApiError(error);
  }
}
