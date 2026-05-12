# Alex Intake Execution Plan — Handy & Friend

Status: ACTIVE
Owner: Handy & Friend engineering
Scope: website chat, WhatsApp/Messenger intake, Supabase CRM, Telegram owner proof, GA4/Google Ads attribution.

## Goal

Turn Alex from a chat endpoint into a reliable lead-intake system:

1. Client always receives a bounded response.
2. Every qualified lead is captured or explicitly marked as not captured.
3. Owner receives Telegram proof.
4. CRM source attribution is preserved.
5. Ads/GA4 events can be reconciled against CRM.
6. Regression and smoke tests produce raw evidence.

## Current verified baseline

- Production project: `handy-friend-landing-v6`.
- Production aliases: `handyandfriend.com`, `www.handyandfriend.com`.
- `/api/health` returns healthy with Supabase, Telegram, and DeepSeek env configured.
- Telegram health has shown zero leads without Telegram proof in the 7-day check.
- Attribution health has shown `PASS`, with `gclid` and `utm_google_cpc` mapping to `google_ads_search`.
- Outbox health has shown queue depth `0`, DLQ `0`, and no SLO breach.
- Alex fail-fast timeout fix is deployed.
- Fallback pricing language is aligned with `$150 labor only` and has no `$185/$105` leakage.

## Known open blocker

`POST /api/ai-chat` production smoke still requires raw PASS evidence from an environment with normal DNS/network.

Tracking issue: #70.

Success criteria:

- HTTP `200`.
- Response time `<=15s`.
- Non-empty `reply`.
- Reply contains `$150`.
- Reply does not contain `$185` or `$105`.

## Product architecture principles

### 1. Fast client response

The client-facing response must not wait on slow side effects without a strict timeout.

Required behavior:

- AI provider call is bounded.
- Static fallback is bounded.
- Supabase write failures do not leave the user hanging.
- Telegram send failures do not leave the user hanging.
- Slow photo forwarding is bounded or deferred.

### 2. Evidence-first operations

Every production claim must be backed by raw evidence:

- endpoint response;
- Vercel deployment state;
- Supabase row/event;
- Telegram send record;
- GA4/Ads event status;
- regression report artifact.

### 3. Stable source attribution

Events and CRM fields must use one contract:

- `phone_click`
- `whatsapp_click`
- `form_submit`
- `lead_created`
- `lead_source=google_ads_search` for gclid/google cpc traffic

Do not introduce alternate names like `click_whatsapp` unless mapped deliberately.

### 4. Business/legal guardrails

Alex must never claim:

- licensed;
- bonded;
- certified;
- best in LA;
- guaranteed lowest price.

Pricing rules:

- Standard eligible small jobs: `$150 labor only` service call.
- Extra labor: `$75/hour` after included scope.
- Materials, parking, and disposal extra only if stated in writing.
- Quote-only services require photos/details.
- Without contractor license, job total must stay under `$1,000`; warn at `$900`.

## P0 — Reliability gates

### P0.1 Production POST smoke

Acceptance:

- raw log attached to issue #70;
- HTTP 200;
- latency <=15s;
- reply has `$150`;
- no `$185/$105`;
- no licensing/overclaim language.

### P0.2 Regression artifact

Acceptance:

- weekly regression produces JSON report artifact;
- failed tests list root cause;
- no pass/fail without raw endpoint evidence.

### P0.3 Lead proof chain

Acceptance:

For one synthetic lead:

- `/api/ai-chat` returns a response;
- Supabase has conversation/lead/event record;
- Telegram has send proof or explicit skip reason;
- attribution payload preserved.

### P0.4 Stale lead SLA

Acceptance:

- query/check identifies `new` leads older than 20 minutes;
- Telegram alert or dashboard field exposes count;
- no silent backlog.

## P1 — Product quality

### P1.1 Response contract

Add stable fields to `/api/ai-chat` response when safe:

- `session_id`
- `correlation_id`
- `latency_ms`
- `fallback_used`
- `model_source`
- `leadCaptured`
- `leadId`
- `service`

Acceptance:

- frontend remains compatible;
- no secrets exposed;
- regression tests updated.

### P1.2 Owner Telegram card

Owner card must include:

- service;
- ZIP/area;
- phone/contact if captured;
- source/channel;
- photos count;
- urgency/timing if present;
- next action;
- SLA deadline.

Acceptance:

- Telegram proof stored;
- failures logged;
- no duplicate photo spam.

### P1.3 Attribution reconciliation report

Acceptance:

Report compares:

- Google Ads clicks/spend/conversions;
- GA4 key events;
- Supabase leads by source;
- Telegram proofs;
- booked jobs.

Manual Ads billing is out of scope.

### P1.4 Event naming cleanup

Acceptance:

- code, GA4, Ads, CRM docs use the same event names;
- `whatsapp_click` is the canonical WhatsApp CTA event;
- any old alias is mapped or removed.

## P2 — Intelligence and safety

### P2.1 Golden service tests

Add/maintain tests for:

- TV mounting;
- furniture assembly;
- drywall;
- interior painting;
- flooring;
- plumbing;
- electrical;
- cabinet painting;
- vanity;
- backsplash;
- door installation.

Acceptance:

- no old prices;
- quote-only services ask for photos/details;
- plumbing/electrical remain standalone;
- no unsafe/licensed overclaims.

### P2.2 Multilingual behavior

Acceptance:

- website chat may respond in EN/RU/UK/ES based on detected language;
- WhatsApp client replies remain English-only unless explicitly changed;
- Telegram internal alerts may include structured English fields.

### P2.3 Abuse/prompt injection

Acceptance:

- prompt injection deflected;
- internal prompts/prices/secrets not exposed;
- customer gets useful service-oriented redirect.

## Execution order

1. Close #70 with raw POST smoke.
2. Add response evidence fields to `/api/ai-chat` without breaking frontend.
3. Add/confirm stale lead SLA health check.
4. Harden regression suite and ensure artifacts are stored.
5. Normalize Ads/GA4/CRM event names.
6. Build weekly reconciliation report.
7. Improve owner Telegram card and photo proof flow.

## Stop conditions

Stop and report exact blocker if:

- DNS/tooling prevents endpoint proof;
- Vercel deployment fails;
- Supabase auth is unavailable;
- Telegram API rejects send;
- Ads/GA4 UI access is missing;
- a change risks billing/payment.
