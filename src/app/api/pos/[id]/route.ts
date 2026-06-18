// src/app/api/pos/[id]/route.ts — PO detail
// Author: Sudarshan Sonawane

import { NextRequest } from "next/server";
import { handleApiError, apiSuccess } from "@/server/api-error";
import * as poService from "@/services/po-service";
import { serializeBigInts } from "@/lib/utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const po = await poService.getPurchaseOrderById(id);
    return apiSuccess(serializeBigInts(po));
  } catch (error) {
    return handleApiError(error);
  }
}