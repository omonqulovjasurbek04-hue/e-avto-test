import crypto from "crypto";
import { env } from "../config/env";

/** RFC 6238 TOTP (SHA-1, 6 digits, 30 s) — the variant every authenticator app supports. */
const STEP_SECONDS = 30;
const DIGITS = 6;
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export const base32Encode = (buf: Buffer): string => {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
};

export const base32Decode = (input: string): Buffer => {
  const clean = input.replace(/=+$/, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) throw new Error("Invalid base32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
};

export const generateSecret = (): string => base32Encode(crypto.randomBytes(20));

export const currentStep = (now = Date.now()): number => Math.floor(now / 1000 / STEP_SECONDS);

export const codeForStep = (secret: string, step: number): string => {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = crypto.createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const bin = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return bin.toString().padStart(DIGITS, "0");
};

/**
 * Returns the matched time step (±1 step of clock drift), or null. Steps at or before `lastStep`
 * are refused so an observed code cannot be replayed.
 */
export const verifyCode = (secret: string, code: string, lastStep: number | null, now = Date.now()): number | null => {
  if (!/^\d{6}$/.test(code)) return null;
  const step = currentStep(now);
  for (const s of [step - 1, step, step + 1]) {
    if (lastStep !== null && s <= lastStep) continue;
    const expected = Buffer.from(codeForStep(secret, s));
    if (crypto.timingSafeEqual(expected, Buffer.from(code))) return s;
  }
  return null;
};

export const otpauthUrl = (secret: string, account: string, issuer = "E-Avto Test"): string =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;

// --- secret encryption at rest (AES-256-GCM) ---

const key = (): Buffer =>
  crypto.createHash("sha256").update(env.TOTP_ENCRYPTION_KEY || `${env.JWT_SECRET}:totp`).digest();

export const encryptSecret = (secret: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(".");
};

export const decryptSecret = (stored: string): string => {
  const [version, iv, tag, data] = stored.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unknown secret format");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
};

// --- recovery codes ---

export const generateRecoveryCodes = (count = 8): string[] =>
  Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(5).toString("hex"); // 10 hex chars
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });

export const normalizeRecoveryCode = (code: string): string => code.trim().toLowerCase().replace(/[\s-]/g, "");

export const hashRecoveryCode = (code: string): string =>
  crypto.createHash("sha256").update(normalizeRecoveryCode(code)).digest("hex");
