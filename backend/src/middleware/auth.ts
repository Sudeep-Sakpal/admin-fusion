import { NextFunction, Request, Response } from "express";
import { UserRole } from "../models";
import { AUTH_COOKIE_NAME } from "../utils/cookies";
import { verifyToken } from "../utils/jwt";
import { HttpError } from "./errorHandler";

export interface AuthenticatedUser {
  id: string;
  userId: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    next(new HttpError(401, "Authentication required"));
    return;
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      userId: payload.userId,
      role: payload.role,
    };
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired session"));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new HttpError(403, "You do not have permission to perform this action"));
      return;
    }
    next();
  };
}
