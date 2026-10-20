-- Staff menu of the Telegram bot: one row per signed-in (or signing-in) chat.
CREATE TABLE "telegram_admin_sessions" (
    "telegramId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "phone" TEXT,
    "userId" TEXT,
    "tokenVersion" INTEGER,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "blockedUntil" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telegram_admin_sessions_pkey" PRIMARY KEY ("telegramId")
);

CREATE INDEX "telegram_admin_sessions_userId_idx" ON "telegram_admin_sessions"("userId");

ALTER TABLE "telegram_admin_sessions" ADD CONSTRAINT "telegram_admin_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
