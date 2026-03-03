# Daily KPI Log — Handy & Friend

---

## 2026-03-03 (Day 1 — Launch)

### Actions Completed Today

| # | Channel | Action | Tag | Status |
|---|---------|--------|-----|--------|
| 1 | Facebook | TV mounting proof post | `FB-20260303-01` | ✅ Published |
| 2 | Facebook | Combo offer 20% off post | `FB-20260303-02` | ✅ Published |
| 3 | Facebook | Intro/services pinned post | `FB-20260303-03` | ✅ Published |
| 4 | Nextdoor | TV mounting proof post ready | `ND-20260303-01` | 📋 Ready to post manually |
| 5 | Nextdoor | Combo offer post ready | `ND-20260303-02` | 📋 Ready to post manually |
| 6 | Craigslist | TV mounting post package | `CL-20260303-01` | 📋 Ready to post manually |
| 7 | Craigslist | Cabinet/interior painting post | `CL-20260303-02` | 📋 Ready to post manually |
| 8 | Craigslist | Furniture assembly + hanging | `CL-20260303-03` | 📋 Ready to post manually |
| 9 | Tech | alex-webhook.js fix deployed | — | ✅ Pushed to main |
| 10 | Assets | GPT image prompts Pack A/B/C | — | 📋 Ready to generate |

### KPIs to Track Today

| Metric | Target | Actual | Notes |
|--------|--------|--------|-------|
| FB posts published | 3 | 3 | ✅ |
| FB impressions | track | __ | Check in 24h |
| FB DMs received | ≥1 | __ | |
| Nextdoor posts | 2 | 0 | Manual — post today |
| CL posts | 2-3 | 0 | Manual — post today |
| Inbound calls/texts | any | __ | |
| Alex Messenger chats | any | __ | Check Supabase ai_conversations |
| Booked jobs | — | __ | |

### Stop-Loss Watch

- If zero FB engagement in 7 days → add 1 photo to each post, retry
- If zero inquiries in 14 days → pivot content to proof-of-work only
- Craigslist: if no replies after 3 posts → test headline variation

### Blockers Remaining

1. **FB_PAGE_ACCESS_TOKEN not set** — Alex cannot reply to Messenger DMs yet
   - Action needed: Create Meta app → generate Page Access Token → add to Vercel env vars
   - Guide: `ops/fb-messenger-connect.md`

2. **GPT images not yet generated** — image prompts ready at `ops/gpt-image-prompts-2026-03-03.md`
   - Action needed: Run prompts through DALL-E 3 or Midjourney, save to `/output/marketing/images/2026-03-03/`

3. **Nextdoor + Craigslist** — packages ready, require manual posting by owner
   - Posts: `ops/nextdoor-posts.md`, `ops/craigslist-post-*.md`

---

## Log Format (Future Days)

```
## YYYY-MM-DD

### Actions
| Channel | Action | Tag | Status |

### KPIs
| Metric | Target | Actual |

### Decisions
- Cut / Keep / Scale per channel
```
