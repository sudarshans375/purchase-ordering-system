// src/validators/po.ts — Purchase Order Zod schemas
// Author: Sudarshan Sonawane

import { z } from "zod";

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Please select a supplier."),
  notes: z
    .string()
    .max(2000, "Notes must not exceed 2,000 characters.")
    .optional()
    .or(z.literal("")),
});

export const addLineItemSchema = z.object({
  productId: z.string().min(1, "Please select a product."),
  quantity: z
    .number()
    .int("Quantity must be a whole number.")
    .min(1, "Quantity must be at least 1.")
    .max(1000000, "Quantity must not exceed 1,000,000."),
});

export const poQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20).catch(20),
  status: z.enum(["DRAFT", "PLACED", "RECEIVED", "CANCELLED"]).optional(),
  supplierId: z.string().optional(),
});

export const receivePoSchema = z.object({
  idempotencyKey: z
    .string()
    .uuid("Idempotency-Key must be a valid UUID.")
    .min(1, "Idempotency-Key header is required."),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type AddLineItemInput = z.infer<typeof addLineItemSchema>;
export type POQueryInput = z.infer<typeof poQuerySchema>;
