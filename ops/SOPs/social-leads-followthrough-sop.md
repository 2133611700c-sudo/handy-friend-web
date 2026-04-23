# Social Leads Follow-Through SOP

**Last updated:** 2026-04-22  
**Audience:** Owner (Sergii)  
**Trigger:** HOT_SOCIAL_SIGNAL Telegram alert fires, OR daily digest shows stuck backlog > 0

---

## What is a social_leads signal?

A row in `social_leads` = someone on Nextdoor, Craigslist, or Facebook Groups posted about a home repair need. The scanner classified it HOT or WARM. **It is not a lead yet.** It becomes a lead only after you make contact and get a phone number.

---

## Step-by-Step: From Signal to Lead

### Step 1 — Triage (< 5 min after alert)

Open the Telegram HOT_SOCIAL_SIGNAL alert. It contains:
- Platform (Nextdoor / Craigslist / Facebook Group)
- Author name
- Post excerpt (first 280 chars)
- Post URL (click to view original)
- `social_id` (UUID in `social_leads` table)

**Discard immediately if:**
- Post is > 48h old (look at post timestamp, not alert time)
- Post says "already hired someone" / "found help" / "no longer needed"
- Outside LA service area (check city/zip in post)
- Not a real service category (e.g., asking for a plumber when we don't do that — verify against price-registry)

If discarding → PATCH `social_leads` status to `ignored` (see §DB Operations).

### Step 2 — Outreach (same day, < 24h)

**Nextdoor:** Reply to the post publicly or DM the author.  
Template:
```
Hi [Name]! I'm Sergii, owner of Handy & Friend — local handyman in LA.
Happy to help with [service]. What's a good number to text you a quick quote?
```

**Craigslist:** Click "Reply" on the CL post → send email via CL relay.  
Template:
```
Hi, I saw your post about [service] on Craigslist. I'm a local handyman in LA — 
I can take care of this quickly. What's your phone number? I'll call/text a quote.
```

**Facebook Group:** Comment on the post OR send a DM to the author.  
Template:
```
Hi [Name]! I do [service] in LA. Happy to help. DM me or text [phone].
```

### Step 3 — Got Their Phone

Once you have a phone number:
1. Call or text within 30 minutes (while intent is hot)
2. Get: service details, address/zip, preferred timing
3. Give quote verbally or via text
4. **Create lead in Supabase** (see §DB Operations)
5. **PATCH social_lead** status to `contacted` + set `last_action_at=now()`

### Step 4 — No Response After 48h

If outreach was sent and no response in 48h:
- PATCH social_lead status to `ignored`
- Move on — do not chase

---

## DB Operations

### PATCH social_lead status

```
Supabase → Table Editor → social_leads → find by id → Edit row
  status: "reviewed" | "contacted" | "ignored"
  last_action_at: <now>
```

Or via REST:
```bash
curl -X PATCH \
  "${SUPABASE_URL}/rest/v1/social_leads?id=eq.<social_id>" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"status": "contacted", "last_action_at": "2026-04-22T15:00:00Z"}'
```

### Create real lead from social signal

```
Supabase → Table Editor → leads → Insert row:
  full_name:    "<name>"
  phone:        "<phone>"
  source:       "<platform>"   # "nextdoor" | "craigslist" | "facebook"
  service_type: "<service>"
  status:       "new"
  stage:        "new"
  is_test:      false
  notes:        "From social_lead id=<social_id>"
```

---

## Stuck Backlog

The watchdog and daily digest both flag HOT/WARM signals that stay in `status=new` > 24h.

**Goal:** Zero stuck HOT/WARM signals at end of each day.

**Priority order:**
1. HOT signals < 6h old → immediate outreach
2. HOT signals 6-24h old → outreach today
3. WARM signals < 24h → outreach today if capacity
4. WARM signals > 24h → mark `ignored` if you can't get to them

**View stuck backlog:**
```
Supabase → Table Editor → social_leads
Filter: status = new, intent_type in (HOT, WARM)
Sort: created_at ascending (oldest first)
```

---

## Signal vs Pre-Lead vs Lead — Decision Tree

```
Inbound signal arrives
│
├── Via social scanner (social_leads row created, HOT_SOCIAL_SIGNAL alert)
│   │
│   └── Owner outreach → phone obtained → manual leads INSERT → social_leads PATCH contacted
│
├── Via Messenger (3+ turns, no phone)
│   │
│   └── PRE_LEAD_REVIEW alert → owner replies in Messenger → phone obtained → lead auto-updates
│       OR owner creates lead manually if Messenger conversation stalls
│
└── Via website form → fully automated, no owner action needed at capture stage
```

---

## SLA Targets

| Signal type | Target response | Max acceptable |
|---|---|---|
| HOT (Nextdoor/CL/FB Group) | < 4h | 24h |
| WARM | < 24h | 48h |
| FB Messenger pre-lead | < 2h (check inbox) | 12h |
| Nextdoor inbox DM | < 24h | 48h |
| Meta Page inbox | < 4h | 24h |
