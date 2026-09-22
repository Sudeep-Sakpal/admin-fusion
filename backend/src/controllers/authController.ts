import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { HttpError } from "../middleware/errorHandler";
import { User } from "../models";
import { AUTH_COOKIE_NAME, authCookieOptions } from "../utils/cookies";
import { serializeUser } from "../utils/serializeUser";
import { signToken } from "../utils/jwt";
import { loginSchema } from "../validators/authValidators";

// A real bcrypt hash (of a value nothing can match) compared against when
// no user is found, so an unknown userId costs the same time as a known one
// and cannot be distinguished by response latency.
const DUMMY_PASSWORD_HASH =
  "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.fVYPTFVhDm5Zr7hR/YKcNqhTRXHq";

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(
      400,
      parsed.error.issues[0]?.message || "Invalid input"
    );
  }

  const { userId, password } = parsed.data;

  const user = await User.findOne({ userId: userId.toUpperCase() })
    .select("+password")
    .populate("team");

  if (!user) {
    // Still spend the hashing time before failing, then return the exact
    // same error as a wrong password — no user enumeration by message or
    // by timing.
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    throw new HttpError(401, "Invalid credentials");
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    throw new HttpError(401, "Invalid credentials");
  }

  // A deactivated account must not be able to obtain a session at all.
  // Reported identically to bad credentials so deactivation is not probeable.
  if (!user.isActive) {
    throw new HttpError(401, "Invalid credentials");
  }

  const token = signToken({
    sub: user._id.toString(),
    userId: user.userId,
    role: user.role,
  });

  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
  res.status(200).json({
    success: true,
    data: { user: serializeUser(user) },
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user!.id).populate("team");
  // An account deactivated after its token was issued must lose access
  // immediately, without waiting for the JWT to expire.
  if (!user || !user.isActive) {
    throw new HttpError(401, "Authentication required");
  }

  res.status(200).json({
    success: true,
    data: { user: serializeUser(user) },
  });
}

export function logout(_req: Request, res: Response): void {
  const { maxAge: _maxAge, ...clearOptions } = authCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, clearOptions);
  res.status(200).json({ success: true, message: "Logged out" });
}
