// src/domain/po-state.ts — Pure state machine for PO lifecycle
// Author: Sudarshan Sonawane

import { ConflictError, ErrorCodes } from "@/lib/errors";
import type { PoStatusUnion } from "@/types";

// ─── Legal Transitions ──────────────────────────────

type TransitionMap = Record<PoStatusUnion, PoStatusUnion[]>;

const LEGAL_TRANSITIONS: TransitionMap = {
  DRAFT: ["PLACED", "CANCELLED"],
  PLACED: ["RECEIVED", "CANCELLED"],
  RECEIVED: [],
  CANCELLED: [],
};

// ─── Human-readable transition descriptions ─────────

const TRANSITION_LABELS: Record<string, string> = {
  "DRAFT->PLACED": "place",
  "DRAFT->CANCELLED": "cancel",
  "PLACED->RECEIVED": "receive",
  "PLACED->CANCELLED": "cancel",
};

const STATUS_LABELS: Record<PoStatusUnion, string> = {
  DRAFT: "draft",
  PLACED: "placed",
  RECEIVED: "received",
  CANCELLED: "cancelled",
};

// ─── Public API ─────────────────────────────────────

/**
 * Asserts that a state transition is legal.
 * Throws ConflictError with a human-readable message if the transition is not allowed.
 * Returns void if the transition is legal.
 */
export function assertCanTransition(
  from: PoStatusUnion,
  to: PoStatusUnion
): void {
  if (from === to) {
    throw new ConflictError(
      ErrorCodes.PO_ILLEGAL_TRANSITION,
      `This purchase order is already in ${STATUS_LABELS[from]} status.`,
      { currentStatus: from, requestedStatus: to }
    );
  }

  const allowed = LEGAL_TRANSITIONS[from];

  if (!allowed?.includes(to)) {
    const label = TRANSITION_LABELS[`${from}->${to}`];
    if (label) {
      // Known transition but not allowed from current state
      throw new ConflictError(
        ErrorCodes.PO_ILLEGAL_TRANSITION,
        `Cannot ${label} a purchase order that is currently "${STATUS_LABELS[from]}". ` +
          `A purchase order can only be ${label}d when it is "${STATUS_LABELS[to === "CANCELLED" ? "DRAFT" : "PLACED"]}".`,
        { currentStatus: from, requestedStatus: to }
      );
    }

    if (from === "RECEIVED") {
      throw new ConflictError(
        ErrorCodes.PO_ALREADY_RECEIVED,
        `This purchase order has already been received and cannot be modified further.`,
        { currentStatus: from, requestedStatus: to }
      );
    }

    if (from === "CANCELLED") {
      throw new ConflictError(
        ErrorCodes.PO_ALREADY_CANCELLED,
        `This purchase order has been cancelled and cannot be modified further.`,
        { currentStatus: from, requestedStatus: to }
      );
    }

    throw new ConflictError(
      ErrorCodes.PO_ILLEGAL_TRANSITION,
      `Cannot transition a purchase order from "${STATUS_LABELS[from]}" to "${STATUS_LABELS[to]}".`,
      { currentStatus: from, requestedStatus: to }
    );
  }
}

/**
 * Returns all legal next states from a given state.
 */
export function getLegalTransitions(
  status: PoStatusUnion
): PoStatusUnion[] {
  return LEGAL_TRANSITIONS[status] ?? [];
}

/**
 * Returns whether a transition is legal (without throwing).
 */
export function canTransition(
  from: PoStatusUnion,
  to: PoStatusUnion
): boolean {
  return LEGAL_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Returns a human-readable label for a status.
 */
export function getStatusLabel(status: PoStatusUnion): string {
  return STATUS_LABELS[status];
}

/**
 * Returns true if the status is terminal (no transitions possible).
 */
export function isTerminal(status: PoStatusUnion): boolean {
  return LEGAL_TRANSITIONS[status]?.length === 0;
}

/**
 * Returns true if the status is active (DRAFT or PLACED).
 */
export function isActive(status: PoStatusUnion): boolean {
  return status === "DRAFT" || status === "PLACED";
}
