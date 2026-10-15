import crypto from "crypto";

export type MediaKind = "VIDEO" | "FILE";

export interface MediaClaims {
  kind: MediaKind;
  assetId: string;
  userId: string;
  /** Unix seconds. */
  exp: number;
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");

const mac = (secret: string, payload: string) => crypto.createHmac("sha256", secret).update(payload).digest("base64url");

/** Short-lived bearer token for one asset: `<payload>.<hmac>`. Cannot be reused for another asset or after exp. */
export const signMediaToken = (secret: string, claims: MediaClaims): string => {
  const payload = b64(JSON.stringify(claims));
  return `${payload}.${mac(secret, payload)}`;
};

export const verifyMediaToken = (secret: string, token: string, nowSeconds: number = Math.floor(Date.now() / 1000)): MediaClaims | null => {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  const expected = Buffer.from(mac(secret, payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const c = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as MediaClaims;
    if ((c.kind !== "VIDEO" && c.kind !== "FILE") || !c.assetId || !c.userId || typeof c.exp !== "number") return null;
    return c.exp > nowSeconds ? c : null;
  } catch {
    return null;
  }
};
