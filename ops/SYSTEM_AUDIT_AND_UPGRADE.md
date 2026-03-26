# SYSTEM AUDIT & UPGRADE PLAN
# Handy & Friend AI Exoskeleton
# March 26, 2026

---

## PART 1: CRITICAL GAPS

### GAP 1: OpenClaw at 5% capacity
CURRENT: Browser scraping and draft posts only.
REAL CAPABILITIES: WhatsApp/Telegram bot, cron jobs, SKILL.md system, persistent memory, shell commands, file read/write, browser CDP, ClawHub skills.

### GAP 2: No automated lead capture
Missing: No monitoring of Nextdoor, Craigslist, Facebook groups for "need handyman" posts.

### GAP 3: No automated client follow-up
Missing: No automated "thank you + review request" 48 hours after service.

### GAP 4: No proactive monitoring
Missing: No automated uptime monitoring, competitor price tracking, review monitoring.

---

## PART 2: OPENCLAW UPGRADE PLAN

### Priority 1: WhatsApp Auto-Responder (MONEY IN ≤14 DAYS)
- OpenClaw answers WhatsApp messages from potential clients
- Reads price-registry.js for current prices
- Collects client info, flags hot leads
- NEVER confirms bookings — "Sergii will call you within 1 hour"
- Cost: ~$0.50/day DeepSeek tokens

### Priority 2: Lead Hunter Cron Job (MONEY IN ≤30 DAYS)
- Scans Nextdoor and Craigslist every 2 hours for "need handyman"
- READ ONLY — never post or reply
- Alerts Sergii via WhatsApp for hot leads
- Schedule: 8am-8pm PT

### Priority 3: Post-Service Follow-Up (MONEY IN ≤30 DAYS)
- 48 hours after job completion, auto-send review request
- Google Review link: handyandfriend.com/review
- Only send once per client, never to complainers

### Priority 4: Competitor Price Monitor (ONGOING)
- Weekly scan of top 5 competitor websites
- Compare to price-registry.js
- Alert if competitor undercuts by 20%+

---

## PART 3: SKILL FILES

Skills created in: ~/handy-friend-landing-v6/openclaw-skills/

| Skill | File | Purpose |
|-------|------|---------|
| client-inquiry-handler | SKILL.md | WhatsApp auto-responder |
| lead-hunter | SKILL.md | Nextdoor/CL lead scanning |
| review-requester | SKILL.md | Post-job review requests |
| competitor-monitor | SKILL.md | Weekly competitor pricing |

---

## PART 4: CLAUDE CODE STARTUP ALIASES

Add to ~/.zshrc:

```bash
alias hf-review='cd ~/handy-friend-landing-v6 && claude "Read AGENTS.md and ops/DECISIONS.md. You are the architecture reviewer for Handy & Friend. Confirm you understand the project rules."'

alias hf-audit='cd ~/handy-friend-landing-v6 && claude "Scan entire codebase. Check for: hardcoded prices not from price-registry.js, wrong contact info, secrets in code. Report findings."'
```

---

## PART 5: SECURITY RULES FOR OPENCLAW

1. NEVER store API keys in SKILL.md files
2. NEVER allow OpenClaw to confirm bookings or accept payments
3. NEVER allow auto-posting on social media (drafts only)
4. NEVER allow file deletion without explicit human command
5. WhatsApp auto-responder: ALWAYS include "Sergii will confirm personally"
6. Lead hunter: READ ONLY on all platforms
7. Keep DeepSeek as model (cheap + sufficient)
8. Review OpenClaw logs daily for first 2 weeks
9. Backup openclaw-skills/ to git weekly

---

## PART 6: MONEY TIMELINE

| Action | Tool | Days to Revenue | Cost |
|--------|------|----------------|------|
| WhatsApp auto-responder | OpenClaw | 7-14 days | ~$15/mo |
| Lead hunter (ND/CL) | OpenClaw | 14-30 days | $0 |
| Review requests | OpenClaw | 30-45 days | $0 |
| Before/after gallery | Codex+Claude | Done | $0 |
| Competitor monitoring | OpenClaw | Ongoing | $0 |

TOTAL NEW COST: ~$15/mo DeepSeek tokens

---

## PART 7: IMPLEMENTATION ORDER

### Week 1 (NOW):
- [ ] Connect OpenClaw WhatsApp channel
- [ ] Deploy client-inquiry-handler SKILL.md
- [ ] Test with own WhatsApp number
- [ ] Before/after gallery on site (DONE)

### Week 2:
- [ ] Deploy lead-hunter SKILL.md + cron
- [ ] Add hf-review alias to terminal
- [ ] Create completed-jobs.json template

### Week 3:
- [ ] Deploy review-requester SKILL.md
- [ ] Deploy competitor-monitor SKILL.md
- [ ] First competitor report generated
- [ ] All skills tested and stable

---

*SYSTEM AUDIT v1.0 | March 26, 2026*
