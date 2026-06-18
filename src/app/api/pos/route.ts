// src/app/api/pos/route.ts — Purchase Order list and create
// Author: Sudarshan Sonawane

import { NextRequest } from "next/server";
import { handleApiError, apiCreated, apiSuccess } from "@/server/api-error";
import { createPurchaseOrderSchema, poQuerySchema } from "@/validators/po";
import * as poService from "@/services/po-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = poQuerySchema.parse({
      page: searchParams.get("page"),
      pageSize: searchParams.get("pageSize"),
      status: searchParams.get("status"),
      supplierId: searchParams.get("supplierId"),
    });

    const result = await poService.listPurchaseOrders(params);
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createPurchaseOrderSchema.parse(body);
    const po = await poService.createPurchaseOrder(data);
    return apiCreated(po);
  } catch (error) {
    return handleApiError(error);
  }
}
