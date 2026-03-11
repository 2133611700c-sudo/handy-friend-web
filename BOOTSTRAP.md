# Bootstrap Operating Rules

## Tool Roles
- Atlas Browser: external consoles (Supabase, Vercel, GA4, Ads, GitHub), verification, account surfaces.
- ChatGPT app: problem framing, planning, spec drafting, review.
- Codex app: implementation, tests, migrations, repo changes.

## Handoff Contract
- No critical state is chat-only.
- Chat/ideas must be written into repo contracts:
  - `EXEC_SPEC.md` (what to do)
  - `STATUS.md` (where we are)
  - `RUN_REPORT.md` (what was done)
  - `DECISIONS.md` (why architecture changed)

## Naming Conventions
- Reports: `ops/reports/YYYY-MM-DD-topic.md`
- Audits: `ops/audits/YYYY-MM-DD-topic.md`
- Snapshots: `ops/snapshots/YYYY-MM-DD-topic.md`
- Migrations: `supabase/migrations/YYYYMMDDHHMM_slug.sql`
- Decisions: `D-001`, `D-002`, `D-003`...

## Workflow Rules
1. ChatGPT/Atlas defines or refines `EXEC_SPEC.md`.
2. Codex executes against `EXEC_SPEC.md`.
3. Codex updates `RUN_REPORT.md` and `STATUS.md` after execution.
4. Architecture/process decisions are recorded in `DECISIONS.md`.
5. Important artifacts are indexed in `ARTIFACT_INDEX.md`.

## Git Rules
- Source of truth is this repository only.
- Work from explicit branch context; never assume.
- Every non-trivial change requires:
  1. spec in `EXEC_SPEC.md`
  2. validation evidence
  3. run report update
- Never rewrite history on shared branches unless explicitly approved.

## Secrets / Env Rules
- Secrets never committed.
- Use `.env.local` or platform secret managers.
- `.env.example` is template-only.

## Daily Operational Routine
1. Run `SESSION_START_CHECKLIST.md`.
2. Confirm branch + objective in `STATUS.md`.
3. Execute work per `EXEC_SPEC.md`.
4. Validate per `VALIDATION_CHECKLIST.md`.
5. Update `RUN_REPORT.md`, `STATUS.md`, `ARTIFACT_INDEX.md`.

## Operational Commands
- `npm run workflow:bootstrap` to provision standardized path and validate baseline.
- `npm run workflow:validate` before major changes or releases.
- `npm run workflow:start` at session start to open required apps/surfaces and record snapshot.
- `npm run audit:prod` as hard production gate before release.

## Release Discipline
- Follow `RELEASE_RUNBOOK.md` for release and rollback sequence.
- Follow `docs/KPI_TRUTH_CONTRACT.md` to prevent metric-label drift in reports.
