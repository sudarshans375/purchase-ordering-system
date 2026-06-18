// src/app/api/pos/[id]/receive/route.ts — Receive PO (idempotent + atomic)
// Author: Sudarshan Sonawane

import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/server/api-error";
import { ErrorCodes } from "@/lib/errors";
import * as poService from "@/services/po-service";
import {
  checkRateLimit,
  getIdempotencyCache,
  setIdempotencyCache,
} from "@/lib/redis";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // ── Step 1: Require Idempotency-Key header ──
    const idempotencyKey = request.headers.get("Idempotency-Key");
    if (!idempotencyKey) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCodes.MISSING_IDEMPOTENCY_KEY,
            message:
              "The Idempotency-Key header is required for this endpoint. " +
              "Please include a UUID to ensure safe retries.",
          },
        },
        { status: 422 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(idempotencyKey)) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCodes.VALIDATION_ERROR,
            message:
              "The Idempotency-Key must be a valid UUID " +
              "(e.g., 550e8400-e29b-41d4-a716-446655440000).",
          },
        },
        { status: 422 }
      );
    }

    // ── Step 2: Rate limiting (Redis fast path) ──
    // This is defence-in-depth — idempotency handles retries safely,
    // but rate limiting prevents abuse of the row lock.
    const rateLimit = await checkRateLimit(id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCodes.RECEIVE_RATE_LIMITED,
            message:
              `Too many receive attempts for this purchase order. ` +
              `Please wait ${rateLimit.retryAfter} seconds before trying again.`,
            details: { retryAfterSeconds: rateLimit.retryAfter },
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfter),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // ── Step 3: Check Redis idempotency cache (fast path) ──
    const cached = await getIdempotencyCache(idempotencyKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached.body), {
        status: cached.status,
      });
    }

    // ── Step 4: Execute the transactional receive ──
    const result = await poService.receivePurchaseOrder(id, idempotencyKey);

    // ── Step 5: Handle idempotent cache hit ──
    // On retry, return the byte-equal original response body captured at the
    // time of the first successful receive. This is what the brief means by
    // "idempotent": the second call is indistinguishable from the first.
    if (result.idempotentCached) {
      if (result.responseBody) {
        // Cache hit AND we have the original body — replay it verbatim.
        return new NextResponse(result.responseBody, {
          status: result.status,
          headers: { "Content-Type": "application/json", "X-Idempotent-Replay": "true" },
        });
      }

      // Defensive: cache row exists but body is missing (older data, recovery
      // path). Fall back to a friendly idempotent message so clients still get
      // a deterministic response.
      if (result.status === 200) {
        return NextResponse.json(
          {
            data: {
              id,
              status: "RECEIVED",
              message: "This purchase order was already received (idempotent retry).",
            },
          },
          { status: 200, headers: { "X-Idempotent-Replay": "true" } }
        );
      }

      return NextResponse.json(
        {
          error: {
            code: ErrorCodes.PO_ALREADY_RECEIVED,
            message:
              "This purchase order has already been received. " +
              "No further changes are allowed.",
            details: { purchaseOrderId: id },
          },
        },
        { status: result.status, headers: { "X-Idempotent-Replay": "true" } }
      );
    }

    // ── Step 6: Cache the response in Redis ──
    if (result.responseBody) {
      await setIdempotencyCache(idempotencyKey, 200, result.responseBody);
    }

    // ── Step 7: Return success ──
    return new NextResponse(result.responseBody!, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
