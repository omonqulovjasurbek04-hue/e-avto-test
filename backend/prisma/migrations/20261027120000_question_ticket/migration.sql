-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "ticket" INTEGER;

-- CreateIndex
CREATE INDEX "questions_courseId_ticket_idx" ON "questions"("courseId", "ticket");
