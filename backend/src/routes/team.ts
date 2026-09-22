import { Router } from "express";
import { selectTrack } from "../controllers/teamController";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { selectTrackRateLimiter } from "../middleware/rateLimiter";
import { UserRole } from "../models";

const router = Router();

router.post(
  "/select-track",
  requireAuth,
  requireRole(UserRole.TEAM_LEADER),
  selectTrackRateLimiter,
  asyncHandler(selectTrack)
);

export default router;
