import { config } from "dotenv";

// In development the project .env wins over machine-wide variables (e.g. a DATABASE_URL left by another project).
// In production the hosting platform's environment is authoritative.
config({ override: !process.env.NODE_ENV || process.env.NODE_ENV === "development" });

const DEV_SECRET = "change_this_long_random_secret";
const nodeEnv = process.env.NODE_ENV || "development";

if (nodeEnv === "production") {
  const secret = process.env.JWT_SECRET;
  // JWT_SECRET_FROM_DB=true: no secret in the environment; the server creates a random one on first start
  // and keeps it in the database (app_secrets), so nobody has to generate or paste it.
  const fromDb = process.env.JWT_SECRET_FROM_DB === "true" && !secret;
  if (!fromDb && (!secret || secret === DEV_SECRET || secret.length < 32)) {
    throw new Error("JWT_SECRET must be set to a random value of at least 32 characters in production");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set in production");
  }
  // CORS allow-list: only real https origins (no localhost, no plain http, no wildcard).
  const origins = (process.env.CLIENT_URL ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  if (origins.length === 0 || origins.some((o) => !/^https:\/\/[^*\s]+$/i.test(o) || /localhost|127\.0\.0\.1/i.test(o))) {
    throw new Error("CLIENT_URL must list the public https origin(s) of the site in production (no localhost, http or wildcard)");
  }
  if (process.env.MEDIA_UPLOAD_ENABLED === "true" && (process.env.MEDIA_SIGNING_SECRET ?? "").length < 32) {
    throw new Error("MEDIA_SIGNING_SECRET (32+ chars) is required in production when MEDIA_UPLOAD_ENABLED=true");
  }
}

const sameSite = (process.env.REFRESH_COOKIE_SAMESITE || "strict").toLowerCase();
if (!["strict", "lax", "none"].includes(sameSite)) {
  throw new Error("REFRESH_COOKIE_SAMESITE must be strict, lax or none");
}
const cookieSecure = process.env.REFRESH_COOKIE_SECURE !== "false";
if (sameSite === "none" && !cookieSecure) {
  throw new Error("REFRESH_COOKIE_SAMESITE=none requires a Secure cookie (REFRESH_COOKIE_SECURE must not be false)");
}
if (nodeEnv === "production" && !cookieSecure) {
  throw new Error("REFRESH_COOKIE_SECURE=false is not allowed in production");
}

if (nodeEnv === "production" && process.env.PAYMENT_PROVIDER === "mock") {
  throw new Error("PAYMENT_PROVIDER=mock is not allowed in production");
}

const storageDriver = (process.env.STORAGE_DRIVER || "local").toLowerCase();
if (!["local", "s3"].includes(storageDriver)) {
  throw new Error("STORAGE_DRIVER must be local or s3");
}
if (storageDriver === "s3" && (!process.env.S3_BUCKET || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY)) {
  throw new Error("STORAGE_DRIVER=s3 requires S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY");
}
if (nodeEnv === "production" && !/^https:\/\/[^/\s]+\/?$/i.test(process.env.PUBLIC_API_ORIGIN ?? "")) {
  throw new Error("PUBLIC_API_ORIGIN must be the public https origin of the API in production, without a path (e.g. https://api.example.uz); used for image links");
}
// The username is public (https://t.me/<username> on the site), so a bot token pasted here by mistake would be published.
// Such a value is dropped (Telegram login stays off) instead of stopping the site; the value itself is never logged.
const rawBotUsername = (process.env.TELEGRAM_BOT_USERNAME || "").replace(/^@/, "");
const botUsername = /^[A-Za-z0-9_]{5,32}$/.test(rawBotUsername) ? rawBotUsername : "";
if (rawBotUsername && !botUsername) {
  console.warn("TELEGRAM_BOT_USERNAME is not a bot @username (letters, digits, _) — ignored, Telegram login is off. Is it the bot token?");
}
if (nodeEnv === "production" && process.env.METRICS_TOKEN && process.env.METRICS_TOKEN.length < 24) {
  throw new Error("METRICS_TOKEN must be at least 24 characters");
}

export const env = {
  PORT: process.env.PORT || "5000",
  DATABASE_URL: process.env.DATABASE_URL || "",
  // Replaced at start-up by the database secret when JWT_SECRET_FROM_DB=true (see lib/appSecrets.ts).
  JWT_SECRET: process.env.JWT_SECRET || (process.env.JWT_SECRET_FROM_DB === "true" && nodeEnv === "production" ? "" : DEV_SECRET),
  JWT_SECRET_FROM_DB: process.env.JWT_SECRET_FROM_DB === "true" && !process.env.JWT_SECRET,
  // Short-lived access token (Authorization: Bearer). Sessions are kept alive by the refresh cookie.
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || "15m",
  REFRESH_TOKEN_TTL_DAYS: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || "30", 10),
  REFRESH_COOKIE_SAMESITE: sameSite as "strict" | "lax" | "none",
  // Browsers accept Secure cookies on http://localhost, so this stays on in development too.
  REFRESH_COOKIE_SECURE: cookieSecure,
  // Key for encrypting TOTP secrets at rest; derived from JWT_SECRET when empty.
  TOTP_ENCRYPTION_KEY: process.env.TOTP_ENCRYPTION_KEY || "",
  // Comma separated list of allowed browser origins.
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  NODE_ENV: nodeEnv,
  // SMTP for password-reset e-mails (optional).
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: parseInt(process.env.SMTP_PORT || "587", 10),
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  MAIL_FROM: process.env.MAIL_FROM || "E-Avto Test <no-reply@localhost>",
  // Telegram login bot (optional). Create the bot with @BotFather.
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  TELEGRAM_BOT_USERNAME: botUsername,
  // "Continue with Google" (optional): OAuth client from Google Cloud Console. Both empty = button hidden.
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  // Default: <first CLIENT_URL>/api/auth/google/callback. Must be listed in the Google client's redirect URIs.
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || "",
  // If set, updates are received on POST /api/telegram/webhook and authenticated by Telegram's secret-token header.
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET || "",
  // Payments. Only "mock" exists (no real gateway is integrated). Empty = payments disabled.
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || "",
  PAYMENT_MOCK_SECRET: process.env.PAYMENT_MOCK_SECRET || "",
  // true = lesson video/content require an active enrollment (paid access). false = everything published is open.
  // Lessons and tests need a purchased (active) course. Only an explicit "false" opens everything (demos).
  ENFORCE_ENROLLMENT: process.env.ENFORCE_ENROLLMENT !== "false",
  // Private media. Uploads are OFF by default: the project rule is that videos live on an external CDN.
  MEDIA_UPLOAD_ENABLED: process.env.MEDIA_UPLOAD_ENABLED === "true",
  MEDIA_DIR: process.env.MEDIA_DIR || "storage/private",
  // Falls back to a value derived from JWT_SECRET; set explicitly in production.
  MEDIA_SIGNING_SECRET: process.env.MEDIA_SIGNING_SECRET || "",
  MEDIA_URL_TTL_SECONDS: parseInt(process.env.MEDIA_URL_TTL_SECONDS || "300", 10),
  // An adaptive (HLS) video asks for a new segment every few seconds for the whole lesson, so its link lives longer.
  MEDIA_HLS_TTL_SECONDS: parseInt(process.env.MEDIA_HLS_TTL_SECONDS || "14400", 10),
  // Video conversion to HLS (npm run media:import); ffmpeg must be installed where it runs.
  FFMPEG_PATH: process.env.FFMPEG_PATH || "ffmpeg",
  FFPROBE_PATH: process.env.FFPROBE_PATH || "ffprobe",
  FFMPEG_PRESET: process.env.FFMPEG_PRESET || "veryfast",
  MAX_VIDEO_MB: parseInt(process.env.MAX_VIDEO_MB || "500", 10),
  MAX_FILE_MB: parseInt(process.env.MAX_FILE_MB || "20", 10),
  // How long the public leaderboard / landing statistics may be served from memory (0 = no caching).
  LEADERBOARD_CACHE_SECONDS: parseInt(process.env.LEADERBOARD_CACHE_SECONDS || "60", 10),
  // Unpaid orders expire after this many minutes.
  ORDER_TTL_MINUTES: parseInt(process.env.ORDER_TTL_MINUTES || "60", 10),
  // Shared store for rate limits (redis://...). Empty = per-process memory.
  REDIS_URL: process.env.REDIS_URL || "",
  // How many proxies stand in front of the API in production (each appends to X-Forwarded-For):
  // 1 = host nginx (VPS); Render static-site rewrite + Render's load balancer = 2.
  // One-service hosting (Railway): folder with the built React app (frontend/dist). Empty = API only.
  WEB_DIST_DIR: process.env.WEB_DIST_DIR || "",
  TRUST_PROXY_HOPS: Math.max(0, Number.parseInt(process.env.TRUST_PROXY_HOPS || "1", 10) || 0),
  // Public base URL Telegram posts webhook updates to (defaults to Render's own address, then PUBLIC_API_ORIGIN).
  TELEGRAM_WEBHOOK_BASE: (process.env.TELEGRAM_WEBHOOK_BASE || process.env.RENDER_EXTERNAL_URL || "").replace(/\/+$/, ""),
  // Error tracking (Sentry or a compatible service such as GlitchTip). Empty = disabled.
  SENTRY_DSN: process.env.SENTRY_DSN || "",
  SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT || nodeEnv,
  SENTRY_TRACES_SAMPLE_RATE: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || "0"),
  // Bearer token for GET /api/metrics (Prometheus format). Empty = endpoint disabled.
  METRICS_TOKEN: process.env.METRICS_TOKEN || "",
  // Where private media and public CMS images are stored: "local" (MEDIA_DIR) or "s3" (S3 / Cloudflare R2 / MinIO).
  STORAGE_DRIVER: storageDriver as "local" | "s3",
  S3_BUCKET: process.env.S3_BUCKET || "",
  S3_REGION: process.env.S3_REGION || "auto",
  // Custom endpoint for R2 (https://<account>.r2.cloudflarestorage.com) or MinIO. Empty = AWS.
  S3_ENDPOINT: process.env.S3_ENDPOINT || "",
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || "",
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || "",
  S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE === "true",
  // With an S3/R2 bucket, video segments, posters and files are fetched by the browser straight from the
  // bucket through short-lived signed links (the API only checks access). "false" streams them through the API.
  MEDIA_DIRECT_DELIVERY: storageDriver === "s3" && process.env.MEDIA_DIRECT_DELIVERY !== "false",
  // Antivirus: clamd TCP address. Empty host = no scanning.
  CLAMAV_HOST: process.env.CLAMAV_HOST || "",
  CLAMAV_PORT: parseInt(process.env.CLAMAV_PORT || "3310", 10),
  CLAMAV_TIMEOUT_MS: parseInt(process.env.CLAMAV_TIMEOUT_MS || "60000", 10),
  // Public origin of this API (no /api path), used for absolute image links inside CMS content.
  PUBLIC_API_ORIGIN: (process.env.PUBLIC_API_ORIGIN || `http://localhost:${process.env.PORT || "5000"}`).replace(/\/+$/, ""),
  // Public CMS images (news covers, page pictures).
  MAX_IMAGE_MB: parseInt(process.env.MAX_IMAGE_MB || "5", 10),
};
