// src/app/page.tsx — Dashboard page
// Author: Sudarshan Sonawane

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useSuppliers, useProducts, usePurchaseOrders, useLowStockProducts } from "@/hooks/use-api";
import { formatDate, formatCents } from "@/lib/utils";
import { Package, ShoppingCart, Truck, AlertTriangle, TrendingUp } from "lucide-react";
import Link from "next/link";

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
      <Card className="card-hover-effect border-zinc-200/80">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <p className="text-xs sm:text-sm font-medium text-zinc-500 uppercase tracking-wider">{title}</p>
              <p className="text-xl sm:text-2xl font-bold text-zinc-900">{value}</p>
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
  const { data: suppliersData, isLoading: loadingSuppliers } = useSuppliers({ pageSize: 1 });
  const { data: posData, isLoading: loadingPos } = usePurchaseOrders({ pageSize: 1 });
  const { data: lowStockData, isLoading: loadingLowStock } = useLowStockProducts();
  const { data: recentPosData, isLoading: loadingRecent } = usePurchaseOrders({ pageSize: 5 });
  const { data: productsData, isLoading: loadingProducts } = useProducts({ pageSize: 1 });

  const totalSuppliers = suppliersData?.total ?? 0;
  const totalProducts = productsData?.total ?? 0;
  const totalPos = posData?.total ?? 0;
  const lowStockCount = lowStockData?.length ?? 0;
  const recentOrders = recentPosData?.items ?? [];
  const lowStockProducts = lowStockData ?? [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="relative">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 gradient-text">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1.5">
          Overview of your purchase ordering system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Suppliers"
          value={loadingSuppliers ? "—" : totalSuppliers}
          icon={<Truck className="h-5 w-5 text-blue-600" />}
          href="/suppliers"
          color="bg-blue-50"
        />
        <StatCard
          title="Total Products"
          value={loadingProducts ? "—" : totalProducts}
          icon={<Package className="h-5 w-5 text-violet-600" />}
          href="/products"
          color="bg-violet-50"
        />
        <StatCard
          title="Purchase Orders"
          value={loadingPos ? "—" : totalPos}
          icon={<ShoppingCart className="h-5 w-5 text-emerald-600" />}
          href="/purchase-orders"
          color="bg-emerald-50"
        />
        <StatCard
          title="Low Stock Alerts"
          value={loadingLowStock ? "—" : lowStockCount}
          icon={<AlertTriangle className="h-5 w-5 text-rose-600" />}
          href="/products?lowStock=true"
          color={lowStockCount > 0 ? "bg-rose-50" : "bg-zinc-50"}
        />
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Recent Purchase Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-zinc-400" />
              Recent Purchase Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRecent ? (
              <TableSkeleton rows={4} />
            ) : recentOrders.length === 0 ? (
              <EmptyState
                title="No purchase orders yet"
                description="Create your first purchase order to get started."
                icon={<ShoppingCart className="h-6 w-6" />}                  action={{
                  label: "Go to Purchase Orders",
                  onClick: () => window.location.href = "/purchase-orders",
                }}
              />
            ) : (
              <div className="space-y-3">
                {recentOrders.map((po: any, idxR: number) => (
                  <Link
                    key={po.id}
                    href={`/purchase-orders/${po.id}`}
                    className={`flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 transition-colors stagger-item`}
                    style={{ animationDelay: `${idxR * 50}ms` }}
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-zinc-900">
                        {po.poNumber}
                      </p>
                      <p className="text-xs text-zinc-500">{po.supplierName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-zinc-700">
                        {formatCents(po.totalCents)}
                      </span>
                      <Badge
                        variant={po.status.toLowerCase()}
                      >
                        {po.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-zinc-400" />
              Low Stock Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingLowStock ? (
              <TableSkeleton rows={4} />
            ) : lowStockProducts.length === 0 ? (
              <EmptyState
                title="All products well-stocked"
                description="No products are below their reorder level."
                icon={<TrendingUp className="h-6 w-6" />}
              />
            ) : (
              <div className="divide-y divide-zinc-100">
                {lowStockProducts.map((product: any, idx: number) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className={`flex items-center justify-between p-3 rounded-lg hover:bg-zinc-50 transition-colors stagger-item`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-zinc-900">
                        {product.name}
                      </p>
                      <p className="text-xs text-zinc-500">SKU: {product.sku}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-zinc-600">
                        Stock: {product.currentStock}
                      </span>
                      <Badge variant="lowStock">
                        {product.deficit} needed
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
