import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface JwtPayload {
  userId: string;
  role: string;
  /** Must match User.tokenVersion, otherwise the token was revoked. */
  tv: number;
}

export const generateToken = (payload: JwtPayload): string => {
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_SECRET, options);
};

export const verifyToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === "string" || !decoded.userId || !decoded.role || typeof decoded.tv !== "number") {
    throw new Error("Invalid token payload");
  }
  return { userId: String(decoded.userId), role: String(decoded.role), tv: decoded.tv };
};

export default { generateToken, verifyToken };
