import { Router } from "express";
import * as testController from "../controllers/test.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { testRateLimiter } from "../middleware/rateLimit.middleware";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.use(authMiddleware);

router.post("/tests/start", asyncHandler(testController.startTest));
router.post("/tests/:id/answer", testRateLimiter, asyncHandler(testController.answerQuestion));
router.post("/tests/:id/finish", testRateLimiter, asyncHandler(testController.finishTest));

export default router;
