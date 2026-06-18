// src/domain/stock.ts — Stock movement domain logic
// Author: Sudarshan Sonawane

import { ConflictError, ErrorCodes } from "@/lib/errors";
import type { MovementReasonUnion } from "@/types";

/**
 * Applies a stock movement and returns the new balance.
 * This is a pure function — it doesn't touch the database.
 */
export function calculateNewBalance(
  currentStock: number,
  delta: number
): number {
  return currentStock + delta;
}

/**
 * Validates a stock movement before applying it.
 * Returns an array of error messages. Empty array means valid.
 */
export function validateStockMovement(
  currentStock: number,
  delta: number,
  reason: MovementReasonUnion
): string[] {
  const errors: string[] = [];

  if (delta === 0) {
    errors.push("Stock movement delta must not be zero.");
  }

  const newBalance = calculateNewBalance(currentStock, delta);

  if (newBalance < 0) {
    errors.push(
      `Cannot complete this operation — it would result in negative stock ` +
      `(current: ${currentStock}, change: ${delta >= 0 ? "+" : ""}${delta}).`
    );
  }

  return errors;
}

/**
 * Asserts that a stock movement is valid. Throws on invalid.
 */
export function assertValidStockMovement(
  currentStock: number,
  delta: number,
  reason: MovementReasonUnion
): void {
  const errors = validateStockMovement(currentStock, delta, reason);
  if (errors.length > 0) {
    throw new ConflictError(
      ErrorCodes.NEGATIVE_STOCK,
      errors.join(" "),
      { currentStock, delta, reason, errors }
    );
  }
}

/**
 * Determines the stock delta for a given reason and quantity.
 * Positive for receiving, negative for cancellation.
 */
export function getStockDelta(
  reason: MovementReasonUnion,
  quantity: number
): number {
  switch (reason) {
    case "RECEIVE_PO":
      return quantity;
    case "CANCEL_PO":
      return -quantity;
    case "ADJUSTMENT_INITIAL":
      return 0; // Initial adjustments are handled separately
    default:
      return 0;
  }
}

/**
 * Generates a human-readable description of a stock movement.
 */
export function describeMovement(
  delta: number,
  balanceAfter: number,
  reason: MovementReasonUnion
): string {
  const sign = delta >= 0 ? "+" : "";
  const reasonLabel = reason
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());

  return `${reasonLabel}: stock changed by ${sign}${delta} units (new balance: ${balanceAfter}).`;
}
