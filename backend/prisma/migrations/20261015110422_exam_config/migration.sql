-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "tests" ADD COLUMN     "passScore" INTEGER NOT NULL DEFAULT 70;

-- CreateTable
CREATE TABLE "test_configs" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL DEFAULT 20,
    "durationSeconds" INTEGER,
    "passScore" INTEGER NOT NULL DEFAULT 70,
    "maxAttempts" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "test_configs_courseId_key" ON "test_configs"("courseId");

-- AddForeignKey
ALTER TABLE "test_configs" ADD CONSTRAINT "test_configs_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
