# Handy & Friend Business Operating Plan

Date: 2026-04-19
Owner: Sergii
Role for Codex: operator, auditor, and execution agent

## 1. Purpose

This plan exists to stop vague work. Handy & Friend needs a small, measurable local-service machine:

- paid and organic traffic creates real customer conversations;
- real conversations become leads with phone numbers;
- leads reach the owner fast;
- booked jobs create revenue and reviews;
- reports fire only when there is a real signal or real failure.

No fake wins. No "system green" when revenue is zero. No Telegram noise from candidates, tests, reports, or scanner guesses.

## 2. Current Verified Baseline

Verified live on 2026-04-19 from Supabase and production health endpoints:

- Real leads last 7 days: 4
- Real leads last 30 days: 4
- Website chat real leads in last 7 days: 3
- Social candidates last 7 days: 25
- Telegram proof rows last 7 days: 6
- Telegram failures last 7 days: 0
- Leads without Telegram proof last 7 days: 1
- Outbox queue depth: 0
- Outbox DLQ total: 0
- Telegram webhook pending updates: 0
- AI conversation rows last 7 days: 186

Known last Ads baseline from repo notes, not freshly verified through Ads UI/API:

- 30-day Ads baseline referenced in repo: 174 impressions, 6 clicks, CTR 3.07%, CPC $3.86, spend $23.12
- Current live Google Ads metrics are UNKNOWN until Ads UI/API snapshot is collected.

## 3. Business Model Assumptions

Handy & Friend is one local home-service product in Los Angeles, operated by one field worker, Vanya.

Core sellable services:

- TV mounting
- Furniture assembly
- Drywall repair

Operating rules:

- Labor-only pricing unless explicitly documented otherwise.
- Customer provides materials.
- No general contractor claims.
- No "licensed", "certified", "#1", "best", or fake guarantee language.
- Ads budget cap: about $200/month unless Sergii explicitly changes it.

## 4. Source Of Truth Metrics

Every business decision must be tied to one of these metrics.

Traffic:

- Google Ads impressions
- Google Ads clicks
- CTR
- CPC
- Search terms
- Search top IS
- Lost IS rank
- Lost IS budget

Site and chat:

- page views by landing page
- chat widget opens
- first chat messages
- phone captured
- quote shown
- lead created

Lead quality:

- real leads
- test leads
- social candidates
- rejected candidates
- leads with valid phone
- leads without Telegram proof

Sales:

- contacted leads
- quote sent
- booked jobs
- completed jobs
- revenue
- average job value
- close rate
- time to first owner action

Trust:

- completed jobs with review request sent
- Google reviews count
- average rating
- before/after assets captured

Noise control:

- Telegram sends by source
- Telegram sends without business event
- repeated identical alerts
- reports sent with zero signal

## 5. Decision Rules

Traffic rules:

- If impressions are low, inspect budget, location, keywords, Search IS, and disapprovals.
- If impressions exist but CTR is below 3%, inspect search terms and ad relevance.
- If clicks exist but leads are zero, inspect landing page, chat capture, phone CTA, and tracking.
- If leads exist but jobs are zero, inspect response speed, quote quality, follow-up, and pricing.

Telegram rules:

- Real customer lead with phone: Telegram allowed.
- Social candidate: no Telegram until human review or explicit approval.
- Test/probe/e2e: no owner Telegram unless manually requested.
- System report: no Telegram unless critical and actionable.
- Daily report: no Telegram unless leads, revenue, jobs, stale real leads, or critical warning exists.

Social scanner rules:

- Scanner writes candidates only.
- Scanner never decides something is a real lead.
- Job posts, vendor offers, non-LA posts, and other trades are rejected before Telegram.

Report rules:

- A report without action is noise.
- A "green" report is allowed only if it proves business health, not just technical uptime.
- If no signal exists, write local artifact only or stay silent.

## 6. Operating Prompt For Codex

Use this prompt when continuing Handy & Friend work:

```text
You are Codex acting as the operating agent for Handy & Friend.

Your job is not to produce optimistic reports. Your job is to build and verify a local-service revenue machine.

Business:
- Handy & Friend, Los Angeles home services.
- Core product: TV mounting, furniture assembly, drywall repair.
- One field worker: Vanya.
- Labor-only. Customer provides materials.
- Budget discipline: Google Ads about $200/month unless Sergii changes it.

Primary goal:
- Generate real booked jobs and reviews, not fake leads or dashboard activity.

Current verified baseline as of 2026-04-19:
- real_leads_7d = 4
- real_leads_30d = 4
- social_candidates_7d = 25
- telegram_sends_7d = 6
- leads_without_telegram_proof_7d = 1
- outbox_queue_depth = 0
- telegram_pending_updates = 0
- ai_conversations_7d = 186
- current Google Ads UI metrics = UNKNOWN until verified live

Rules:
- Never say PASS without evidence.
- Separate FACT, UNKNOWN, and ACTION.
- Never count social candidates as real leads.
- Never count tests/probes as business success.
- Never send Telegram for reports with no actionable signal.
- Every Telegram owner alert must map to a real business event and preferably a telegram_sends row.
- If Google Ads data is not visible live, mark it UNKNOWN.
- If a system works only synthetically, call it SYNTHETIC, not production-ready.

Execution order:
1. Verify current metrics from Supabase, health endpoints, and Ads UI/API if available.
2. Identify the single current bottleneck.
3. Fix only that bottleneck.
4. Verify with code proof, live endpoint proof, and DB proof.
5. Update the operating plan only if the baseline changes.

Do not:
- invent metrics;
- write broad strategy without numbers;
- optimize copy before knowing traffic and conversion;
- create new reports before removing false reports;
- expand channels before one channel produces booked jobs.
```

## 7. Next Build Sequence

Phase 1: Telegram truth

- Move all production Telegram sends through one sender.
- Every owner alert writes a proof row.
- Remove or gate every direct `api.telegram.org/sendMessage` path.
- Acceptance: grep proves no raw send paths outside approved sender except Telegram webhook replies and setup scripts.

Phase 2: Lead truth

- Create a strict distinction between `real_lead`, `social_candidate`, `test`, `probe`, and `system_alert`.
- Exclude tests/probes/social candidates from business metrics.
- Acceptance: dashboard returns counts by channel and test flag.

Phase 3: Funnel truth

- Track landing page -> chat open -> first message -> phone captured -> lead created.
- Acceptance: each step has a count for last 7 days.

Phase 4: Ads truth

- Collect live Google Ads snapshot.
- Required: impressions, clicks, spend, CTR, CPC, conversions, Search IS, Lost IS rank, Search terms, disapprovals.
- Acceptance: no Ads recommendation without snapshot.

Phase 5: Sales truth

- For every real lead, track owner action: called, texted, quote sent, booked, lost.
- Acceptance: no lead stays `new` without reason.

Phase 6: Review engine

- After completed job, send review request.
- Acceptance: completed job without review request is an exception.

## 8. Weekly Success Criteria

Week is good only if at least one of these is true:

- booked job count increased;
- completed revenue increased;
- review count increased;
- verified conversion rate improved;
- a proven bottleneck was removed and measured.

Week is not good if the only progress is:

- more reports;
- more candidates;
- more test passes;
- more synthetic Telegram sends;
- more scripts that do not change revenue path.

## 9. Immediate Bottlenecks

- Google Ads live metrics are still UNKNOWN.
- Lead stages show 4 real leads still `new`; owner-action tracking is weak.
- Social candidates exist but are not a revenue channel until review/approval is disciplined.
- AI conversation volume exists, but phone-capture and booking conversion need precise funnel proof.
- Telegram proof is better, but full sender unification is not complete yet.

## 10. Next Action

The next engineering block should be Telegram truth:

- audit every remaining raw Telegram send;
- migrate legitimate sends to the unified sender;
- hard-gate noise;
- verify through grep, DB, and live health endpoint.

The next business block should be Ads truth:

- open Google Ads UI/API;
- collect snapshot;
- decide if the bottleneck is traffic volume, search terms, CTR, landing conversion, or sales follow-up.
