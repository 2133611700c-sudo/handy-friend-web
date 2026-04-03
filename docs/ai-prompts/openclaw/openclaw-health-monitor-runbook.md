# OpenClaw Health Monitor Runbook

## Script
- Path: `scripts/openclaw_health_monitor.py`
- Purpose: source freshness, rejection anomaly, feed checks, scanner activity checks, incident + Telegram digest

## Cron
```cron
0 */6 * * * cd /Users/sergiikuropiatnyk/handy-friend-landing-v6 && /usr/bin/env python3 scripts/openclaw_health_monitor.py >> /Users/sergiikuropiatnyk/handy-friend-ops/logs/health_monitor.log 2>&1
```

## Required env vars
- `SUPABASE_URL`
- `SUPABASE_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Optional:
- `OPENCLAW_ROOT`
- `NEXTDOOR_SOURCES_PATH`

## Test commands
```bash
# 1) Syntax
python3 -m py_compile scripts/openclaw_health_monitor.py

# 2) Dry run (no incident write, no telegram)
SUPABASE_URL="https://<project>.supabase.co" \
SUPABASE_KEY="<service-key>" \
python3 scripts/openclaw_health_monitor.py --test

# 3) Full run
SUPABASE_URL="https://<project>.supabase.co" \
SUPABASE_KEY="<service-key>" \
TELEGRAM_BOT_TOKEN="<token>" \
TELEGRAM_CHAT_ID="<chat_id>" \
python3 scripts/openclaw_health_monitor.py
```

## Risks and control
- `ops_incidents` schema may vary: script tries multiple payload shapes and logs failures.
- If `nextdoor_sources.json` path drifts: set `NEXTDOOR_SOURCES_PATH` explicitly.
- If scanner process names differ: freshness falls back to log mtime checks.
- If Telegram unavailable: script logs failure but still writes local report.
