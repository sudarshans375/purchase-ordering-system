// src/domain/pricing.ts — Price snapshot domain logic
// Author: Sudarshan Sonawane

import { ValidationError } from "@/lib/errors";

/**
 * Calculates line total in cents (quantity × unit price).
 * Both values are BigInt to avoid floating-point errors.
 * Returns BigInt result.
 */
export function calculateLineTotalCents(
  quantity: number,
  unitPriceCents: bigint
): bigint {
  return unitPriceCents * BigInt(quantity);
}

/**
 * Validates a quantity value.
 */
export function validateQuantity(quantity: number): string | null {
  if (!Number.isInteger(quantity)) {
    return "Quantity must be a whole number.";
  }

  if (quantity <= 0) {
    return "Quantity must be greater than zero.";
  }

  if (quantity > 1000000) {
    return "Quantity must not exceed 1,000,000 units.";
  }

  return null;
}

/**
 * Validates a price in cents.
 */
export function validatePriceCents(priceCents: number): string | null {
  if (!Number.isInteger(priceCents)) {
    return "Price must be in whole cents.";
  }

  if (priceCents < 0) {
    return "Price cannot be negative.";
  }

  if (priceCents > 100000000) {
    return "Price must not exceed $1,000,000.00.";
  }

  return null;
}

/**
 * Asserts that a quantity is valid. Throws on invalid.
 */
export function assertValidQuantity(quantity: number): void {
  const error = validateQuantity(quantity);
  if (error) {
    throw new ValidationError(error, { quantity });
  }
}

/**
 * Asserts that a price is valid. Throws on invalid.
 */
export function assertValidPriceCents(priceCents: number): void {
  const error = validatePriceCents(priceCents);
  if (error) {
    throw new ValidationError(error, { priceCents });
  }
}
