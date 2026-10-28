-- AlterTable
ALTER TABLE "users" ADD COLUMN     "staffNumber" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "users_role_staffNumber_key" ON "users"("role", "staffNumber");

-- ───────────── Staff numbers (hand-written; Prisma does not manage sequences or triggers) ─────────────
-- moderator0001, finance0001, manager0001, admin0001, superadmin0001: one sequence per staff role, never
-- reused. An account with a staff role is not a "user" any more: like a teacher, its user number is freed.

CREATE SEQUENCE "moderator_number_seq";
CREATE SEQUENCE "finance_number_seq";
CREATE SEQUENCE "manager_number_seq";
CREATE SEQUENCE "admin_number_seq";
CREATE SEQUENCE "superadmin_number_seq";

-- The next number for a staff role (NULL for USER and TEACHER, which have their own numbers).
CREATE FUNCTION "next_staff_number"(r "Role") RETURNS INTEGER LANGUAGE sql AS $$
  SELECT CASE r
    WHEN 'MODERATOR' THEN nextval('"moderator_number_seq"')
    WHEN 'FINANCE' THEN nextval('"finance_number_seq"')
    WHEN 'MANAGER' THEN nextval('"manager_number_seq"')
    WHEN 'ADMIN' THEN nextval('"admin_number_seq"')
    WHEN 'SUPERADMIN' THEN nextval('"superadmin_number_seq"')
  END::INTEGER
$$;

-- The role decides the public number, for every way a role is set (admin page, bootstrap, seeds):
--   USER: a user number (a freed one or a new one); TEACHER: a teacher number (kept from before, if any);
--   staff roles: a new number from the role's own sequence. Teachers and staff free their user number.
CREATE FUNCTION "users_role_numbers"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD."role" IS NOT DISTINCT FROM NEW."role" THEN
    RETURN NEW;
  END IF;
  IF NEW."role" = 'USER' THEN
    NEW."staffNumber" := NULL;
    IF NEW."userNumber" IS NULL THEN
      NEW."userNumber" := "next_user_number"();
    END IF;
  ELSIF NEW."role" = 'TEACHER' THEN
    NEW."staffNumber" := NULL;
    NEW."teacherNumber" := COALESCE(NEW."teacherNumber", nextval('"teacher_number_seq"')::INTEGER);
    NEW."userNumber" := NULL;
  ELSE
    NEW."staffNumber" := "next_staff_number"(NEW."role");
    NEW."userNumber" := NULL;
  END IF;
  RETURN NEW;
END $$;

-- Runs after "users_pick_user_number" on insert (trigger names sort), so a staff account created
-- directly does not keep the user number that was just picked.
CREATE TRIGGER "users_role_numbers" BEFORE INSERT OR UPDATE OF "role" ON "users"
  FOR EACH ROW EXECUTE FUNCTION "users_role_numbers"();

-- History now also records staff numbers; the kind is the role the number belongs to.
CREATE OR REPLACE FUNCTION "users_identifier_history"() RETURNS trigger LANGUAGE plpgsql AS $$
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

  -- A staff number belongs to its role: a new number or a new role closes the old row and opens a new one.
  IF TG_OP = 'UPDATE' AND OLD."staffNumber" IS NOT NULL
     AND (OLD."staffNumber" IS DISTINCT FROM NEW."staffNumber" OR OLD."role" IS DISTINCT FROM NEW."role") THEN
    UPDATE "user_identifiers" SET "releasedAt" = now(), "releaseReason" = reason
     WHERE "userId" = NEW."id" AND "kind" = OLD."role"::text::"IdentifierKind" AND "number" = OLD."staffNumber" AND "releasedAt" IS NULL;
  END IF;
  IF NEW."staffNumber" IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD."staffNumber" IS DISTINCT FROM NEW."staffNumber" OR OLD."role" IS DISTINCT FROM NEW."role") THEN
    INSERT INTO "user_identifiers" ("id", "userId", "kind", "number") VALUES (gen_random_uuid()::text, NEW."id", NEW."role"::text::"IdentifierKind", NEW."staffNumber");
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER "users_identifier_history" ON "users";
CREATE TRIGGER "users_identifier_history" AFTER INSERT OR UPDATE OF "userNumber", "studentNumber", "teacherNumber", "staffNumber", "role" ON "users"
  FOR EACH ROW EXECUTE FUNCTION "users_identifier_history"();

-- Today's staff get their numbers (oldest first, per role) and free their user numbers.
UPDATE "users" u SET "staffNumber" = s.n, "userNumber" = NULL
  FROM (SELECT "id", row_number() OVER (PARTITION BY "role" ORDER BY "createdAt", "id") AS n
          FROM "users" WHERE "role" IN ('MODERATOR', 'FINANCE', 'MANAGER', 'ADMIN', 'SUPERADMIN')) s
 WHERE u."id" = s."id";
SELECT setval('"moderator_number_seq"', COALESCE((SELECT MAX("staffNumber") FROM "users" WHERE "role" = 'MODERATOR'), 0) + 1, false);
SELECT setval('"finance_number_seq"', COALESCE((SELECT MAX("staffNumber") FROM "users" WHERE "role" = 'FINANCE'), 0) + 1, false);
SELECT setval('"manager_number_seq"', COALESCE((SELECT MAX("staffNumber") FROM "users" WHERE "role" = 'MANAGER'), 0) + 1, false);
SELECT setval('"admin_number_seq"', COALESCE((SELECT MAX("staffNumber") FROM "users" WHERE "role" = 'ADMIN'), 0) + 1, false);
SELECT setval('"superadmin_number_seq"', COALESCE((SELECT MAX("staffNumber") FROM "users" WHERE "role" = 'SUPERADMIN'), 0) + 1, false);
