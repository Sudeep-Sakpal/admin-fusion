import { Router } from "express";
import { login, logout, me } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { loginRateLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post("/login", loginRateLimiter, asyncHandler(login));
router.get("/me", requireAuth, asyncHandler(me));
router.post("/logout", logout);

export default router;
