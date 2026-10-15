-- Synthetic data volume for a performance check (run against a THROW-AWAY database only):
--   npx prisma db execute --file scripts/perf-seed.sql      (DATABASE_URL = the scratch database)
-- ~20k students, 30k orders/payments, 20k finished tests with answers, 100k notifications, 100k audit rows, 1000 questions.

INSERT INTO courses (id, title, description, level, "order", "isPublished", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'Perf course ' || g, 'perf', 'Boshlang''ich', g, true, now(), now() FROM generate_series(1, 5) g;

INSERT INTO users (id, name, email, role, "isActive", "tokenVersion", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'Perf User ' || g, 'perf' || g || '@example.com', 'USER', true, 0, now() - (g || ' minutes')::interval, now()
FROM generate_series(1, 20000) g;

INSERT INTO questions (id, "courseId", text, options, "correctIndex", "order", difficulty, "isPublished", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, c.id, 'Perf question ' || g, '["A","B","C","D"]'::jsonb, g % 4, g, 'EASY', true, now(), now()
FROM generate_series(1, 1000) g
JOIN (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM courses) c ON c.rn = (g % 5) + 1;

-- finished tests spread over the users
INSERT INTO tests (id, "userId", "courseId", "totalQuestions", duration, "correctAnswers", "wrongAnswers", score, passed, "timeSpent", "passScore", "startedAt", "finishedAt")
SELECT gen_random_uuid()::text, u.id, c.id, 20, 2700, 12 + (g % 9), 8 - (g % 9), 60 + (g % 41), (60 + (g % 41)) >= 70, 600 + g % 1500, 70,
       now() - (g || ' minutes')::interval, now() - (g || ' minutes')::interval + interval '20 minutes'
FROM generate_series(1, 20000) g
JOIN (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM users) u ON u.rn = g
JOIN (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM courses) c ON c.rn = (g % 5) + 1;

INSERT INTO user_answers (id, "testId", "questionId", "selectedIndex", "isCorrect")
SELECT gen_random_uuid()::text, t.id, q.id, 0, (random() > 0.4)
FROM (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM tests) t
JOIN (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM questions) q ON q.rn BETWEEN (t.rn % 990) + 1 AND (t.rn % 990) + 5;

INSERT INTO enrollments (id, "userId", "courseId", status, "startsAt", "createdAt")
SELECT gen_random_uuid()::text, u.id, c.id, 'ACTIVE', now(), now()
FROM (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM users) u
JOIN (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM courses) c ON c.rn = (u.rn % 5) + 1;

INSERT INTO orders (id, "userId", status, subtotal, "discountTotal", total, currency, "paidAt", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, u.id,
       CASE WHEN g % 10 < 7 THEN 'PAID' WHEN g % 10 < 9 THEN 'PENDING' ELSE 'CANCELLED' END::"OrderStatus",
       10000000, 0, 10000000, 'UZS', now() - (g || ' minutes')::interval, now() - (g || ' minutes')::interval, now()
FROM generate_series(1, 30000) g
JOIN (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM users) u ON u.rn = (g % 20000) + 1;

INSERT INTO payments (id, "orderId", provider, "providerPaymentId", status, amount, currency, "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, o.id, 'mock', 'perf_' || o.rn, 'PAID'::"PaymentStatus", 10000000, 'UZS', now(), now()
FROM (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM orders) o;

INSERT INTO notifications (id, "userId", type, title, body, "dedupeKey", "inApp", "emailStatus", "emailAttempts", "createdAt")
SELECT gen_random_uuid()::text, u.id, 'PERF', 'Perf notice ' || g, 'body', 'perf:' || g, true, 'NONE', 0, now() - (g || ' seconds')::interval
FROM generate_series(1, 100000) g
JOIN (SELECT id, row_number() OVER (ORDER BY id) AS rn FROM users) u ON u.rn = (g % 20000) + 1;

INSERT INTO audit_logs (id, "actorId", action, entity, "entityId", "createdAt")
SELECT gen_random_uuid()::text, NULL, 'perf.' || (g % 20), 'Perf', g::text, now() - (g || ' seconds')::interval
FROM generate_series(1, 100000) g;

-- an admin to call the back-office endpoints with
INSERT INTO users (id, name, email, role, "isActive", "tokenVersion", "createdAt", "updatedAt")
VALUES ('perf-admin-0000-0000-0000-000000000001', 'Perf Admin', 'perfadmin@example.com', 'ADMIN', true, 0, now(), now());

ANALYZE;
