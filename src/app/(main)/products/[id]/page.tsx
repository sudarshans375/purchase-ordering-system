// src/app/(main)/products/[id]/page.tsx — Product detail page
// Author: Sudarshan Sonawane

"use client";

import { useParams, useRouter } from "next/navigation";
import { useProduct } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { formatDate, formatCents } from "@/lib/utils";
import { ArrowLeft, Package, AlertTriangle, Truck } from "lucide-react";
import Link from "next/link";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: product, isLoading, error } = useProduct(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-zinc-100 rounded animate-pulse" />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-semibold text-zinc-900">Product not found</h2>
        <p className="text-sm text-zinc-500 mt-1">
          The product you're looking for doesn't exist or has been removed.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/products")}>
          Back to Products
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => router.push("/products")}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Products
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900">{product.name}</h1>
            <Badge variant={product.isLowStock ? "lowStock" : "success"}>
              {product.isLowStock ? (
                <><AlertTriangle className="h-3 w-3 mr-1" /> Low Stock</>
              ) : (
                "In Stock"
              )}
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            SKU: {product.sku} · Updated {formatDate(product.updatedAt)}
          </p>
        </div>
      </div>

      {/* Stock Info */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-zinc-500">Current Stock</p>
            <p className="text-2xl font-bold text-zinc-900 mt-1">{product.currentStock}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-zinc-500">Reorder Level</p>
            <p className="text-2xl font-bold text-zinc-900 mt-1">{product.reorderLevel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-zinc-500">Suppliers</p>
            <p className="text-2xl font-bold text-zinc-900 mt-1">
              {product.suppliers?.length ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers */}
      {product.suppliers && product.suppliers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-zinc-400" />
              Suppliers ({product.suppliers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-zinc-100">
              {product.suppliers.map((sp: any) => (
                <div key={sp.supplierId} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <Link
                      href={`/suppliers/${sp.supplierId}`}
                      className="text-sm font-medium text-zinc-900 hover:text-blue-600 transition-colors"
                    >
                      {sp.supplierName}
                    </Link>
                    {sp.supplierSku && (
                      <p className="text-xs text-zinc-500 mt-0.5">SKU: {sp.supplierSku}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCents(sp.currentPriceCents)}</p>
                    {sp.leadTimeDays && (
                      <p className="text-xs text-zinc-500">{sp.leadTimeDays} day lead time</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
