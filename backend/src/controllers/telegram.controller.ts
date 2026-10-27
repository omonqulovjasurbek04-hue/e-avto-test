import crypto from "crypto";
import { Request, Response } from "express";
import { z } from "zod";
import * as telegramService from "../services/telegram.service";
import { success, error } from "../utils/apiResponse";
import { env } from "../config/env";
import { sendLoginOutcome } from "./auth.controller";
import { clientInfo } from "../utils/clientInfo";
import { AuthRequest, requireUserId } from "../middleware/auth.middleware";
import * as authService from "../services/auth.service";

const verifySchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export const start = async (_req: Request, res: Response): Promise<void> => {
  success(res, await telegramService.startLogin(), 201);
};

export const verify = async (req: Request, res: Response): Promise<void> => {
  const { code } = verifySchema.parse(req.body);
  sendLoginOutcome(res, await telegramService.verifyLogin(code, clientInfo(req)));
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

/** Settings -> linked accounts: the bot code links Telegram to the signed-in user. */
export const link = async (req: AuthRequest, res: Response): Promise<void> => {
  const { code } = verifySchema.parse(req.body);
  success(res, await telegramService.linkTelegram(requireUserId(req), code));
};

export const unlink = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await authService.unlinkSignIn(requireUserId(req), "telegram"));
};
