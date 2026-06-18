// src/app/api/pos/[id]/lines/route.ts — Add line item
// Author: Sudarshan Sonawane

import { NextRequest } from "next/server";
import { handleApiError, apiCreated } from "@/server/api-error";
import { addLineItemSchema } from "@/validators/po";
import * as poService from "@/services/po-service";
import { serializeBigInts } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = addLineItemSchema.parse(body);
    const lineItem = await poService.addLineItem(id, data);
    return apiCreated(serializeBigInts(lineItem));
  } catch (error) {
    return handleApiError(error);
  }
}