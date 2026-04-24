# AI Workflow — Solo Operator Playbook v1.1

**Author:** Sergii + Claude | **Updated:** March 25, 2026
**Rule #0:** This document is alive. Update only when workflow actually changes, not for process sake.

---

## 1. TOOL INVENTORY

| Tool | Access | Strength |
|------|--------|----------|
| **Claude** (Opus 4.6) | App: Mac, iOS, Web | Memory across chats, Google Drive/Calendar/Gmail, files, web search, code, strategy, long context |
| **ChatGPT + Projects** | App: Mac, iOS, Web | Persistent project knowledge base (files, sources, instructions across sessions), DALL-E, Canvas, Tasks |
| **Codex** (OpenAI) | App | Autonomous coding tasks, isolated worktrees, PR diffs on GitHub, reads AGENTS.md |
| **Gemini** | Browser | Google ecosystem, long documents, video analysis, multimodal, fast research |
| **DeepSeek API** | API | Cheap tokens for bulk tasks via n8n/OpenClaw |
| **OpenClaw** | Desktop | Browser automation: scraping, monitoring, post drafts |
| **n8n** | Self-hosted/Cloud | Workflow orchestration |

---

## 2. ROLE DISTRIBUTION

### Routing Table

| Task | Primary Tool | Can Also | DO NOT Use |
|------|-------------|----------|------------|
| Strategic decision | Claude | ChatGPT (2nd opinion) | DeepSeek |
| Client-facing document | Claude (files) | — | ChatGPT |
| Project context storage | ChatGPT Projects | Git /ops | Notes in head |
| Image generation | ChatGPT (DALL-E) | — | — |
| Code on GitHub | Codex | Claude Code (review) | ChatGPT chat |
| Code review | Claude Code | — | — |
| Market research / fact-check | Gemini | Claude (web search) | DeepSeek |
| Verify Claude recommendations | Gemini | ChatGPT | — |
| Calendar / email / Drive | Claude | Gemini (Google native) | — |
| Bulk parsing | DeepSeek + n8n | — | Claude, ChatGPT |
| Browser automation | OpenClaw | — | Manual |
| Scheduled checks | ChatGPT Tasks | — | — |

---

## 3. PROJECT STRUCTURE

### Git repo + /ops (for code projects)

```
project-repo/
├── /ops
│   ├── PRD.md              ← Product Requirements
│   ├── TASKS.md            ← current tasks (source of truth)
│   ├── DECISIONS.md        ← key decisions + date + WHY
│   ├── PROMPTS.md          ← working prompts for each AI
│   ├── AGENTS.md           ← instructions for Codex (see below)
│   └── STATUS.md           ← weekly status
├── /src
├── /docs
└── README.md
```

### ChatGPT Project (for each active project)

```
Project: [Project Name]
├── Instructions          ← system prompt for project
├── Sources               ← uploaded files, links, context
├── Conversations         ← decision history
└── Tasks                 ← regular checks if needed
```

---

## 4. DAILY WORKFLOW

### Morning (5 min)
1. Claude → calendar, email, urgent items
2. What moves money today? → TOP-3 tasks

### For each task — routing
```
TASK
  │
  ▼
Brings money in ≤45 days?
  │
  YES ──────────── NO → defer / drop
  │
  ▼
Task type → Primary tool
  │
  ├── Client → Claude
  ├── Code → Codex
  ├── Research → Gemini → Claude
  ├── Content → ChatGPT (DALL-E)
  ├── Routine ×100 → DeepSeek + n8n
  └── Scrape → OpenClaw
  │
  ▼
VERIFY (built into each type — see section 5)
  │
  ▼
DONE → result recorded
```

### Evening (5 min)
- What was done → what worked → what's tomorrow

---

## 5. PIPELINES WITH VERIFY GATE

### A. Client — Handy & Friend
```
Client request
  → Claude: generate estimate (PDF)
  → VERIFY: prices from price list correct? contacts correct?
     client name right? total adds up?
  → Claude: send (email/SMS)
  → Claude: Calendar — work date
```

### B. Website Feature
```
Idea
  → ChatGPT Project: spec in PRD.md, acceptance criteria
  → Codex: branch + code + tests (reads AGENTS.md)
  → Claude Code: architecture review, weak spots
  → VERIFY: tests pass? lint clean? preview works?
     no hardcoded data? mobile version ok?
  → You: final check → merge → deploy
  → ChatGPT Project: update DECISIONS.md
```

### C. Market Research / New Idea
```
Hypothesis
  → Gemini: data, competitors, prices, market size
  → Claude: critical analysis (competitive breakdown,
     real numbers, what's unknown — explicitly stated)
  → VERIFY: sources checked? numbers from primary sources?
     Claude and Gemini agree? if not — what's the gap?
  → DECISIONS.md: go / no-go + WHY + what's unknown
```

### D. Marketing / Content
```
Content task
  → Claude: post text / strategy
  → ChatGPT: image (DALL-E) if needed
  → OpenClaw: draft on platform (Nextdoor/FB)
  → VERIFY: claims truthful? no false promises?
     phone / website correct? image appropriate?
  → You: manual check → publish
```

### E. Bulk Processing
```
Repeating task (>10 times)
  → n8n workflow + DeepSeek API
  → VERIFY: spot check 5-10 results manually
  → Result → Google Sheet / Supabase
```

---

## 6. RISK PROTECTION

| Risk | Control |
|------|---------|
| Decisions disappear into chats | No DECISIONS.md entry = no decision |
| One AI hallucinations | Critical facts verified through second AI (Claude ↔ Gemini) |
| Overengineering (main historical issue) | "≤45 days to money" filter on every task input |
| Context loss between sessions | Claude = memory. ChatGPT Projects = files. Git = code |
| Desync between agents | One primary tool per task. Others only on escalation |
| Secrets/keys leak | Only .env / secret manager. Never in chat or prompt |
| DeepSeek outputs garbage | DeepSeek not for final texts. Always spot check |

---

## 7. ANTI-PATTERNS

- Do NOT build "unified system" from 5 AIs — each is autonomous in its zone
- Do NOT use DeepSeek for client-facing texts
- Do NOT automate what you do <2x per week
- Do NOT spend >15 min configuring workflow — if it doesn't work, change approach
- Do NOT jump between 5 windows for one task — 1 task = 1 primary tool
- Do NOT start infrastructure before first paying customer
- Do NOT accept AI recommendations without checking competitors and real numbers

---

## 8. SUCCESS METRIC

This workflow works if:
1. Every day you know TOP-3 tasks and primary tool for each
2. No tool is idle AND no tool duplicates another
3. Decisions recorded in DECISIONS.md, not "in your head"
4. Time from task to result is shrinking
5. VERIFY gate catches errors BEFORE they reach client

---

## 9. WHEN TO UPDATE THIS DOCUMENT

- Second active project appears → add pipeline
- Hired someone → add roles and escalation policy
- Changed tool → update routing table
- Workflow doesn't work >1 week → analyze why, update

---

*v1.1 | March 25, 2026*
