import { Router } from "express";
import * as testController from "../controllers/test.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { testRateLimiter } from "../middleware/rateLimit.middleware";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.use("/tests", asyncHandler(authMiddleware), testRateLimiter);
router.post("/tests/start", asyncHandler(testController.startTest));
router.post("/tests/:id/answer", asyncHandler(testController.answerQuestion));
router.post("/tests/:id/finish", asyncHandler(testController.finishTest));

export default router;
