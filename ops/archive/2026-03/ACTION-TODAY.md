# ACTION TODAY — 2026-04-17

**Reality:** 0 real leads last 7 days. Ads still running. Need to flip lead flow on TODAY.

## PRIORITY 1 — Review harvest (30 min, free, compounds forever)
20 past customers completed jobs (Feb-Mar 2026), zero Google reviews yet.
File: `.secrets/review-batch/sms_batch.txt` — ready-to-paste SMS for each.
**Send 5 per day**, 15-min cadence, from your phone (iMessage or WhatsApp).
Target: **5 new Google reviews in 7 days** → GBP map rank lifts → organic calls.

## PRIORITY 2 — Craigslist post (15 min, $5, immediate traffic)
File: `ops/reports/2026-04-16-full-audit/SMM-BLAST/CL-01-TV-MOUNTING.md` (ready)
Post today. LA Craigslist drives 2-5 text-in leads per post.
Repost every 48h. Rotate headline every 2 weeks.

## PRIORITY 3 — Nextdoor Business Page post (10 min, free, local trust)
File: `ops/reports/2026-04-16-full-audit/SMM-BLAST/ND-01-SAME-DAY.md` (ready)
Post as Business Page (not personal). Target Hollywood, WeHo, Silver Lake.
Include 1 before/after photo from `/gallery`.

## PRIORITY 4 — Google Ads audit (15 min, prevent wasted spend)
Check these 5 things in Google Ads (637-606-8452):
- Active AGs: AG2 TV / AG3 Furniture / AG4 Drywall only
- Budget ≤ $6.40/day
- Search top IS ≥ 20% (last 7 days) — if lower, bids too low
- Lost IS (rank) < 70% — if higher, raise Max CPC by $0.25 (ceiling $4.00)
- 0 policy violations in Policy Manager

## PRIORITY 5 — Facebook Page post (15 min, free)
File: `ops/reports/2026-04-16-full-audit/SMM-BLAST/FB-01-OFFER-CARD.md` (ready)
Post as Page. Pin to top. Reply to every comment within 1h.

---

## WHAT I (CLAUDE) AM DOING AUTOMATICALLY

- ✅ Monitoring every 30 min (URL audit, /api/health, Telegram dashboard)
- ✅ Daily sales pulse at 08:57 — you already got today's (0 leads warning)
- ✅ Weekly regression test Mondays
- ✅ Vercel crons (outbox retry + watchdog)

## WHAT I CANNOT DO WITHOUT YOU (YET)

- Send SMS (no Twilio credentials on file)
- Publish to Craigslist/Nextdoor/Facebook/GBP (no API or session saved)
- Change Google Ads bids/keywords (no Ads API creds)
- Set Vercel env vars (no VERCEL_TOKEN yet)

## WHAT UNLOCKS IF YOU DROP ONE TOKEN

| Token | Unlocks | Time to add |
|---|---|---|
| `VERCEL_TOKEN` in `.env.local` | I set env vars + trigger redeploys | 30 sec |
| Google Ads OAuth (dev token + refresh) | I run Ads reports, push negatives, tweak bids | 15 min |
| Twilio SID/token | I send SMS review-requests myself | 5 min |

Full instructions in `ops/AUTONOMOUS-RUNBOOK.md`.
