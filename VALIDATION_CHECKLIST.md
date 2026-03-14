# Validation Checklist

## Repository and Branch
- [ ] Confirm repo path is `/Users/sergiikuropiatnyk/handy-friend-landing-v6`
- [ ] Confirm expected branch is checked out
- [ ] Confirm `origin` points to `2133611700c-sudo/handy-friend-web`
- [ ] Run `npm run vercel:guard` and confirm canonical Vercel project linkage

## Environment and Secrets
- [ ] Required env vars are loaded
- [ ] No real secrets were written to tracked files
- [ ] `.env.example` remains template-only

## Change Safety
- [ ] Migration names follow `YYYYMMDDHHMM_slug.sql`
- [ ] DB changes include rollback or clear reversal path
- [ ] No destructive command executed without explicit approval

## Technical Validation
- [ ] Local checks/tests executed (or reason documented)
- [ ] API/feature behavior validated with evidence
- [ ] Integration touchpoints validated (Supabase/Telegram/Resend/etc. when relevant)

## Documentation and Artifacts
- [ ] `RUN_REPORT.md` updated
- [ ] `STATUS.md` updated
- [ ] `DECISIONS.md` updated if architecture/process changed
- [ ] `ARTIFACT_INDEX.md` updated with new outputs
- [ ] KPI labels validated against `docs/KPI_TRUTH_CONTRACT.md` (no mixed rating sources)

## Git Readiness
- [ ] `git status` reviewed (clean or intentionally dirty with explanation)
- [ ] Commit message reflects actual changes
- [ ] Rollback readiness confirmed
