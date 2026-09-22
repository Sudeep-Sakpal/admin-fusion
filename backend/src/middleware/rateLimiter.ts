import rateLimit, { ipKeyGenerator } from "express-rate-limit";

/**
 * In-memory rate limiting.
 *
 * This stores counters in the Node process's memory (express-rate-limit's
 * default store). It is appropriate for the current single-instance
 * modular-monolith deployment (one Render web service). It does NOT
 * coordinate across multiple instances/processes — if this service is ever
 * horizontally scaled, each instance enforces its own independent limit
 * (effectively multiplying the true allowed rate by the instance count).
 * At that point this should be swapped for a shared store (e.g. a Redis
 * store for express-rate-limit), which is intentionally out of scope here.
 */

export const loginRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
});

// Mounted after requireAuth on the select-track route, so req.user is
// always populated here — keyed per authenticated user, not per IP.
export const selectTrackRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? "unknown"),
  message: {
    success: false,
    message: "Too many requests. Please slow down and try again shortly.",
  },
});
