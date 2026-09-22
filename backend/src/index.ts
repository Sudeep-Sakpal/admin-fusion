import app from "./app";
import { connectDB, disconnectDB, registerIndexDiagnostics } from "./config/db";
import { env } from "./config/env";
import { ProblemStatement, Team, Track, User } from "./models";

registerIndexDiagnostics([User, Team, Track, ProblemStatement]);

const server = app.listen(env.port, () => {
  console.log(`Backend server running on port ${env.port} (${env.nodeEnv})`);
});

// The HTTP listener starts first so the platform health check can succeed
// immediately; the database connects alongside it and retries on failure.
connectDB().catch((err) => {
  console.error(
    "MongoDB connection failed after all retries. The server is running but " +
      "database-backed endpoints will fail until connectivity recovers:",
    (err as Error).message
  );
});

/**
 * Render sends SIGTERM on every deploy/restart. Without this the process is
 * killed mid-request, dropping in-flight work and leaving the Mongo
 * connection to time out server-side. Stop accepting new connections, let
 * in-flight requests finish, then close the database cleanly.
 */
let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received — shutting down gracefully`);

  // Hard ceiling so a hung connection can never block the platform's
  // shutdown window indefinitely.
  const forceExit = setTimeout(() => {
    console.error("Graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, 10000);
  forceExit.unref();

  server.close(async (err) => {
    if (err) {
      console.error("Error closing HTTP server:", err.message);
    }
    try {
      await disconnectDB();
      console.log("Shutdown complete");
      process.exit(0);
    } catch (dbErr) {
      console.error("Error closing database connection:", (dbErr as Error).message);
      process.exit(1);
    }
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
