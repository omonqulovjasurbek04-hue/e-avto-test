-- MODERATOR and FINANCE are gone. Existing accounts of these roles continue as ADMIN (their data is
-- kept), their staff-number history is cleaned, and both enums are recreated without the two values.

-- 1) Accounts of the removed roles become admins (the trigger gives each an admin staff number and
--    releases its old staff-number row, as any role change does).
UPDATE "users" SET "role" = 'ADMIN' WHERE "role" IN ('MODERATOR', 'FINANCE');

-- 2) The identifier history cannot keep a kind that no longer exists.
DELETE FROM "user_identifiers" WHERE "kind" IN ('MODERATOR', 'FINANCE');

-- 3) The hand-written functions/triggers reference the removed enum values; drop them first.
DROP TRIGGER IF EXISTS "users_role_numbers" ON "users";
DROP TRIGGER IF EXISTS "users_identifier_history" ON "users";
DROP TRIGGER IF EXISTS "users_identifier_release" ON "users";
DROP FUNCTION "users_role_numbers"();
DROP FUNCTION "users_identifier_history"();
DROP FUNCTION "next_staff_number"("Role");

-- 4) Recreate "Role" without MODERATOR/FINANCE.
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
CREATE TYPE "Role_new" AS ENUM ('USER', 'TEACHER', 'MANAGER', 'ADMIN', 'SUPERADMIN');
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER';

-- 5) Recreate "IdentifierKind" without MODERATOR/FINANCE.
CREATE TYPE "IdentifierKind_new" AS ENUM ('USER', 'STUDENT', 'TEACHER', 'MANAGER', 'ADMIN', 'SUPERADMIN');
ALTER TABLE "user_identifiers" ALTER COLUMN "kind" TYPE "IdentifierKind_new" USING ("kind"::text::"IdentifierKind_new");
DROP TYPE "IdentifierKind";
ALTER TYPE "IdentifierKind_new" RENAME TO "IdentifierKind";

-- 6) The removed roles' staff number sequences are unused now.
DROP SEQUENCE IF EXISTS "moderator_number_seq";
DROP SEQUENCE IF EXISTS "finance_number_seq";

-- 7) Recreate the staff number and identifier-history functions/triggers (without the removed roles).
CREATE FUNCTION "next_staff_number"(r "Role") RETURNS INTEGER LANGUAGE sql AS $$
  SELECT CASE r
    WHEN 'MANAGER' THEN nextval('"manager_number_seq"')
    WHEN 'ADMIN' THEN nextval('"admin_number_seq"')
    WHEN 'SUPERADMIN' THEN nextval('"superadmin_number_seq"')
  END::INTEGER
$$;

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

CREATE TRIGGER "users_role_numbers" BEFORE INSERT OR UPDATE OF "role" ON "users"
  FOR EACH ROW EXECUTE FUNCTION "users_role_numbers"();

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

CREATE TRIGGER "users_identifier_history" AFTER INSERT OR UPDATE OF "userNumber", "studentNumber", "teacherNumber", "staffNumber", "role" ON "users"
  FOR EACH ROW EXECUTE FUNCTION "users_identifier_history"();
CREATE TRIGGER "users_identifier_release" BEFORE DELETE ON "users"
  FOR EACH ROW EXECUTE FUNCTION "users_identifier_history"();
