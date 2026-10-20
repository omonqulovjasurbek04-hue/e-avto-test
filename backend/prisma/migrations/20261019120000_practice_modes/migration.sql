-- Practice modes (own mistakes, saved questions) and the official "max mistakes" exam rule.
CREATE TYPE "TestMode" AS ENUM ('EXAM', 'MISTAKES', 'SAVED');

ALTER TABLE "tests" ADD COLUMN "mode" "TestMode" NOT NULL DEFAULT 'EXAM',
                    ADD COLUMN "maxMistakes" INTEGER;

ALTER TABLE "test_configs" ADD COLUMN "maxMistakes" INTEGER;

CREATE TABLE "saved_questions" (
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_questions_pkey" PRIMARY KEY ("userId", "questionId")
);

CREATE INDEX "saved_questions_questionId_idx" ON "saved_questions"("questionId");

ALTER TABLE "saved_questions" ADD CONSTRAINT "saved_questions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_questions" ADD CONSTRAINT "saved_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
