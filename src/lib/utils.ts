// src/lib/utils.ts — Shared utilities
// Author: Sudarshan Sonawane

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

/**
 * Convert cents (BigInt, number, or numeric string) to a human-readable
 * dollar string. Uses string-based division so values larger than
 * Number.MAX_SAFE_INTEGER (≈ $90 trillion in cents) round-trip correctly.
 */
export function formatCents(
  cents: number | bigint | { toString(): string } | null | undefined
): string {
  if (cents === null || cents === undefined) return "$0.00";

  // Normalize to a string of digits, optionally with a leading "-".
  const raw = typeof cents === "bigint" ? cents.toString() : cents.toString();
  const negative = raw.startsWith("-");
  const digits = negative ? raw.slice(1) : raw;

  // Pad to at least 3 digits so we always have whole-dollar + fractional parts.
  const padded = digits.padStart(3, "0");
  const wholePart = padded.slice(0, -2);
  const fractionalPart = padded.slice(-2);

  // Insert thousands separators into wholePart.
  const wholeWithSeparators = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `${negative ? "-" : ""}$${wholeWithSeparators}.${fractionalPart}`;
}

/**
 * Parse a dollar-string like "$1,234.56" or "1234.56" to cents (BigInt).
 * Returns null if the input is not a valid amount.
 */
export function parseCents(input: string | number | null | undefined): bigint | null {
  if (input === null || input === undefined) return null;
  const cleaned = String(input).replace(/[$,\s]/g, "").trim();
  if (!/^-?\d+(\.\d{0,2})?$/.test(cleaned)) return null;

  const negative = cleaned.startsWith("-");
  const unsigned = negative ? cleaned.slice(1) : cleaned;
  const [whole, fraction = ""] = unsigned.split(".");
  const cents = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0").slice(0, 2));

  return negative ? -cents : cents;
}

/**
 * JSON.stringify replacer that converts BigInt values to strings. Useful when
 * returning data from route handlers — Next.js will not auto-serialize BigInt.
 *
 * Usage:
 *   return NextResponse.json(JSON.parse(JSON.stringify(data, bigIntReplacer)));
 *   // or pass directly to a NextResponse init body (must be string).
 */
export function bigIntReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  return value;
}

/**
 * Convert a value with BigInt fields into a plain object where BigInts are
 * strings. Recursive but shallow-safe for cyclical refs (tracks seen objects).
 */
export function serializeBigInts<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, bigIntReplacer)) as T;
}