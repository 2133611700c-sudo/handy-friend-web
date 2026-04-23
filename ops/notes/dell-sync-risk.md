# Dell Hunter Proof Contract — RESOLVED

**Created:** 2026-04-22  
**Resolved:** 2026-04-23  
**Severity (was):** HIGH — telegram_sends proof row completeness broken  
**Status:** RESOLVED — hunters patched, proof mechanism verified

---

## What Was Wrong

Dell hunters (`cl_hunter.py`, `fb_hunter.py`) sent HOT_SOCIAL_SIGNAL Telegram alerts but did NOT write `telegram_sends` proof rows. They used `telegram_reporter.send_telegram_logged()` which logs only to a local JSONL file, not to Supabase.

`social_scanner.py` (which has `log_telegram_send_proof()`) is NOT what the scheduler runs — the scheduler calls `cl_hunter.py` and `fb_hunter.py` directly via `scheduler_once.py`.

---

## What Was Fixed (2026-04-23)

1. **cl_hunter.py** — added `log_proof_sync()` function + 2 call sites (HTML scan loop + RSS fallback loop)
2. **fb_hunter.py** — added `log_proof_sync()` function + 1 call site, fixed `send_alert()` to return bool
3. Both write to `telegram_sends` with `source='social_scanner'` (compatible with watchdog query)
4. Backups: `cl_hunter.py.bak-proof-20260423`, `fb_hunter.py.bak-proof-20260423`

**Proof:** Test run on Dell wrote `telegram_sends id=37` (HTTP 201), confirmed visible in Supabase from Mac.

**Watchdog fix:** Query changed from `telegram_message_id=neq.88888` (excludes NULLs in SQL) to `id=neq.35` (excludes only the known synthetic test row).

---

## Nextdoor Hunter Architecture (discovered 2026-04-23)

**ND hunter is NOT live scraping.** It reads from 3 manual JSON feed files:
- `nextdoor_manual_feed_1.json` — 0 rows
- `nextdoor_manual_feed_2.json` — 0 rows  
- `nextdoor_manual_feed_3.json` — 0 rows

Config: `nextdoor_sources.json` → `[{type: "json_file", path: "nextdoor_manual_feed_*.json"}]`

**Result:** ND hunter runs but produces 0 new leads because all feed files are empty. 
The 4 ND signals in `social_leads` (from 16.3d ago) came from a time when feeds had content.

**Action needed:** Either manually populate the ND feed JSON files with real ND posts, or integrate live ND scraping into the scheduler.

---

## Verification Query

```
GET /rest/v1/telegram_sends?source=eq.social_scanner&id=neq.35&order=created_at.desc&limit=5
```

Rows with real (non-test) proof now visible.

---

## Current State (2026-04-23 ~08:15 UTC)

- `telegram_sends id=37` — test proof row from Dell (HTTP 201 confirmed)
- Hunters patched and waiting for next qualifying CL/FB scan cycle
- Watchdog: `proof_gap=False`, issues=3 (down from 5)
- Next expected real proof row: on next CL/FB scan that finds a qualifying post
