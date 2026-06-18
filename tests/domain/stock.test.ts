// tests/domain/stock.test.ts — Stock movement unit tests
// Author: Sudarshan Sonawane

import { describe, it, expect } from "vitest";
import {
  calculateNewBalance,
  validateStockMovement,
  assertValidStockMovement,
  getStockDelta,
} from "@/domain/stock";
import { ConflictError } from "@/lib/errors";

describe("calculateNewBalance", () => {
  it("adds positive delta to current stock", () => {
    expect(calculateNewBalance(100, 50)).toBe(150);
  });

  it("subtracts negative delta from current stock", () => {
    expect(calculateNewBalance(100, -30)).toBe(70);
  });

  it("handles zero current stock with positive delta", () => {
    expect(calculateNewBalance(0, 10)).toBe(10);
  });

  it("handles large numbers", () => {
    expect(calculateNewBalance(99999, 1)).toBe(100000);
  });
});

describe("validateStockMovement", () => {
  it("returns no errors for valid positive movement", () => {
    const errors = validateStockMovement(100, 50, "RECEIVE_PO");
    expect(errors).toHaveLength(0);
  });

  it("returns no errors for valid negative movement", () => {
    const errors = validateStockMovement(100, -30, "CANCEL_PO");
    expect(errors).toHaveLength(0);
  });

  it("rejects zero delta", () => {
    const errors = validateStockMovement(100, 0, "RECEIVE_PO");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("zero");
  });

  it("rejects negative stock result", () => {
    const errors = validateStockMovement(10, -20, "CANCEL_PO");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("negative");
  });

  it("allows exact zero balance", () => {
    const errors = validateStockMovement(10, -10, "CANCEL_PO");
    expect(errors).toHaveLength(0);
  });
});

describe("assertValidStockMovement", () => {
  it("does not throw for valid movement", () => {
    expect(() =>
      assertValidStockMovement(100, 50, "RECEIVE_PO")
    ).not.toThrow();
  });

  it("throws for negative stock", () => {
    expect(() =>
      assertValidStockMovement(5, -10, "CANCEL_PO")
    ).toThrow(ConflictError);
  });
});

describe("getStockDelta", () => {
  it("returns positive delta for RECEIVE_PO", () => {
    expect(getStockDelta("RECEIVE_PO", 100)).toBe(100);
  });

  it("returns negative delta for CANCEL_PO", () => {
    expect(getStockDelta("CANCEL_PO", 100)).toBe(-100);
  });

  it("returns zero for ADJUSTMENT_INITIAL", () => {
    expect(getStockDelta("ADJUSTMENT_INITIAL", 100)).toBe(0);
  });
});
