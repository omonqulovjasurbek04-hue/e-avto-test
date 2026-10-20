import { env } from "../config/env";

/** Telegram Bot API over plain fetch (no extra dependency). Shared by the login code flow and the staff menu. */

export interface TgUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TgMessage {
  message_id: number;
  text?: string;
  chat: { id: number; type: string };
  from?: TgUser;
}

export interface TgCallbackQuery {
  id: string;
  from: TgUser;
  data?: string;
  message?: TgMessage;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

export type InlineKeyboard = { text: string; callback_data?: string; url?: string; copy_text?: { text: string } }[][];

export interface SendOptions {
  /** Texts are HTML: escape every value with `esc`. */
  html?: boolean;
  inline?: InlineKeyboard;
  /** Reply keyboard under the input field; `null` removes it. */
  keyboard?: string[][] | null;
}

export async function tgCall<T>(method: string, body: object, signal?: AbortSignal): Promise<T> {
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

const markup = (o: SendOptions) =>
  o.inline
    ? { reply_markup: { inline_keyboard: o.inline } }
    : o.keyboard === null
      ? { reply_markup: { remove_keyboard: true } }
      : o.keyboard
        ? { reply_markup: { keyboard: o.keyboard.map((row) => row.map((text) => ({ text }))), resize_keyboard: true, is_persistent: true } }
        : {};

/** Errors are logged, never thrown: a failed chat message must not break the request that caused it. */
export const sendMessage = (chatId: number | string, text: string, o: SendOptions = {}) =>
  tgCall("sendMessage", { chat_id: chatId, text, ...(o.html ? { parse_mode: "HTML" } : {}), ...markup(o), link_preview_options: { is_disabled: true } }).catch(
    (e: Error) => {
      console.error(e.message);
    }
  );

export const editMessage = (chatId: number | string, messageId: number, text: string, o: SendOptions = {}) =>
  tgCall("editMessageText", { chat_id: chatId, message_id: messageId, text, ...(o.html ? { parse_mode: "HTML" } : {}), ...markup(o) }).catch(() => undefined);

export const deleteMessage = (chatId: number | string, messageId: number) =>
  tgCall("deleteMessage", { chat_id: chatId, message_id: messageId }).catch(() => undefined);

export const answerCallback = (id: string, text?: string) => tgCall("answerCallbackQuery", { callback_query_id: id, ...(text ? { text } : {}) }).catch(() => undefined);

/** Escapes a value for parse_mode HTML. */
export const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
