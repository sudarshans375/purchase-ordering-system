// src/app/products/page.tsx — Products list page
// Author: Sudarshan Sonawane

"use client";

import { useState } from "react";
import { useProducts, useCreateProduct } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import {
  Plus,
  Search,
  Package,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ProductsPageContent() {
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lowStockOnly, setLowStockOnly] = useState(
    searchParams.get("lowStock") === "true"
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    reorderLevel: "10",
  });
  const [formError, setFormError] = useState("");

  const { data, isLoading, error } = useProducts({
    search,
    page,
    pageSize: 20,
    lowStock: lowStockOnly ? "true" : undefined,
  });
  const createMutation = useCreateProduct();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("Please enter a product name.");
      return;
    }
    if (!formData.sku.trim()) {
      setFormError("Please enter a product SKU.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        sku: formData.sku.trim(),
        name: formData.name.trim(),
        reorderLevel: Number(formData.reorderLevel),
      });
      setDialogOpen(false);
      setFormData({ sku: "", name: "", reorderLevel: "10" });
    } catch (err: any) {
      setFormError(err.message || "Failed to create product.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Products</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage your product catalog and monitor stock levels
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Product</DialogTitle>
              <DialogDescription>
                Add a new product to your catalog.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Product Name"
                placeholder="e.g. Industrial Widget XL"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
              <Input
                label="SKU"
                placeholder="e.g. WDG-XL-001"
                value={formData.sku}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                required
              />
              <Input
                label="Reorder Level"
                type="number"
                min="0"
                placeholder="10"
                value={formData.reorderLevel}
                onChange={(e) =>
                  setFormData({ ...formData, reorderLevel: e.target.value })
                }
              />
              {formError && (
                <p className="text-sm text-red-500">{formError}</p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={createMutation.isPending}>
                  Create Product
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 h-10 rounded-lg border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          />
        </div>
        <Button
          variant={lowStockOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className="gap-2"
        >
          <AlertTriangle className="h-4 w-4" />
          Low Stock Only
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={5} />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">
              Failed to load products. Please try again.
            </div>
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              title={lowStockOnly ? "No low stock products" : "No products yet"}
              description={
                lowStockOnly
                  ? "All products are above their reorder level."
                  : "Add your first product to the catalog."
              }
              icon={<Package className="h-6 w-6" />}
              action={
                lowStockOnly
                  ? undefined
                  : {
                      label: "Add Product",
                      onClick: () => setDialogOpen(true),
                    }
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead>Reorder Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Suppliers</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium text-zinc-900">
                        {product.name}
                      </TableCell>
                      <TableCell className="text-zinc-500 font-mono text-xs">
                        {product.sku}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={
                            product.isLowStock
                              ? "text-rose-600 font-semibold"
                              : "text-zinc-900"
                          }
                        >
                          {product.currentStock}
                        </span>
                      </TableCell>
                      <TableCell className="text-zinc-500">
                        {product.reorderLevel}
                      </TableCell>
                      <TableCell>
                        {product.isLowStock ? (
                          <Badge variant="lowStock">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="success">In Stock</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-zinc-500">
                        {product.supplierCount} supplier{product.supplierCount !== 1 ? "s" : ""}
                      </TableCell>
                      <TableCell className="text-zinc-500 text-sm">
                        {formatDate(product.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/products/${product.id}`}
                          className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
                        >
                          View
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
                  <p className="text-sm text-zinc-500">
                    Page {data.page} of {data.totalPages} ({data.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="h-8 w-48 bg-zinc-100 rounded animate-pulse" />
        <div className="h-10 w-full bg-zinc-100 rounded animate-pulse" />
      </div>
    }>
      <ProductsPageContent />
    </Suspense>
  );
}
