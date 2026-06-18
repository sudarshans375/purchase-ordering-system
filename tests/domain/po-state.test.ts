// tests/domain/po-state.test.ts — State machine unit tests
// Author: Sudarshan Sonawane

import { describe, it, expect } from "vitest";
import {
  assertCanTransition,
  canTransition,
  getLegalTransitions,
  isTerminal,
  isActive,
} from "@/domain/po-state";
import { ConflictError, ErrorCodes } from "@/lib/errors";

describe("assertCanTransition", () => {
  // ─── Legal transitions ─────────────────────────────

  it("allows DRAFT → PLACED", () => {
    expect(() => assertCanTransition("DRAFT", "PLACED")).not.toThrow();
  });

  it("allows DRAFT → CANCELLED", () => {
    expect(() => assertCanTransition("DRAFT", "CANCELLED")).not.toThrow();
  });

  it("allows PLACED → RECEIVED", () => {
    expect(() => assertCanTransition("PLACED", "RECEIVED")).not.toThrow();
  });

  it("allows PLACED → CANCELLED", () => {
    expect(() => assertCanTransition("PLACED", "CANCELLED")).not.toThrow();
  });

  // ─── Illegal transitions ───────────────────────────

  it("rejects PLACED → DRAFT", () => {
    expect(() => assertCanTransition("PLACED", "DRAFT")).toThrow(ConflictError);
  });

  it("rejects RECEIVED → anything", () => {
    expect(() => assertCanTransition("RECEIVED", "DRAFT")).toThrow(ConflictError);
    expect(() => assertCanTransition("RECEIVED", "PLACED")).toThrow(ConflictError);
    expect(() => assertCanTransition("RECEIVED", "CANCELLED")).toThrow(ConflictError);
  });

  it("rejects CANCELLED → anything", () => {
    expect(() => assertCanTransition("CANCELLED", "DRAFT")).toThrow(ConflictError);
    expect(() => assertCanTransition("CANCELLED", "PLACED")).toThrow(ConflictError);
    expect(() => assertCanTransition("CANCELLED", "RECEIVED")).toThrow(ConflictError);
  });

  it("rejects DRAFT → RECEIVED (must place first)", () => {
    expect(() => assertCanTransition("DRAFT", "RECEIVED")).toThrow(ConflictError);
  });

  it("rejects same status transition (DRAFT → DRAFT)", () => {
    expect(() => assertCanTransition("DRAFT", "DRAFT")).toThrow(ConflictError);
  });

  // ─── Error messages ────────────────────────────────

  it("has a friendly error message for PLACED → DRAFT", () => {
    try {
      assertCanTransition("PLACED", "DRAFT");
    } catch (e: any) {
      expect(e.code).toBe(ErrorCodes.PO_ILLEGAL_TRANSITION);
      expect(e.message).toContain("draft");
    }
  });

  it("has a friendly error message for RECEIVED → RECEIVED (same status)", () => {
    try {
      assertCanTransition("RECEIVED", "RECEIVED");
    } catch (e: any) {
      expect(e.code).toBe(ErrorCodes.PO_ILLEGAL_TRANSITION);
      expect(e.message).toContain("already in received");
    }
  });

  it("has a friendly error message for CANCELLED → PLACED", () => {
    try {
      assertCanTransition("CANCELLED", "PLACED");
    } catch (e: any) {
      expect(e.code).toBe(ErrorCodes.PO_ALREADY_CANCELLED);
    }
  });
});

describe("canTransition", () => {
  it("returns true for legal transitions", () => {
    expect(canTransition("DRAFT", "PLACED")).toBe(true);
    expect(canTransition("DRAFT", "CANCELLED")).toBe(true);
    expect(canTransition("PLACED", "RECEIVED")).toBe(true);
    expect(canTransition("PLACED", "CANCELLED")).toBe(true);
  });

  it("returns false for illegal transitions", () => {
    expect(canTransition("RECEIVED", "DRAFT")).toBe(false);
    expect(canTransition("CANCELLED", "PLACED")).toBe(false);
    expect(canTransition("DRAFT", "RECEIVED")).toBe(false);
  });
});

describe("getLegalTransitions", () => {
  it("returns correct transitions from DRAFT", () => {
    expect(getLegalTransitions("DRAFT")).toEqual(["PLACED", "CANCELLED"]);
  });

  it("returns correct transitions from PLACED", () => {
    expect(getLegalTransitions("PLACED")).toEqual(["RECEIVED", "CANCELLED"]);
  });

  it("returns empty array for RECEIVED", () => {
    expect(getLegalTransitions("RECEIVED")).toEqual([]);
  });

  it("returns empty array for CANCELLED", () => {
    expect(getLegalTransitions("CANCELLED")).toEqual([]);
  });
});

describe("isTerminal", () => {
  it("RECEIVED is terminal", () => expect(isTerminal("RECEIVED")).toBe(true));
  it("CANCELLED is terminal", () => expect(isTerminal("CANCELLED")).toBe(true));
  it("DRAFT is not terminal", () => expect(isTerminal("DRAFT")).toBe(false));
  it("PLACED is not terminal", () => expect(isTerminal("PLACED")).toBe(false));
});

describe("isActive", () => {
  it("DRAFT is active", () => expect(isActive("DRAFT")).toBe(true));
  it("PLACED is active", () => expect(isActive("PLACED")).toBe(true));
  it("RECEIVED is not active", () => expect(isActive("RECEIVED")).toBe(false));
  it("CANCELLED is not active", () => expect(isActive("CANCELLED")).toBe(false));
});
