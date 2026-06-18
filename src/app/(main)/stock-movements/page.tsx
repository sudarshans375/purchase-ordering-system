// src/app/(main)/stock-movements/page.tsx — Stock movement history page
// Author: Sudarshan Sonawane

"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { useStockMovements, type StockMovementItem } from "@/hooks/use-api";
import { formatDate } from "@/lib/utils";
import { ArrowDown, ArrowUp, History, Package } from "lucide-react";

const REASON_LABELS: Record<string, string> = {
  RECEIVE_PO: "PO Received",
  CANCEL_PO: "PO Cancelled",
  ADJUSTMENT_INITIAL: "Initial Stock",
};

const REASON_VARIANTS: Record<string, "default" | "success" | "error" | "warning" | "info"> = {
  RECEIVE_PO: "success",
  CANCEL_PO: "error",
  ADJUSTMENT_INITIAL: "info",
};

export default function StockMovementsPage() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [reasonFilter, setReasonFilter] = React.useState("");

  const { data, isLoading, error } = useStockMovements({
    page,
    pageSize: 25,
    ...(search && { productId: search }), // simple: treat as productId filter
    ...(reasonFilter && { reason: reasonFilter }),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Stock Movements
        </h1>
        <p className="text-sm text-zinc-500 mt-1.5">
          Append-only history of every stock change. Reconcile against inventory
          with{" "}
          <code className="text-xs bg-zinc-100 dark:bg-zinc-800 rounded px-1.5 py-0.5">
            npm run reconcile:stock
          </code>
          .
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 max-w-md">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Filter by product ID…"
          />
        </div>
        <div className="flex gap-2">
          {[
            { label: "All", value: "" },
            { label: "Received", value: "RECEIVE_PO" },
            { label: "Cancelled", value: "CANCEL_PO" },
            { label: "Initial", value: "ADJUSTMENT_INITIAL" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setReasonFilter(opt.value);
                setPage(1);
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                reasonFilter === opt.value
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-zinc-400" />
            Movements ({data?.total ?? "—"})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={10} />
            </div>
          ) : error ? (
            <p className="p-6 text-sm text-red-600 dark:text-red-400">
              Failed to load movements.
            </p>
          ) : !data || data.items.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No movements yet"
                description="Stock movements appear here as soon as a PO is received or cancelled."
                icon={<History className="h-6 w-6" />}
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">When</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Product</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Reason</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">Delta</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">Balance</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">PO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {data.items.map((m) => (
                      <MovementRow key={m.id} m={m} />
                    ))}
                  </tbody>
                </table>
              </div>
              {data.totalPages > 1 && (
                <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800">
                  <Pagination
                    page={page}
                    totalPages={data.totalPages}
                    onPageChange={setPage}
                    total={data.total}
                    pageSize={data.pageSize}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MovementRow({ m }: { m: StockMovementItem }) {
  const isPositive = m.delta > 0;
  const DeltaIcon = isPositive ? ArrowUp : ArrowDown;

  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs whitespace-nowrap">
        {formatDate(m.createdAt)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-zinc-400 shrink-0" />
          <div>
            <div className="font-medium text-zinc-900 dark:text-zinc-100">{m.productName}</div>
            <div className="text-xs text-zinc-500 font-mono">{m.productSku}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant={REASON_VARIANTS[m.reason] ?? "default"}>
          {REASON_LABELS[m.reason] ?? m.reason}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <span
          className={`inline-flex items-center gap-1 font-mono font-medium tabular-nums ${
            isPositive ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
          }`}
        >
          <DeltaIcon className="h-3 w-3" />
          {isPositive ? "+" : ""}
          {m.delta}
        </span>
      </td>
      <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
        {m.balanceAfter}
      </td>
      <td className="px-4 py-3 text-xs">
        {m.purchaseOrderNumber ? (
          <Link
            href={`/purchase-orders/${m.purchaseOrderId}`}
            className="text-blue-600 dark:text-blue-400 hover:underline font-mono"
          >
            {m.purchaseOrderNumber}
          </Link>
        ) : (
          <span className="text-zinc-400">—</span>
        )}
      </td>
    </tr>
  );
}