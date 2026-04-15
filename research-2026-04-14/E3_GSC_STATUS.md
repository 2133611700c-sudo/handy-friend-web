# E.3 — GSC Re-Crawl Ping + URL Inspection Status
**Date:** 2026-04-15
**Author:** Claude Opus 4.6 (Phase 4 Block E.3)
**Scope:** What Claude could automate for GSC, what still requires user action

---

## TL;DR

**Claude did:**
- ✅ Verified prod sitemap healthy (46 URLs, 8490b, HTTP 200)
- ✅ Verified robots.txt healthy (HTTP 200)
- ✅ Warmed edge cache for all 46 sitemap URLs via Googlebot UA
- ✅ Confirmed every URL returns 200 with real content (no thin pages, no redirects)

**Claude could NOT:**
- ❌ Trigger GSC re-crawl automatically — legacy Google sitemap ping endpoint returns **404** (deprecated 2023-06-26)
- ❌ Submit URLs via Indexing API — no OAuth credentials paired

**User action still required (manual, GSC UI):**
- Resubmit sitemap in GSC → Sitemaps → Paste `sitemap.xml` → Submit (again, to refresh the stale "21 pages" count)
- URL Inspection tool → Test Live URL for at least 3–5 of the new blog/neighborhood pages → Request Indexing

---

## Details

### 1. Legacy sitemap ping endpoints — all dead

| Endpoint | Status | Notes |
|---|---|---|
| `https://www.google.com/ping?sitemap=...` | **404** | Deprecated 2023-06-26 by Google ([announcement](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping)). Google no longer processes these. |
| `https://www.bing.com/ping?sitemap=...` | **410 Gone** | Bing deprecated its ping endpoint as well. |
| `https://yandex.com/indexnow?...` | not tested | IndexNow is a push protocol, needs a site-level API key file; not a priority right now. |

**Consequence:** There is no 2026-era "just hit a URL and the search engine will re-crawl" path. Crawl refreshes happen when:
1. User resubmits in search console UI (asynchronous trigger)
2. Code calls Indexing API with OAuth (requires paired credentials)
3. Search engine's own crawler revisits on its normal schedule (days to weeks)

### 2. Sitemap + content verification

```
sitemap.xml        → 200, 8490 bytes
robots.txt         → 200
```

All 46 sitemap URLs warmed with Googlebot UA, full response body captured. Every URL returns HTTP 200 with real content:

| URL class | Count | Size range | Health |
|---|---|---|---|
| Home / core / pricing / services | 2 | 96–136 KB | ✅ |
| Service pages (14) | 14 | 8–20 KB | ✅ |
| Blog posts (9) | 9 | 8.2–8.9 KB | ✅ (all enriched to ≥8 KB by Codex Block D) |
| Blog index | 1 | 6.4 KB | ✅ |
| Neighborhood pages (15) | 15 | 7.0–7.3 KB | ✅ (all enriched to ≥7 KB by Codex Block D) |
| **Total** | **41 URLs** (from the 46-entry sitemap; 5 entries are privacy/terms/gallery/reviews/book which are also live) | all 200 | ✅ |

Edge cache is now warm across the sitemap. When Googlebot arrives, every response is instantaneous from the CDN.

### 3. GSC UI state (from user evidence 2026-04-14)

The user already performed these GSC actions yesterday:
- **Sitemap submitted:** "Файл Sitemap отправлен" dialog confirmed
- **Status:** "Успешно, 21 страниц" — but 21 is the **stale pre-enrichment count**. The actual sitemap now has 46 URLs.
- **URL Inspection requests:** `/blog/` and `/la-neighborhoods/hollywood-handyman` indexing requests already sent
- **GSC-side processing latency:** Google takes hours-to-days to re-crawl a sitemap even after explicit resubmission

### 4. Why it still shows "21 pages" in GSC

GSC's "pages" count in the Sitemaps panel reflects **Google's last successful parse of the sitemap URL**, not the current content at that URL. The current sitemap has 46 `<loc>` entries, but Google hasn't parsed it again since the enrichment deploy. This will update automatically on the next sitemap crawl (typically within 1–3 days of the previous crawl) or sooner if the user resubmits via the UI.

### 5. What would actually accelerate crawl

| Action | Claude can automate? | Owner can do now? |
|---|---|---|
| GSC sitemap resubmit | ❌ no (no OAuth) | ✅ 1-click in UI |
| GSC URL inspection → Request Indexing | ❌ no (no OAuth) | ✅ per-URL in UI |
| Indexing API `urlNotifications:publish` | ⚠️ yes if user pairs OAuth token | ✅ once credentials exist |
| External link building (Reddit/Nextdoor/FB posts pointing to new URLs) | indirect — the content is up, owner can share | ✅ social posting workflow |

---

## Recommendation

**Short-term (today):** Owner spends 5 minutes in GSC:
1. Go to Sitemaps → click `sitemap.xml` → Submit again
2. URL Inspection → paste `https://handyandfriend.com/blog/how-much-does-a-handyman-cost-in-la` → Test Live URL → Request Indexing
3. Repeat step 2 for 2–3 more high-value blog posts and 2–3 neighborhood pages

**Medium-term (this week):** Pair a Google OAuth token scoped to `https://www.googleapis.com/auth/indexing` so future batches (e.g., after a content refresh) can push URLs via `urlNotifications:publish` without UI clicks. Store in Vercel env as `GOOGLE_INDEXING_API_TOKEN`.

**Long-term:** Nothing to chase. Google's crawl cadence is reliable for sites that return 200 with healthy content, and our sitemap + hreflang + JSON-LD are all in place.

---

## Block E.3 verdict

✅ **Complete on Claude's side.** All automatable work is done. The remaining GSC actions require user credentials Claude does not hold, and those actions are already captured in the Phase 3 user-task list.
