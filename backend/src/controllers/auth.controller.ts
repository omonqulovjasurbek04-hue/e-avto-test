import { completeRegistrationSchema } from "../validators/auth";
import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import * as sessionService from "../services/session.service";
import * as twoFactorService from "../services/twoFactor.service";
import * as emailVerificationService from "../services/emailVerification.service";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  twoFactorLoginSchema,
  twoFactorCodeSchema,
  twoFactorDisableSchema,
} from "../validators/auth";
import { success, error } from "../utils/apiResponse";
import { AuthRequest, requireUserId } from "../middleware/auth.middleware";
import { REFRESH_COOKIE, clearRefreshCookie, readCookie, setRefreshCookie } from "../utils/cookies";
import { User } from "@prisma/client";

const userAgent = (req: Request) => req.get("user-agent") ?? undefined;

/** The access token goes in the body (kept in memory by the client); the refresh token only in the httpOnly cookie. */
const sendSession = (res: Response, user: User, session: sessionService.Session, status = 200, extra: object = {}) => {
  setRefreshCookie(res, session.refreshToken);
  success(res, { user: authService.toPublicUser(user), token: session.accessToken, ...extra }, status);
};

export const sendLoginOutcome = (res: Response, outcome: authService.LoginOutcome) => {
  if (outcome.kind === "2fa") {
    success(res, { twoFactorRequired: true, challengeToken: outcome.challengeToken });
    return;
  }
  sendSession(res, outcome.user, outcome.session);
};

export const register = async (req: Request, res: Response): Promise<void> => {
  const { user, session, emailVerification } = await authService.register(registerSchema.parse(req.body), userAgent(req));
  sendSession(res, user, session, 201, { emailVerification });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  sendLoginOutcome(res, await authService.login(loginSchema.parse(req.body), userAgent(req)));
};

export const loginTwoFactor = async (req: Request, res: Response): Promise<void> => {
  const { challengeToken, code } = twoFactorLoginSchema.parse(req.body);
  const { user, session } = await twoFactorService.completeTwoFactorLogin(challengeToken, code, userAgent(req));
  sendSession(res, user, session);
};

/** Silent refresh: rotates the refresh cookie and returns a new short-lived access token. */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  const presented = readCookie(req, REFRESH_COOKIE);
  if (!presented) {
    error(res, "No active session", 401);
    return;
  }
  try {
    const { user, accessToken, refreshToken } = await sessionService.rotateSession(presented, userAgent(req));
    sendSession(res, user, { accessToken, refreshToken });
  } catch (e) {
    clearRefreshCookie(res);
    throw e;
  }
};

/** Logout on this device. Works without an access token (it may already have expired). */
export const logout = async (req: Request, res: Response): Promise<void> => {
  await sessionService.endSession(readCookie(req, REFRESH_COOKIE));
  clearRefreshCookie(res);
  success(res, { loggedOut: true });
};

export const completeRegistration = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await authService.completeRegistration(requireUserId(req), completeRegistrationSchema.parse(req.body)));
};

export const me = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await authService.getMe(requireUserId(req)));
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const input = changePasswordSchema.parse(req.body);
  const { changed, session } = await authService.changePassword(requireUserId(req), input, userAgent(req));
  setRefreshCookie(res, session.refreshToken);
  success(res, { changed, token: session.accessToken });
};

export const logoutAll = async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await authService.logoutEverywhere(requireUserId(req));
  clearRefreshCookie(res);
  success(res, result);
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = forgotPasswordSchema.parse(req.body);
  await authService.requestPasswordReset(email);
  // Same answer whether or not the account exists.
  success(res, { sent: true });
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  success(res, await authService.resetPassword(resetPasswordSchema.parse(req.body)));
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  success(res, await emailVerificationService.verifyEmail(verifyEmailSchema.parse(req.body).token));
};

export const resendVerification = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await emailVerificationService.resendVerification(requireUserId(req)));
};

export const twoFactorStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await twoFactorService.getStatus(requireUserId(req)));
};

export const twoFactorSetup = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await twoFactorService.beginSetup(requireUserId(req)));
};

export const twoFactorEnable = async (req: AuthRequest, res: Response): Promise<void> => {
  const { code } = twoFactorCodeSchema.parse(req.body);
  success(res, await twoFactorService.confirmSetup(requireUserId(req), code));
};

export const twoFactorDisable = async (req: AuthRequest, res: Response): Promise<void> => {
  success(res, await twoFactorService.disable(requireUserId(req), twoFactorDisableSchema.parse(req.body)));
};

export const twoFactorRecoveryCodes = async (req: AuthRequest, res: Response): Promise<void> => {
  const { code } = twoFactorCodeSchema.parse(req.body);
  success(res, await twoFactorService.regenerateRecoveryCodes(requireUserId(req), code));
};
