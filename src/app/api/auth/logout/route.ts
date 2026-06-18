// src/app/api/auth/logout/route.ts — Logout API
// Author: Sudarshan Sonawane

import { NextResponse } from "next/server";
import { COOKIE_OPTIONS } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({
    data: { message: "Logged out successfully." },
  });

  // Clear the session cookie
  response.cookies.set(COOKIE_OPTIONS.name, "", {
    httpOnly: COOKIE_OPTIONS.httpOnly,
    secure: COOKIE_OPTIONS.secure,
    sameSite: COOKIE_OPTIONS.sameSite,
    path: COOKIE_OPTIONS.path,
    maxAge: 0,
  });

  return response;
}
