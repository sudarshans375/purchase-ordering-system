// src/app/api/suppliers/[id]/route.ts — Supplier detail
// Author: Sudarshan Sonawane

import { NextRequest } from "next/server";
import { handleApiError, apiSuccess } from "@/server/api-error";
import { updateSupplierSchema } from "@/validators/supplier";
import * as supplierService from "@/services/supplier-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supplier = await supplierService.getSupplierById(id);
    return apiSuccess(supplier);
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
    const data = updateSupplierSchema.parse(body);
    const supplier = await supplierService.updateSupplier(id, data);
    return apiSuccess(supplier);
  } catch (error) {
    return handleApiError(error);
  }
}
