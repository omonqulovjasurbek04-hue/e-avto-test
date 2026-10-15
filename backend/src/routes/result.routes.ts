import { Router } from "express";
import * as resultController from "../controllers/result.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.use("/results", asyncHandler(authMiddleware));
router.get("/results", asyncHandler(resultController.listResults));
router.get("/results/:id", asyncHandler(resultController.getResult));

export default router;
