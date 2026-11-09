ALTER TABLE "notifications" ADD COLUMN "telegramLessonAt" TIMESTAMP(3);

UPDATE "notifications" AS n
SET "telegramLessonAt" = slot."startsAt"
FROM "attendance_sessions" AS session
JOIN "schedule_slots" AS slot ON slot.id = session."slotId"
WHERE n.type = 'ATTENDANCE_ABSENT'
  AND n."dedupeKey" = 'absent:' || session.id::text;

UPDATE "notifications"
SET "telegramNextAt" = CASE
  WHEN "telegramSends" = 0 THEN "createdAt" + INTERVAL '1 hour'
  WHEN "telegramSends" = 1 THEN COALESCE(
    "telegramLessonAt" + INTERVAL '1 day',
    "createdAt" + INTERVAL '1 day'
  )
  WHEN "telegramSends" = 2 THEN date_trunc('day', "createdAt" + INTERVAL '5 hours') + INTERVAL '1 day 15 hours'
END
WHERE "telegramNextAt" IS NOT NULL AND "telegramSends" < 3;
