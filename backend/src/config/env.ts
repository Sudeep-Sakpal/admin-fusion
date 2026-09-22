import dotenv from "dotenv";

dotenv.config();

const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigins,
  mongodbUri:
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hackathon",
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,
  jwtSecret: process.env.JWT_SECRET || "dev_insecure_secret_change_me",
  jwtExpiresInSeconds: Number(process.env.JWT_EXPIRES_IN_SECONDS) || 86400,
};

if (env.nodeEnv === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required in production");
}
