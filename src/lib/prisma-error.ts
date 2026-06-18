// src/lib/prisma-error.ts — Map Prisma errors to domain errors.
// Author: Sudarshan Sonawane

import { Prisma } from "@prisma/client";
import { ConflictError, NotFoundError, ErrorCodes } from "./errors";

/**
 * Wraps a Prisma operation. If it throws a PrismaClientKnownRequestError,
 * translate to the appropriate domain error. Otherwise re-throw.
 *
 * Usage:
 *   const supplier = await translatePrisma(() =>
 *     supplierRepo.createSupplier(data)
 *   );
 */
export async function translatePrisma<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (err) {
    throw mapPrismaError(err);
  }
}

/**
 * Map a single Prisma error to a domain error. Returns the original error
 * if it isn't a recognizable Prisma error.
 */
export function mapPrismaError(err: unknown): unknown {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return err;

  switch (err.code) {
    case "P2002": {
      // Unique constraint violation. Inspect the target to choose a friendly code.
      const target = (err.meta?.target as string[] | string | undefined) ?? [];
      const fields = Array.isArray(target) ? target : [target];

      if (fields.includes("poNumber")) {
        return new ConflictError(
          "PO_NUMBER_DUPLICATE",
          "A purchase order with this number already exists. Please retry.",
          { code: err.code }
        );
      }
      if (fields.includes("sku")) {
        return new ConflictError(
          ErrorCodes.PRODUCT_SKU_DUPLICATE,
          "A product with this SKU already exists.",
          { fields }
        );
      }
      if (fields.includes("supplierSku")) {
        return new ConflictError(
          ErrorCodes.SUPPLIER_SKU_DUPLICATE,
          "This supplier already has a product with this supplier SKU.",
          { fields }
        );
      }
      if (fields.includes("purchaseOrderId") && fields.includes("productId")) {
        return new ConflictError(
          ErrorCodes.PRODUCT_ALREADY_IN_PO,
          "This product is already on the purchase order.",
          { fields }
        );
      }
      if (fields.includes("email")) {
        return new ConflictError(
          "USER_EMAIL_DUPLICATE",
          "A user with this email already exists.",
          { fields }
        );
      }
      return new ConflictError("UNIQUE_VIOLATION", "A record with these unique fields already exists.", {
        fields,
        code: err.code,
      });
    }

    case "P2025":
      // Record not found (e.g., update/delete on missing id)
      return new NotFoundError("Record", String(err.meta?.cause ?? "unknown"));

    case "P2003":
      // Foreign key constraint failed
      return new ConflictError(
        "FK_CONSTRAINT",
        "This operation violates a foreign key constraint. Check related records exist.",
        { code: err.code, meta: err.meta }
      );

    case "P2014":
      // Required relation missing
      return new ConflictError(
        "REQUIRED_RELATION_MISSING",
        "A required related record is missing.",
        { code: err.code }
      );

    default:
      return err;
  }
}