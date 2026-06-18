// src/app/suppliers/page.tsx — Suppliers list page
// Author: Sudarshan Sonawane

"use client";

import { useState } from "react";
import { useSuppliers, useCreateSupplier } from "@/hooks/use-api";
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
import { Plus, Search, Truck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "" });
  const [formError, setFormError] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useSuppliers({ search, page, pageSize: 20 });
  const createMutation = useCreateSupplier();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("Please enter a supplier name.");
      return;
    }

    try {
      const result = await createMutation.mutateAsync(formData);
      setDialogOpen(false);
      setFormData({ name: "", email: "" });
      router.push(`/suppliers/${result.id}`);
    } catch (err: any) {
      setFormError(err.message || "Failed to create supplier.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Suppliers</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage your suppliers and their product pricing
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Supplier</DialogTitle>
              <DialogDescription>
                Add a new supplier to your purchasing network.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Supplier Name"
                placeholder="e.g. Acme Industrial Supplies"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                error={
                  formError && !formData.name.trim()
                    ? formError
                    : undefined
                }
                required
              />
              <Input
                label="Email Address"
                type="email"
                placeholder="orders@acme.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
              {formError && formData.name.trim() && (
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
                  Create Supplier
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search suppliers..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full pl-10 pr-4 h-10 rounded-lg border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
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
              Failed to load suppliers. Please try again.
            </div>
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              title="No suppliers yet"
              description="Add your first supplier to start creating purchase orders."
              icon={<Truck className="h-6 w-6" />}
              action={{
                label: "Add Supplier",
                onClick: () => setDialogOpen(true),
              }}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Products</TableHead>
                    <TableHead className="text-center">Orders</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((supplier: any) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium text-zinc-900">
                        {supplier.name}
                      </TableCell>
                      <TableCell className="text-zinc-500">
                        {supplier.email || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {supplier.productCount}
                      </TableCell>
                      <TableCell className="text-center">
                        {supplier.poCount}
                      </TableCell>
                      <TableCell>
                        <Badge variant={supplier.isActive ? "success" : "cancelled"}>
                          {supplier.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-500 text-sm">
                        {formatDate(supplier.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/suppliers/${supplier.id}`}
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
