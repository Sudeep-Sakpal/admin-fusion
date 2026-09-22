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
 * In production every legitimate state-changing caller is the browser app,
 * which always sends Origin on a cross-site request, so a mutating request
 * carrying neither header is rejected rather than trusted — that closes the
 * "omit the header" path instead of relying on browsers never taking it.
 * In development the header is not required, so local tooling (curl, tests)
 * still works against a dev server.
 */
export function verifyOrigin(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = originOf(req.get("origin")) ?? originOf(req.get("referer"));

  if (!origin) {
    if (env.nodeEnv === "production") {
      next(new HttpError(403, "Request origin is not allowed"));
      return;
    }
    next();
    return;
  }

  if (!env.corsOrigins.includes(origin)) {
    next(new HttpError(403, "Request origin is not allowed"));
    return;
  }

  next();
}
