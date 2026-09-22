import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UserRole } from "../models";

export interface AuthTokenPayload {
  sub: string;
  userId: string;
  role: UserRole;
}

// Pinned explicitly on both sides so a token can never be accepted under an
// algorithm we did not issue it with.
const JWT_ALGORITHM = "HS256" as const;

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresInSeconds,
    algorithm: JWT_ALGORITHM,
  });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret, {
    algorithms: [JWT_ALGORITHM],
  }) as AuthTokenPayload;
}
