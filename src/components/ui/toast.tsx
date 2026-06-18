// src/components/ui/toast.tsx — Toast notifications (Radix) + ToastProvider + useToast hook.
// Author: Sudarshan Sonawane

"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { ToastHost } from "./toast-host";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center gap-3 overflow-hidden rounded-lg border p-4 shadow-lg transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-top-full",
  {
    variants: {
      variant: {
        default: "border-zinc-200 bg-white text-zinc-900",
        success: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
        error: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
        warning: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
        info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  default: Info,
};

interface ToastProps
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root>,
    VariantProps<typeof toastVariants> {}

export function Toast({
  className,
  variant = "default",
  children,
  ...props
}: ToastProps) {
  const Icon = icons[variant as keyof typeof icons] || icons.default;

  return (
    <ToastPrimitive.Root
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      <Icon className="h-5 w-5 shrink-0 opacity-80" />
      <div className="flex-1 text-sm font-medium">{children}</div>
      <ToastPrimitive.Close className="rounded-md p-1 opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-zinc-400">
        <X className="h-4 w-4" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

export function ToastViewport() {
  return (
    <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:max-w-[420px] gap-2" />
  );
}

// ─── Provider + Hook ───────────────────────────────────────────

interface ToastMessage {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning" | "info";
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastMessage[];
  toast: (msg: Omit<ToastMessage, "id">) => void;
  success: (description: string, title?: string) => void;
  error: (description: string, title?: string) => void;
  warning: (description: string, title?: string) => void;
  info: (description: string, title?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider>");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback((msg: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...msg, id }]);
  }, []);

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toasts,
      toast,
      success: (description, title) => toast({ variant: "success", description, title }),
      error: (description, title) => toast({ variant: "error", description, title }),
      warning: (description, title) => toast({ variant: "warning", description, title }),
      info: (description, title) => toast({ variant: "info", description, title }),
      dismiss,
    }),
    [toasts, toast, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
        {children}
        {toasts.map((t) => (
          <Toast
            key={t.id}
            variant={t.variant}
            duration={t.duration}
            onOpenChange={(open) => !open && dismiss(t.id)}
          >
            <div className="flex-1">
              {t.title && <div className="font-semibold">{t.title}</div>}
              {t.description && (
                <div className={cn(t.title && "text-sm opacity-90")}>
                  {t.description}
                </div>
              )}
            </div>
          </Toast>
        ))}
        <ToastViewport />
        <ToastHost />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export { ToastPrimitive };
export type { ToastProps, ToastMessage };