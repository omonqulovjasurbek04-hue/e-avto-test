-- The database itself guarantees the rule: a student keeps their own number (user0002 -> student0002).
ALTER TABLE "users"
  ADD CONSTRAINT "users_studentNumber_is_userNumber"
  CHECK ("studentNumber" IS NULL OR "studentNumber" = "userNumber");
