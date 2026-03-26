# PROJECT_CONTEXT

Generated on 2026-03-25 (America/Los_Angeles).

## 1. PROJECT OVERVIEW
- This repository is the official Handy & Friend web application for Los Angeles handyman and cabinet refinishing services, built as a static marketing site plus serverless backend.
- `README.md` positions it as `handy-friend-web` with a deterministic operations protocol and health-check workflow for production stability.
- `index.html` confirms the core product: a multilingual lead-generation landing page with service pricing highlights, AI-assisted intake/chat, direct booking/contact CTAs, analytics tracking, and local-business SEO schema.
- Primary business flow: visitor lands on static pages, submits lead/chat, backend stores and enriches lead data, then forwards notifications to operator channels for rapid close.

## 2. TECH STACK
- Frontend: Vanilla HTML5, CSS3, and JavaScript (no framework/build step).
- Styling: Custom CSS (`assets/css/main.css`, `assets/css/pages.css`) with Google Fonts (Playfair Display + DM Sans).
- Runtime/Backend: Vercel Serverless Functions (`api/*.js`) on Node.js.
- Package manager/runtime scripts: npm + Node scripts (`package.json`).
- Database/API: Supabase (`@supabase/supabase-js`, SQL migrations in `supabase/`).
- AI model provider: DeepSeek Chat API (Alex assistant + intake fallback paths).
- Notifications/Comms: Telegram Bot API, optional Twilio SMS, optional SendGrid email, optional Resend email, WhatsApp deep links, Facebook Messenger webhook.
- Analytics/Tracking: Google Tag Manager, GA4 (`G-Z05XJ8E281`), Google Ads conversion tag (`AW-17971094967`), Meta Pixel (`741929941112529`), server-side GA4 Measurement Protocol (`lib/ga4-mp.js`).
- Bot/spam prevention: Google reCAPTCHA v3 (client + server verify in lead submission).
- Deployment/hosting: Vercel (`vercel.json`, `.vercel/project.json`).
- CI/automation: GitHub Actions workflows in `.github/workflows/`.
- Testing: Node built-in test runner (`tests/*.test.js`) for pricing/attribution logic.
- Data/ops tooling: Shell and Node scripts under `scripts/` and `ops/`.

## 3. FILE MAP
Tracked files: 467.

### Root
- `.env.example` — Environment variable file template/config (contains deployment settings).
- `.env.local.example` — Environment variable file template/config (contains deployment settings).
- `.gitignore` — Repository file.
- `AGENTS.md` — Repository policy and implementation constraints for AI coding agents.
- `ARTIFACT_INDEX.md` — Markdown documentation artifact.
- `BACKEND_PIPELINE_README.md` — Markdown documentation artifact.
- `BOOTSTRAP.md` — Markdown documentation artifact.
- `DECISIONS.md` — Markdown documentation artifact.
- `EXEC_SPEC.md` — Markdown documentation artifact.
- `FACEBOOK_AUTOMATION_CHECKLIST.txt` — Plain-text operations/marketing artifact.
- `FACEBOOK_COMPLETE_PACKAGE_SUMMARY.txt` — Plain-text operations/marketing artifact.
- `FACEBOOK_COVER_IMAGE_DESIGN.txt` — Plain-text operations/marketing artifact.
- `FACEBOOK_FILES_INDEX.txt` — Plain-text operations/marketing artifact.
- `FACEBOOK_PAGE_SETUP.md` — Markdown documentation artifact.
- `FACEBOOK_POSTS_CONTENT.txt` — Plain-text operations/marketing artifact.
- `FACEBOOK_TIPS_AND_FAQ.txt` — Plain-text operations/marketing artifact.
- `LICENSE` — Repository file.
- `MARKETING_AUTOMATION_COMPLETE.md` — Markdown documentation artifact.
- `PROD_READINESS_GATE.md` — Markdown documentation artifact.
- `README.md` — Primary project readme with quick stability protocol and health-check references.
- `RELEASE_RUNBOOK.md` — Markdown documentation artifact.
- `RUN_REPORT.md` — Markdown documentation artifact.
- `SESSION_START_CHECKLIST.md` — Markdown documentation artifact.
- `STATUS.md` — Markdown documentation artifact.
- `TELEGRAM_DEPLOYMENT.txt` — Plain-text operations/marketing artifact.
- `TELEGRAM_SETUP.md` — Markdown documentation artifact.
- `UNIFIED_REGISTRY.md` — Markdown documentation artifact.
- `VALIDATION_CHECKLIST.md` — Markdown documentation artifact.
- `ai-hero-section.html` — Static HTML page/asset.
- `dns_check.sh` — Repository file.
- `dns_loop.sh` — Repository file.
- `dns_monitor.sh` — Repository file.
- `dns_watch.sh` — Repository file.
- `favicon.ico` — Static/binary asset or generated data artifact.
- `favicon.svg` — Static/binary asset or generated data artifact.
- `handyfriend_10.html` — Static HTML page/asset.
- `index.html` — Main multilingual marketing/lead-capture landing page for handyandfriend.com.
- `manifest.webmanifest` — PWA manifest metadata.
- `og.jpg` — Static/binary asset or generated data artifact.
- `package.json` — Node package manifest with scripts for audits, pricing checks, and ops automation.
- `privacy.html` — Privacy policy page.
- `qa_handy.js` — JavaScript source module.
- `robots.txt` — Crawler directives for search engines.
- `sitemap.xml` — XML sitemap of public website URLs.
- `terms.html` — Terms and conditions page.
- `vercel.json` — Vercel routing config with redirects, rewrites, and canonical URL rules.
- `verify-pipeline-setup.sh` — Repository file.

### api/
- `api/_lib/lead-context-store.js` — Shared serverless utility module used by API endpoints.
- `api/_lib/rate-limit.js` — Shared serverless utility module used by API endpoints.
- `api/_lib/reply-templates.js` — Shared serverless utility module used by API endpoints.
- `api/_lib/supabase-admin.js` — Shared serverless utility module used by API endpoints.
- `api/_lib/telegram-templates.js` — Shared serverless utility module used by API endpoints.
- `api/ai-chat.js` — Alex web chat endpoint with policy/guard logic and lead extraction.
- `api/ai-intake.js` — AI-intake endpoint for query/photo intake and Telegram forwarding.
- `api/alex-webhook.js` — Facebook Messenger webhook that routes messages through Alex.
- `api/append-conversation.js` — JavaScript source module.
- `api/fb-redirect.js` — Redirect endpoint to Facebook destination links.
- `api/health.js` — Unified health endpoint replacing prior factory/funnel health routes.
- `api/lead-photo-url.js` — JavaScript source module.
- `api/review-redirect.js` — Redirect endpoint to review destination links.
- `api/send-sms.js` — SMS capture endpoint with Twilio/SendGrid/Firebase fallback paths.
- `api/send-telegram.js` — Telegram delivery endpoint for lead alerts with one-tap actions.
- `api/submit-lead.js` — Main lead ingestion endpoint (validation, anti-spam, persistence, notifications).
- `api/upload-lead-photos.js` — JavaScript source module.

### archived-api/
- `archived-api/README.md` — Archived legacy API file kept for reference/backward compatibility.
- `archived-api/health-check.js` — Archived legacy API file kept for reference/backward compatibility.
- `archived-api/notify-lead.js` — Archived legacy API file kept for reference/backward compatibility.
- `archived-api/pipeline-cron.js` — Archived legacy API file kept for reference/backward compatibility.
- `archived-api/run-migrations.js` — Archived legacy API file kept for reference/backward compatibility.
- `archived-api/telegram-lead-assets.js` — Archived legacy API file kept for reference/backward compatibility.
- `archived-api/telegram-notify.js` — Archived legacy API file kept for reference/backward compatibility.
- `archived-api/telegram-webhook.js` — Archived legacy API file kept for reference/backward compatibility.

### assets/
- `assets/css/main.css` — Primary landing page stylesheet.
- `assets/css/pages.css` — Shared stylesheet for service and secondary pages.
- `assets/images/services-ba/art-mirror-hanging-ba.png` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/art-mirror-hanging-ba.webp` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/backsplash-installation-ba-2.png` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/backsplash-installation-ba.png` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/cabinet-painting-after.png` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/cabinet-painting-ba.png` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/cabinet-painting-before.png` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/door-installation-ba.png` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/drywall-repair-ba.png` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/electrical-ba.png` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/electrical-ba.webp` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/flooring-installation-ba.png` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/flooring-installation-ba.webp` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/furniture-assembly-ba.png` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/furniture-assembly-ba.webp` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/furniture-painting-ba.png` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/furniture-painting-ba.webp` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/interior-painting-ba.png` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/interior-painting-ba.webp` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/plumbing-ba.png` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/plumbing-ba.webp` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/tv-mounting-ba.png` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/tv-mounting-ba.webp` — Static before/after visual asset used on service pages.
- `assets/images/services-ba/vanity-installation-ba.png` — Static before/after visual asset used on service pages.
- `assets/img/alex-avatar-v4.webp` — Static marketing image asset used by landing and service pages.
- `assets/img/alex-avatar.png` — Static marketing image asset used by landing and service pages.
- `assets/img/art.jpg` — Static marketing image asset used by landing and service pages.
- `assets/img/art.webp` — Static marketing image asset used by landing and service pages.
- `assets/img/electrical.jpeg` — Static marketing image asset used by landing and service pages.
- `assets/img/electrical.webp` — Static marketing image asset used by landing and service pages.
- `assets/img/flooring.jpeg` — Static marketing image asset used by landing and service pages.
- `assets/img/flooring.webp` — Static marketing image asset used by landing and service pages.
- `assets/img/furniture.jpg` — Static marketing image asset used by landing and service pages.
- `assets/img/furniture.webp` — Static marketing image asset used by landing and service pages.
- `assets/img/furnp.png` — Static marketing image asset used by landing and service pages.
- `assets/img/furnp.webp` — Static marketing image asset used by landing and service pages.
- `assets/img/hero-bg.jpg` — Static marketing image asset used by landing and service pages.
- `assets/img/hero-bg.webp` — Static marketing image asset used by landing and service pages.
- `assets/img/kitch.png` — Static marketing image asset used by landing and service pages.
- `assets/img/kitch.webp` — Static marketing image asset used by landing and service pages.
- `assets/img/og.jpg` — Static marketing image asset used by landing and service pages.
- `assets/img/painting.jpg` — Static marketing image asset used by landing and service pages.
- `assets/img/painting.webp` — Static marketing image asset used by landing and service pages.
- `assets/img/plumbing.jpeg` — Static marketing image asset used by landing and service pages.
- `assets/img/plumbing.webp` — Static marketing image asset used by landing and service pages.
- `assets/img/tv-mounting.jpg` — Static marketing image asset used by landing and service pages.
- `assets/img/tv-mounting.webp` — Static marketing image asset used by landing and service pages.
- `assets/js/main.js` — Main frontend logic (i18n, calculator, lead form, tracking hooks).
- `assets/js/price-registry.browser.js` — Browser-safe generated pricing registry payload for frontend consumption.
- `assets/js/service-calculator-modal.js` — Service calculator modal behavior and estimate helpers.
- `assets/js/shared.js` — Shared page bootstrap (analytics/meta pixel loading and global click tracking).

### ads/
- `ads/META_ADS_CAMPAIGN_GUIDE.md` — Advertising operations documentation.
- `ads/retargeting-ad-1-urgency.html` — Ad-focused landing creative page variant for campaign testing.
- `ads/retargeting-ad-2-social-proof.html` — Ad-focused landing creative page variant for campaign testing.
- `ads/retargeting-ad-3-guarantee.html` — Ad-focused landing creative page variant for campaign testing.

### art-hanging/
- `art-hanging/index.html` — Public static page entry for this route segment.

### backsplash/
- `backsplash/index.html` — Public static page entry for this route segment.

### book/
- `book/index.html` — Public static page entry for this route segment.

### cabinet-painting/
- `cabinet-painting/index.html` — Public static page entry for this route segment.

### door-installation/
- `door-installation/index.html` — Public static page entry for this route segment.

### drywall/
- `drywall/index.html` — Public static page entry for this route segment.

### electrical/
- `electrical/index.html` — Public static page entry for this route segment.

### flooring/
- `flooring/index.html` — Public static page entry for this route segment.

### furniture-assembly/
- `furniture-assembly/index.html` — Public static page entry for this route segment.

### furniture-painting/
- `furniture-painting/index.html` — Public static page entry for this route segment.

### gallery/
- `gallery/index.html` — Public static page entry for this route segment.

### handy-friend/
- `handy-friend/ops/2026-03-14-V4-GAP-CLOSURE-PLAN.md` — Handy-friend nested operations planning artifact.
- `handy-friend/ops/2026-03-14-agent-error-postmortem.md` — Handy-friend nested operations planning artifact.
- `handy-friend/ops/DAILY_RUNBOOK.md` — Handy-friend nested operations planning artifact.
- `handy-friend/ops/HANDY-FRIEND-REVENUE-MASTER-PROMPT-V4.md` — Handy-friend nested operations planning artifact.
- `handy-friend/ops/KPI_SCOREBOARD.csv` — Handy-friend nested operations planning artifact.
- `handy-friend/ops/TODAY_EXECUTION_BOARD.md` — Handy-friend nested operations planning artifact.
- `handy-friend/ops/reports/2026-03-14-v4-developer-change-list.md` — Handy-friend nested reporting artifact.
- `handy-friend/ops/reports/2026-03-14-v4-execution-status.md` — Handy-friend nested reporting artifact.
- `handy-friend/ops/reports/2026-03-14-v4-gsc-evidence-matrix.csv` — Handy-friend nested reporting artifact.
- `handy-friend/ops/reports/2026-03-14-v4-proof-asset-sop.md` — Handy-friend nested reporting artifact.
- `handy-friend/ops/reports/2026-03-14-v4-revenue-audit-final.md` — Handy-friend nested reporting artifact.

### interior-painting/
- `interior-painting/index.html` — Public static page entry for this route segment.

### lib/
- `lib/ai-fallback.js` — DeepSeek wrapper with retries/timeouts and fallback responses.
- `lib/alex-one-truth.js` — Core Alex sales-policy prompt and guard-mode orchestration.
- `lib/alex-policy-engine.js` — JavaScript source module.
- `lib/alex-v8-system.js` — JavaScript source module.
- `lib/attribution.js` — JavaScript source module.
- `lib/ga4-mp.js` — JavaScript source module.
- `lib/lead-pipeline.js` — Lead lifecycle engine, attribution normalization, and event logging helpers.
- `lib/price-registry.js` — Single source of truth for service pricing and price catalogs.
- `lib/pricing-policy.js` — JavaScript source module.

### ops/
- `ops/00-START-HERE-RESULTS.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/ACTION-NOW.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/AGENT_ONBOARDING_PROMPTS.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/AI_WORKFLOW_v1.1.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/COMMERCIAL-AUDIT-2026-03-12.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/COMPLETE-DEPLOYMENT-ALL-CHANNELS.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/DECISIONS.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/EVIDENCE-LOG-2026-03-07.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/FINAL-DEPLOYMENT-REPORT.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/FINAL-INTEGRATION-SUMMARY.txt` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/GOOGLE-ADS-INTEGRATION-LIVE.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/GOOGLE-ADS-MICRO-TEST-PLAN.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/GOOGLE-ADS-PROFESSIONAL-SETUP.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/IMAGE-GENERATION-GUIDE.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/KPI_SCOREBOARD.csv` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/LAUNCH-CHECKLIST-TODAY.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/LEAD-GENERATION-DEPLOYMENT-110PERCENT.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/MAC_AI_COMMAND_CENTER_SETUP.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/MASTER-DEPLOYMENT-CHECKLIST.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/MASTER-PLAN.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/PROMPTS.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/REVIEW-LINK-TEMPLATE.txt` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/STATUS.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/TASKS.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/ad-matrix-master.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/baseline-2026-03-10.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/build-asset-inventory.mjs` — Operations automation script for audits/build/report tasks.
- `ops/build-post-pack.mjs` — Operations automation script for audits/build/report tasks.
- `ops/contact-scripts-2026-03-09.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/control-tower.html` — Operations utility HTML asset.
- `ops/craigslist-post-1-tv-mounting.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/craigslist-post-2-painting.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/craigslist-post-3-assembly-hanging.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/craigslist-post-3-flooring.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/craigslist-post-4-renovation-combo.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/craigslist-posts-batch2.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/daily-kpi-log.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/facebook-groups-la.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/facebook-groups-strategy.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/factory-guard.mjs` — Operations automation script for audits/build/report tasks.
- `ops/fb-finalize-webhook.mjs` — Operations automation script for audits/build/report tasks.
- `ops/fb-messenger-connect.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/fb-sales-posts.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/final-report-014-2026-03-09.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/gbp-business-card.html` — Operations utility HTML asset.
- `ops/gbp-completeness-checklist.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/gbp-seo-content.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/google-ads-full-audit.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/google-ads-report-30d-2026-03-10.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/google-lsa-setup.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/google-review-template.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/google-search-ads-strategy.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/google-services-gate.mjs` — Operations automation script for audits/build/report tasks.
- `ops/gpt-image-prompts-2026-03-03.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/growth-sprint-14d.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/image-prompts-master-2026-03-09.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/incidents/INC-20260311-01.md` — Incident response document/template.
- `ops/incidents/INCIDENT_TEMPLATE.md` — Incident response document/template.
- `ops/lead-response-scripts.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/marketing-tracker.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/meta-setup-checklist.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/nextdoor-posts-batch2.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/nextdoor-posts.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/nextdoor-service-matrix.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/post-queue-4weeks.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/posts-batch-2026-03-09.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/posts-batch-2026-03-11.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/release-gate.sh` — Operations shell helper for release/deployment gating.
- `ops/remediation-2026-03-09.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/reports/.gitkeep` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-10.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-11-execution-pack.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-11-execution-status.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-11-live-close-sheet.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-11-sales-war-room.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-11-sprint1-action-pack.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-11-sprint1-verification.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-11.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-12-live-close-sheet.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-12-production-fix-verify.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-12.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-13-live-close-sheet.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-13-stage-a-stabilization-report.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-13.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-14-live-close-sheet.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-14-stage-b-autopilot-report.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-14-stage-c-test-traffic-guard.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-14.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-15-live-close-sheet.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-15.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-16-live-close-sheet.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-16.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-17-live-close-sheet.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-17.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-18-live-close-sheet.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-18.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-19-live-close-sheet.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-19.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-20-live-close-sheet.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-20.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-21-live-close-sheet.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-21.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-22-live-close-sheet.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-22.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-23-live-close-sheet.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-23.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-24-live-close-sheet.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-24.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-25-live-close-sheet.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-25.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/2026-03-26-live-close-sheet.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/daily-ops-audit-2026-03-09T22-36-11-851Z.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/daily-ops-audit-2026-03-09T22-45-09-148Z.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/daily-ops-audit-2026-03-10T07-04-03-431Z.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/daily-ops-audit-2026-03-14T00-58-43-274Z.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/e2e-email-telegram-2026-03-09T23-41-50Z.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/full-integrity-audit-2026-03-25.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/incident-dashboard-2026-03-11.md` — Operational report/log artifact for daily execution tracking.
- `ops/reports/incident-mttr-2026-03-11.csv` — Operational report/log artifact for daily execution tracking.
- `ops/reports/migration-drift-2026-03-11.md` — Operational report/log artifact for daily execution tracking.
- `ops/resend-setup-2026-03-09.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/rotation-tracker.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/screenshots/cl-ad2-cabinet-painting.png` — Operations screenshot evidence artifact.
- `ops/screenshots/cl-ad3-general-handyman.png` — Operations screenshot evidence artifact.
- `ops/snapshot-after-014-2026-03-09.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/snapshot-before-014-2026-03-09.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/snapshots/2026-03-10-atlas-session-20260310-172404.png` — Snapshot/log evidence from ops sessions.
- `ops/snapshots/2026-03-10-atlas-session-20260310-173714.png` — Snapshot/log evidence from ops sessions.
- `ops/snapshots/2026-03-10-session-start.md` — Snapshot/log evidence from ops sessions.
- `ops/sop-lead-reactivation.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/sop-review-request.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/sop-sales-pipeline.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/sprint-1-report-2026-03-11.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/thumbtack-yelp-setup.md` — Operations runbook, checklist, strategy, or execution artifact.
- `ops/utm-convention.md` — Operations runbook, checklist, strategy, or execution artifact.

### output/
- `output/gbp/content_calendar_30d.csv` — Generated Google Business Profile planning/output artifact.
- `output/gbp/final_audit_report.md` — Generated Google Business Profile planning/output artifact.
- `output/gbp/photos_manifest.json` — Generated Google Business Profile planning/output artifact.
- `output/gbp/posts/post_01.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_02.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_03.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_04.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_05.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_06.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_07.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_08.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_09.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_10.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_11.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_12.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_13.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_14.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_15.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_16.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_17.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_18.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_19.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_20.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_21.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_22.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_23.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_24.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_25.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_26.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_27.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_28.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_29.md` — Generated Google Business Profile post draft output.
- `output/gbp/posts/post_30.md` — Generated Google Business Profile post draft output.
- `output/gbp/profile_master.json` — Generated Google Business Profile planning/output artifact.
- `output/gbp/qa_bank.json` — Generated Google Business Profile planning/output artifact.
- `output/gbp/services_catalog.json` — Generated Google Business Profile planning/output artifact.
- `output/gbp/utm_map.json` — Generated Google Business Profile planning/output artifact.
- `output/pdf/ALEX_ONE_TRUTH_MASTER.pdf` — Generated PDF export artifact.
- `output/price-audit-report.md` — Generated output artifact.

### plumbing/
- `plumbing/index.html` — Public static page entry for this route segment.

### pricing/
- `pricing/index.html` — Public static page entry for this route segment.

### r/
- `r/one-tap/index.html` — Static HTML page/asset.

### reviews/
- `reviews/index.html` — Public static page entry for this route segment.

### scripts/
- `scripts/audit-service-prices.mjs` — Project automation/diagnostic Node script.
- `scripts/audit.sh` — Project automation/diagnostic shell script.
- `scripts/backfill-lead-sources.mjs` — Project automation/diagnostic Node script.
- `scripts/build-browser-price-registry.mjs` — Project automation/diagnostic Node script.
- `scripts/check-migration-drift.sh` — Project automation/diagnostic shell script.
- `scripts/daily-report.mjs` — Project automation/diagnostic Node script.
- `scripts/daily_ops_audit.mjs` — Project automation/diagnostic Node script.
- `scripts/incident-dashboard.mjs` — Project automation/diagnostic Node script.
- `scripts/new-incident.mjs` — Project automation/diagnostic Node script.
- `scripts/openai-workflow-bootstrap.sh` — Project automation/diagnostic shell script.
- `scripts/ops/vercel-preflight.sh` — Ops-focused deployment preflight helper script.
- `scripts/prod_audit.sh` — Project automation/diagnostic shell script.
- `scripts/sla-check.mjs` — Project automation/diagnostic Node script.
- `scripts/sprint1-autopilot.mjs` — Project automation/diagnostic Node script.
- `scripts/start-atlas-ops-session.sh` — Project automation/diagnostic shell script.
- `scripts/update-live-close-sheet.mjs` — Project automation/diagnostic Node script.
- `scripts/validate-openai-workflow.sh` — Project automation/diagnostic shell script.
- `scripts/vercel-project-guard.sh` — Project automation/diagnostic shell script.

### services/
- `services/index.html` — Public static page entry for this route segment.

### supabase/
- `supabase/AI_INTAKE_SYSTEM_PROMPT.md` — Supabase integration/setup documentation.
- `supabase/API_CONTRACTS.md` — Supabase integration/setup documentation.
- `supabase/BLOCK1_SETUP.md` — Supabase integration/setup documentation.
- `supabase/README.md` — Supabase integration/setup documentation.
- `supabase/functions/notify-telegram/index.ts` — Supabase Edge Function source file.
- `supabase/migrations/20260309221600_015_pipeline_enforcement.sql` — Supabase migration SQL applied via migration timeline.
- `supabase/migrations/20260309222400_016_fix_jobs_sync_uuid_compare.sql` — Supabase migration SQL applied via migration timeline.
- `supabase/migrations/20260309222600_017_confirm_jobs_link_backfill.sql` — Supabase migration SQL applied via migration timeline.
- `supabase/migrations/20260309223500_018_diag_leads_constraints.sql` — Supabase migration SQL applied via migration timeline.
- `supabase/migrations/20260309223800_019_backfill_completed_jobs_to_leads_compatible.sql` — Supabase migration SQL applied via migration timeline.
- `supabase/migrations/20260309224200_020_link_completed_jobs_to_backfill_leads.sql` — Supabase migration SQL applied via migration timeline.
- `supabase/migrations/20260309230000_021_cleanup_test_data_dedup_index.sql` — Supabase migration SQL applied via migration timeline.
- `supabase/migrations/20260310070000_022_clean_prod_metrics.sql` — Supabase migration SQL applied via migration timeline.
- `supabase/migrations/20260310120000_023_sla_refinement.sql` — Supabase migration SQL applied via migration timeline.
- `supabase/migrations/20260311190000_024_security_advisor_fixes.sql` — Supabase migration SQL applied via migration timeline.
- `supabase/migrations/20260311220000_025_views_exclude_test_leads.sql` — Supabase migration SQL applied via migration timeline.
- `supabase/sql/000_RUN_ALL_IN_SUPABASE.sql` — Supabase SQL script for schema, policies, analytics, or enforcement.
- `supabase/sql/001_leads_core.sql` — Supabase SQL script for schema, policies, analytics, or enforcement.
- `supabase/sql/002_rls_policies.sql` — Supabase SQL script for schema, policies, analytics, or enforcement.
- `supabase/sql/003_storage_private_bucket.sql` — Supabase SQL script for schema, policies, analytics, or enforcement.
- `supabase/sql/004_analytics_views.sql` — Supabase SQL script for schema, policies, analytics, or enforcement.
- `supabase/sql/005_conversations_patch.sql` — Supabase SQL script for schema, policies, analytics, or enforcement.
- `supabase/sql/006_leads_schema_sync.sql` — Supabase SQL script for schema, policies, analytics, or enforcement.
- `supabase/sql/007_pipeline_columns.sql` — Supabase SQL script for schema, policies, analytics, or enforcement.
- `supabase/sql/008_backfill.sql` — Supabase SQL script for schema, policies, analytics, or enforcement.
- `supabase/sql/009_constraints.sql` — Supabase SQL script for schema, policies, analytics, or enforcement.
- `supabase/sql/010_response_time_and_audit.sql` — Supabase SQL script for schema, policies, analytics, or enforcement.
- `supabase/sql/011_rls_complete.sql` — Supabase SQL script for schema, policies, analytics, or enforcement.
- `supabase/sql/012_ultimate_analytics.sql` — Supabase SQL script for schema, policies, analytics, or enforcement.
- `supabase/sql/013_test_isolation.sql` — Supabase SQL script for schema, policies, analytics, or enforcement.
- `supabase/sql/014_confirm_jobs_link.sql` — Supabase SQL script for schema, policies, analytics, or enforcement.
- `supabase/sql/014_fix_dashboard_and_jobs_link.sql` — Supabase SQL script for schema, policies, analytics, or enforcement.
- `supabase/sql/014_rollback.sql` — Supabase SQL script for schema, policies, analytics, or enforcement.
- `supabase/sql/015_pipeline_enforcement.sql` — Supabase SQL script for schema, policies, analytics, or enforcement.

### tests/
- `tests/ads-attribution.test.js` — Node test file validating policy or attribution behavior.
- `tests/pricing-policy.test.js` — Node test file validating policy or attribution behavior.

### docs/
- `docs/AGENT_PROMPTS_GROWTH.md` — Project documentation, audits, plans, and implementation notes.
- `docs/AI-RESEARCH-REPORT-2026-2030.md` — Project documentation, audits, plans, and implementation notes.
- `docs/AI-RESEARCH-REPORT-2026-2030.pdf` — Project documentation, audits, plans, and implementation notes.
- `docs/ALEX_V8_FINAL_STATUS.md` — Project documentation, audits, plans, and implementation notes.
- `docs/ALEX_V8_SMOKE_TEST_RESULTS.md` — Project documentation, audits, plans, and implementation notes.
- `docs/ALEX_V8_SMOKE_TEST_RUNNER.md` — Project documentation, audits, plans, and implementation notes.
- `docs/ALEX_V9_IMPLEMENTATION_REPORT.md` — Project documentation, audits, plans, and implementation notes.
- `docs/CALCULATOR-PRICING-FINALIZATION.md` — Project documentation, audits, plans, and implementation notes.
- `docs/DEPLOYMENT_CHECKLIST.md` — Project documentation, audits, plans, and implementation notes.
- `docs/EXEC_CONTROL_LOG.md` — Project documentation, audits, plans, and implementation notes.
- `docs/EXEC_FINAL_PASSFAIL.md` — Project documentation, audits, plans, and implementation notes.
- `docs/FACTORY_TOOLCHAIN_STATUS_2026-02-26.md` — Project documentation, audits, plans, and implementation notes.
- `docs/FACTORY_ZERO_DOWNTIME_PROTOCOL.md` — Project documentation, audits, plans, and implementation notes.
- `docs/FORM-SUBMISSION-END-TO-END-TEST.md` — Project documentation, audits, plans, and implementation notes.
- `docs/FREE-TOOLS-LEADS-ANALYTICS.md` — Project documentation, audits, plans, and implementation notes.
- `docs/GA4-TESTING-VERIFICATION.md` — Project documentation, audits, plans, and implementation notes.
- `docs/GBP-PHOTO-CHECKLIST.md` — Project documentation, audits, plans, and implementation notes.
- `docs/GOOGLE-ADS-KEYWORD-RESEARCH.md` — Project documentation, audits, plans, and implementation notes.
- `docs/GOOGLE-CALL-EXTENSIONS-SETUP.md` — Project documentation, audits, plans, and implementation notes.
- `docs/GOOGLE_SERVICES_MICROPLAN.md` — Project documentation, audits, plans, and implementation notes.
- `docs/GROWTH-EXPERIMENT-BOARD.csv` — Project documentation, audits, plans, and implementation notes.
- `docs/GROWTH-FACTORY-PILOT-14D.md` — Project documentation, audits, plans, and implementation notes.
- `docs/IMPLEMENTATION-COMPLETE-CHECKLIST.md` — Project documentation, audits, plans, and implementation notes.
- `docs/KPI_TRUTH_CONTRACT.md` — Project documentation, audits, plans, and implementation notes.
- `docs/LAUNCH-ROADMAP-2026.md` — Project documentation, audits, plans, and implementation notes.
- `docs/LSA-DOCUMENTS-PREPARATION.md` — Project documentation, audits, plans, and implementation notes.
- `docs/META-PIXEL-TESTING-VERIFICATION.md` — Project documentation, audits, plans, and implementation notes.
- `docs/PHASE-B-LEGAL-GUARDRAIL.md` — Project documentation, audits, plans, and implementation notes.
- `docs/PHASE-C-SMS-COMPLIANCE.md` — Project documentation, audits, plans, and implementation notes.
- `docs/PIPELINE_IMPLEMENTATION_SUMMARY.md` — Project documentation, audits, plans, and implementation notes.
- `docs/PIPELINE_INTEGRATION_GUIDE.md` — Project documentation, audits, plans, and implementation notes.
- `docs/PLATFORM_API_TRUTH_2026-02-26.md` — Project documentation, audits, plans, and implementation notes.
- `docs/PLATFORM_POST_TEMPLATES_FREE.md` — Project documentation, audits, plans, and implementation notes.
- `docs/POST-LAUNCH-MONITORING-SCALING.md` — Project documentation, audits, plans, and implementation notes.
- `docs/README.md` — Project documentation, audits, plans, and implementation notes.
- `docs/REVIEW_ENGINE_EXECUTION_ORDER.md` — Project documentation, audits, plans, and implementation notes.
- `docs/ROCKET_48H_EXECUTION.md` — Project documentation, audits, plans, and implementation notes.
- `docs/ROCKET_48H_TASKS.csv` — Project documentation, audits, plans, and implementation notes.
- `docs/SMS-CONSENT-LOGGING-FIREBASE.md` — Project documentation, audits, plans, and implementation notes.
- `docs/UI_FIX_SCREEN_JUMPING_REPORT.md` — Project documentation, audits, plans, and implementation notes.
- `docs/WAVE1_LIVE_STATUS_2026-02-26.md` — Project documentation, audits, plans, and implementation notes.
- `docs/WHATSAPP-BUSINESS-TEMPLATES.md` — Project documentation, audits, plans, and implementation notes.
- `docs/ai-prompts/ALEX_v7_BACKUP.md` — Alex prompt design/versioning documentation artifact.
- `docs/ai-prompts/ALEX_v8_COMPLETE_PROMPT.md` — Alex prompt design/versioning documentation artifact.
- `docs/ai-prompts/ALEX_v8_IMPLEMENTATION_PLAN.md` — Alex prompt design/versioning documentation artifact.
- `docs/alex-full-service-qa-matrix.md` — Project documentation, audits, plans, and implementation notes.
- `docs/alex-unification-audit.md` — Project documentation, audits, plans, and implementation notes.
- `docs/creative-assets.json` — Project documentation, audits, plans, and implementation notes.
- `docs/creatives/before-after/before-after-01.jpg` — Creative media asset for marketing content.
- `docs/creatives/before-after/before-after-02.jpg` — Creative media asset for marketing content.
- `docs/creatives/before-after/before-after-03.jpg` — Creative media asset for marketing content.
- `docs/creatives/before-after/before-after-04.jpg` — Creative media asset for marketing content.
- `docs/frontend-audit.md` — Project documentation, audits, plans, and implementation notes.
- `docs/frontend-v2-implementation-report.md` — Project documentation, audits, plans, and implementation notes.
- `docs/generate_report_pdf.py` — Project documentation, audits, plans, and implementation notes.
- `docs/placements.csv` — Project documentation, audits, plans, and implementation notes.
- `docs/post-pack/craigslist-plc_cl_001.txt` — Prepared channel post template/output artifact.
- `docs/post-pack/facebook-plc_fb_001.txt` — Prepared channel post template/output artifact.
- `docs/post-pack/google_business-plc_gbp_001.txt` — Prepared channel post template/output artifact.
- `docs/post-pack/manifest.json` — Prepared channel post template/output artifact.
- `docs/post-pack/nextdoor-plc_nd_001.txt` — Prepared channel post template/output artifact.
- `docs/post-pack/taskrabbit-plc_tr_001.txt` — Prepared channel post template/output artifact.
- `docs/post-pack/thumbtack-plc_tt_001.txt` — Prepared channel post template/output artifact.
- `docs/post-pack/yelp-plc_yp_001.txt` — Prepared channel post template/output artifact.

### .github/
- `.github/workflows/daily-report.yml` — GitHub Actions workflow for validation/reporting/ops automation.
- `.github/workflows/live-close-sheet.yml` — GitHub Actions workflow for validation/reporting/ops automation.
- `.github/workflows/nightly-health.yml` — GitHub Actions workflow for validation/reporting/ops automation.
- `.github/workflows/sla-escalation.yml` — GitHub Actions workflow for validation/reporting/ops automation.
- `.github/workflows/validate.yml` — GitHub Actions workflow for validation/reporting/ops automation.

### .vercel/
- `.vercel/project.json` — Static/binary asset or generated data artifact.

### "ops/
- `"ops/\360\237\232\200-LAUNCH-NOW.txt"` — Repository file.

### tv-mounting/
- `tv-mounting/index.html` — Public static page entry for this route segment.

### vanity-installation/
- `vanity-installation/index.html` — Public static page entry for this route segment.

## 4. PRICE REGISTRY
Full contents of `lib/price-registry.js`:

```js
/**
 * Canonical pricing registry for Handy & Friend.
 * Single source of truth used by chat, messenger, diagnostics, and SEO checks.
 */

const PRICING_SOURCE_VERSION = '2026.03.25-v2';

const SERVICES = {
  tv_mounting: {
    service_id: 'tv_mounting',
    label: 'TV Mounting',
    unit: 'fixed',
    base_prices: {
      standard: 150,
      hidden_wire: 185
    },
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'wall_install'
  },
  furniture_assembly: {
    service_id: 'furniture_assembly',
    label: 'Furniture Assembly',
    unit: 'from',
    base_prices: {
      small_item: 150,
      dresser: 200,
      bed_frame: 275,
      pax_hourly: 70
    },
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'wall_install'
  },
  art_mirrors: {
    service_id: 'art_mirrors',
    label: 'Art & Mirror Hanging',
    unit: 'fixed',
    base_prices: {
      up_to_5_pieces: 150,
      curtain_first: 150,
      curtain_each: 50,
      service_call_min: 150
    },
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'wall_install'
  },
  interior_painting: {
    service_id: 'interior_painting',
    label: 'Interior Painting',
    unit: 'sq_ft',
    base_prices: {
      wall_1coat: 3.0,
      wall_2coats: 3.75,
      ceiling_smooth: 3.75,
      ceiling_textured: 4.25,
      baseboard: 3.0,
      crown_ornate: 3.75,
      door_casing_side: 30,
      baseboard_install: 2.5,
      door_slab: 65
    },
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'renovation'
  },
  flooring: {
    service_id: 'flooring',
    label: 'Flooring Installation',
    unit: 'sq_ft',
    base_prices: {
      laminate: 3.0,
      lvp: 3.0,
      demo: 1.5,
      underlayment: 0.5,
      transition: 30
    },
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'renovation'
  },
  kitchen_cabinet_painting: {
    service_id: 'kitchen_cabinet_painting',
    label: 'Kitchen Cabinet Painting',
    unit: 'door',
    base_prices: {
      full_package: 75,
      spray_both_sides: 70,
      spray_one_side: 40,
      roller_budget: 7.25,
      drawer_small: 25,
      drawer_large: 35,
      end_panel: 50,
      island: 175,
      interior_section: 30
    },
    material_policy: 'paint_included',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'paint_refresh'
  },
  furniture_painting: {
    service_id: 'furniture_painting',
    label: 'Furniture Painting',
    unit: 'piece',
    base_prices: {
      chair: 40,
      nightstand: 65,
      dresser: 170,
      dining_table: 130,
      builtin_lf: 60
    },
    material_policy: 'paint_included',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'paint_refresh'
  },
  plumbing: {
    service_id: 'plumbing',
    label: 'Plumbing',
    unit: 'fixed',
    base_prices: {
      faucet: 150,
      shower_head: 150,
      toilet_tank: 165,
      recaulk: 150
    },
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'standalone'
  },
  electrical: {
    service_id: 'electrical',
    label: 'Electrical',
    unit: 'fixed',
    base_prices: {
      light_fixture: 150,
      outlet_switch_first: 150,
      outlet_switch_additional: 45,
      smart_device: 195
    },
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'standalone'
  },
  drywall: {
    service_id: 'drywall',
    label: 'Drywall Repair',
    unit: 'from',
    base_prices: {
      small_patch: 120,
      medium_patch: 180,
      large_patch: 250
    },
    material_policy: 'materials_included',
    channel_visibility: ['website', 'ai_chat', 'messenger'],
    cross_sell_cluster: 'renovation'
  },
  door_installation: {
    service_id: 'door_installation',
    label: 'Door Installation',
    unit: 'from',
    base_prices: {
      interior_prehung: 140,
      interior_slab: 120,
      exterior: 250
    },
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger'],
    cross_sell_cluster: 'renovation'
  },
  vanity_installation: {
    service_id: 'vanity_installation',
    label: 'Vanity Installation',
    unit: 'from',
    base_prices: {
      single_vanity: 195,
      double_vanity: 295
    },
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger'],
    cross_sell_cluster: 'renovation'
  },
  backsplash: {
    service_id: 'backsplash',
    label: 'Backsplash Installation',
    unit: 'sq_ft',
    base_prices: {
      tile_install: 20,
      peel_stick: 12
    },
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger'],
    cross_sell_cluster: 'renovation'
  }
};

const PRICE_MATRIX = {
  tv_mounting: 150,
  furniture_assembly: 150,
  art_mirrors: 150,
  interior_painting: 3.0,
  flooring: 3.0,
  kitchen_cabinet_painting: 75,
  furniture_painting: 150,
  plumbing: 150,
  electrical: 150,
  drywall: 120,
  door_installation: 140,
  vanity_installation: 195,
  backsplash: 20
};

function getPricingSourceVersion() {
  return PRICING_SOURCE_VERSION;
}

function getCanonicalPriceMatrix() {
  return { ...PRICE_MATRIX };
}

function getServices() {
  return SERVICES;
}

function getService(serviceId) {
  return SERVICES[serviceId] || null;
}

function getAlexPricingCatalogLines() {
  return [
    'Kitchen cabinet painting (paint included):',
    '- Full Package (spray both sides + frame): $75/door',
    '- Spray both sides: $70/door',
    '- Spray one side: $40/door',
    '- Roller finish (budget): $7.25/door',
    '- Drawer front small: $25 each',
    '- Drawer front large: $35 each',
    '- End panel / fridge panel: $50 each',
    '- Kitchen island full repaint: $175',
    '- Interior cabinet (shelves and walls): $30/section',
    '',
    'Furniture painting (paint included):',
    '- Dining chair: $40',
    '- Nightstand: $65',
    '- Dresser: $170',
    '- Dining table: $130',
    '- Built-in cabinetry: $60/lin ft',
    '',
    'Interior painting (labor only):',
    '- Walls/ceiling 1 coat: $3.00/sq ft',
    '- Walls/ceiling 2 coats: $3.75/sq ft',
    '- Ceiling smooth: $3.75/sq ft',
    '- Ceiling textured: $4.25/sq ft',
    '- Baseboards/crown: $3.00/lin ft',
    '- Crown ornate: $3.75/lin ft',
    '- Door casing/trim: $30/side',
    '- Door slab: $65/door',
    '- Baseboard install: $2.50/lin ft',
    '',
    'Flooring installation (labor only):',
    '- Laminate: $3.00/sq ft',
    '- LVP: $3.00/sq ft',
    '- Demo existing floor: $1.50/sq ft',
    '- Underlayment: $0.50/sq ft',
    '- Transition strip: $30 each',
    '',
    'TV and art mounting:',
    '- TV mount standard (up to 65"): $150',
    '- TV mount hidden wire: $185',
    '- Art/mirror hanging (up to 5 pcs): $150',
    '- Curtain rods first window: $150',
    '- Curtain rods each additional: $50',
    '- Service call minimum: $150',
    '',
    'Furniture assembly:',
    '- Small item: $150',
    '- Dresser/chest: $200',
    '- Bed frame: $275',
    '- PAX/closet system: $70/hour (min 4 hours)',
    '',
    'Minor plumbing (labor only):',
    '- Faucet installation: $150',
    '- Shower head replacement: $150',
    '- Toilet tank repair: $165',
    '- Re-caulk tub or shower: $150',
    '',
    'Minor electrical (labor only):',
    '- Light fixture replacement: $150',
    '- Outlet/switch (first 1-2): $150',
    '- Each additional outlet/switch: $45',
    '- Smart doorbell/lock install: $195',
    '',
    'Drywall repair (materials included):',
    '- Small patch (up to 6"): from $120',
    '- Medium patch (6"-12"): from $180',
    '- Large patch (12"+): from $250',
    '',
    'Door installation (labor only):',
    '- Interior pre-hung door: from $140',
    '- Interior slab door: from $120',
    '- Exterior door: from $250',
    '',
    'Vanity installation (labor only):',
    '- Single vanity: from $195',
    '- Double vanity: from $295',
    '',
    'Backsplash installation (labor only):',
    '- Tile backsplash: $20/sq ft',
    '- Peel & stick: $12/sq ft'
  ];
}

function getMessengerPostbackTexts() {
  return {
    GET_STARTED: "Hi! I'm Alex from Handy & Friend. Tell me what service you need and I'll guide you to the right estimate.",
    ICE_TV: 'TV mounting is one of our most requested services. Send your phone number and I will calculate your exact quote right away.',
    ICE_CABINET: 'Kitchen cabinet painting is our core service. Send your phone and number of doors, and I will provide an exact quote.',
    ICE_SERVICES: 'We handle TV mounting, cabinet painting, interior painting, flooring, furniture assembly, art/mirror hanging, plumbing, electrical, drywall repair, door installation, vanity installation, and backsplash. Send your phone and service details for exact pricing.',
    ICE_BOOK: 'Ready to book? Send:\n1) Service\n2) ZIP/area\n3) Phone number\n\nOur manager confirms time and final estimate quickly.',
    MENU_QUOTE: 'Send your service, area, and phone. I will provide the estimate right away.',
    MENU_SERVICES: 'Tell me your service and area, then share your phone number. I will return exact pricing and next steps.'
  };
}

module.exports = {
  getPricingSourceVersion,
  getCanonicalPriceMatrix,
  getServices,
  getService,
  getAlexPricingCatalogLines,
  getMessengerPostbackTexts
};

```

## 5. CURRENT PAGES
Public URLs inferred from `vercel.json` rewrites/redirects and static HTML files:

- `/` — Home landing page (hero, service grid, estimator, lead form/chat entry).
- `/pricing` — Pricing overview page.
- `/services` — Services hub/listing page.
- `/tv-mounting` — TV mounting service landing page.
- `/furniture-assembly` — Furniture assembly service landing page.
- `/art-hanging` — Art and mirror hanging service landing page.
- `/cabinet-painting` — Kitchen cabinet painting service landing page.
- `/flooring` — Flooring installation service landing page.
- `/interior-painting` — Interior painting service landing page.
- `/plumbing` — Plumbing service landing page.
- `/electrical` — Electrical service landing page.
- `/drywall` — Drywall repair service landing page.
- `/door-installation` — Door installation service landing page.
- `/vanity-installation` — Vanity installation service landing page.
- `/backsplash` — Backsplash installation service landing page.
- `/furniture-painting` — Furniture painting service landing page.
- `/gallery` — Gallery page with project visuals.
- `/reviews` — Reviews/testimonials page.
- `/book` — Booking page with lead form funnel.
- `/privacy` — Privacy policy page.
- `/terms` — Terms page.
- `/review` — Rewrite to `/api/review-redirect` for review-link routing.
- `/fb` — Rewrite to `/api/fb-redirect` for Facebook routing.
- `/messenger` — Redirect to Facebook Messenger (`m.me`).
- `/chat` — Redirect to Facebook Messenger (`m.me`).
- `/r/one-tap/` — Operator one-tap helper panel page for lead follow-up actions.

Non-public-on-prod static HTML files present in repo: `/ads/*.html` and `/ops/*.html` are redirected to `/` by `vercel.json`.

## 6. INTEGRATIONS
- Vercel: hosting, rewrites/redirects, serverless runtime, environment management.
- Supabase: lead storage, events, analytics views, migrations, and admin client usage.
- DeepSeek API: AI chat/intake completion provider for Alex.
- Telegram Bot API: lead and intake notifications with quick-reply buttons.
- Facebook Messenger + Graph API: inbound webhook handling and outbound replies.
- Meta Pixel: browser tracking (`fbq` + `PageView` + custom events).
- Google Tag Manager and GA4: client-side analytics/event tracking.
- Google Ads tag: conversion tracking via AW ID.
- Google reCAPTCHA v3: anti-spam token generation and verification.
- WhatsApp deep links (`wa.me`): direct chat CTA from landing and follow-up flows.
- Optional/conditional email & SMS providers: Resend, SendGrid, and Twilio logic paths in API code.
- Optional Firebase Admin path in `api/send-sms.js` for consent logging (when `FIREBASE_CONFIG` is set).
- External profile links in SEO/schema/footer: Facebook page, Nextdoor page, Bing Places profile.

## 7. KNOWN ISSUES
- `README.md` references `/api/factory-health` and `/api/funnel-health`, but only `/api/health` exists now (legacy naming mismatch).
- `index.html` still contains user-facing text payload `"Combo discount please!"` in WhatsApp cross-sell link generation, conflicting with repo policy that removed 20% combo discount messaging on 2026-03-25.
- Production serverless and library code contains multiple `console.log` statements (`api/*.js`, `lib/*.js`), conflicting with repo style rule “No console.log in production code.”
- `api/send-sms.js` dynamically imports `firebase-admin`, but `firebase-admin` is not declared in `package.json`, so that path will fail when `FIREBASE_CONFIG` is enabled.
- Security risk: local `.env.production` in the workspace contains live secrets/tokens (API keys, service role keys, bot tokens). Even if not committed, this file should remain untracked, access-restricted, and all exposed credentials should be rotated.
- Architecture/style inconsistency: AGENTS policy says API should be Node.js ESM, while many modules use CommonJS (`require/module.exports`) and mixed export styles.
- Large amount of legacy marketing collateral still includes 20% combo-offer language across ops/docs artifacts; not all messaging assets are aligned with latest pricing policy.
