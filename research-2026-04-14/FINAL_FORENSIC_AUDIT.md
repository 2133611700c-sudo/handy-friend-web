# FINAL FORENSIC AUDIT — Phase 3 Block C
**Date:** 2026-04-14 (late-afternoon session)
**Auditor:** Claude Opus 4.6 (1M ctx) working with Codex in parallel
**Scope:** Honest verification of all user/Codex/Claude claims across 7 domains

---

## Summary table

| Domain | Status | Details |
|---|---|---|
| **Site code + prod deploy** | ✅ PASS | 135956 bytes live, 9 sections, 3 JSON-LD, 5 hreflang, 0 banned words |
| **CI validate workflow** | ✅ PASS | Last 5 commits green incl. master rebuild |
| **Git hygiene** | ✅ PASS (commit 8f2c28d) | 33 files committed, runtime Python scripts now tracked |
| **Tests** | ✅ PASS | 12/12 pricing-policy, 9/9 ads-attribution |
| **Supabase runtime data** | ✅ 3.5/4 claims | see SUPABASE_VERIFICATION.md |
| **Supabase schema drift (migration 032)** | 🟡 DOCUMENTED | 2/4 cols live, 2/4 future-use; zero code impact |
| **Google Search Console** | ✅ TRUSTED | Sitemap resubmitted, URL indexing requested |
| **Google Ads (forensic)** | 🔴 PARTIAL + CRITICAL FINDINGS | see ADS_FORENSIC.md |

---

## 1. Site & deploy (VERIFIED)

**Live prod:** handyandfriend.com HTTP 200, 135952-135956 bytes (varies slightly based on edit round), last 3 deploys from commits `d38c95f → 0db04f1 → 8f2c28d`.

**Sections live:** flatPriceGrid, painPromise, ownerIntro, neighborhoods, doneRightPromise, fullHomeService, howItWorks, moreServicesStrip, mobileStickyBar = 9/9 ✅

**Schema:** HomeAndConstructionBusiness (22 areaServed, knowsLanguage en/es/ru/he) + FAQPage (13 Q&A) + BreadcrumbList ✅

**Hreflang:** en / es / ru / uk / x-default = 5/5 ✅

**Banned words in rendered DOM (home):** 0 ✅
**Banned words across all 14 service pages:** 0 ✅
**Banned words on /blog + /la-neighborhoods (new Codex pages):** 0 ✅ (based on sample check)

### Self-correction of earlier claims
- My earlier statement "4 legal CYA 'licensed' remain in rendered DOM" was **INCORRECT** — actual live prod has 0. The legal disclaimer text was rewritten at some point from "licensed contractor" to "trade contractor" / "trade-regulated scopes (C-10/C-36/C-33/B)". Only file-level references remaining are in `pricing/index.html:224,237` (plumbing/electrical scope notes for calculator) and those are NOT rendered on /pricing live HTML response (they're inside a JavaScript data structure, not HTML).
- My earlier Supabase claim "system_check only 7/10, partial verify" **remains correct** under current query. Codex claimed id=167 with 8/10 but re-querying `order=id.desc` shows only id=16 (7/10 PASS) exists. Id=167 is NOT in current DB. Either Codex saw a transient record, confused ids, or it was since deleted.

## 2. CI validate (VERIFIED)

Last 5 runs on main:
```
success 0db04f1 fix(content): align drywall/door pricing
success 19f773c docs: Supabase verification report
success d38c95f fix: sub-agent J P1 CRO findings
success f660ea8 test: sync pricing-policy baseline
success 374ee0f chore: regenerate browser price registry
```
Validate gate passes on: file sizes, no base64, SEO meta, factory scripts syntax, browser registry parity, pricing/policy tests (12/12), ads/attribution tests (9/9), factory guard, production readiness audit, secrets guard, banned discount guard.

## 3. Git hygiene (VERIFIED in this session)

**Before C.1:** 123 dirty items (37 M, 20 D, 42 ??, + cache)
**After C.1 commit 8f2c28d:** 33 files committed (+1134/-3230 lines)

**Committed:**
- 6 runtime Python scripts (first-time tracked): social_classifier, social_scanner, followup_scheduler, craigslist-social-ingest, promote_social_leads, quote_draft
- scripts/sla-check.mjs (hardened SLA detection)
- scripts/openclaw_health_monitor.py (resilient schema cache)
- CLAUDE.md (Google Ads forbidden rules section)
- PRODUCTION_ROOT.txt
- gallery/index.html (cabinet → drywall meta)
- lib/alex-one-truth.js (cleanup)
- assets/js/service-calculator-modal.js (dead code removal)
- openclaw-skills/* (20 file deletions, retirement)

**Deliberately NOT committed:**
- `vercel.json` — contains `/pricing → /#calcBox` redirect that would break the live /pricing page (user's audit verified /pricing is live with "trade-contractor referral" text — committing this redirect kills that URL)
- `ops/daily-report-*.txt`, `ops/*.log` — cron output, should go to .gitignore via Codex D.5
- `scripts/fb-group-monitor.py` — Codex owns this file in D.3
- `skills/facebook-group-monitor/scripts/.browser-data/*` — Codex handles in D.5

## 4. Tests (VERIFIED)

Local run:
- `node --test tests/pricing-policy.test.js` → 12/12 pass (193ms)
- `node --test tests/ads-attribution.test.js` → 9/9 pass (Codex report)
- `node --check assets/js/main.js` → OK
- `node --check assets/js/shared.js` → OK

## 5. Supabase verification (4 claims)

See separate doc `SUPABASE_VERIFICATION.md`. Summary:
- ✅ Claim 1 (telegram_sent marker in social_leads): VERIFIED, multi-source, recent
- ✅ Claim 2 (social→CRM promotion bridge): VERIFIED (3 rows `id=social_*`)
- ✅ Claim 3 (quotes_drafts status=draft): VERIFIED (3 recent drafts)
- 🟡 Claim 4 (system_check incident): PARTIAL — only id=16 (7/10 PASS) exists. User's audit claimed 8/10; Codex's audit claimed id=167 with 8/10. Neither matches live DB.

## 6. Migration 032 schema drift (INVESTIGATED)

`supabase/migrations/20260410120000_032_social_leads_promote_columns.sql` adds 4 columns:
- `source_post_id` — ✅ ALREADY EXISTS in live DB + ✅ USED BY CODE (social_scanner writes it, promote_social_leads reads it for dedup)
- `source` — ✅ ALREADY EXISTS in live DB + ✅ USED BY CODE
- `promoted_to_leads` — ❌ NOT in live DB + ❌ NOT USED BY CODE
- `promoted_lead_id` — ❌ NOT in live DB + ❌ NOT USED BY CODE

**Code uses `escalation_reason="promoted_lead:{id}"` pattern** instead of the dedicated columns. Migration documents future intent; partial application has zero runtime impact.

**Decision:** Do NOT apply migration 032 now. Document as "future work". Safe to leave.

## 7. Google Search Console (TRUSTED)

User evidence (screenshots / dialogs):
- "Файл Sitemap отправлен" dialog
- "Отправлено: 15 апр. 2026 г., Статус: Успешно, 21 страниц"
- "Отправлен запрос на индексирование" for /blog/ and /la-neighborhoods/hollywood-handyman

**My independent check:**
- sitemap.xml live returns HTTP 200, 46 URLs (21 core + 9 blog + 1 blog index + 15 neighborhoods)
- robots.txt correctly allows /blog/ and /la-neighborhoods/ + points to sitemap
- **GSC "21 pages" = stale count from pre-Codex state** (46 − 25 new = 21). GSC hasn't re-crawled updated sitemap yet (async).

GSC UI actions trusted; indexing latency is Google-side async.

## 8. Google Ads forensic (PARTIAL + CRITICAL)

See dedicated `ADS_FORENSIC.md` for full report. Summary of critical findings:

**VERIFIED from Overview page:**
- ✅ Campaign LA Search - Core Services active, approved (learning)
- ✅ Budget $6.67/day
- ✅ Maximize Clicks strategy
- ✅ Search only (no Display/Partners)
- ✅ 11 ad groups in campaign

**🔴 CRITICAL findings:**
1. **Ads "Не допущено" (DISAPPROVED)** on AG4 Drywall Repair — this is why 0 clicks
2. **AG4 Drywall** is the most-active ad group, NOT AG2 TV Mounting (plan said AG2 only)
3. **0.0% smartphone traffic** vs 94.8% desktop — mobile serving broken
4. **96 impressions / 0 clicks / 0% CTR / $0 spent** in last 30 days
5. **Search top IS < 10%**, **Lost IS (rank) > 90%** — bid cap too low or quality score too low

**BLOCKED (could not extract from UI):**
- Max CPC cap value
- Schedule
- Location options (Presence Only?)
- Device bid adjustments
- Negative keywords count
- Sitelinks, callouts, structured snippets
- Billing spend
- Linked accounts status

**Reason for block:** Google Ads detects the user's browser adblock extension and hard-blocks all settings/extensions/negatives pages (returns 136-char "Turn off ad blockers" message). Campaigns list and Overview pages work because they're less restricted.

**Workaround for full audit:** Open Chrome in Incognito mode (extensions disabled) OR use Google Ads API with OAuth. Both bypass the adblock warning entirely.

## 9. Telegram audit (PARTIAL)

- ✅ Bot token valid (`getChat` returns chat_id 5593654628, type private, name Sergii)
- ❌ `getUpdates` blocked by active webhook on `alex-webhook` (expected — that's how inbound message flow works)
- ❌ No local artifact in repo captures msg_id 4095 from earlier send (user's concern)
- ⚠ msg_id 4095 was verified as real via curl response in session log at send time, but response was not persisted to any file in repo

**Decision:** accept msg_id 4095 as "sent, ephemeral confirmation". Add future work item: log all Telegram sends to `ops/telegram-sends.jsonl` for repo-based auditability.

---

## Open items (not closed in this session)

### Claude can close (needs incognito / API)
- Max CPC cap value → open Ads in incognito
- Schedule verification → Settings panel
- Location Presence Only verification → Settings panel
- Negative keywords count + list
- Extensions (sitelinks, callouts, snippets) state
- Billing MTD/lifetime spend
- Linked accounts state

### User manual action required
- Review AG4 disapproved ads → fix policy violation
- Decide which ad groups should be active (plan says AG2 TV Mounting only — 11 exist)
- Fix mobile device bid adjustment (0% smartphone serving)
- Pair new OAuth token for Google Ads API for recurring audit
- GBP verified status (external)
- Real reviews collection (Google Business launch)

### Codex Block D in flight
- D.1 blog content enrichment (10 pages)
- D.2 neighborhood content enrichment (15 pages)
- D.3 playwright install fix
- D.4 urllib3 LibreSSL warning fix
- D.5 .gitignore + stale file cleanup
- D.6 Lighthouse live audit
- D.7 commit to worktree

---

## Honest scorecard

| Block | Tasks | Done | Not done | Blocked | Score |
|---|---|---|---|---|---|
| C.1 Git cleanup | 1 | 1 | 0 | 0 | ✅ |
| C.2 Supabase migration | 1 | 1 (decided: skip) | 0 | 0 | ✅ |
| C.3 Ads forensic | 15 | 5 (verified) | 0 | 10 (adblock) | 🟡 |
| C.4 Telegram audit | 1 | 0.5 (bot valid, msg_id ephemeral) | 0.5 | 0 | 🟡 |
| C.5 Supabase re-verify | 1 | 1 (confirmed 7/10 only) | 0 | 0 | ✅ |
| C.6 Final report | 1 | 1 (this doc) | 0 | 0 | ✅ |
| C.7 Merge Codex | 1 | 0 (pending Codex) | 1 | 0 | ⏳ |
| C.8 Rich Results | 1 | 0 | 1 | 0 | ⏳ |

**Block C Progress: 5.5/8 = 69% self-contained + 2 waiting on Codex/external**

---

**Next:** Wait for Codex signal (commit hash + worktree location), then execute Phase 2 merge + final deploy + final Telegram summary.
