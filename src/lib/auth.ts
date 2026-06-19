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
    // Dev/test only — never used in production.
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
//
// The `Secure` cookie flag is computed per-request: we honour the
// X-Forwarded-Proto header (set by Caddy/Nginx) so a production deployment
// behind HTTPS gets the Secure flag, but a plain-HTTP deployment does not.
//
// Browsers drop Secure cookies over plain HTTP, so blindly setting
// secure: NODE_ENV === "production" would log in successfully on the
// server but never persist the cookie in the browser when the user
// reaches the app via http://...:3000.

export const COOKIE_NAME = "session";
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 hours

export interface CookieOptions {
  name: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge: number;
}

export const COOKIE_OPTIONS: CookieOptions = {
  name: COOKIE_NAME,
  httpOnly: true,
  // Default false; buildCookieOptions() recomputes per-request.
  secure: false,
  sameSite: "lax",
  path: "/",
  maxAge: COOKIE_MAX_AGE_SECONDS,
};

/**
 * Detect whether the incoming request is over HTTPS. Honours the
 * X-Forwarded-Proto header (set by Caddy/Nginx/proxies), then falls back
 * to NODE_ENV.
 */
export function isSecureRequest(request?: { headers: Headers }): boolean {
  const forwardedProto = request?.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.toLowerCase() === "https";
  }
  return process.env.NODE_ENV === "production";
}

/**
 * Build per-request cookie options so Secure flag matches the actual
 * transport — never sends Secure over HTTP (browsers would drop the
 * cookie), never sends non-Secure over HTTPS (XSS surface).
 */
export function buildCookieOptions(request?: { headers: Headers }): CookieOptions {
  return {
    ...COOKIE_OPTIONS,
    secure: isSecureRequest(request),
  };
}

/**
 * Get the current authenticated user from a JWT token (used by /api/auth/me
 * and middleware).
 */
export async function getCurrentUser(token: string) {
  const payload = await verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return user;
}