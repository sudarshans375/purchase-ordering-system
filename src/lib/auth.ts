// src/lib/auth.ts — JWT authentication utilities (DB-backed)
// Author: Sudarshan Sonawane

import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      // Refuse to use a fallback secret in production — fail fast.
      throw new Error(
        "JWT_SECRET is required in production. Refusing to start with an insecure default."
      );
    }
    // Dev/test only — never used in production. Throw a clear error in prod,
    // fall back to a clearly-labeled development secret otherwise.
    // eslint-disable-next-line no-console
    console.warn(
      "[auth] JWT_SECRET not set — using insecure development fallback. " +
        "DO NOT use this configuration in production."
    );
    return new TextEncoder().encode(
      "pos-development-jwt-secret-key-min-32-chars-DO-NOT-USE-IN-PROD"
    );
  }
  return new TextEncoder().encode(secret);
}

// ─── Token Creation ──────────────────────────────────

export interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
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
  user?: { id: string; email: string; name: string; role: string };
  error?: string;
}

export async function authenticate(
  email: string,
  password: string
): Promise<AuthResult> {
  // Look up user in database
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, name: true, password: true, role: true, isActive: true },
  });

  if (!user) {
    return { success: false, error: "Invalid email or password." };
  }

  if (!user.isActive) {
    return { success: false, error: "Account has been deactivated." };
  }

  // Verify password with bcrypt
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return { success: false, error: "Invalid email or password." };
  }

  const token = await createToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return {
    success: true,
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
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
