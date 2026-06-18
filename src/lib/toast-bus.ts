// src/lib/toast-bus.ts — Tiny global event bus for toast notifications.
// Author: Sudarshan Sonawane
//
// Components that live outside the React tree (e.g. apiFetch helper inside
// use-api.ts, fetch interceptors, third-party libs) can dispatch toast events
// via dispatchToast(). The <ToastHost> component is mounted in the root layout
// and listens for them — letting us show toasts from anywhere without
// threading the useToast context through every layer.

import { ApiError } from "@/hooks/use-api";

export type ToastVariant = "default" | "success" | "error" | "warning" | "info";

export interface ToastEvent {
  title?: string;
  description: string;
  variant: ToastVariant;
  duration?: number;
}

const TOAST_EVENT = "app:toast";

export function dispatchToast(event: ToastEvent): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastEvent>(TOAST_EVENT, { detail: event }));
}

/**
 * Convert an ApiError (or generic Error) into a toast event.
 */
export function dispatchErrorToast(error: unknown): void {
  if (error instanceof ApiError) {
    dispatchToast({
      variant: "error",
      title: error.code,
      description: error.message,
    });
    return;
  }
  if (error instanceof Error) {
    dispatchToast({
      variant: "error",
      description: error.message || "An unexpected error occurred.",
    });
    return;
  }
  dispatchToast({ variant: "error", description: String(error) });
}