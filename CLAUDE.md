# Handy & Friend — Multi-Agent System Codex

## System Architecture

This project runs a **unified multi-agent orchestration system** defined in `system/`.

Before starting any task, consult:
1. `system/policy-plane/routing-policy.yaml` — which provider for which task
2. `system/policy-plane/budget-policy.yaml` — spending limits
3. `system/policy-plane/access-policy.yaml` — permissions and safety gates
4. `system/control-plane/agent-hierarchy.yaml` — provider roles and trust tiers
5. `system/execution-plane/workers.yaml` — worker definitions

## Control Plane Rules

When receiving a task:
1. **Parse goal** → identify task_type, urgency, constraints
2. **Route to provider** → follow `routing-policy.yaml` (cheapest capable first)
3. **Check budget** → respect daily/weekly/monthly limits in `budget-policy.yaml`
4. **Classify risk** → high-risk tasks require human approval
5. **Execute via skill** → use formalized skill contracts in `system/skill-registry/`
6. **QA check** → run relevant QA skills before delivering
7. **Log** → update `system/memory-plane/operational-memory.yaml`

## Provider Routing (Quick Reference)

| Task Type | Primary | Fallback |
|---|---|---|
| Production code | Claude Opus | Codex |
| Web research | Perplexity | ChatGPT |
| Image/video | Gemini | ChatGPT |
| Social posts | Claude Opus | DeepSeek |
| Bulk drafts | DeepSeek | ChatGPT |
| Browser automation | OpenClaw | Cursor |
| Strategy/PRD | ChatGPT | Claude Opus |
| Lead responses | Claude Opus | DeepSeek |
| UI testing | Cursor | OpenClaw |

## Human Approval Required

ALWAYS require human approval before:
- Publishing to any social media
- Sending customer emails
- Making payments
- Logging into third-party sites
- Pushing to production
- Modifying DNS or env vars
- Creating/modifying ad campaigns

## Budget Limits

- Daily: $10 max
- Weekly: $50 max
- Per task default: $0.50
- Emergency stop: $20/day triggers halt

## Skill Registry

60+ skills defined in `system/skill-registry/` across 10 categories:
- **Core** (8): goal_parser, task_decomposer, provider_router, budget_allocator, risk_classifier, human_review_router, fallback_selector, artifact_registrar
- **Research** (7): fresh_web_research, source_validation, fact_crosscheck, competitor_snapshot, market_signal_scan, change_detection, daily_digest_builder
- **Coding** (8): repo_map, bug_reproducer, feature_builder, test_writer, refactorer, migration_runner, deploy_checker, rollback_preparer
- **Browser** (7): login_session_runner, page_navigator, form_filler, data_extractor, ui_smoke_tester, screenshot_recorder, flow_video_recorder
- **Media** (7): image_prompt_builder, image_generator_router, image_editor, video_prompt_builder, video_generator_router, ad_creative_builder, thumbnail_builder
- **Content** (7): post_writer, ad_copy_writer, seo_page_writer, sms_writer, email_writer, comment_responder, offer_packager
- **Publishing** (6): draft_preparer, channel_formatter, approval_gate, post_scheduler, publish_executor, utm_tagger
- **QA** (7): style_checker, brand_checker, policy_checker, truth_checker, duplicate_checker, artifact_validator, cost_auditor
- **Memory** (5): project_memory_update, decision_log_update, skill_performance_update, prompt_library_update, failure_pattern_capture
- **Ops** (12): secret_loader, session_rotator, health_check_runner, error_classifier, incident_summarizer, daily_status_report, provider_benchmark_runner, new_feature_watcher, prompt_optimizer, tool_health_monitor, artifact_reuse_engine, human_approval_packager

## Memory Plane

Three types of memory in `system/memory-plane/`:
- **project-memory.yaml** — Business facts, brand rules, pricing source, profiles
- **operational-memory.yaml** — Action log, known issues, what works/fails
- **skill-memory.yaml** — Skill performance metrics, deployment status

## Dell Background Workers

Host: `100.125.80.43` (via Tailscale SSH `dell`)
Directory: `C:\cloud cod\`

| Worker | Schedule | Status |
|---|---|---|
| CL Hunter v2 | every 4h | active |
| FB/TG Hunter v2 | every 6h | active |
| Callback Handler | always-on | active |
| Immigration Scanner | Monday 9AM | active |

## Deploy Pattern

```
npx vercel deploy --yes → smoke test → npx vercel --prod --yes
curl https://handyandfriend.com/api/health
```

## Key Principles

1. **Cheapest capable first** — don't use Opus for what DeepSeek can do
2. **Evidence-first** — every output must include source/proof
3. **No zero-data reports** — if no data, say so in one line
4. **Human gate on publish** — nothing customer-facing goes out without approval
5. **Skill contracts** — every capability has defined inputs, outputs, budget, QA checks
6. **Isolation** — code in worktrees, browser in sandbox, media in temp dirs
7. **Observe everything** — log provider, cost, quality, errors for every execution

## OpenClaw
Role: web scraping / browser automation ONLY.

OpenClaw is used for:
- Nextdoor lead collection
- Craigslist lead collection
- source login/session handling
- raw lead extraction
- source-level parsing
- first-pass source filtering
- scrape heartbeat / source health evidence

OpenClaw is NOT:
- the CRM
- the source of truth
- the main orchestrator
- the main monitoring system
- the pricing authority
- the incident history authority

System boundaries:
- Supabase = source of truth
- Telegram = alerts / approvals / digests
- rules-registry.yaml = source of truth for pricing, geography, SLA, claims, escalation
- Claude Code / Codex / Gems = higher-level reasoning and ops tools

Runtime:
- Dell Vostro / WSL2 = 24/7 node
- OPENCLAW_ROOT = [REPLACE AFTER PROMPT 1 WITH REAL DISCOVERED PATH]
- Sources: nextdoor_sources.json + Craigslist config
- Health scripts: verify_hunters.py, monitor_hunter_sla.py, agent_self_check.py
- Output target: Supabase social_leads

Severity rules:
- feeds empty > expected interval = SEV 3
- scanner/scheduler down = SEV 3
- 100% lead rejection anomaly = SEV 2 minimum
- parser drift / source format drift = SEV 2 minimum
