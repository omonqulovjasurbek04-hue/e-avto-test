-- The sign-up number becomes "userNumber" (user0001); "studentNumber" (student0001) is now given only
-- once a course is bought, from its own sequence, so buyers and non-buyers are told apart.

-- 1. Rename the existing sign-up number with its sequence and index.
ALTER TABLE "users" RENAME COLUMN "studentNumber" TO "userNumber";
ALTER SEQUENCE "users_studentNumber_seq" RENAME TO "users_userNumber_seq";
ALTER INDEX "users_studentNumber_key" RENAME TO "users_userNumber_key";

-- 2. The student number: empty until the first paid course.
ALTER TABLE "users" ADD COLUMN "studentNumber" INTEGER;
CREATE UNIQUE INDEX "users_studentNumber_key" ON "users"("studentNumber");

-- 3. Existing buyers (anyone with an enrollment; enrollments are only created by a paid order),
--    numbered in the order they first got a course.
UPDATE "users" u
SET "studentNumber" = b.rn
FROM (
  SELECT "userId", ROW_NUMBER() OVER (ORDER BY MIN("createdAt"), "userId") AS rn
  FROM "enrollments"
  GROUP BY "userId"
) b
WHERE u."id" = b."userId";

-- 4. Not a column default: the number is drawn explicitly when an order is fulfilled.
CREATE SEQUENCE "users_student_number_seq";
SELECT setval('"users_student_number_seq"', COALESCE((SELECT MAX("studentNumber") FROM "users"), 0) + 1, false);
