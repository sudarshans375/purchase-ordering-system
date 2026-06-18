// src/lib/errors.ts — Domain error classes
// Author: Sudarshan Sonawane

export class DomainError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    statusCode: number = 400,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super(
      `${resource.toUpperCase()}_NOT_FOUND`,
      `${resource} with ID "${id}" was not found.`,
      404,
      { resource, id }
    );
    this.name = "NotFoundError";
  }
}

export class ConflictError extends DomainError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, 409, details);
    this.name = "ConflictError";
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("VALIDATION_ERROR", message, 422, details);
    this.name = "ValidationError";
  }
}

// ─── Error Codes ────────────────────────────────────

export const ErrorCodes = {
  // PO State Machine
  PO_NOT_FOUND: "PO_NOT_FOUND",
  PO_ALREADY_RECEIVED: "PO_ALREADY_RECEIVED",
  PO_ALREADY_CANCELLED: "PO_ALREADY_CANCELLED",
  PO_ALREADY_PLACED: "PO_ALREADY_PLACED",
  PO_HAS_NO_LINES: "PO_HAS_NO_LINES",
  PO_ILLEGAL_TRANSITION: "PO_ILLEGAL_TRANSITION",
  PO_NOT_DRAFT: "PO_NOT_DRAFT",
  PO_NOT_PLACED: "PO_NOT_PLACED",

  // Receiving
  RECEIVE_IDEMPOTENT_MISMATCH: "RECEIVE_IDEMPOTENT_MISMATCH",
  RECEIVE_RATE_LIMITED: "RECEIVE_RATE_LIMITED",
  MISSING_IDEMPOTENCY_KEY: "MISSING_IDEMPOTENCY_KEY",
  INVALID_IDEMPOTENCY_KEY: "INVALID_IDEMPOTENCY_KEY",

  // Suppliers
  SUPPLIER_NOT_FOUND: "SUPPLIER_NOT_FOUND",
  SUPPLIER_SKU_DUPLICATE: "SUPPLIER_SKU_DUPLICATE",
  PRODUCT_NOT_FROM_SUPPLIER: "PRODUCT_NOT_FROM_SUPPLIER",

  // Products
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  PRODUCT_SKU_DUPLICATE: "PRODUCT_SKU_DUPLICATE",
  PRODUCT_ALREADY_IN_PO: "PRODUCT_ALREADY_IN_PO",

  // Line Items
  LINE_ITEM_NOT_FOUND: "LINE_ITEM_NOT_FOUND",
  LINE_ITEM_NOT_IN_DRAFT: "LINE_ITEM_NOT_IN_DRAFT",

  // Stock
  NEGATIVE_STOCK: "NEGATIVE_STOCK",
  STOCK_MOVEMENT_FAILED: "STOCK_MOVEMENT_FAILED",

  // General
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ─── Error Response Helper ──────────────────────────

export function errorResponse(
  error: unknown
): { code: string; message: string; details?: Record<string, unknown> } {
  if (error instanceof DomainError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    console.error("[unhandled]", error);
    return {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred. Please try again later.",
    };
  }

  return {
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred.",
  };
}

export function errorStatus(error: unknown): number {
  if (error instanceof DomainError) return error.statusCode;
  return 500;
}
