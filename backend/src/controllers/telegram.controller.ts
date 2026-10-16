import crypto from "crypto";
import { Request, Response } from "express";
import { z } from "zod";
import * as telegramService from "../services/telegram.service";
import { success, error } from "../utils/apiResponse";
import { env } from "../config/env";
import { sendLoginOutcome } from "./auth.controller";

const verifySchema = z.object({
  sessionId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export const start = async (_req: Request, res: Response): Promise<void> => {
  success(res, await telegramService.startLogin(), 201);
};

export const verify = async (req: Request, res: Response): Promise<void> => {
  const { sessionId, code } = verifySchema.parse(req.body);
  sendLoginOutcome(res, await telegramService.verifyLogin(sessionId, code, req.get("user-agent") ?? undefined));
};

/** Webhook mode: Telegram posts updates here; the secret in the URL authenticates the caller. */
export const webhook = async (req: Request, res: Response): Promise<void> => {
  const given = Buffer.from(String(req.params.secret));
  const wanted = Buffer.from(env.TELEGRAM_WEBHOOK_SECRET);
  if (!wanted.length || given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) {
    error(res, "Not found", 404);
    return;
  }
  await telegramService.handleUpdate(req.body);
  res.json({ ok: true });
};
