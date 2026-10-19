-- Permanent sequential account number ("student0001" on the site).
ALTER TABLE "users" ADD COLUMN "studentNumber" INTEGER;

-- Existing accounts are numbered in sign-up order.
UPDATE "users" AS u
SET "studentNumber" = n.rn
FROM (SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS rn FROM "users") AS n
WHERE u."id" = n."id";

-- New accounts continue from the highest number.
CREATE SEQUENCE "users_studentNumber_seq" OWNED BY "users"."studentNumber";
SELECT setval('"users_studentNumber_seq"', COALESCE((SELECT MAX("studentNumber") FROM "users"), 0) + 1, false);

ALTER TABLE "users"
  ALTER COLUMN "studentNumber" SET DEFAULT nextval('"users_studentNumber_seq"'),
  ALTER COLUMN "studentNumber" SET NOT NULL;

CREATE UNIQUE INDEX "users_studentNumber_key" ON "users"("studentNumber");
