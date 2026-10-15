import nodemailer from "nodemailer";
import { env } from "../config/env";

export const isMailConfigured = (): boolean => Boolean(env.SMTP_HOST);

/** Sends an e-mail through SMTP. Returns false (never throws) when SMTP is missing or fails. */
export const sendMail = async (msg: { to: string; subject: string; text: string }): Promise<boolean> => {
  if (!isMailConfigured()) return false;
  try {
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
    await transport.sendMail({ from: env.MAIL_FROM, ...msg });
    return true;
  } catch (e) {
    console.error("Mail delivery failed:", e instanceof Error ? e.message : "unknown");
    return false;
  }
};
