import dotenv from "dotenv";

dotenv.config();

const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

// MongoDB Atlas is the only supported database for this project, in every
// environment (local development, testing, and production) — there is no
// local-MongoDB fallback. Fail immediately and clearly rather than silently
// trying to reach a database that was never configured, or one still
// carrying unreplaced placeholder text from .env.example.
const mongodbUri = process.env.MONGODB_URI;

if (!mongodbUri) {
  throw new Error(
    "MONGODB_URI environment variable is required. This project uses " +
      "MongoDB Atlas only — set MONGODB_URI to your Atlas connection " +
      "string in backend/.env (see backend/.env.example)."
  );
}

if (!/^mongodb(\+srv)?:\/\//.test(mongodbUri)) {
  throw new Error(
    "MONGODB_URI must be a valid MongoDB connection string starting with " +
      "'mongodb://' or 'mongodb+srv://'."
  );
}

if (mongodbUri.includes("<") || mongodbUri.includes(">")) {
  throw new Error(
    "MONGODB_URI still contains placeholder text (e.g. <username>, " +
      "<password>, <cluster>). Replace it with your real Atlas connection " +
      "string in backend/.env."
  );
}

export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv,
  corsOrigins,
  mongodbUri,
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,
  jwtSecret: process.env.JWT_SECRET || "dev_insecure_secret_change_me",
  jwtExpiresInSeconds: Number(process.env.JWT_EXPIRES_IN_SECONDS) || 86400,
  // Enabled by default in production (Render always fronts the service with
  // its own proxy); overridable for platforms that expose the socket
  // directly, since blindly trusting forwarded headers is worse than not.
  trustProxy: process.env.TRUST_PROXY
    ? process.env.TRUST_PROXY === "true"
    : isProduction,
};

// Fail fast at boot rather than silently running a misconfigured production
// deployment. These are all cheap checks and each one guards a real
// failure mode (forgeable tokens, wildcard CORS). MONGODB_URI is already
// validated unconditionally above.
if (isProduction) {
  const problems: string[] = [];

  if (!process.env.JWT_SECRET) {
    problems.push("JWT_SECRET is required in production");
  } else if (process.env.JWT_SECRET.length < 32) {
    problems.push("JWT_SECRET must be at least 32 characters in production");
  }

  if (!process.env.CORS_ORIGIN) {
    problems.push(
      "CORS_ORIGIN is required in production (refusing to fall back to localhost)"
    );
  }

  if (corsOrigins.includes("*")) {
    problems.push("CORS_ORIGIN must not be '*' — credentials are enabled");
  }

  if (problems.length > 0) {
    throw new Error(`Invalid production configuration:\n - ${problems.join("\n - ")}`);
  }
}
