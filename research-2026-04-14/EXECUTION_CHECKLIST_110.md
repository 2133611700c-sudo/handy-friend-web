# EXECUTION CHECKLIST — 110% Readiness
**Mode:** Autonomous execution, no questions asked. User override: `делай всё пока не будет сделано`.

## Tasks (ordered)

### Phase 1 — DEPLOY PREVIEW (immediate)
- [ ] `npx vercel deploy --yes` → get preview URL
- [ ] Smoke test: curl 200 OK, health check

### Phase 2 — EXTERNAL AUDIT (parallel, 5 sources)
- [ ] Sub-agent A: Run Lighthouse mobile + desktop, report scores
- [ ] Sub-agent B: Schema.org validator check (all 3 JSON-LD blocks)
- [ ] Sub-agent C: Google Rich Results Test on preview URL (fetch via WebFetch)
- [ ] Sub-agent D: "Fresh eyes" full LP audit — CRO + banned words + mobile UX
- [ ] Browser: ChatGPT "Give me 30 specific issues found on this page" (preview URL)
- [ ] Browser: Perplexity "Audit this LA handyman landing page for 2026 CRO best practices"
- [ ] Browser: Gemini same prompt

### Phase 3 — GOOGLE ADS UPDATE (parallel via Claude in Chrome)
- [ ] Lower Max CPC AG2 TV Mounting: $7 → $4.50
- [ ] Verify final URL = `/tv-mounting/`
- [ ] Add 6 new sitelinks (from sub-agent research)
- [ ] Add 8 callouts
- [ ] Add 3 structured snippet groups
- [ ] Add 20 new LA-specific negative keywords
- [ ] Verify Location = Presence only (LA)
- [ ] Verify schedule = Mon-Sat 8am-9pm
- [ ] Verify no auto-recommendations
- [ ] Screenshot final state

### Phase 4 — FIX ISSUES (from Phase 2)
- [ ] Address every P1 + P2 issue from the 5 external audits
- [ ] Re-run smoke test

### Phase 5 — DEPLOY PROD
- [ ] `npx vercel --prod --yes`
- [ ] `curl https://handyandfriend.com/api/health`
- [ ] Verify schema.org markup on live
- [ ] Verify GA4 receiving events (test click_call, click_whatsapp, form_submit)
- [ ] Telegram report with msg_id

### Phase 6 — POST-DEPLOY VERIFICATION
- [ ] Google Search Console — submit updated sitemap
- [ ] Google Search Console — URL Inspection on index.html
- [ ] Google Business Profile — verify no changes needed (or note what user should update)
- [ ] Bing Places — verify NAP consistency
- [ ] Telegram final summary with all delivered items

## Potential blocks + mitigations

| Risk | Mitigation |
|---|---|
| Vercel preview build fails | Read build logs, fix, retry |
| Schema.org validator errors | Fix JSON-LD, redeploy |
| Mobile viewport issues | Quick CSS fixes, redeploy |
| Google Ads UI broken (login expired) | Report to user, continue other tasks |
| Sub-agent returns opinions not data | Ignore opinions, extract facts only (per source-of-truth rule) |
| Context limit during work | Document state, continue from saved state |

## Success criteria

- Preview URL loads cleanly in <2s mobile, <1s desktop
- 0 banned marketing words in visible DOM
- 3 valid JSON-LD schemas pass Google Rich Results
- Lighthouse ≥ 90 SEO / 85 Perf / 95 Accessibility
- All 9 new sections render in all 4 languages
- Google Ads AG2 updated with new assets + negatives + Max CPC
- Prod deploy successful
- Telegram summary sent
