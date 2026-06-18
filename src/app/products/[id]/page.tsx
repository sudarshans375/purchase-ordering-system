// src/app/products/[id]/page.tsx — Product detail page
// Author: Sudarshan Sonawane

"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProduct } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { formatDate, formatCents } from "@/lib/utils";
import {
  ArrowLeft,
  Package,
  ExternalLink,
  AlertTriangle,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, ApiError } from "@/hooks/use-api";
import { Input } from "@/components/ui/input";

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  const body = await res.json();
  if (!res.ok) {
    const error = body.error || { code: "UNKNOWN", message: "An error occurred." };
    throw new ApiError(res.status, error.code, error.message, error.details);
  }
  return body.data;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const { data: product, isLoading, error } = useProduct(id);

  const [reorderLevel, setReorderLevel] = useState("");
  const [updateError, setUpdateError] = useState("");

  const updateMutation = useMutation({
    mutationFn: (data: { reorderLevel: number }) =>
      apiFetch(`/api/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      setUpdateError("");
    },
    onError: (err: any) => {
      setUpdateError(err.message || "Failed to update product.");
    },
  });

  const handleUpdateReorder = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(reorderLevel);
    if (isNaN(val) || val < 0) {
      setUpdateError("Please enter a valid reorder level.");
      return;
    }
    updateMutation.mutate({ reorderLevel: val });
  };

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
          This product doesn't exist or has been removed.
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
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900">{product.name}</h1>
            <Badge variant={product.isActive ? "success" : "cancelled"}>
              {product.isActive ? "Active" : "Inactive"}
            </Badge>
            {product.currentStock < product.reorderLevel && (
              <Badge variant="lowStock">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Low Stock
              </Badge>
            )}
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            SKU: <span className="font-mono">{product.sku}</span>
            {" · "}
            {product.suppliers?.length ?? 0} supplier{(product.suppliers?.length ?? 0) !== 1 ? "s" : ""}
            {" · "}
            Updated {formatDate(product.updatedAt)}
          </p>
        </div>
      </div>

      {/* Stock Info */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-500">
              Current Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-3xl font-bold ${
                product.currentStock < product.reorderLevel
                  ? "text-rose-600"
                  : "text-zinc-900"
              }`}
            >
              {product.currentStock}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-500">
              Reorder Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-zinc-900">
              {product.reorderLevel}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-500">
              Deficit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-3xl font-bold ${
                product.currentStock < product.reorderLevel
                  ? "text-rose-600"
                  : "text-emerald-600"
              }`}
            >
              {product.currentStock >= product.reorderLevel
                ? "None"
                : product.reorderLevel - product.currentStock}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reorder Level Update */}
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateReorder} className="flex items-end gap-3 max-w-sm">
            <Input
              label="Reorder Level"
              type="number"
              min="0"
              defaultValue={product.reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
            />
            <Button type="submit" loading={updateMutation.isPending}>
              Update
            </Button>
          </form>
          {updateError && (
            <p className="text-sm text-red-500 mt-2">{updateError}</p>
          )}
        </CardContent>
      </Card>

      {/* Suppliers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-zinc-400" />
            Suppliers ({product.suppliers?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!product.suppliers || product.suppliers.length === 0 ? (
            <div className="px-6 pb-6">
              <p className="text-sm text-zinc-500 text-center py-8">
                This product is not linked to any suppliers yet.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {product.suppliers.map((sp: any) => (
                <div
                  key={sp.supplierId}
                  className="flex items-center justify-between p-4"
                >
                  <div>
                    <Link
                      href={`/suppliers/${sp.supplier.id}`}
                      className="text-sm font-medium text-zinc-900 hover:text-blue-600 transition-colors"
                    >
                      {sp.supplier.name}
                    </Link>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {sp.supplierSku
                        ? `Supplier SKU: ${sp.supplierSku}`
                        : "No supplier SKU"}
                      {sp.leadTimeDays && ` · ${sp.leadTimeDays} days lead time`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">
                      {formatCents(sp.currentPriceCents)}
                    </span>
                    {sp.isPreferred && (
                      <Badge variant="success">Preferred</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
