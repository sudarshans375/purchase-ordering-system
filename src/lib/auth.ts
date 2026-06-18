// src/lib/auth.ts — JWT authentication utilities
// Author: Sudarshan Sonawane

import { SignJWT, jwtVerify } from "jose";

// Default admin credentials (should be overridden via .env in production)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@posystem.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || "pos-development-jwt-secret-key-min-32-chars!";
  return new TextEncoder().encode(secret);
}

// ─── Token Creation ──────────────────────────────────

export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
}

export async function createToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecret());
}

// ─── Token Verification ──────────────────────────────

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

// ─── Authentication ──────────────────────────────────

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: { email: string; name: string };
  error?: string;
}

export async function authenticate(
  email: string,
  password: string
): Promise<AuthResult> {
  // For demo: single admin user
  // In production: check against database
  if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return { success: false, error: "Invalid email or password." };
  }

  if (password !== ADMIN_PASSWORD) {
    return { success: false, error: "Invalid email or password." };
  }

  const token = await createToken({
    sub: "admin-001",
    email: ADMIN_EMAIL,
    name: "Admin",
  });

  return {
    success: true,
    token,
    user: { email: ADMIN_EMAIL, name: "Admin" },
  };
}

// ─── Cookie Configuration ────────────────────────────

export const COOKIE_NAME = "session";

export const COOKIE_OPTIONS = {
  name: COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24, // 24 hours
};
