// src/validators/supplier.ts — Supplier Zod schemas
// Author: Sudarshan Sonawane

import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z
    .string()
    .min(1, "Please enter a supplier name.")
    .max(200, "Supplier name must not exceed 200 characters."),
  email: z
    .string()
    .email("Please enter a valid email address.")
    .max(255, "Email must not exceed 255 characters.")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .max(50, "Phone number must not exceed 50 characters.")
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .max(500, "Address must not exceed 500 characters.")
    .optional()
    .or(z.literal("")),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const supplierQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export const linkProductSchema = z.object({
  productId: z.string().min(1, "Please select a product."),
  supplierSku: z
    .string()
    .max(100, "Supplier SKU must not exceed 100 characters.")
    .optional()
    .or(z.literal("")),
  currentPriceCents: z
    .number()
    .int("Price must be in whole cents.")
    .min(0, "Price cannot be negative.")
    .max(100000000, "Price must not exceed $1,000,000."),
  leadTimeDays: z
    .number()
    .int("Lead time must be a whole number of days.")
    .min(1, "Lead time must be at least 1 day.")
    .max(365, "Lead time must not exceed 365 days.")
    .optional(),
  isPreferred: z.boolean().default(false),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type SupplierQueryInput = z.infer<typeof supplierQuerySchema>;
export type LinkProductInput = z.infer<typeof linkProductSchema>;
