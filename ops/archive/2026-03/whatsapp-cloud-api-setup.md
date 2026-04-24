# WhatsApp Cloud API Setup Checklist

Date: 2026-04-22

## Required environment variables (Vercel Production + Preview)

- `WHATSAPP_VERIFY_TOKEN` — random shared secret used only for webhook challenge validation.
- `WHATSAPP_ACCESS_TOKEN` — Meta temporary/permanent access token for Cloud API sends.
- `WHATSAPP_PHONE_NUMBER_ID` — numeric phone number ID from WhatsApp Manager.
- `WHATSAPP_BUSINESS_ACCOUNT_ID` — optional but recommended for diagnostics.
- `WHATSAPP_GRAPH_VERSION` — optional (default `v19.0`).

Existing required vars reused by pipeline:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- Alex provider vars used by `callAlex` (`DEEPSEEK_API_KEY` or fallback provider vars).

## Meta app configuration

1. Meta Developers -> App -> Add product: **WhatsApp**.
2. WhatsApp -> API Setup:
   - copy `Phone number ID`
   - copy/test `Access token`
3. Webhooks -> Configure:
   - Callback URL: `https://handyandfriend.com/api/whatsapp-webhook`
   - Verify token: value of `WHATSAPP_VERIFY_TOKEN`
4. Subscribe webhook fields at minimum:
   - `messages`
   - `message_template_status_update`
   - `message_status_updates` (if shown as separate field in UI)
5. In WhatsApp Manager, ensure the phone number is connected to this app.

## Production verification steps

1. Verify challenge path:
```bash
curl -i "https://handyandfriend.com/api/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=<WHATSAPP_VERIFY_TOKEN>&hub.challenge=12345"
```
Expected: `HTTP/1.1 200` and body `12345`.

2. Send a WhatsApp message from a real user to business number.

3. Verify webhook ingest:
```bash
curl -sS "https://handyandfriend.com/api/health?type=telegram"
```
Expected: no spike in failures; owner alert should appear.

4. Verify DB proof rows (Supabase SQL):
```sql
select id, lead_id, event_type, event_data, created_at
from lead_events
where event_type in (
  'whatsapp_inbound',
  'whatsapp_visibility_classification',
  'whatsapp_ai_reply_sent',
  'whatsapp_status',
  'whatsapp_synthetic_ignored'
)
order by created_at desc
limit 50;
```

5. Verify owner alert proof:
```sql
select id, lead_id, source, ok, message_id, extra, created_at
from telegram_sends
where extra->>'channel' = 'meta_whatsapp'
order by created_at desc
limit 20;
```

6. Verify duplicate protection by re-sending same webhook payload in Meta test tool.
Expected: dedupe prevents second processing of same `wa_message_id`.

## Rollback

- Remove rewrite from `vercel.json`:
  - `/api/whatsapp-webhook -> /api/alex-webhook`
- Redeploy.
- Keep webhook disabled in Meta until fix is re-shipped.
