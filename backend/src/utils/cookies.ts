import { CookieOptions } from "express";
import { env } from "../config/env";

export const AUTH_COOKIE_NAME = "token";

export function authCookieOptions(): CookieOptions {
  const isProduction = env.nodeEnv === "production";

  // Frontend (Vercel) and backend (Render) are on different sites in
  // production, so the auth cookie must be sent cross-site. That requires
  // SameSite=None, which browsers only honor when Secure is also set.
  // In development both run on localhost (same site, different ports), so
  // Lax + non-secure works and doesn't require HTTPS locally.
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: env.jwtExpiresInSeconds * 1000,
    path: "/",
  };
}
