// src/server/api-error.ts — API error handling
// Author: Sudarshan Sonawane

import { NextResponse } from "next/server";
import { errorResponse, errorStatus } from "@/lib/errors";
import { ZodError } from "zod";

export function handleApiError(error: unknown): NextResponse {
  // Handle Zod validation errors with user-friendly messages
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const message = firstIssue
      ? firstIssue.message
      : "Please check your input and try again.";

    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message,
          details: {
            fields: error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          },
        },
      },
      { status: 422 }
    );
  }

  // Handle domain errors with proper codes and messages
  const status = errorStatus(error);
  const body = errorResponse(error);

  // Log 500s but don't leak details
  if (status === 500) {
    console.error("[api] Internal error:", error);
  }

  return NextResponse.json({ error: body }, { status });
}

export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function apiCreated<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: 201 });
}

export function apiNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
