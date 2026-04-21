# Telegram Notification Contract

Updated: 2026-04-20

## Goal

Telegram is an operator channel, not a dump for background chatter.
Every message must be classed as one of:

- `P1 lead`: real customer lead or revenue-risk escalation
- `P2 signal`: qualified prospect signal that may justify manual action
- `P3 info`: summary, digest, or system information

If a message does not fit one of those classes, it should not be sent.

## Delivery rules

- `P1 lead`
  - Send immediately
  - Must be actionable
  - Must write durable row to `telegram_sends`

- `P2 signal`
  - Send only if quality threshold is met
  - Must clearly state it is not yet a confirmed lead
  - Must write durable row to `telegram_sends`

- `P3 info`
  - Send only on explicit schedule or when policy says signal exists
  - Never page as if it were a lead
  - Must write durable row to `telegram_sends`

## Active sources

- `ai_chat`
  - Class: `P1 lead`
  - Reason: real website chat capture and owner handoff

- `sla_check`
  - Class: `P1 lead`
  - Reason: uncontacted real lead with age threshold breach

- `daily_report`
  - Class: `P3 info`
  - Reason: scheduled KPI summary
  - Constraint: `REPORT_DELIVERY_POLICY=signal_only` should suppress no-signal days

- `psi_weekly`
  - Class: `P2 signal`
  - Reason: site performance degradation can hurt acquisition

- `ads_daily_check`
  - Class: `P2 signal`
  - Reason: zero-lead or outbox failure condition

- `followup_scheduler`
  - Class: `P1 lead`
  - Reason: pending operator follow-up on existing lead

- `hunter_signal`
  - Class: `P2 signal`
  - Reason: external prospect post without direct contact yet
  - Constraint: only `platform in {nextdoor,facebook}`, known author, known service, `scope=GREEN`, `priority in {hot,warm}`, `comments_count < 20`

## Suppression rules

- Never label hunter activity as `lead` before direct contact exists
- Never send test or unknown-author hunter posts to Telegram
- Never send duplicate watchdog alerts for the same unresolved digest inside 24h
- Never send informational daily/weekly digests from more than one scheduler by default

## Audit requirement

For any sender that remains active:

- message path must use `lib/telegram/send.js` directly or through `scripts/send-telegram.mjs`
- `source` must be explicit
- `extra.category` must be explicit
- `extra.actionable` must be explicit

## Known legacy exceptions

These still exist in the repo and should not be treated as current production contract unless explicitly reactivated:

- `scripts/daily_sales_pulse.py`
- `scripts/openclaw_health_monitor.py`
- `scripts/autonomous_watchdog.py`
- `scripts/quote_draft.py`
- `scripts/sprint1-autopilot.mjs`
