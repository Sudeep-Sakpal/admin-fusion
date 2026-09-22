import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { HttpError } from "./errorHandler";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function originOf(headerValue: string | undefined): string | null {
  if (!headerValue) return null;
  try {
    return new URL(headerValue).origin;
  } catch {
    return null;
  }
}

/**
 * Lightweight CSRF defense for cookie-authenticated requests.
 *
 * Switching the auth cookie to SameSite=None (required for the cross-site
 * Vercel -> Render deployment) means browsers will attach it to
 * state-changing requests from *any* origin, not just ours. Browsers cannot
 * be made to lie about the Origin header on a cross-site fetch/XHR, so
 * rejecting a mismatched Origin (falling back to Referer) blocks forged
 * cross-site requests while requiring no client-side token plumbing.
 *
 * Requests with neither header (non-browser API clients, plain GETs) are
 * let through, since they aren't part of the ambient-cookie CSRF threat
 * model this guards against.
 */
export function verifyOrigin(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = originOf(req.get("origin")) ?? originOf(req.get("referer"));

  if (origin && !env.corsOrigins.includes(origin)) {
    next(new HttpError(403, "Request origin is not allowed"));
    return;
  }

  next();
}
