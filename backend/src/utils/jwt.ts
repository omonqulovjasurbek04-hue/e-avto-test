import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface JwtPayload {
  userId: string;
  role: string;
  /** Must match User.tokenVersion, otherwise the token was revoked. */
  tv: number;
}

// Separate audiences, so a token minted for one purpose is never accepted for another.
const ACCESS_AUDIENCE = "access";
const TWO_FACTOR_AUDIENCE = "2fa-challenge";
const TWO_FACTOR_TTL = "5m";

export const generateToken = (payload: JwtPayload): string => {
  const options: SignOptions = { expiresIn: env.ACCESS_TOKEN_TTL as SignOptions["expiresIn"], audience: ACCESS_AUDIENCE };
  return jwt.sign(payload, env.JWT_SECRET, options);
};

export const verifyToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET, { audience: ACCESS_AUDIENCE });
  if (typeof decoded === "string" || !decoded.userId || !decoded.role || typeof decoded.tv !== "number") {
    throw new Error("Invalid token payload");
  }
  return { userId: String(decoded.userId), role: String(decoded.role), tv: decoded.tv };
};

/** Proof that the password step of a 2FA login succeeded; only exchangeable for a session together with a TOTP code. */
export const generateTwoFactorChallenge = (userId: string, tv: number): string =>
  jwt.sign({ uid: userId, tv }, env.JWT_SECRET, { expiresIn: TWO_FACTOR_TTL, audience: TWO_FACTOR_AUDIENCE });

export const verifyTwoFactorChallenge = (token: string): { userId: string; tv: number } => {
  const decoded = jwt.verify(token, env.JWT_SECRET, { audience: TWO_FACTOR_AUDIENCE });
  if (typeof decoded === "string" || !decoded.uid || typeof decoded.tv !== "number") throw new Error("Invalid challenge");
  return { userId: String(decoded.uid), tv: decoded.tv };
};

export default { generateToken, verifyToken };
