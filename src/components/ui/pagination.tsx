// src/components/ui/pagination.tsx — Pagination with prev/next + page jump
// Author: Sudarshan Sonawane

"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Show first/last buttons. Default true. */
  showEdges?: boolean;
  /** Show total count summary. */
  total?: number;
  pageSize?: number;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  showEdges = true,
  total,
  pageSize,
}: PaginationProps) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex items-center justify-between gap-3">
      {typeof total === "number" && typeof pageSize === "number" && (
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
        </p>
      )}
      <div className="flex items-center gap-1">
        {showEdges && (
          <PageBtn disabled={!canPrev} onClick={() => onPageChange(1)} aria-label="First page">
            <ChevronsLeft className="h-4 w-4" />
          </PageBtn>
        )}
        <PageBtn disabled={!canPrev} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </PageBtn>
        <span className="px-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Page {page} of {totalPages}
        </span>
        <PageBtn disabled={!canNext} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </PageBtn>
        {showEdges && (
          <PageBtn disabled={!canNext} onClick={() => onPageChange(totalPages)} aria-label="Last page">
            <ChevronsRight className="h-4 w-4" />
          </PageBtn>
        )}
      </div>
    </div>
  );
}

function PageBtn({
  disabled,
  onClick,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-2 transition-colors",
        "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900",
        "text-zinc-700 dark:text-zinc-300",
        "hover:bg-zinc-50 dark:hover:bg-zinc-800",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-zinc-900",
        "focus:outline-none focus:ring-2 focus:ring-zinc-400"
      )}
      {...props}
    >
      {children}
    </button>
  );
}