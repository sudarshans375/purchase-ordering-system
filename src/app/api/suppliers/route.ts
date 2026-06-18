// src/app/api/suppliers/route.ts — Supplier API routes
// Author: Sudarshan Sonawane

import { NextRequest } from "next/server";
import { handleApiError, apiCreated, apiSuccess } from "@/server/api-error";
import { createSupplierSchema, supplierQuerySchema } from "@/validators/supplier";
import * as supplierService from "@/services/supplier-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = supplierQuerySchema.parse({
      page: searchParams.get("page"),
      pageSize: searchParams.get("pageSize"),
      search: searchParams.get("search"),
      isActive: searchParams.get("isActive"),
    });

    const result = await supplierService.listSuppliers(params);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createSupplierSchema.parse(body);
    const supplier = await supplierService.createSupplier(data);
    return apiCreated(supplier);
  } catch (error) {
    return handleApiError(error);
  }
}
