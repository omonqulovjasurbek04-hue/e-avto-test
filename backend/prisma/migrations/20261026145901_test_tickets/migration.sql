-- AlterTable
ALTER TABLE "tests" ADD COLUMN     "ticket" INTEGER;

-- CreateIndex
CREATE INDEX "tests_userId_courseId_ticket_idx" ON "tests"("userId", "courseId", "ticket");
