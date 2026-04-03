# OpenClaw Role Design — 2026-04-03

## 1. Correct Role of OpenClaw
OpenClaw owns browser automation and scraping execution only.

## 2. OpenClaw Owns / OpenClaw Does Not Own
### Owns
- Session/auth handling for scraping targets
- Source navigation and extraction
- First-pass source parsing
- Runtime evidence of scan execution

### Does Not Own
- CRM lifecycle and lead truth
- Pricing/policy authority
- Incident history authority
- Business orchestration decisions

## 3. Scraping Schedule
- Work hours cadence: every 30 minutes for ND/CL scanners.
- Health monitor: every 6 hours.
- Immediate retry allowed once on transport failures.

## 4. Health Monitoring Design
- Freshness by source using Supabase `social_leads` timestamps.
- Rejection anomaly using rolling sample (50 rows/source).
- Feed reachability checks from source config file.
- Scanner process/log freshness checks.

## 5. Dedup / Filter Design
- Dedupe in DB via lead_hash + platform/profile/time windows.
- Filter rules conservative: avoid over-aggressive rejection.
- Keep filter thresholds in rules-registry where possible.

## 6. Error Handling
- Every scanner run logs START/FAIL/DONE with reason.
- Stale lock auto-clean and lock-age logging.
- On monitor failures: log + Telegram alert (if configured) + local JSON artifact.

## 7. Minimal Implementation Plan
1. Keep patched runner with stale lock recovery.
2. Ensure real `nextdoor_sources.json` exists and path is explicit.
3. Run `openclaw_health_monitor.py` on 6h cron.
4. Patch `ops_incidents` schema mapping.

## 8. Risks and Control
- Missing source artifact -> explicit path + alert.
- Schema drift -> contract check before write.
- Long-running scan hangs -> timeout + kill/restart policy.

## 9. Final Recommendation
Do not broaden OpenClaw scope. Stabilize intake with strict source config, monitor enforcement, and evidence-first incident logging.
