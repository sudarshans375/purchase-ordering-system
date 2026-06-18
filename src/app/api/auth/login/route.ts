// src/app/api/auth/login/route.ts — Login API
// Author: Sudarshan Sonawane

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, COOKIE_OPTIONS } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Please enter your password."),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const result = await authenticate(email, password);

    if (!result.success || !result.token) {
      return NextResponse.json(
        { error: { code: "AUTH_FAILED", message: result.error || "Authentication failed." } },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      data: { user: result.user },
    });

    // Set session cookie
    response.cookies.set(COOKIE_OPTIONS.name, result.token, {
      httpOnly: COOKIE_OPTIONS.httpOnly,
      secure: COOKIE_OPTIONS.secure,
      sameSite: COOKIE_OPTIONS.sameSite,
      path: COOKIE_OPTIONS.path,
      maxAge: COOKIE_OPTIONS.maxAge,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: error.issues[0]?.message || "Invalid input.",
          },
        },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } },
      { status: 500 }
    );
  }
}
