import { Router } from "express";
import { isDatabaseConnected } from "../config/db";

const router = Router();

/**
 * Liveness probe. Deliberately still returns 200 when the database is
 * unavailable: this answers "is the process up and serving?", and the
 * platform restarting the container would not repair an Atlas outage — it
 * would just add downtime. The database state is reported as a field so
 * operators (and the /api/health/ready probe below) can distinguish the two.
 */
router.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    database: isDatabaseConnected() ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness probe: fails when the service cannot actually serve real
 * traffic. Kept separate so it can be wired to a load balancer without
 * changing the liveness semantics above.
 */
router.get("/ready", (_req, res) => {
  const dbConnected = isDatabaseConnected();
  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    message: dbConnected ? "Ready" : "Database unavailable",
    database: dbConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

export default router;
