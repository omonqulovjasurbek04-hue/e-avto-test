-- Reschedule outstanding missed-class reminders to the updated three-message cadence.
UPDATE "notifications"
SET "telegramNextAt" = CASE
  WHEN "telegramSends" = 0 THEN "createdAt" + INTERVAL '1 hour'
  WHEN "telegramSends" = 1 THEN date_trunc('day', "createdAt" + INTERVAL '5 hours') + INTERVAL '1 day 3 hours'
  WHEN "telegramSends" = 2 THEN date_trunc('day', "createdAt" + INTERVAL '5 hours') + INTERVAL '2 days 3 hours'
END
WHERE "telegramNextAt" IS NOT NULL AND "telegramSends" < 3;
