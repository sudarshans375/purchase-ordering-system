// src/app/(main)/purchase-orders/[id]/page.tsx — PO detail page
// Author: Sudarshan Sonawane

"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  usePurchaseOrder,
  useAddLineItem,
  useRemoveLineItem,
  usePlacePurchaseOrder,
  useCancelPurchaseOrder,
  useReceivePurchaseOrder,
  useSupplier,
} from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Input } from "@/components/ui/input";
import { formatDate, formatCents } from "@/lib/utils";
import {
  ArrowLeft,
  ShoppingCart,
  Send,
  XCircle,
  PackageCheck,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: po, isLoading, error } = usePurchaseOrder(id);

  // Add line item dialog
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ productId: "", quantity: "1" });
  const [itemError, setItemError] = useState("");

  // Supplier products for add-item dropdown
  const { data: supplierData } = useSupplier(po?.supplier?.id ?? "");

  // Mutations
  const addLineItem = useAddLineItem();
  const removeLineItem = useRemoveLineItem();
  const placeMutation = usePlacePurchaseOrder();
  const cancelMutation = useCancelPurchaseOrder();
  const receiveMutation = useReceivePurchaseOrder();

  // Status display
  const [actionError, setActionError] = useState("");

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setItemError("");

    if (!itemForm.productId) {
      setItemError("Please select a product.");
      return;
    }
    if (!itemForm.quantity || Number(itemForm.quantity) < 1) {
      setItemError("Quantity must be at least 1.");
      return;
    }

    try {
      await addLineItem.mutateAsync({
        poId: id,
        productId: itemForm.productId,
        quantity: Number(itemForm.quantity),
      });
      setAddItemOpen(false);
      setItemForm({ productId: "", quantity: "1" });
    } catch (err: any) {
      setItemError(err.message || "Failed to add item.");
    }
  };

  const handleRemoveItem = async (lineId: string) => {
    try {
      await removeLineItem.mutateAsync({ poId: id, lineId });
    } catch (err: any) {
      setActionError(err.message || "Failed to remove item.");
    }
  };

  const handlePlace = async () => {
    setActionError("");
    try {
      await placeMutation.mutateAsync(id);
    } catch (err: any) {
      setActionError(err.message || "Failed to place purchase order.");
    }
  };

  const handleCancel = async () => {
    setActionError("");
    try {
      await cancelMutation.mutateAsync(id);
    } catch (err: any) {
      setActionError(err.message || "Failed to cancel purchase order.");
    }
  };

  const handleReceive = async () => {
    setActionError("");
    try {
      await receiveMutation.mutateAsync(id);
    } catch (err: any) {
      setActionError(err.message || "Failed to receive purchase order.");
    }
  };

  const supplierProducts = supplierData?.products ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-zinc-100 rounded animate-pulse" />
        <TableSkeleton rows={5} />
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-semibold text-zinc-900">
          Purchase order not found
        </h2>
        <p className="text-sm text-zinc-500 mt-1">
          This purchase order doesn't exist or has been removed.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/purchase-orders")}
        >
          Back to Purchase Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back button */}
      <button
        onClick={() => router.push("/purchase-orders")}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Purchase Orders
      </button>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-zinc-900">{po.poNumber}</h1>
            <StatusBadge status={po.status} />
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Supplier:{" "}
            <Link
              href={`/suppliers/${po.supplier.id}`}
              className="text-blue-600 hover:underline"
            >
              {po.supplier.name}
            </Link>
            {" · "}
            Created {formatDate(po.createdAt)}
            {po.placedAt && ` · Placed ${formatDate(po.placedAt)}`}
            {po.receivedAt && ` · Received ${formatDate(po.receivedAt)}`}
            {po.cancelledAt && ` · Cancelled ${formatDate(po.cancelledAt)}`}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {po.status === "DRAFT" && (
            <>
              <Button
                variant="success"
                onClick={handlePlace}
                loading={placeMutation.isPending}
                disabled={po.lineItems.length === 0}
              >
                <Send className="h-4 w-4" />
                Place Order
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                loading={cancelMutation.isPending}
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
            </>
          )}
          {po.status === "PLACED" && (
            <>
              <Button
                variant="success"
                onClick={handleReceive}
                loading={receiveMutation.isPending}
              >
                <PackageCheck className="h-4 w-4" />
                Receive Order
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                loading={cancelMutation.isPending}
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
            </>
          )}
          {po.status === "RECEIVED" && (
            <Badge variant="received">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Fully Received
            </Badge>
          )}
          {po.status === "CANCELLED" && (
            <Badge variant="cancelled">
              <XCircle className="h-4 w-4 mr-1" />
              Cancelled
            </Badge>
          )}
        </div>
      </div>

      {/* Action errors */}
      {actionError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {actionError}
        </div>
      )}

      {/* Line Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-zinc-400" />
              Line Items ({po.lineItems.length})
            </CardTitle>
            {po.status === "DRAFT" && (
              <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Line Item</DialogTitle>
                    <DialogDescription>
                      Add a product to this purchase order. The price will be
                      snapshotted from the supplier's current price.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddItem} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-700">
                        Product
                      </label>
                      <select
                        value={itemForm.productId}
                        onChange={(e) =>
                          setItemForm({ ...itemForm, productId: e.target.value })
                        }
                        className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                        required
                      >
                        <option value="">Select product...</option>
                        {supplierProducts.map((sp: any) => (
                          <option key={sp.productId} value={sp.productId}>
                            {sp.productName} ({formatCents(sp.currentPriceCents)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <Input
                      label="Quantity"
                      type="number"
                      min="1"
                      placeholder="1"
                      value={itemForm.quantity}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, quantity: e.target.value })
                      }
                      required
                    />
                    {itemError && (
                      <p className="text-sm text-red-500">{itemError}</p>
                    )}
                    <div className="flex justify-end gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAddItemOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" loading={addLineItem.isPending}>
                        Add Item
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {po.lineItems.length === 0 ? (
            <div className="px-6 pb-6">
              <EmptyState
                title="No line items"
                description={
                  po.status === "DRAFT"
                    ? "Add products to this purchase order."
                    : "This purchase order has no line items."
                }
                icon={<ShoppingCart className="h-6 w-6" />}
                action={
                  po.status === "DRAFT"
                    ? {
                        label: "Add Item",
                        onClick: () => setAddItemOpen(true),
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
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Price Snapshot</TableHead>
                  {po.status === "DRAFT" && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.lineItems.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-zinc-900">
                      <Link
                        href={`/products/${item.productId}`}
                        className="hover:text-blue-600 transition-colors"
                      >
                        {item.productName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-zinc-500 font-mono text-xs">
                      {item.productSku}
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="font-medium">
                      {formatCents(item.unitPriceCents)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCents(item.lineTotalCents)}
                    </TableCell>
                    <TableCell className="text-zinc-500 text-sm">
                      {formatDate(item.priceSnapshotAt)}
                    </TableCell>
                    {po.status === "DRAFT" && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                          aria-label={`Remove ${item.productName} from order`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <dt className="text-sm text-zinc-500">PO Number</dt>
              <dd className="text-sm font-mono font-medium text-zinc-900 mt-1">
                {po.poNumber}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-500">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={po.status} />
              </dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-500">Total</dt>
              <dd className="text-lg font-bold text-zinc-900 mt-1">
                {formatCents(po.totalCents)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-500">Items</dt>
              <dd className="text-sm font-medium text-zinc-900 mt-1">
                {po.lineItems.length} product{po.lineItems.length !== 1 ? "s" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-500">Created</dt>
              <dd className="text-sm text-zinc-700 mt-1">
                {formatDate(po.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-500">Last Updated</dt>
              <dd className="text-sm text-zinc-700 mt-1">
                {formatDate(po.updatedAt)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
