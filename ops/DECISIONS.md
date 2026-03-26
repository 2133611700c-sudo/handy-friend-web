# DECISIONS.md — Key Decisions Log

> Rule: No record here = decision doesn't exist.
> Format: Date | Decision | WHY | Who decided

## 2026-03

| Date | Decision | Why | Notes |
|------|----------|-----|-------|
| 03-25 | Remove 20% combo discount | Was never real — false claim. Messaging now "Same Visit" only | Sergii |
| 03-25 | Adopt AI Workflow Playbook v1.1 | Solo operator needs clear tool routing to avoid waste | Sergii |
| 03-25 | Claude = Strategy & Ops primary tool | Best at memory, docs, client-facing, analytics | Playbook v1.1 |
| 03-25 | ≤45-day money filter on all tasks | Historical overengineering pattern — need revenue focus | Playbook v1.1 |
| 03-13 | Service pages launched (9 pages) | SEO + conversion: dedicated landing per service | Sergii |
| 03-10 | Daily report system via GitHub Actions | Automated KPI tracking, Telegram + email delivery | Sergii |
| 03-09 | Resend for email (not SendGrid) | Simpler API, verified domain, works with Vercel | Sergii |
| 03-09 | Zero-dependency policy for API functions | Vercel cold starts, simplicity, no supply chain risk | Sergii |
| 03-04 | Facebook Messenger via parent app (not test) | Test app can't go live, parent app already published | Sergii |
| 03-04 | DeepSeek API for Alex AI (not OpenAI) | 10x cheaper tokens, good enough for lead qualification | Sergii |

---
*Add every non-trivial decision here. Future you will thank present you.*
