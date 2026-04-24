# Remediation Report — 2026-03-09

## Executive Summary

Full-stack remediation of Handy & Friend lead pipeline, analytics, and marketing systems.
8 priorities executed. 3 files modified in codebase, 1 new SQL migration, 2 new ops documents, 1 post batch generated.

**Critical finding**: 74 of 79 leads were test data. Real leads: 5. Revenue $3,425 exists but was disconnected from pipeline. All fixes preserve production stability.

---

## Changes Made

### 1. Contact Scripts (DONE)
- **File**: `ops/contact-scripts-2026-03-09.md`
- Generated SMS + call scripts for:
  - Sandra Kirby (575-805-0706) — Art & Mirror Hanging, $95
  - Unknown (310-663-5792) — Cabinet Painting, from $75/door
- Scripts in English + Russian
- Follow-up rules: Day 0 SMS → 2h call → Day 1 SMS → Day 3 final call

### 2. Form Deduplication Fix (DONE)
**Root cause**: Sandra Kirby clicked submit 4 times in ~1 second. All 4 `fetch()` calls fired simultaneously. `findDuplicate()` checked for existing leads, found none (no lead inserted yet), created 4 duplicates.

**Fix — 3 layers of protection:**

| Layer | File | Change |
|-------|------|--------|
| Frontend debounce | `index.html` line 878 | Button disabled + opacity 0.6 on first click. Re-enabled only on error. |
| Idempotency key | `index.html` line 883 | `crypto.randomUUID()` generated per click, sent in POST body |
| Rapid-fire guard | `lib/lead-pipeline.js` line 422 | Priority 0 check: same phone within 60 seconds → return existing lead |
| Event tracking | `api/submit-lead.js` line 183 | `request_id` logged in `form_submission` event payload |

**Verification after deploy:**
```bash
# Submit test form twice rapidly (should only create 1 lead)
# Check Supabase: select count(*) from leads where phone = 'TEST_PHONE';
```

### 3. Pipeline Usage Fix (DONE)
**File**: `supabase/sql/014_fix_dashboard_and_jobs_link.sql`

**3a. Link historical jobs to leads:**
- Matches `jobs.customer_phone` to `leads.phone` (digits only)
- Filters: non-test leads, phone >= 10 digits, date within 30 days
- Updates matched leads: `stage='closed'`, `outcome='won'`, `won_amount=job.total_amount`

**3b. Stage workflow helper:**
- `advance_lead_stage(lead_id, new_stage, metadata)` — safe forward-only transitions
- Prevents backward stage movement
- Auto-timestamps: `contacted_at`, `qualified_at`, `quoted_at`, `closed_at`
- Logs `stage_change` event in `lead_events`

**Verification:**
```sql
-- Run in Supabase SQL Editor:
-- Check jobs linked to leads
SELECT count(*) FILTER (WHERE lead_id IS NOT NULL) AS linked,
       count(*) FILTER (WHERE lead_id IS NULL) AS unlinked
FROM jobs;

-- Test stage advancement
SELECT advance_lead_stage('LEAD_ID_HERE', 'contacted', '{"via": "phone"}'::jsonb);
```

### 4. Analytics Consistency Fix (DONE)
**File**: `supabase/sql/014_fix_dashboard_and_jobs_link.sql`

Updated `dashboard_stats()` function:
- All lead counts now filter `is_test = false`
- Added `leads_total_all` (for diagnostic comparison)
- Added `test_leads_count` (visible in stats)
- `stale_leads` only counts real leads
- `conversion_rate` only counts real leads
- `revenue` / `avg_deal_size` / `pipeline_value` filter test leads

**Verification:**
```sql
SELECT dashboard_stats(30);
-- Check: leads_total should be ~5 (not 79)
-- Check: test_leads_count should be ~74
```

### 5. Resend Integration Prepared (DONE)
- **File**: `api/submit-lead.js` — Added `sendCustomerAutoResponder()` function
- Auto-responder sends customer confirmation email after form submission
- Only activates when `RESEND_API_KEY` env var is set
- **Setup guide**: `ops/resend-setup-2026-03-09.md`
- **Status**: Code ready, needs API key + domain verification

### 6. Trust Signals Fix (DONE)
- **File**: `index.html`
- Removed fake `aggregateRating` from JSON-LD schema (was "5.0, 12 reviews")
- Removed fake "4.9" badge from testimonials section header
- Added HTML comment marking review cards as placeholders to replace
- Review cards kept for UX but schema no longer makes false claims to Google

### 7. Content Posts Generated (DONE)
- **File**: `ops/posts-batch-2026-03-09.md`
- 8 posts: 3 Nextdoor + 3 Facebook + 2 Craigslist
- Week C rotation: Renovation (Flooring + Painting + Baseboards)
- All prices pulled from live `price-registry.js`
- Includes tracking tags: `ND-20260309-01` through `CL-20260309-02`

---

## Files Modified

| File | Type | Lines Changed |
|------|------|---------------|
| `index.html` | Modified | +15 lines (dedup + schema fix) |
| `api/submit-lead.js` | Modified | +65 lines (requestId + auto-responder) |
| `lib/lead-pipeline.js` | Modified | +14 lines (rapid-fire guard) |
| `supabase/sql/014_fix_dashboard_and_jobs_link.sql` | New | 155 lines |
| `ops/contact-scripts-2026-03-09.md` | New | 70 lines |
| `ops/resend-setup-2026-03-09.md` | New | 55 lines |
| `ops/posts-batch-2026-03-09.md` | New | ~200 lines |
| `ops/remediation-2026-03-09.md` | New | This file |

---

## Deployment Order

### Step 1: Run SQL migration (Supabase)
1. Open Supabase SQL Editor
2. Paste contents of `supabase/sql/014_fix_dashboard_and_jobs_link.sql`
3. Run → verify output shows linked jobs count

### Step 2: Deploy code changes
```bash
cd ~/handy-friend-landing-v6
npx vercel deploy --yes
# Smoke test the preview URL
curl -s "https://PREVIEW_URL/api/health" | head -20
# Then promote to production
npx vercel --prod --yes
```

### Step 3: Verify
```bash
# Health check
curl -s "https://handyandfriend.com/api/health" | python3 -m json.tool | head -5

# Stats check (replace SECRET with first 16 chars of SUPABASE_SERVICE_ROLE_KEY)
curl -s "https://handyandfriend.com/api/health?type=stats&key=SECRET&days=7" | python3 -m json.tool | grep leads_total
# Expected: leads_total ~5 (not 79)
```

---

## 7-Day Playbook

### Day 0 (Today — March 9)
- [x] Contact Sandra Kirby: send SMS, wait 2h, call if no reply
- [x] Contact 310-663-5792: send SMS (English + Russian)
- [ ] **ACTION**: Run migration 014 in Supabase SQL Editor
- [ ] **ACTION**: Deploy code changes to Vercel
- [ ] **ACTION**: Publish 2 Nextdoor posts (ND-01 proof of work, ND-03 tip)

### Day 1 (March 10)
- [ ] If Sandra no reply: send follow-up SMS "Just checking in..."
- [ ] If 310 no reply: send follow-up SMS
- [ ] Publish 1 Facebook post (FB-01 social proof + attach before/after photos)
- [ ] Publish 1 Craigslist post (CL-01 focused service)
- [ ] Verify dashboard_stats shows correct numbers after migration

### Day 2 (March 11)
- [ ] Publish 1 Nextdoor post (ND-02 combo offer)
- [ ] Publish 1 Facebook post (FB-02 service spotlight)
- [ ] If any lead responded → update stage to `contacted` in Supabase:
  ```sql
  SELECT advance_lead_stage('LEAD_ID', 'contacted', '{"via": "sms"}'::jsonb);
  ```

### Day 3 (March 12)
- [ ] Final call attempt for Sandra Kirby (if no response)
- [ ] Final call attempt for 310-663-5792
- [ ] If no response → mark as lost:
  ```sql
  UPDATE leads SET stage='closed', outcome='lost', lost_reason='no_response'
  WHERE phone IN ('5758050706', '3106635792') AND is_test = false;
  ```
- [ ] Publish 1 Facebook post (FB-03 seasonal)
- [ ] Publish 1 Craigslist post (CL-02 combo)

### Day 4-5 (March 13-14)
- [ ] Start Resend setup (see `ops/resend-setup-2026-03-09.md`)
- [ ] Create Resend account → add domain → get DNS records
- [ ] Add DNS records at registrar
- [ ] Wait for domain verification (usually 5-60 min)
- [ ] Add `RESEND_API_KEY` to Vercel → redeploy

### Day 6-7 (March 15-16)
- [ ] Submit test lead to verify full pipeline: form → Supabase → Telegram → owner email → customer auto-responder
- [ ] Verify test lead flagged as `is_test=true` automatically
- [ ] Ask first completed-job customer for Google review (use templates from `ops/google-review-template.md`)
- [ ] Generate next week's post batch: `node ~/.codex/skills/handy-friend-marketing/scripts/generate_posts.mjs`
- [ ] Review KPIs: `curl "handyandfriend.com/api/health?type=stats&key=SECRET&days=7"`

---

## Risks & Mitigations

| Risk | Probability | Mitigation |
|------|-------------|------------|
| Migration 014 fails on production | Low | All statements are idempotent (CREATE OR REPLACE, IF NOT EXISTS) |
| Dedup too aggressive (blocks legit leads) | Very Low | 60-second window only applies to same phone; different phones unaffected |
| Resend domain verification fails | Medium | Code gracefully falls back to demo mode (Telegram still works) |
| No real leads in 7 days | Medium | Keep posting on all channels; monitor Google Ads spend |

---

## What's NOT Done (Future Work)

1. **Alex chat widget improvements** — separate scope, not blocking
2. **Google Business Profile verification** — requires manual verification with Google
3. **Real Google Reviews on site** — need actual reviews first (templates ready)
4. **Auto-scheduling for posts** — currently manual; consider Buffer/Hootsuite later
5. **SKILL.md hub router** — marketing skills exist as scripts but not wired as Claude Code skill yet
