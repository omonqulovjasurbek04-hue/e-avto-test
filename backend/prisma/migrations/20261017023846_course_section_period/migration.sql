-- CreateEnum
CREATE TYPE "CourseSection" AS ENUM ('MAIN', 'COMBINED', 'EXTRA');

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "section" "CourseSection" NOT NULL DEFAULT 'MAIN',
ADD COLUMN     "studyPeriod" TEXT;
