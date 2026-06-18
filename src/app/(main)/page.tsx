// src/app/(main)/page.tsx — Dashboard with recharts widgets
// Author: Sudarshan Sonawane

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { useDashboardSummary, useLowStockProducts } from "@/hooks/use-api";
import { formatDate } from "@/lib/utils";
import {
  Package,
  ShoppingCart,
  Truck,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import {
  SpendTrendChart,
  StatusMixChart,
  TopSuppliersChart,
} from "@/features/dashboard/components/charts";

function StatCard({
  title,
  value,
  icon,
  href,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  href: string;
  color: string;
}) {
  return (
    <Link href={href} className="block group">
      <Card className="card-hover-effect border-zinc-200/80 dark:border-zinc-800/80">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <p className="text-xs sm:text-sm font-medium text-zinc-500 uppercase tracking-wider">
                {title}
              </p>
              <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                {value}
              </p>
            </div>
            <div className={`rounded-xl p-3 sm:p-3.5 ${color} ring-1 ring-inset ring-black/5`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const { data: summary, isLoading: loadingSummary } = useDashboardSummary();
  const { data: lowStockData, isLoading: loadingLowStock } = useLowStockProducts();

  const totals = summary?.totals;
  const recentOrders = summary?.recentOrders ?? [];
  const lowStock = lowStockData ?? [];
  const recentMovements = summary?.recentMovements ?? [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 gradient-text">
          Dashboard
        </h1>
        <p className="text-sm text-zinc-500 mt-1.5">
          Live overview of suppliers, products, purchase orders, and stock health.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Suppliers"
          value={loadingSummary ? "—" : totals?.suppliers ?? 0}
          icon={<Truck className="h-5 w-5 text-blue-600" />}
          href="/suppliers"
          color="bg-blue-50 dark:bg-blue-950"
        />
        <StatCard
          title="Products"
          value={loadingSummary ? "—" : totals?.products ?? 0}
          icon={<Package className="h-5 w-5 text-violet-600" />}
          href="/products"
          color="bg-violet-50 dark:bg-violet-950"
        />
        <StatCard
          title="Purchase Orders"
          value={loadingSummary ? "—" : totals?.purchaseOrders ?? 0}
          icon={<ShoppingCart className="h-5 w-5 text-emerald-600" />}
          href="/purchase-orders"
          color="bg-emerald-50 dark:bg-emerald-950"
        />
        <StatCard
          title="Low Stock"
          value={loadingLowStock ? "—" : totals?.lowStockCount ?? 0}
          icon={<AlertTriangle className="h-5 w-5 text-rose-600" />}
          href="/products?lowStock=true"
          color={
            (totals?.lowStockCount ?? 0) > 0 ? "bg-rose-50 dark:bg-rose-950" : "bg-zinc-50 dark:bg-zinc-900"
          }
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Spend (last 30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? <ChartSkeleton /> : (
              <SpendTrendChart data={summary?.spendTrend ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
              PO Status Mix
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? <ChartSkeleton /> : (
              <StatusMixChart data={summary?.statusMix ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4 text-blue-600" />
              Top Suppliers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? <ChartSkeleton /> : (
              <TopSuppliersChart data={summary?.topSuppliers ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-zinc-400" />
                Recent Purchase Orders
              </CardTitle>
              <Link
                href="/purchase-orders"
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <TableSkeleton rows={4} />
            ) : recentOrders.length === 0 ? (
              <EmptyState
                title="No purchase orders yet"
                description="Create your first purchase order to get started."
                icon={<ShoppingCart className="h-6 w-6" />}
              />
            ) : (
              <div className="space-y-2">
                {recentOrders.map((po: any, idxR: number) => (
                  <Link
                    key={po.id}
                    href={`/purchase-orders/${po.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors stagger-item"
                    style={{ animationDelay: `${idxR * 50}ms` }}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {po.poNumber}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">{po.supplierName}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 tabular-nums">
                        {po.totalFormatted}
                      </span>
                      <StatusBadge status={po.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-zinc-400" />
                Low Stock
              </CardTitle>
              <Link
                href="/products?lowStock=true"
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loadingLowStock ? (
              <TableSkeleton rows={4} />
            ) : lowStock.length === 0 ? (
              <EmptyState
                title="All products well-stocked"
                description="No products are below their reorder level."
                icon={<TrendingUp className="h-6 w-6" />}
              />
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {lowStock.slice(0, 6).map((product: any, idx: number) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors stagger-item"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-zinc-500 font-mono truncate">{product.sku}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400 tabular-nums">
                        Stock: {product.currentStock}
                      </span>
                      <Badge variant="lowStock">{product.deficit} needed</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Stock Movements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-zinc-400" />
              Recent Stock Movements
            </CardTitle>
            <Link
              href="/stock-movements"
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingSummary ? (
            <div className="p-6">
              <TableSkeleton rows={4} />
            </div>
          ) : recentMovements.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No movements yet"
                description="Stock movements appear here as soon as a PO is received."
                icon={<TrendingUp className="h-6 w-6" />}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">When</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Product</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Reason</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">Delta</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {recentMovements.map((m: any) => (
                    <tr key={m.id}>
                      <td className="px-4 py-2.5 text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {formatDate(m.createdAt)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{m.productName}</div>
                        <div className="text-xs text-zinc-500 font-mono">{m.productSku}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={m.reason === "RECEIVE_PO" ? "success" : m.reason === "CANCEL_PO" ? "error" : "info"}>
                          {m.reason.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase())}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                        <span className={m.delta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                          {m.delta > 0 ? "+" : ""}{m.delta}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-zinc-700 dark:text-zinc-300">
                        {m.balanceAfter}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
      <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6" />
      <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-4/6" />
      <div className="h-32 bg-zinc-100 dark:bg-zinc-900 rounded mt-4" />
    </div>
  );
}