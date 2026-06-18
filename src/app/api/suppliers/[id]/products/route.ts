// src/app/api/suppliers/[id]/products/route.ts — Supplier product linking
// Author: Sudarshan Sonawane

import { NextRequest } from "next/server";
import { handleApiError, apiSuccess, apiNoContent, apiCreated } from "@/server/api-error";
import { linkProductSchema } from "@/validators/supplier";
import * as supplierService from "@/services/supplier-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const products = await supplierService.getSupplierProducts(id);
    return apiSuccess(products);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = linkProductSchema.parse(body);
    const result = await supplierService.linkProduct(id, data);
    return apiCreated(result);
  } catch (error) {
    return handleApiError(error);
  }
}
