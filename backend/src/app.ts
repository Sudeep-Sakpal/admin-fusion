import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { verifyOrigin } from "./middleware/verifyOrigin";
import adminRouter from "./routes/admin";
import authRouter from "./routes/auth";
import healthRouter from "./routes/health";
import teamRouter from "./routes/team";
import tracksRouter from "./routes/tracks";

const app = express();

// Render terminates TLS and proxies to this service, so the socket address
// is always Render's edge, not the client. Trusting exactly one hop makes
// req.ip / req.protocol reflect the real request instead of the proxy.
// Note: rate limiting deliberately does not depend on client IP (see
// rateLimiter.ts) — participants share a venue NAT, so IP is not a usable
// identity here.
if (env.trustProxy) {
  app.set("trust proxy", 1);
}

// Express advertises itself by default; there is no reason to tell clients
// what the server runs on.
app.disable("x-powered-by");

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  // This API is JSON-only and never meant to be framed or embedded.
  res.setHeader("X-Frame-Options", "DENY");
  // Every response here is either authenticated or account-specific, and
  // several carry participant PII. Keep them out of shared/browser caches.
  res.setHeader("Cache-Control", "no-store");
  if (env.nodeEnv === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }
  next();
});

app.use(cors({ origin: env.corsOrigins, credentials: true }));
// Bodies in this API are a couple of short ids; the default 100kb ceiling
// is far more than needed, so cap it tighter.
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());
app.use(verifyOrigin);

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/tracks", tracksRouter);
app.use("/api/team", teamRouter);
app.use("/api/admin", adminRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
