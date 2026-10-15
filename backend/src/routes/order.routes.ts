import { Router } from "express";
import * as c from "../controllers/order.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler";
import { testRateLimiter } from "../middleware/rateLimit.middleware";

const router = Router();

// Signature-verified, no user session: the provider calls this, not a browser.
router.post("/payments/webhook/:provider", asyncHandler(c.webhook));

router.post("/orders", asyncHandler(authMiddleware), testRateLimiter, asyncHandler(c.createOrder));
router.get("/orders", asyncHandler(authMiddleware), asyncHandler(c.listOrders));
router.get("/orders/:id", asyncHandler(authMiddleware), asyncHandler(c.getOrder));

export default router;
