// src/app/api/products/[id]/route.ts — Product detail and update
// Author: Sudarshan Sonawane

import { NextRequest } from "next/server";
import { handleApiError, apiSuccess } from "@/server/api-error";
import { updateProductSchema } from "@/validators/product";
import * as productService from "@/services/product-service";
import { serializeBigInts } from "@/lib/utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await productService.getProductById(id);
    return apiSuccess(serializeBigInts(product));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateProductSchema.parse(body);
    const product = await productService.updateProduct(id, data);
    return apiSuccess(serializeBigInts(product));
  } catch (error) {
    return handleApiError(error);
  }
}