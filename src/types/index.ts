// src/types/index.ts — Core type definitions
// Author: Sudarshan Sonawane

import type { PoStatus, MovementReason } from "@prisma/client";

// ─── API Response Envelope ───────────────────────────

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Pagination ──────────────────────────────────────

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Domain Types ────────────────────────────────────

export type PoStatusUnion = PoStatus;
export type MovementReasonUnion = MovementReason;

export interface StateTransition {
  from: PoStatusUnion;
  to: PoStatusUnion;
}

// ─── Money ───────────────────────────────────────────

export type Cents = bigint;

export function centsFromDollars(dollars: number): bigint {
  return BigInt(Math.round(dollars * 100));
}

// ─── Supplier Types ──────────────────────────────────

export interface SupplierSummary {
  id: string;
  name: string;
  email: string | null;
  isActive: boolean;
  productCount: number;
  poCount: number;
  createdAt: Date;
}

export interface SupplierDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  products: SupplierProductSummary[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierProductSummary {
  productId: string;
  productName: string;
  productSku: string;
  supplierSku: string | null;
  currentPriceCents: bigint;
  leadTimeDays: number | null;
  isPreferred: boolean;
}

// ─── Product Types ───────────────────────────────────

export interface ProductSummary {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  currentStock: number;
  reorderLevel: number;
  isLowStock: boolean;
  isActive: boolean;
  supplierCount: number;
  updatedAt: Date;
}

export interface LowStockProduct extends ProductSummary {
  deficit: number; // reorderLevel - currentStock
}

// ─── Purchase Order Types ────────────────────────────

export interface PurchaseOrderSummary {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  status: PoStatusUnion;
  totalCents: bigint;
  totalFormatted: string;
  lineItemCount: number;
  placedAt: Date | null;
  receivedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
}

export interface PurchaseOrderDetail {
  id: string;
  poNumber: string;
  supplier: {
    id: string;
    name: string;
    email: string | null;
  };
  status: PoStatusUnion;
  totalCents: bigint;
  totalFormatted: string;
  notes: string | null;
  lineItems: LineItemDetail[];
  placedAt: Date | null;
  receivedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LineItemDetail {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPriceCents: bigint;
  unitPriceFormatted: string;
  lineTotalCents: bigint;
  lineTotalFormatted: string;
  priceSnapshotAt: Date;
}

// ─── Stock Movement Types ────────────────────────────

export interface StockMovementSummary {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  delta: number;
  balanceAfter: number;
  reason: MovementReasonUnion;
  purchaseOrderId: string | null;
  purchaseOrderNumber: string | null;
  createdAt: Date;
}

// ─── Dashboard Types ─────────────────────────────────

export interface DashboardStats {
  totalSuppliers: number;
  totalProducts: number;
  totalPurchaseOrders: number;
  totalInventory: number;
  lowStockCount: number;
  recentOrders: PurchaseOrderSummary[];
  recentMovements: StockMovementSummary[];
}

// ─── Create/Update Types ─────────────────────────────

export interface CreateSupplierInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface CreateProductInput {
  sku: string;
  name: string;
  description?: string;
  reorderLevel?: number;
}

export interface LinkSupplierProductInput {
  supplierId: string;
  productId: string;
  supplierSku?: string;
  currentPriceCents: number;
  leadTimeDays?: number;
  isPreferred?: boolean;
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  notes?: string;
}

export interface AddLineItemInput {
  productId: string;
  quantity: number;
}
