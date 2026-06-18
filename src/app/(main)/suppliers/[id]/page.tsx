// src/app/(main)/suppliers/[id]/page.tsx — Supplier detail page
// Author: Sudarshan Sonawane

"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSupplier, useProducts } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDate, formatCents } from "@/lib/utils";
import { ArrowLeft, Package, Link, ExternalLink } from "lucide-react";
import LinkComponent from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { queryKeys, ApiError } from "@/hooks/use-api";

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

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const { data: supplier, isLoading, error } = useSupplier(id);

  // Link product dialog
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkForm, setLinkForm] = useState({
    productId: "",
    supplierSku: "",
    currentPriceCents: "",
    leadTimeDays: "",
    isPreferred: false,
  });
  const [linkError, setLinkError] = useState("");

  const { data: productsData } = useProducts({ pageSize: 100 });

  const linkMutation = useMutation({
    mutationFn: (data: any) =>
      apiFetch(`/api/suppliers/${id}/products`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.detail(id) });
      setLinkDialogOpen(false);
      setLinkForm({
        productId: "", supplierSku: "", currentPriceCents: "",
        leadTimeDays: "", isPreferred: false,
      });
    },
    onError: (err: any) => {
      setLinkError(err.message || "Failed to link product.");
    },
  });

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError("");

    if (!linkForm.productId) {
      setLinkError("Please select a product.");
      return;
    }
    if (!linkForm.currentPriceCents || Number(linkForm.currentPriceCents) < 0) {
      setLinkError("Please enter a valid price.");
      return;
    }

    linkMutation.mutate({
      productId: linkForm.productId,
      supplierSku: linkForm.supplierSku || undefined,
      currentPriceCents: Math.round(Number(linkForm.currentPriceCents) * 100),
      leadTimeDays: linkForm.leadTimeDays ? Number(linkForm.leadTimeDays) : undefined,
      isPreferred: linkForm.isPreferred,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-zinc-100 rounded animate-pulse" />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-semibold text-zinc-900">Supplier not found</h2>
        <p className="text-sm text-zinc-500 mt-1">
          The supplier you're looking for doesn't exist or has been removed.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/suppliers")}>
          Back to Suppliers
        </Button>
      </div>
    );
  }

  const availableProducts = productsData?.items?.filter(
    (p: any) => !supplier.products?.some((sp: any) => sp.productId === p.id)
  ) ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => router.push("/suppliers")}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Suppliers
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900">{supplier.name}</h1>
            <Badge variant={supplier.isActive ? "success" : "cancelled"}>
              {supplier.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            {supplier.email && `${supplier.email} · `}
            Added {formatDate(supplier.createdAt)}
          </p>
        </div>
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={availableProducts.length === 0}>
              <Link className="h-4 w-4" />
              Link Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link Product</DialogTitle>
              <DialogDescription>
                Add a product to this supplier with its current price.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleLink} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">Product</label>
                <select
                  value={linkForm.productId}
                  onChange={(e) => setLinkForm({ ...linkForm, productId: e.target.value })}
                  className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  required
                >
                  <option value="">Select a product...</option>
                  {availableProducts.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Supplier SKU (optional)"
                placeholder="e.g. ACM-001"
                value={linkForm.supplierSku}
                onChange={(e) =>
                  setLinkForm({ ...linkForm, supplierSku: e.target.value })
                }
              />
              <Input
                label="Price (in dollars)"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 19.99"
                value={linkForm.currentPriceCents}
                onChange={(e) =>
                  setLinkForm({ ...linkForm, currentPriceCents: e.target.value })
                }
                required
              />
              <Input
                label="Lead Time (days, optional)"
                type="number"
                min="1"
                placeholder="e.g. 14"
                value={linkForm.leadTimeDays}
                onChange={(e) =>
                  setLinkForm({ ...linkForm, leadTimeDays: e.target.value })
                }
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPreferred"
                  checked={linkForm.isPreferred}
                  onChange={(e) =>
                    setLinkForm({ ...linkForm, isPreferred: e.target.checked })
                  }
                  className="rounded border-zinc-300"
                />
                <label htmlFor="isPreferred" className="text-sm text-zinc-700">
                  Preferred supplier for this product
                </label>
              </div>
              {linkError && (
                <p className="text-sm text-red-500">{linkError}</p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLinkDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={linkMutation.isPending}>
                  Link Product
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-4 w-4 text-zinc-400" />
            Products ({supplier.products?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!supplier.products || supplier.products.length === 0 ? (
            <div className="px-6 pb-6">
              <EmptyState
                title="No products linked"
                description="Link products to this supplier to set up pricing."
                icon={<Package className="h-6 w-6" />}
                action={
                  availableProducts.length > 0
                    ? {
                        label: "Link Product",
                        onClick: () => setLinkDialogOpen(true),
                      }
                    : undefined
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Supplier SKU</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Lead Time</TableHead>
                  <TableHead>Preferred</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplier.products.map((sp: any) => (
                  <TableRow key={sp.productId}>
                    <TableCell className="font-medium text-zinc-900">
                      <LinkComponent
                        href={`/products/${sp.productId}`}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {sp.productName}
                      </LinkComponent>
                    </TableCell>
                    <TableCell className="text-zinc-500">{sp.productSku}</TableCell>
                    <TableCell className="text-zinc-500">
                      {sp.supplierSku || "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCents(sp.currentPriceCents)}
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {sp.leadTimeDays ? `${sp.leadTimeDays} days` : "—"}
                    </TableCell>
                    <TableCell>
                      {sp.isPreferred ? (
                        <Badge variant="success">Preferred</Badge>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <LinkComponent
                        href={`/products/${sp.productId}`}
                        className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
                      >
                        View Product
                        <ExternalLink className="h-3 w-3" />
                      </LinkComponent>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
