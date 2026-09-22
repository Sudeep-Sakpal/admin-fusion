import { Router } from "express";
import {
  listProblemStatements,
  selectProblemStatement,
  selectTrack,
} from "../controllers/teamController";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import {
  selectProblemRateLimiter,
  selectTrackRateLimiter,
} from "../middleware/rateLimiter";
import { UserRole } from "../models";

const router = Router();

router.post(
  "/select-track",
  requireAuth,
  requireRole(UserRole.TEAM_LEADER),
  selectTrackRateLimiter,
  asyncHandler(selectTrack)
);

router.get(
  "/problem-statements",
  requireAuth,
  requireRole(UserRole.TEAM_LEADER),
  asyncHandler(listProblemStatements)
);

router.post(
  "/select-problem",
  requireAuth,
  requireRole(UserRole.TEAM_LEADER),
  selectProblemRateLimiter,
  asyncHandler(selectProblemStatement)
);

export default router;
