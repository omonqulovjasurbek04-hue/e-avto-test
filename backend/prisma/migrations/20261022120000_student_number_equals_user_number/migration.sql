-- A student keeps their own number: user0002 becomes student0002 (no separate student counter any more).
-- Two steps so the unique index never sees two equal values in the middle of the update.
UPDATE "users" SET "studentNumber" = -"studentNumber" WHERE "studentNumber" IS NOT NULL;
UPDATE "users" SET "studentNumber" = "userNumber" WHERE "studentNumber" IS NOT NULL;

DROP SEQUENCE IF EXISTS "users_student_number_seq";
