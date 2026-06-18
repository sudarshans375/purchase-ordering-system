// src/app/api/dashboard/summary/route.ts — Dashboard summary endpoint
// Author: Sudarshan Sonawane

import { NextResponse } from "next/server";
import { handleApiError } from "@/server/api-error";
import { getDashboardSummary } from "@/services/dashboard-service";

export async function GET() {
  try {
    const summary = await getDashboardSummary();
    return NextResponse.json({ data: summary });
  } catch (error) {
    return handleApiError(error);
  }
}