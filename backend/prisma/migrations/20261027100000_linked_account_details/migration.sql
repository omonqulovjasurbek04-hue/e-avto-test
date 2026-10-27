-- AlterTable
ALTER TABLE "users" ADD COLUMN     "googleEmail" TEXT,
ADD COLUMN     "googleUnlinkedAt" TIMESTAMP(3),
ADD COLUMN     "telegramName" TEXT,
ADD COLUMN     "unlinkedTelegramId" TEXT;
