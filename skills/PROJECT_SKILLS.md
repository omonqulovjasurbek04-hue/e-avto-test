# E-Avto Test Skills

This directory contains complete, nested skill repositories selected for the E-Avto Test platform.

## Sources

- `claude-skills/` - 67 full-stack development skills, references, workflows, security, testing, backend, frontend, and DevOps guidance.
- `ui-ux-pro-max-skill/` - UI/UX design intelligence, React and Tailwind guidance, accessibility, responsive design, typography, and design-system data.
- `awesome-ai-agent-skills/` - 103 cross-agent skills compatible with Claude Code, Codex, Gemini CLI, GitHub Copilot, and other Agent Skills tools.
- `github-skills/` - official GitHub Skills for repository setup, Markdown, GitHub Pages, pull request review, Actions, testing, and supply-chain security.

The official GitHub Skills included are:

- `introduction-to-github/`
- `communicate-using-markdown/`
- `github-pages/`
- `review-pull-requests/`
- `hello-github-actions/`
- `test-with-actions/`
- `secure-repository-supply-chain/`

## Project-relevant sections

## Vazifa bo‘yicha skill routeri

Har safar barcha skilllarni yuklamang. Quyidagi jadval vazifaga mos yo‘riqnomani
tez tanlash uchun. Tanlangan `SKILL.md`ni ish boshlashdan oldin to‘liq o‘qing.

| Vazifa | Birinchi skill | Qo‘shimcha skill |
|---|---|---|
| Frontend + backend funksiyasi yoki API ulash | `claude-skills/skills/fullstack-guardian/SKILL.md` | `typescript-pro`, `api-designer` |
| React sahifasi, hook, state yoki forma | `claude-skills/skills/react-expert/SKILL.md` | `ui-ux-pro-max-skill/cli/assets/skills/ui-styling/SKILL.md` |
| Express/Prisma endpoint yoki CRUD | `claude-skills/skills/fullstack-guardian/SKILL.md` | `claude-skills/skills/api-designer/SKILL.md` |
| JWT, auth, admin rol, Zod, CORS, rate-limit | `claude-skills/skills/secure-code-guardian/SKILL.md` | `claude-skills/skills/security-reviewer/SKILL.md` |
| Prisma schema, indeks, migration, seed | `claude-skills/skills/postgres-pro/SKILL.md` | `awesome-ai-agent-skills/database/database-migration/SKILL.md`, `database-seeding/SKILL.md` |
| Test yoki browser E2E | `awesome-ai-agent-skills/code-and-development/testing/SKILL.md` | `claude-skills/skills/playwright-expert/SKILL.md` |
| Xatoni topish/tuzatish | `claude-skills/skills/debugging-wizard/SKILL.md` | `awesome-ai-agent-skills/code-and-development/debugging/SKILL.md` |
| Kod yoki xavfsizlik review | `claude-skills/skills/code-reviewer/SKILL.md` | `awesome-ai-agent-skills/security/security-audit/SKILL.md` |
| Responsive UI, dark mode, accessibility | `ui-ux-pro-max-skill/cli/assets/skills/ui-styling/SKILL.md` | `awesome-ai-agent-skills/design-and-ui-ux/accessibility-testing/SKILL.md` |
| Docker, CI/CD yoki deploy | `awesome-ai-agent-skills/devops-and-infrastructure/docker-compose-setup/SKILL.md` | `awesome-ai-agent-skills/devops-and-infrastructure/ci-cd/SKILL.md` |

`typescript-pro` manzili: `claude-skills/skills/typescript-pro/SKILL.md`.

## Tavsiya etilgan ishlash ketma-ketligi

1. **Yangi funksiya**: `fullstack-guardian` bilan talab, API va xavfsizlik
   chegarasini aniqlang.
2. **Database**: model yoki migration bo‘lsa `postgres-pro` va
   `database-migration`ni qo‘llang; `prisma generate` hamda `prisma validate`
   bilan tekshiring.
3. **Backend**: server tomondagi validatsiya, auth/authorization va standart
   API javoblarini `secure-code-guardian` talablariga ko‘ra yozing.
4. **Frontend**: service, TypeScript turi, hook va sahifani `react-expert` va
   `ui-styling` bilan yarating. `VITE_API_URL` orqali real backendga ulang.
5. **Sifat**: `testing`/`playwright-expert` bilan tekshiring, keyin
   `code-reviewer` va `security-audit` cheklistini qo‘llang.
6. **Deploy**: `docker-compose-setup` va `ci-cd` orqali environment,
   health-check va deploy sozlamalarini tekshiring.

From `awesome-ai-agent-skills/`:

- `agent-engineering/`
- `agent-security/`
- `api-and-integration/`
- `code-and-development/`
- `context-engineering/`
- `database/`
- `design-and-ui-ux/`
- `devops-and-infrastructure/`
- `security/`
- `productivity-and-workflow/`
- `research-and-knowledge/`

Every source repository is kept with its complete nested structure. Each individual skill is represented by a `SKILL.md` file and may include `agents/`, `scripts/`, `references/`, or `assets/` subdirectories.

## Licenses

The selected repositories declare MIT licenses in their respective `LICENSE` files. Review the source license before redistributing these files outside this project.

## Sources

- https://github.com/Jeffallan/claude-skills
- https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- https://github.com/seb1n/awesome-ai-agent-skills
