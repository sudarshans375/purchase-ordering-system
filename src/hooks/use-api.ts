// src/hooks/use-api.ts — Add dashboard summary + stock-movements hooks
// (appended after existing hooks — preserves original file)

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { generateIdempotencyKey } from "@/lib/utils";
import { dispatchErrorToast } from "@/lib/toast-bus";

// ─── Fetch helper ─────────────────────────────────────

export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  const body = await res.json();

  if (!res.ok) {
    const error = body.error || {
      code: "UNKNOWN",
      message: "An unexpected error occurred.",
    };
    const apiErr = new ApiError(res.status, error.code, error.message, error.details);
    const isMutation = options?.method && options.method !== "GET";
    if (!isMutation) dispatchErrorToast(apiErr);
    throw apiErr;
  }

  return body.data;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Query key factory ────────────────────────────────

export const queryKeys = {
  suppliers: {
    all: ["suppliers"] as const,
    list: (params?: Record<string, string | number | undefined>) =>
      ["suppliers", "list", params] as const,
    detail: (id: string) => ["suppliers", id] as const,
    products: (id: string) => ["suppliers", id, "products"] as const,
  },
  products: {
    all: ["products"] as const,
    list: (params?: Record<string, string | number | undefined>) =>
      ["products", "list", params] as const,
    detail: (id: string) => ["products", id] as const,
    lowStock: ["products", "low-stock"] as const,
  },
  pos: {
    all: ["pos"] as const,
    list: (params?: Record<string, string | number | undefined>) =>
      ["pos", "list", params] as const,
    detail: (id: string) => ["pos", id] as const,
  },
  dashboard: ["dashboard"] as const,
  dashboardSummary: ["dashboard", "summary"] as const,
  stockMovements: {
    all: ["stock-movements"] as const,
    list: (params?: Record<string, string | number | undefined>) =>
      ["stock-movements", "list", params] as const,
  },
  users: {
    all: ["users"] as const,
    list: (params?: Record<string, string | number | undefined>) =>
      ["users", "list", params] as const,
  },
};

// ─── Dashboard ────────────────────────────────────────

export interface DashboardSummary {
  totals: {
    suppliers: number;
    products: number;
    purchaseOrders: number;
    totalInventory: number;
    lowStockCount: number;
  };
  recentOrders: Array<{
    id: string;
    poNumber: string;
    supplierName: string;
    status: string;
    totalCents: string;
    totalFormatted: string;
    lineItemCount: number;
    createdAt: string;
  }>;
  recentMovements: Array<{
    id: string;
    productName: string;
    productSku: string;
    delta: number;
    balanceAfter: number;
    reason: string;
    purchaseOrderId: string | null;
    createdAt: string;
  }>;
  statusMix: Array<{ status: string; count: number }>;
  topSuppliers: Array<{
    supplierId: string;
    supplierName: string;
    spendCents: string;
    spendFormatted: string;
  }>;
  spendTrend: Array<{ day: string; totalCents: string }>;
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboardSummary,
    queryFn: () => apiFetch<DashboardSummary>("/api/dashboard/summary"),
    refetchInterval: 60_000, // refresh every minute
  });
}

// ─── Stock Movements ──────────────────────────────────

export interface StockMovementItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  delta: number;
  balanceAfter: number;
  reason: string;
  purchaseOrderId: string | null;
  purchaseOrderNumber: string | null;
  createdAt: string;
}

export function useStockMovements(params?: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") searchParams.set(k, String(v));
    });
  }
  return useQuery({
    queryKey: queryKeys.stockMovements.list(params),
    queryFn: () => apiFetch<{
      items: StockMovementItem[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`/api/stock-movements?${searchParams.toString()}`),
  });
}

// ─── Suppliers ─────────────────────────────────────────

export function useSuppliers(params?: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) searchParams.set(k, String(v));
    });
  }

  return useQuery({
    queryKey: queryKeys.suppliers.list(params),
    queryFn: () =>
      apiFetch<any>(`/api/suppliers?${searchParams.toString()}`),
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: queryKeys.suppliers.detail(id),
    queryFn: () => apiFetch<any>(`/api/suppliers/${id}`),
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; email?: string }) =>
      apiFetch<any>("/api/suppliers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.suppliers.all });
    },
  });
}

// ─── Products ─────────────────────────────────────────

export function useProducts(params?: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) searchParams.set(k, String(v));
    });
  }

  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () =>
      apiFetch<any>(`/api/products?${searchParams.toString()}`),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => apiFetch<any>(`/api/products/${id}`),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { sku: string; name: string; reorderLevel?: number }) =>
      apiFetch<any>("/api/products", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: queryKeys.products.lowStock,
    queryFn: () => apiFetch<any[]>("/api/products/low-stock"),
  });
}

// ─── Purchase Orders ──────────────────────────────────

export function usePurchaseOrders(params?: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) searchParams.set(k, String(v));
    });
  }

  return useQuery({
    queryKey: queryKeys.pos.list(params),
    queryFn: () =>
      apiFetch<any>(`/api/pos?${searchParams.toString()}`),
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.pos.detail(id),
    queryFn: () => apiFetch<any>(`/api/pos/${id}`),
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { supplierId: string; notes?: string }) =>
      apiFetch<any>("/api/pos", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pos.all });
    },
  });
}

export function useAddLineItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      poId,
      ...data
    }: {
      poId: string;
      productId: string;
      quantity: number;
    }) =>
      apiFetch<any>(`/api/pos/${poId}/lines`, {
        method: "POST",
        body: JSON.stringify({ productId: data.productId, quantity: data.quantity }),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.pos.detail(variables.poId) });
      qc.invalidateQueries({ queryKey: queryKeys.pos.all });
    },
  });
}

export function useRemoveLineItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, lineId }: { poId: string; lineId: string }) =>
      apiFetch<void>(`/api/pos/${poId}/lines/${lineId}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.pos.detail(variables.poId) });
      qc.invalidateQueries({ queryKey: queryKeys.pos.all });
    },
  });
}

export function usePlacePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (poId: string) =>
      apiFetch<any>(`/api/pos/${poId}/place`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pos.all });
      qc.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

export function useCancelPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (poId: string) =>
      apiFetch<any>(`/api/pos/${poId}/cancel`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pos.all });
    },
  });
}

export function useReceivePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (poId: string) => {
      const idempotencyKey = generateIdempotencyKey();
      return apiFetch<any>(`/api/pos/${poId}/receive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
      });
    },
    onMutate: async (poId) => {
      await qc.cancelQueries({ queryKey: queryKeys.pos.detail(poId) });
      await qc.cancelQueries({ queryKey: queryKeys.pos.all });
      const prev = qc.getQueriesData({ queryKey: ["pos"] });
      return { prev };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pos.all });
      qc.invalidateQueries({ queryKey: queryKeys.products.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboardSummary });
      qc.invalidateQueries({ queryKey: queryKeys.stockMovements.all });
    },
    onError: (_err, _poId, context) => {
      if (context?.prev) {
        context.prev.forEach(([key, data]) => qc.setQueryData(key, data));
      }
    },
  });
}