## What changed

**1. Railway image fix and Node 22** (`40027d5`)
- `deploy/Dockerfile.railway`: the `storage/private` folder now belongs to the `node` user. Before this, `/app/backend` was root-owned, so image/video uploads in production should have failed with `EACCES`. CI now checks that the folder is writable.
- Node 20 reached end-of-life in April 2026 → Node 22 LTS everywhere (Dockerfiles, CI, `engines`).
- `docs/ROLES.md`: each role's duties and the APIs it uses; `docs/BACKEND_TODO.md` updated.
- `npm run seed:roles`: one test account per role, **local DB only** (refuses any other host).

**2. Account numbers: `user####` and `student####`** (`8decfd3`)
- On sign-up every account gets `userNumber` → `user0001` (the old `studentNumber` column was renamed).
- `studentNumber` → `student0001` is given **only on the first paid course**, from its own sequence (`users_student_number_seq`). It's kept when access expires; a renewal doesn't issue a new number.
- Migration: existing buyers (with an `enrollment`) are numbered in purchase order.
- Site: the top badge shows `student####` (blue) for buyers, `user####` otherwise.
- Admin: ID and phone columns, search by `student0001` / `user0001` / phone, a "bought / didn't buy" filter (`kind=student|user`), and a buyer count on the dashboard.
- Telegram staff menu shows and searches both numbers.

**3. MANAGER (operator) role** (`d0e7714`, merge `06fe7cb`)
- Front desk: `admin:access`, `users:read`, `groups:manage`, `schedule:manage`, `orders:read`. Enrols students into groups without ADMIN rights (prices, settings, audit).
- Enum migration, permissions, routes, frontend labels (uz / uz_cyrl / ru), tests.

## Notes for the reviewer
- **2 migrations:** `20261021100000_manager_role`, `20261021120000_user_and_student_numbers`. They run automatically on deploy (`npm run release`). The second renames a column: the API now returns `userNumber`, and `studentNumber` may be missing.
- After merging, uploads still need a Volume on Railway to persist (and `RAILWAY_RUN_UID=0`), see BACKEND_TODO #2.
- The Docker image wasn't built locally (no Docker), so CI's `railway-image` job will verify it.

## Checks
- Backend: 42 test files pass (with integration tests against PostgreSQL 18), typecheck, lint, `prisma migrate diff` (no drift).
- Frontend: typecheck, lint, `i18n-cyrl --check`.
- Tested locally in the browser: sign-up → `user0034` → mock payment → `student0001`; admin filter; MANAGER access (users list allowed, catalog 403).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
