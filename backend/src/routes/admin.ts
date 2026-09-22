import { Router } from "express";
import {
  getDashboard,
  getTeamDetail,
  listAdminProblemStatements,
  listAdminTracks,
  listTeams,
} from "../controllers/adminController";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { adminReadRateLimiter } from "../middleware/rateLimiter";
import { UserRole } from "../models";

const router = Router();

// Every /api/admin/* route requires authentication, the ADMIN role (from
// the verified JWT), and shares one rate-limit bucket. Controllers each
// additionally re-verify the admin's active status against the database.
router.use(requireAuth, requireRole(UserRole.ADMIN), adminReadRateLimiter);

router.get("/dashboard", asyncHandler(getDashboard));
router.get("/teams", asyncHandler(listTeams));
router.get("/teams/:id", asyncHandler(getTeamDetail));
router.get("/tracks", asyncHandler(listAdminTracks));
router.get("/problem-statements", asyncHandler(listAdminProblemStatements));

export default router;
