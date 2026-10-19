-- Telegram reminders for notices (a missed class: up to 3 messages).
ALTER TABLE "notifications" ADD COLUMN "telegramSends" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "telegramNextAt" TIMESTAMP(3);

CREATE INDEX "notifications_telegramNextAt_idx" ON "notifications"("telegramNextAt");
