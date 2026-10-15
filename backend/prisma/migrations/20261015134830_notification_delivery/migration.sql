-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "emailAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "emailSentAt" TIMESTAMP(3),
ADD COLUMN     "emailStatus" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "inApp" BOOLEAN NOT NULL DEFAULT true;
