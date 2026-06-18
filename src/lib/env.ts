// src/lib/env.ts — Typed environment parser. Fail fast at boot if anything is missing.
// Author: Sudarshan Sonawane

import { z } from "zod";

/**
 * Production-required secrets. The app refuses to start without these in
 * production to prevent silent insecure defaults.
 */
const PROD_REQUIRED = [
  "DATABASE_URL",
  "REDIS_URL",
  "JWT_SECRET",
  "ADMIN_EMAIL",
] as const;

/**
 * Env schema. Required vs optional split per environment.
 */
const EnvSchema = z.object({
  // ─── App ───────────────────────────────────────────
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  // ─── Data ──────────────────────────────────────────
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  // ─── Auth ──────────────────────────────────────────
  JWT_SECRET: z.string().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().optional(),

  // ─── Misc ──────────────────────────────────────────
  NEXT_PUBLIC_DEMO_MODE: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Parse + validate environment. Returns the typed env or throws on
 * validation failure.
 */
export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const env = parsed.data;

  // In production, additionally require the secrets that should never have
  // dev fallbacks.
  if (env.NODE_ENV === "production") {
    const missing = PROD_REQUIRED.filter((k) => !process.env[k]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables in production:\n` +
          missing.map((k) => `  - ${k}`).join("\n") +
          `\n\nSet them in your environment before starting the app.`
      );
    }

    // JWT secret must be at least 32 chars in production
    if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
      throw new Error(
        "JWT_SECRET must be at least 32 characters in production. " +
          "Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('base64'))\""
      );
    }
  }

  return env;
}

/**
 * Validated env, eagerly loaded at module import. If the env is invalid
 * the process will exit with a clear error.
 */
export const env = loadEnv();