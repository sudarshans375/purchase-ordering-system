// src/server/api-error.ts — API error + success helpers.
// Author: Sudarshan Sonawane

import { NextResponse } from "next/server";
import { errorResponse, errorStatus } from "@/lib/errors";
import { ZodError } from "zod";

/**
 * JSON.stringify replacer that converts BigInt values to strings. Required
 * because NextResponse.json() can't serialize BigInt natively, and our money
 * values are BigInt cents throughout the domain layer.
 */
const BIGINT_REPLACER = (_key: string, value: unknown): unknown => {
  if (typeof value === "bigint") return value.toString();
  return value;
};

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
    // eslint-disable-next-line no-console
    console.error("[api] Internal error:", error);
  }

  return NextResponse.json({ error: body }, { status });
}

/**
 * Serialize a value that may contain BigInt fields to a plain JSON-safe
 * object, then wrap in the standard `{ data }` envelope.
 *
 * IMPORTANT: this is the only safe way to return money from API routes.
 */
export function apiJson<T>(data: T, init?: ResponseInit): NextResponse {
  const body = JSON.parse(JSON.stringify(data, BIGINT_REPLACER));
  return NextResponse.json({ data: body }, init);
}

export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
  return apiJson(data, { status });
}

export function apiCreated<T>(data: T): NextResponse {
  return apiJson(data, { status: 201 });
}

export function apiNoContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}