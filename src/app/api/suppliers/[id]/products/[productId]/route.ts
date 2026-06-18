// src/app/api/suppliers/[id]/products/[productId]/route.ts — Unlink product
// Author: Sudarshan Sonawane

import { NextRequest } from "next/server";
import { handleApiError, apiNoContent } from "@/server/api-error";
import * as supplierService from "@/services/supplier-service";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const { id, productId } = await params;
    await supplierService.unlinkProduct(id, productId);
    return apiNoContent();
  } catch (error) {
    return handleApiError(error);
  }
}
