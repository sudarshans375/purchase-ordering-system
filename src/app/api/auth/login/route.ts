// src/app/api/auth/login/route.ts — Login API
// Author: Sudarshan Sonawane

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, COOKIE_OPTIONS } from "@/lib/auth";
import { checkIpRateLimit } from "@/lib/redis";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Please enter your password."),
});

// Login rate limit: 5 attempts per IP per minute. Beyond this, return 429.
// Note: this throttles credential-stuffing. We use IP-only as the bucket
// (not email) so attackers cannot lock out a real user by hammering their
// account from many IPs.
const LOGIN_MAX = 5;
const LOGIN_WINDOW_SECS = 60;

function getClientIp(request: NextRequest): string {
  // Honour common proxy headers, falling back to a constant if none set.
  // Caddy/Nginx should set X-Forwarded-For; the platform's edge will too.
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get("x-real-ip") ?? "unknown"
  );
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit FIRST (before parse, so even invalid requests count).
    const ip = getClientIp(request);
    const limit = await checkIpRateLimit(ip, "login", LOGIN_MAX, LOGIN_WINDOW_SECS);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: `Too many login attempts. Try again in ${limit.retryAfter} seconds.`,
            details: { retryAfterSeconds: limit.retryAfter },
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(limit.retryAfter),
            "X-RateLimit-Limit": String(LOGIN_MAX),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

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