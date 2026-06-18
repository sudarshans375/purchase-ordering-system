// src/app/api/pos/[id]/lines/[lineId]/route.ts — Remove line item
// Author: Sudarshan Sonawane

import { NextRequest } from "next/server";
import { handleApiError, apiNoContent } from "@/server/api-error";
import * as poService from "@/services/po-service";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  try {
    const { id, lineId } = await params;
    await poService.removeLineItem(id, lineId);
    return apiNoContent();
  } catch (error) {
    return handleApiError(error);
  }
}
