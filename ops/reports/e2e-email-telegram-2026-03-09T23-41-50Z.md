# E2E Verification Report (Resend + Telegram + Pipeline)

Generated: 2026-03-09 UTC

## Test Request
- Endpoint: `POST /api/submit-lead`
- Expected mode: `resend`
- Expected side effects:
  - lead row created
  - stage moved to `contacted`
  - `form_submission` + `stage_change` + `telegram_sent` in `lead_events`
  - owner email from `leads@handyandfriend.com`
  - customer autoresponder from `hello@handyandfriend.com`

## Actual API Response
```json
{"success":true,"mode":"resend","leadId":"lead_1773099689139_2kiwdm"}
```

## Lead Row (by leadId)
```json
[{"id":"lead_1773099689139_2kiwdm","full_name":"E2E Email Telegram Audit","email":"2133611700c+e2e164128@gmail.com","phone":"5559090011","is_test":true,"status":"contacted","stage":"contacted","contacted_at":"2026-03-09T23:41:29.654+00:00","response_time_min":0,"created_at":"2026-03-09T23:41:29.139+00:00"}]
```

## Lead Events
```json
[
  {"event_type":"form_submission","created_at":"2026-03-09T23:41:29.593697+00:00"},
  {"event_type":"stage_change","created_at":"2026-03-09T23:41:29.871847+00:00"},
  {"event_type":"telegram_sent","created_at":"2026-03-09T23:41:30.53475+00:00"}
]
```

## Verdict
- API delivery mode switched to `resend`: **PASS**
- DB pipeline write + stage transition: **PASS**
- Telegram notification + event logging: **PASS**
- Inbox verification (owner + customer): **MANUAL CHECK REQUIRED**

## Manual Inbox Checklist
- [ ] Owner inbox received new lead email from `leads@handyandfriend.com`
- [ ] Test customer inbox received autoresponder from `hello@handyandfriend.com`
- [ ] Both emails are authenticated (DKIM/SPF/DMARC aligned)
- [ ] Emails not in spam
