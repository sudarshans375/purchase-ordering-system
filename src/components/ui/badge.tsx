// src/components/ui/badge.tsx — Badge component
// Author: Sudarshan Sonawane

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors duration-200",
  {
    variants: {
      variant: {
        default:
          "bg-zinc-100 text-zinc-800 border border-zinc-200",
        draft:
          "bg-amber-50 text-amber-700 border border-amber-200",
        placed:
          "bg-blue-50 text-blue-700 border border-blue-200",
        received:
          "bg-emerald-50 text-emerald-700 border border-emerald-200",
        cancelled:
          "bg-red-50 text-red-700 border border-red-200",
        lowStock:
          "bg-rose-50 text-rose-700 border border-rose-200 ring-1 ring-rose-300",
        success:
          "bg-emerald-50 text-emerald-700 border border-emerald-200",
        warning:
          "bg-amber-50 text-amber-700 border border-amber-200",
        error:
          "bg-red-50 text-red-700 border border-red-200",
        info:
          "bg-blue-50 text-blue-700 border border-blue-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

const STATUS_VARIANTS = ["draft", "placed", "received", "cancelled"] as const;
type StatusVariant = (typeof STATUS_VARIANTS)[number];

const VARIANT_MAP: Record<string, "draft" | "placed" | "received" | "cancelled" | "default"> = {
  draft: "draft",
  placed: "placed",
  received: "received",
  cancelled: "cancelled",
};

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  const variant = VARIANT_MAP[key] ?? "default";
  const label = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  return (
    <Badge variant={variant}>
      {label}
    </Badge>
  );
}
