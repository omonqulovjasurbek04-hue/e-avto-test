-- Real study time per student and Tashkent day (lessons and tests).
CREATE TABLE "study_time" (
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "lessonSeconds" INTEGER NOT NULL DEFAULT 0,
    "testSeconds" INTEGER NOT NULL DEFAULT 0,
    "lastBeatAt" TIMESTAMP(3),

    CONSTRAINT "study_time_pkey" PRIMARY KEY ("userId","day")
);

ALTER TABLE "study_time" ADD CONSTRAINT "study_time_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
