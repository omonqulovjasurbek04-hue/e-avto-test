-- Server-counted video watch time per lesson: completion of a video lesson needs the video really watched.
ALTER TABLE "lesson_progress"
  ADD COLUMN "watchedSeconds" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastWatchAt" TIMESTAMP(3);
