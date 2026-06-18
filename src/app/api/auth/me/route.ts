// src/app/api/auth/me/route.ts — Current user info
// Author: Sudarshan Sonawane

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated." } },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Session expired. Please login again." } },
        { status: 401 }
      );
    }

    return NextResponse.json({
      data: {
        user: {
          email: payload.email,
          name: payload.name,
        },
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
      { status: 500 }
    );
  }
}
