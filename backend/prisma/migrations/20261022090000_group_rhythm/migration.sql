-- A group's weekly rhythm (toq / juft kunlar), lesson start time and length, chosen when the group is opened.
CREATE TYPE "GroupDays" AS ENUM ('ODD', 'EVEN');

ALTER TABLE "teacher_groups"
  ADD COLUMN "days" "GroupDays",
  ADD COLUMN "startTime" TEXT,
  ADD COLUMN "lessonMinutes" INTEGER,
  ADD COLUMN "room" TEXT;
