// src/app/purchase-orders/page.tsx — Purchase Orders list
// Author: Sudarshan Sonawane

"use client";

import { useState } from "react";
import {
  usePurchaseOrders,
  useSuppliers,
  useCreatePurchaseOrder,
} from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge, StatusBadge } from "@/components/ui/badge";
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
import { formatDate, formatCents } from "@/lib/utils";
import { Plus, ShoppingCart, ExternalLink, Filter } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "PLACED", label: "Placed" },
  { value: "RECEIVED", label: "Received" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    supplierId: "",
    notes: "",
  });
  const [formError, setFormError] = useState("");

  const { data, isLoading, error } = usePurchaseOrders({
    page,
    pageSize: 20,
    status: statusFilter || undefined,
  });

  const { data: suppliersData } = useSuppliers({ pageSize: 100 });
  const createMutation = useCreatePurchaseOrder();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formData.supplierId) {
      setFormError("Please select a supplier.");
      return;
    }

    try {
      const result = await createMutation.mutateAsync(formData);
      setDialogOpen(false);
      setFormData({ supplierId: "", notes: "" });
      router.push(`/purchase-orders/${result.id}`);
    } catch (err: any) {
      setFormError(err.message || "Failed to create purchase order.");
    }
  };

  const suppliers = suppliersData?.items ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Purchase Orders</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Create and manage purchase orders through their lifecycle
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              New Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
              <DialogDescription>
                Create a new draft purchase order for a supplier.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">
                  Supplier
                </label>
                <select
                  value={formData.supplierId}
                  onChange={(e) =>
                    setFormData({ ...formData, supplierId: e.target.value })
                  }
                  className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  required
                >
                  <option value="">Select a supplier...</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-700">
                  Notes (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Any special instructions or notes..."
                  rows={3}
                  className="flex w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
                />
              </div>
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
                  Create PO
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={statusFilter === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter(opt.value);
              setPage(1);
            }}
          >
            {opt.label}
          </Button>
        ))}
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
              Failed to load purchase orders.
            </div>
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              title={
                statusFilter
                  ? `No ${statusFilter.toLowerCase()} purchase orders`
                  : "No purchase orders yet"
              }
              description="Create your first purchase order to get started."
              icon={<ShoppingCart className="h-6 w-6" />}
              action={{
                label: "Create PO",
                onClick: () => setDialogOpen(true),
              }}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((po: any) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono text-sm font-medium text-zinc-900">
                        {po.poNumber}
                      </TableCell>
                      <TableCell className="text-zinc-700">
                        {po.supplierName}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={po.status} />
                      </TableCell>
                      <TableCell className="text-zinc-500">
                        {po.lineItemCount}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCents(po.totalCents)}
                      </TableCell>
                      <TableCell className="text-zinc-500 text-sm">
                        {formatDate(po.createdAt)}
                      </TableCell>
                      <TableCell className="text-zinc-500 text-sm">
                        {po.receivedAt ? formatDate(po.receivedAt) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/purchase-orders/${po.id}`}
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
