// src/validators/product.ts — Product Zod schemas
// Author: Sudarshan Sonawane

import { z } from "zod";

export const createProductSchema = z.object({
  sku: z
    .string()
    .min(1, "Please enter a product SKU.")
    .max(100, "SKU must not exceed 100 characters.")
    .regex(/^[A-Za-z0-9-]+$/, "SKU may only contain letters, numbers, and hyphens."),
  name: z
    .string()
    .min(1, "Please enter a product name.")
    .max(300, "Product name must not exceed 300 characters."),
  description: z
    .string()
    .max(2000, "Description must not exceed 2,000 characters.")
    .optional()
    .or(z.literal("")),
  reorderLevel: z
    .number()
    .int("Reorder level must be a whole number.")
    .min(0, "Reorder level cannot be negative.")
    .max(100000, "Reorder level must not exceed 100,000.")
    .default(10),
});

export const updateProductSchema = z.object({
  reorderLevel: z
    .number()
    .int("Reorder level must be a whole number.")
    .min(0, "Reorder level cannot be negative.")
    .max(100000, "Reorder level must not exceed 100,000."),
});

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20).catch(20),
  search: z.string().optional().catch(undefined),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional()
    .catch(undefined),
  lowStock: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional()
    .catch(undefined),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
