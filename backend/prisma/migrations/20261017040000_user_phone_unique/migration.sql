-- Empty strings left by older profile forms become NULL (NULLs never collide in a unique index).
UPDATE "users" SET "phone" = NULL WHERE "phone" IS NOT NULL AND btrim("phone") = '';

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
