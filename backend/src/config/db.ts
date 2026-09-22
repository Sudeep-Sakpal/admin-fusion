import mongoose from "mongoose";
import { env } from "./env";

mongoose.set("strictQuery", true);

export function isDatabaseConnected(): boolean {
  // 1 === connected. Anything else (connecting/disconnecting/disconnected)
  // means queries would buffer or fail.
  return mongoose.connection.readyState === 1;
}

/**
 * Connects with bounded retries.
 *
 * Mongoose only auto-reconnects after an initial connection has succeeded —
 * if the very first attempt fails (an Atlas DNS blip or a cold start racing
 * the cluster during a deploy) the process would otherwise stay up forever
 * with no database and no further attempts, serving errors indefinitely.
 * Retrying with backoff covers that window; after the final attempt the
 * caller decides what to do rather than this helper crashing the process.
 */
export async function connectDB(attempts = 5): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await mongoose.connect(env.mongodbUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`MongoDB connected: ${mongoose.connection.name}`);
      return;
    } catch (err) {
      lastError = err;
      // Never log the URI itself — it carries the Atlas credentials.
      console.error(
        `MongoDB connection attempt ${attempt}/${attempts} failed: ${
          (err as Error).message
        }`
      );

      if (attempt < attempts) {
        const delayMs = Math.min(1000 * 2 ** (attempt - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}

/**
 * Index builds are kicked off in the background by Mongoose. If one fails
 * (most importantly a `unique` index that cannot be built because duplicate
 * data already exists) the failure is otherwise silent and the application
 * keeps running *without* that constraint enforced. Surface it loudly.
 */
export function registerIndexDiagnostics(models: mongoose.Model<any>[]): void {
  for (const model of models) {
    model.on("index", (err?: Error) => {
      if (err) {
        console.error(
          `Index build failed for "${model.modelName}" — a uniqueness or ` +
            `lookup constraint may NOT be enforced: ${err.message}`
        );
      }
    });
  }
}
