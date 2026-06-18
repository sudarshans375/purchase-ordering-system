// tests/domain/pricing.test.ts — Price snapshot unit tests
// Author: Sudarshan Sonawane

import { describe, it, expect } from "vitest";
import {
  calculateLineTotalCents,
  validateQuantity,
  validatePriceCents,
  assertValidQuantity,
  assertValidPriceCents,
} from "@/domain/pricing";
import { ValidationError } from "@/lib/errors";

describe("calculateLineTotalCents", () => {
  it("calculates line total correctly", () => {
    expect(calculateLineTotalCents(50, BigInt(120))).toBe(BigInt(6000));
  });

  it("handles zero quantity", () => {
    expect(calculateLineTotalCents(0, BigInt(100))).toBe(BigInt(0));
  });

  it("handles large quantities", () => {
    expect(calculateLineTotalCents(10000, BigInt(100000))).toBe(
      BigInt(1000000000)
    );
  });

  it("produces integer result (no floating point)", () => {
    const result = calculateLineTotalCents(3, BigInt(99));
    expect(typeof result).toBe("bigint");
    expect(result).toBe(BigInt(297));
  });
});

describe("validateQuantity", () => {
  it("accepts valid quantity", () => {
    expect(validateQuantity(50)).toBeNull();
    expect(validateQuantity(1)).toBeNull();
    expect(validateQuantity(1000000)).toBeNull();
  });

  it("rejects zero quantity", () => {
    expect(validateQuantity(0)).toBeTruthy();
  });

  it("rejects negative quantity", () => {
    expect(validateQuantity(-1)).toBeTruthy();
  });

  it("rejects non-integer", () => {
    expect(validateQuantity(1.5)).toBeTruthy();
  });

  it("rejects quantity exceeding max", () => {
    expect(validateQuantity(1000001)).toBeTruthy();
  });
});

describe("validatePriceCents", () => {
  it("accepts valid price", () => {
    expect(validatePriceCents(1999)).toBeNull();
    expect(validatePriceCents(0)).toBeNull();
    expect(validatePriceCents(100000000)).toBeNull();
  });

  it("rejects negative price", () => {
    expect(validatePriceCents(-1)).toBeTruthy();
  });

  it("rejects non-integer price", () => {
    expect(validatePriceCents(19.99)).toBeTruthy();
  });

  it("rejects price exceeding max", () => {
    expect(validatePriceCents(100000001)).toBeTruthy();
  });
});

describe("assertValidQuantity", () => {
  it("does not throw for valid quantity", () => {
    expect(() => assertValidQuantity(10)).not.toThrow();
  });

  it("throws for invalid quantity", () => {
    expect(() => assertValidQuantity(0)).toThrow(ValidationError);
    expect(() => assertValidQuantity(-5)).toThrow(ValidationError);
  });
});

describe("assertValidPriceCents", () => {
  it("does not throw for valid price", () => {
    expect(() => assertValidPriceCents(1999)).not.toThrow();
  });

  it("throws for invalid price", () => {
    expect(() => assertValidPriceCents(-100)).toThrow(ValidationError);
  });
});
