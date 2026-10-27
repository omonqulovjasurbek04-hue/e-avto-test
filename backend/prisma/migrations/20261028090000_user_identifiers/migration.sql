-- CreateEnum
CREATE TYPE "IdentifierKind" AS ENUM ('USER', 'STUDENT', 'TEACHER');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "teacherNumber" INTEGER,
ALTER COLUMN "userNumber" DROP NOT NULL;

-- CreateTable
CREATE TABLE "user_identifiers" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "kind" "IdentifierKind" NOT NULL,
    "number" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,

    CONSTRAINT "user_identifiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_identifiers_kind_number_idx" ON "user_identifiers"("kind", "number");

-- CreateIndex
CREATE INDEX "user_identifiers_userId_idx" ON "user_identifiers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_teacherNumber_key" ON "users"("teacherNumber");

-- AddForeignKey
ALTER TABLE "user_identifiers" ADD CONSTRAINT "user_identifiers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ───────────── Public account numbers (hand-written; Prisma does not manage sequences or triggers) ─────────────
-- users.id is the permanent identity. userNumber / studentNumber / teacherNumber are the public numbers
-- (user0005, student0001, teacher0001); the unique columns on "users" allow one active holder per number,
-- and "user_identifiers" keeps who held which number when.

-- The student number is no longer the user number (a user number can now pass to someone else).
ALTER TABLE "users" DROP CONSTRAINT "users_studentNumber_is_userNumber";

-- Student and teacher numbers have their own sequences and are never reused. Existing student numbers
-- stay as they are; new ones continue after the largest.
CREATE SEQUENCE "student_number_seq";
SELECT setval('"student_number_seq"', COALESCE((SELECT MAX("studentNumber") FROM "users"), 0) + 1, false);
CREATE SEQUENCE "teacher_number_seq";

-- A user number freed by a role change (user0005 of a new teacher) that nobody holds now, smallest
-- first; NULL when there is none. The advisory lock makes two simultaneous sign-ups wait for each other
-- here, so they never take the same freed number (and users.userNumber is UNIQUE besides).
CREATE FUNCTION "freed_user_number"() RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  freed INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('users.userNumber'));
  SELECT ui."number" INTO freed
    FROM "user_identifiers" ui
   WHERE ui."kind" = 'USER'
     AND ui."releaseReason" = 'ROLE_CHANGE'
     AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u."userNumber" = ui."number")
   ORDER BY ui."number"
   LIMIT 1;
  RETURN freed;
END $$;

-- The next user number for an existing account (a teacher who is no longer one): a freed one, else a new one.
CREATE FUNCTION "next_user_number"() RETURNS INTEGER LANGUAGE sql AS $$
  SELECT COALESCE("freed_user_number"(), nextval('"users_userNumber_seq"')::INTEGER)
$$;

-- Every new account (phone, Telegram, Google, seed …) takes a freed number when there is one; otherwise
-- it keeps the one the column default drew from the sequence.
CREATE FUNCTION "users_pick_user_number"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  freed INTEGER;
BEGIN
  IF NEW."userNumber" IS NOT NULL THEN
    freed := "freed_user_number"();
    IF freed IS NOT NULL THEN
      NEW."userNumber" := freed;
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- History: a number given opens a row, a number taken away closes it.
CREATE FUNCTION "users_identifier_history"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  reason TEXT := COALESCE(NULLIF(current_setting('eavto.release_reason', true), ''), 'ROLE_CHANGE');
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE "user_identifiers" SET "releasedAt" = now(), "releaseReason" = 'ACCOUNT_DELETED'
     WHERE "userId" = OLD."id" AND "releasedAt" IS NULL;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD."userNumber" IS DISTINCT FROM NEW."userNumber" AND OLD."userNumber" IS NOT NULL THEN
    UPDATE "user_identifiers" SET "releasedAt" = now(), "releaseReason" = reason
     WHERE "userId" = NEW."id" AND "kind" = 'USER' AND "number" = OLD."userNumber" AND "releasedAt" IS NULL;
  END IF;
  IF NEW."userNumber" IS NOT NULL AND (TG_OP = 'INSERT' OR OLD."userNumber" IS DISTINCT FROM NEW."userNumber") THEN
    INSERT INTO "user_identifiers" ("id", "userId", "kind", "number") VALUES (gen_random_uuid()::text, NEW."id", 'USER', NEW."userNumber");
  END IF;

  IF TG_OP = 'UPDATE' AND OLD."studentNumber" IS DISTINCT FROM NEW."studentNumber" AND OLD."studentNumber" IS NOT NULL THEN
    UPDATE "user_identifiers" SET "releasedAt" = now(), "releaseReason" = reason
     WHERE "userId" = NEW."id" AND "kind" = 'STUDENT' AND "number" = OLD."studentNumber" AND "releasedAt" IS NULL;
  END IF;
  IF NEW."studentNumber" IS NOT NULL AND (TG_OP = 'INSERT' OR OLD."studentNumber" IS DISTINCT FROM NEW."studentNumber") THEN
    INSERT INTO "user_identifiers" ("id", "userId", "kind", "number") VALUES (gen_random_uuid()::text, NEW."id", 'STUDENT', NEW."studentNumber");
  END IF;

  IF TG_OP = 'UPDATE' AND OLD."teacherNumber" IS DISTINCT FROM NEW."teacherNumber" AND OLD."teacherNumber" IS NOT NULL THEN
    UPDATE "user_identifiers" SET "releasedAt" = now(), "releaseReason" = reason
     WHERE "userId" = NEW."id" AND "kind" = 'TEACHER' AND "number" = OLD."teacherNumber" AND "releasedAt" IS NULL;
  END IF;
  IF NEW."teacherNumber" IS NOT NULL AND (TG_OP = 'INSERT' OR OLD."teacherNumber" IS DISTINCT FROM NEW."teacherNumber") THEN
    INSERT INTO "user_identifiers" ("id", "userId", "kind", "number") VALUES (gen_random_uuid()::text, NEW."id", 'TEACHER', NEW."teacherNumber");
  END IF;
  RETURN NEW;
END $$;

-- The numbers people hold today become the first history rows.
INSERT INTO "user_identifiers" ("id", "userId", "kind", "number", "assignedAt")
SELECT gen_random_uuid()::text, "id", 'USER', "userNumber", "createdAt" FROM "users" WHERE "userNumber" IS NOT NULL;
INSERT INTO "user_identifiers" ("id", "userId", "kind", "number", "assignedAt")
SELECT gen_random_uuid()::text, "id", 'STUDENT', "studentNumber", "createdAt" FROM "users" WHERE "studentNumber" IS NOT NULL;

CREATE TRIGGER "users_pick_user_number" BEFORE INSERT ON "users"
  FOR EACH ROW EXECUTE FUNCTION "users_pick_user_number"();
CREATE TRIGGER "users_identifier_history" AFTER INSERT OR UPDATE OF "userNumber", "studentNumber", "teacherNumber" ON "users"
  FOR EACH ROW EXECUTE FUNCTION "users_identifier_history"();
CREATE TRIGGER "users_identifier_release" BEFORE DELETE ON "users"
  FOR EACH ROW EXECUTE FUNCTION "users_identifier_history"();

-- Today's teachers get teacher numbers (oldest first) and free their user numbers, as a new teacher would.
UPDATE "users" u SET "teacherNumber" = t.n, "userNumber" = NULL
  FROM (SELECT "id", row_number() OVER (ORDER BY "createdAt", "id") AS n FROM "users" WHERE "role" = 'TEACHER') t
 WHERE u."id" = t."id";
SELECT setval('"teacher_number_seq"', COALESCE((SELECT MAX("teacherNumber") FROM "users"), 0) + 1, false);
