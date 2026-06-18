// src/app/api/pos/[id]/cancel/route.ts — Cancel PO
// Author: Sudarshan Sonawane

import { NextRequest } from "next/server";
import { handleApiError, apiSuccess } from "@/server/api-error";
import * as poService from "@/services/po-service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const po = await poService.cancelPurchaseOrder(id);
    return apiSuccess(po);
  } catch (error) {
    return handleApiError(error);
  }
}
