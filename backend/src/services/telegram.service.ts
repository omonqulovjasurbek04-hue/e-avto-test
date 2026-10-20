import crypto from "crypto";
import { prisma } from "../config/database";
import { env } from "../config/env";
import { badRequest, HttpError } from "../utils/errors";
import { completeLogin } from "./auth.service";
import { handleAdminCallback, handleAdminMessage } from "./telegramAdmin.service";
import { sendMessage, tgCall, type TgUpdate, type TgUser } from "../lib/telegramApi";

const CODE_TTL_MS = 5 * 60 * 1000; // time to type the code on the site

export const isTelegramConfigured = (): boolean =>
  Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_USERNAME);

/**
 * Codes are stored only as a keyed hash (HMAC with the server secret), so a database dump does not
 * reveal a valid code. The code itself is the lookup key: the site sends nothing else.
 */
const hashCode = (code: string) => crypto.createHmac("sha256", env.JWT_SECRET).update(`tg-login:${code}`).digest("hex");

/** "Ali Valiyev" from Telegram's first and last name (either may be missing). */
const fullName = (u: TgUser) => [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || null;

/** A notice to a linked Telegram account (e.g. a missed class). true = Telegram accepted the message. */
export const sendTelegramNotice = async (telegramId: string, text: string): Promise<boolean> => {
  if (!isTelegramConfigured()) return false;
  try {
    await tgCall("sendMessage", { chat_id: telegramId, text });
    return true;
  } catch (e) {
    console.error((e as Error).message);
    return false;
  }
};

/** The code with a "copy" button under it (Bot API copy_text); older clients just see the text. */
const sendCode = (chatId: number, code: string) =>
  tgCall("sendMessage", {
    chat_id: chatId,
    text: `E-Avto Test tasdiqlash kodi: ${code}\n\nKodni saytdagi "Kod" maydoniga kiriting. Kod 5 daqiqa amal qiladi, uni hech kimga bermang.`,
    reply_markup: { inline_keyboard: [[{ text: "Kodni nusxalash", copy_text: { text: code } }]] },
  }).catch(() => sendMessage(chatId, `E-Avto Test tasdiqlash kodi: ${code}\n\nKod 5 daqiqa amal qiladi.`));

// ---------------------------------------------------------------------------
// Site side
// ---------------------------------------------------------------------------

/**
 * Step 1 (site): show how to reach the bot. The link carries no token: the user simply opens the bot
 * and presses Start, and the bot answers with a random one-time code.
 */
export const startLogin = async () => {
  if (!isTelegramConfigured()) throw new HttpError(503, "Telegram login is not configured");
  return {
    botUrl: `https://t.me/${env.TELEGRAM_BOT_USERNAME}`,
    botUsername: env.TELEGRAM_BOT_USERNAME,
    codeLength: 6,
    expiresInSeconds: CODE_TTL_MS / 1000,
  };
};

/**
 * Step 3 (site): the user types the code the bot gave them. The code finds the Telegram account it was
 * issued to; it works once and only within 5 minutes. (Guessing is held back by a strict rate limit
 * on this route: a few active 6-digit codes out of a million.)
 */
export const verifyLogin = async (code: string, userAgent?: string) => {
  if (!isTelegramConfigured()) throw new HttpError(503, "Telegram login is not configured");
  const invalid = () => badRequest("Code is invalid or expired");
  const codeHash = hashCode(code);

  // Single use: only one request can flip usedAt from null.
  const claimed = await prisma.telegramLogin.updateMany({
    where: { codeHash, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (claimed.count === 0) throw invalid();
  const login = await prisma.telegramLogin.findFirst({ where: { codeHash, usedAt: { not: null } }, orderBy: { usedAt: "desc" } });
  if (!login?.telegramId) throw invalid();

  const telegramId = login.telegramId;
  const user = await prisma.user.upsert({
    where: { telegramId },
    update: {},
    create: {
      telegramId,
      // Full name from Telegram as a starting point; the sign-up form asks for the real first and last name.
      name: login.firstName || login.username || "Telegram foydalanuvchi",
      role: "USER", // never elevated through Telegram
    },
  });

  if (!user.isActive) throw new HttpError(403, "Account is disabled");

  return completeLogin(user, userAgent);
};

// ---------------------------------------------------------------------------
// Bot side
// ---------------------------------------------------------------------------

/** Step 2 (bot): the user pressed Start (or sent /code); give them a fresh random one-time code. */
export async function handleUpdate(update: TgUpdate): Promise<void> {
  // Inline buttons exist only in the staff menu.
  if (update.callback_query) {
    if (update.callback_query.message?.chat.type === "private") await handleAdminCallback(update.callback_query);
    return;
  }
  const msg = update.message;
  if (!msg?.text || msg.chat.type !== "private" || !msg.from || msg.from.is_bot) return;

  const command = msg.text.trim().split(/\s+/)[0].split("@")[0];
  if (command !== "/start" && command !== "/code") {
    // Staff: /admin, the sign-in steps and the menu. The bot never hands out lessons or tests.
    if (await handleAdminMessage(msg)) return;
    await sendMessage(msg.chat.id, "Saytga kirish yoki ro'yxatdan o'tish uchun kod olish: /start");
    return;
  }

  const telegramId = String(msg.from.id);
  // One live code per Telegram account: a new /start replaces the previous unused code.
  await prisma.telegramLogin.deleteMany({ where: { telegramId, usedAt: null } });
  // Opportunistic cleanup of old rows.
  void prisma.telegramLogin.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } } }).catch(() => undefined);

  // A random 6-digit code that is not live for anyone else right now.
  let code = "";
  for (let i = 0; i < 10 && !code; i++) {
    const candidate = String(crypto.randomInt(100000, 1000000));
    const taken = await prisma.telegramLogin.count({ where: { codeHash: hashCode(candidate), usedAt: null, expiresAt: { gt: new Date() } } });
    if (!taken) code = candidate;
  }
  if (!code) {
    await sendMessage(msg.chat.id, "Hozir kod berib bo'lmadi. Birozdan keyin /start ni qayta bosing.");
    return;
  }

  await prisma.telegramLogin.create({
    data: {
      telegramId,
      firstName: fullName(msg.from),
      username: msg.from.username ?? null,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  await sendCode(msg.chat.id, code);
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
          { offset, timeout: 25, allowed_updates: ["message", "callback_query"] },
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
