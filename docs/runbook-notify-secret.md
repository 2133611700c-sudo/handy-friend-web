# Runbook — `/api/notify` Secret Enablement

## Goal
Enable `/api/notify` securely for server-side callers only.

## Current State (2026-04-19)
- Endpoint is fail-closed when `HF_NOTIFY_SECRET` is unset.
- Live response (no header): `{"success":false,"error":"notify_disabled"}`.
- Live response (wrong header): `{"success":false,"error":"notify_disabled"}`.

## Manual Steps (Vercel)
1. Open Vercel project `handy-friend-web`.
2. Go to `Settings -> Environment Variables`.
3. Add env var:
   - Key: `HF_NOTIFY_SECRET`
   - Value: random 32+ bytes
   - Environments: `Production` and `Preview`
4. Redeploy latest commit to apply env.

## Verification
Run both checks:

```bash
# Must reject without secret
curl -sS -X POST 'https://handyandfriend.com/api/notify' \
  -H 'Content-Type: application/json' \
  -d '{"type":"telegram","leadId":"probe","phone":"2130000000"}'

# Must reject wrong secret
curl -sS -X POST 'https://handyandfriend.com/api/notify' \
  -H 'Content-Type: application/json' \
  -H 'X-HF-Notify-Secret: wrong' \
  -d '{"type":"telegram","leadId":"probe","phone":"2130000000"}'

# Must accept correct secret (replace <secret>)
curl -sS -X POST 'https://handyandfriend.com/api/notify' \
  -H 'Content-Type: application/json' \
  -H 'X-HF-Notify-Secret: <secret>' \
  -d '{"type":"telegram","leadId":"probe","phone":"2130000000"}'
```

Expected after enablement:
- without/wrong header -> `403 forbidden`
- with correct header -> `200` + `{ "success": true, ... }`

## Rollback
- Remove `HF_NOTIFY_SECRET` from Vercel env and redeploy.
- Endpoint returns `503 notify_disabled` again.
