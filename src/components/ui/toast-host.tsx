// src/components/ui/toast-host.tsx — Listens to global toast events and forwards to useToast
// Author: Sudarshan Sonawane

"use client";

import * as React from "react";
import { useToast } from "./toast";
import { dispatchErrorToast, type ToastEvent } from "@/lib/toast-bus";

/**
 * Mount once at the root (already covered by ToastProvider). This component
 * is the bridge that lets non-React code dispatch toast notifications.
 *
 * It also exposes `dispatchErrorToast` on `window.__appToastError` for
 * debugging and for non-React callers.
 */
export function ToastHost() {
  const { toast } = useToast();

  React.useEffect(() => {
    function onToast(e: Event) {
      const detail = (e as CustomEvent<ToastEvent>).detail;
      toast({
        variant: detail.variant,
        title: detail.title,
        description: detail.description,
        duration: detail.duration,
      });
    }
    window.addEventListener("app:toast", onToast as EventListener);

    // Expose for debugging.
    (window as unknown as { __appToastError?: typeof dispatchErrorToast }).__appToastError =
      dispatchErrorToast;

    return () => window.removeEventListener("app:toast", onToast as EventListener);
  }, [toast]);

  return null;
}