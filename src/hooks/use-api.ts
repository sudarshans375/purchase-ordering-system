// src/hooks/use-api.ts — React Query hooks for all API endpoints
// Author: Sudarshan Sonawane

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { generateIdempotencyKey } from "@/lib/utils";

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
    throw new ApiError(res.status, error.code, error.message, error.details);
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
  users: {
    all: ["users"] as const,
    list: (params?: Record<string, string | number | undefined>) =>
      ["users", "list", params] as const,
  },
};

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
    onMutate: async (newSupplier) => {
      await qc.cancelQueries({ queryKey: queryKeys.suppliers.all });
      const prev = qc.getQueriesData({ queryKey: queryKeys.suppliers.all });
      return { prev };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.suppliers.all });
    },
    onError: (_err, _newSupplier, context) => {
      if (context?.prev) {
        context.prev.forEach(([key, data]) => qc.setQueryData(key, data));
      }
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
    onMutate: async (newProduct) => {
      await qc.cancelQueries({ queryKey: queryKeys.products.all });
      const prev = qc.getQueriesData({ queryKey: queryKeys.products.all });
      return { prev };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.products.all });
    },
    onError: (_err, _newProduct, context) => {
      if (context?.prev) {
        context.prev.forEach(([key, data]) => qc.setQueryData(key, data));
      }
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
    },
    onError: (_err, _poId, context) => {
      if (context?.prev) {
        context.prev.forEach(([key, data]) => qc.setQueryData(key, data));
      }
    },
  });
}
