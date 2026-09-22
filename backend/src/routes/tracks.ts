import { Router } from "express";
import { listTracks } from "../controllers/trackController";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

router.get("/", requireAuth, asyncHandler(listTracks));

export default router;
