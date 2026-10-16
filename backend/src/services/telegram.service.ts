import crypto from "crypto";
import { prisma } from "../config/database";
import { env } from "../config/env";
import { badRequest, HttpError } from "../utils/errors";
import { completeLogin } from "./auth.service";

const SESSION_TTL_MS = 10 * 60 * 1000; // time to press Start in the bot
const CODE_TTL_MS = 5 * 60 * 1000; // time to type the code on the site
const MAX_ATTEMPTS = 5;

export const isTelegramConfigured = (): boolean =>
  Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_USERNAME);

const hashCode = (sessionId: string, code: string) =>
  crypto.createHash("sha256").update(`${sessionId}:${code}`).digest("hex");

// ---------------------------------------------------------------------------
// Telegram Bot API (plain fetch, no extra dependency)
// ---------------------------------------------------------------------------
interface TgUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  username?: string;
}

interface TgUpdate {
  update_id: number;
  message?: {
    text?: string;
    chat: { id: number; type: string };
    from?: TgUser;
  };
}

async function tgCall<T>(method: string, body: object, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description ?? res.status}`);
  return json.result;
}

const sendMessage = (chatId: number, text: string) =>
  tgCall("sendMessage", { chat_id: chatId, text }).catch((e: Error) => {
    console.error(e.message);
  });

// ---------------------------------------------------------------------------
// Site side
// ---------------------------------------------------------------------------

/** Step 1: the site asks for a login session and gets a link that opens the bot. */
export const startLogin = async () => {
  if (!isTelegramConfigured()) throw new HttpError(503, "Telegram login is not configured");

  const session = await prisma.telegramLogin.create({
    data: { expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  // Opportunistic cleanup of old sessions.
  void prisma.telegramLogin
    .deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } } })
    .catch(() => undefined);

  return {
    sessionId: session.id,
    botUrl: `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${session.id}`,
    expiresInSeconds: SESSION_TTL_MS / 1000,
  };
};

/** Step 3: the user types the code the bot sent; on success the usual JWT is issued. */
export const verifyLogin = async (sessionId: string, code: string, userAgent?: string) => {
  const session = await prisma.telegramLogin.findUnique({ where: { id: sessionId } });
  const invalid = () => badRequest("Code is invalid or expired");

  if (!session || session.usedAt || !session.codeHash || !session.telegramId) throw invalid();
  if (session.expiresAt < new Date()) throw invalid();
  if (session.attempts >= MAX_ATTEMPTS) throw new HttpError(429, "Too many wrong codes, start again");

  const expected = Buffer.from(session.codeHash, "hex");
  const actual = Buffer.from(hashCode(session.id, code), "hex");
  if (!crypto.timingSafeEqual(expected, actual)) {
    await prisma.telegramLogin.update({ where: { id: session.id }, data: { attempts: { increment: 1 } } });
    throw invalid();
  }

  // Single use: only one concurrent request can flip usedAt from null.
  const claimed = await prisma.telegramLogin.updateMany({
    where: { id: session.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count === 0) throw invalid();

  const telegramId = session.telegramId;
  const user = await prisma.user.upsert({
    where: { telegramId },
    update: {},
    create: {
      telegramId,
      name: session.firstName || session.username || "Telegram foydalanuvchi",
      role: "USER", // never elevated through Telegram
    },
  });

  if (!user.isActive) throw new HttpError(403, "Account is disabled");

  return completeLogin(user, userAgent);
};

// ---------------------------------------------------------------------------
// Bot side
// ---------------------------------------------------------------------------

const START_PAYLOAD = /^[0-9a-f-]{36}$/i;

/** Step 2: the user pressed Start in the bot; send a one-time code to that chat. */
export async function handleUpdate(update: TgUpdate): Promise<void> {
  const msg = update.message;
  if (!msg?.text || msg.chat.type !== "private" || !msg.from || msg.from.is_bot) return;

  const [command, payload] = msg.text.trim().split(/\s+/);
  if (command !== "/start") return;

  if (!payload || !START_PAYLOAD.test(payload)) {
    await sendMessage(msg.chat.id, "Salom! Kirish uchun saytdagi \"Telegram orqali kirish\" tugmasini bosing.");
    return;
  }

  const session = await prisma.telegramLogin.findUnique({ where: { id: payload } });
  if (!session || session.usedAt || session.expiresAt < new Date()) {
    await sendMessage(msg.chat.id, "Bu havola eskirgan. Saytdan qaytadan urinib ko'ring.");
    return;
  }
  if (session.codeHash) {
    await sendMessage(msg.chat.id, "Kod allaqachon yuborilgan. Yangi kod uchun saytdan qaytadan boshlang.");
    return;
  }

  const code = String(crypto.randomInt(100000, 1000000));
  // Claim the session so a repeated /start cannot issue a second code.
  const claimed = await prisma.telegramLogin.updateMany({
    where: { id: session.id, codeHash: null },
    data: {
      codeHash: hashCode(session.id, code),
      telegramId: String(msg.from.id),
      firstName: msg.from.first_name ?? null,
      username: msg.from.username ?? null,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  if (claimed.count === 0) return;

  await sendMessage(
    msg.chat.id,
    `E-Avto Test kirish kodi: ${code}\n\nKod 5 daqiqa amal qiladi. Uni hech kimga bermang.`
  );
}

// ---------------------------------------------------------------------------
// Update delivery: long polling (default, needs no public URL) or webhook
// ---------------------------------------------------------------------------
let polling = false;
let pollAbort: AbortController | null = null;

export function startBot(): void {
  if (!isTelegramConfigured()) {
    console.log("Telegram login disabled (TELEGRAM_BOT_TOKEN / TELEGRAM_BOT_USERNAME not set)");
    return;
  }
  if (env.TELEGRAM_WEBHOOK_SECRET) {
    console.log("Telegram login: webhook mode");
    return;
  }

  polling = true;
  void (async () => {
    // Long polling and a webhook cannot be active together.
    await tgCall("deleteWebhook", {}).catch(() => undefined);
    console.log(`Telegram login: polling as @${env.TELEGRAM_BOT_USERNAME}`);

    let offset = 0;
    while (polling) {
      try {
        pollAbort = new AbortController();
        const updates = await tgCall<TgUpdate[]>(
          "getUpdates",
          { offset, timeout: 25, allowed_updates: ["message"] },
          pollAbort.signal
        );
        for (const u of updates) {
          offset = u.update_id + 1;
          await handleUpdate(u).catch((e: Error) => console.error("Telegram update failed:", e.message));
        }
      } catch (e) {
        if (!polling) break;
        console.error("Telegram polling error:", e instanceof Error ? e.message : e);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  })();
}

export function stopBot(): void {
  polling = false;
  pollAbort?.abort();
}
