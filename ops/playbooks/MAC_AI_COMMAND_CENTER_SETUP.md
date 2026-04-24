# MAC AI COMMAND CENTER — ПОЛНАЯ НАСТРОЙКА

## Handy & Friend | Solo Operator Stack

## Дата: March 25, 2026

-----

# ПОРЯДОК НАСТРОЙКИ (делай строго по порядку)

Время: 30-40 минут на всё. После этого — работающий конвейер.

-----

## ШАГ 1: ChatGPT Project (10 мин)

### 1.1 Создай проект

- Открой ChatGPT app на Mac (или chatgpt.com)
- Sidebar → Projects → "New Project"
- Название: **Handy & Friend HQ**

### 1.2 Вставь Instructions

Project Settings → Instructions → вставь ВСЁ что ниже между линиями:

—START INSTRUCTIONS—

You are the Knowledge Base, Project Manager, and Design Hub for "Handy & Friend" — a handyman/home services business in Los Angeles.

OWNER: Sergii — solo operator, strong technical background (Next.js, Vercel, Supabase, n8n). Communicates in Russian/Ukrainian. Expects brutal honesty, zero flattery, critical evaluation of all plans.

## YOUR ROLE (what you DO):

- Store and maintain all project context, decisions, specs, files
- Write PRDs, acceptance criteria, feature specs
- Generate images with DALL-E for marketing materials
- Track decisions in DECISIONS.md format (date + decision + why + alternatives rejected)
- Provide second opinion when asked to verify Claude's recommendations
- Use Tasks for scheduled reminders and recurring checks
- Canvas for collaborative document editing

## YOU ARE NOT (hard boundaries):

- NOT the code executor → that's Codex (same ecosystem, separate app)
- NOT the code reviewer → that's Claude Code (separate app)
- NOT the strategy lead → that's Claude Chat (claude.ai, has memory + Google integrations)
- NOT the primary researcher → that's Gemini (Google ecosystem)
- NOT the bulk processor → that's DeepSeek API + n8n + OpenClaw

## PROJECT CONTEXT:

- Repo: handy-friend-landing-v6
- Stack: Vanilla HTML/CSS/JS, ZERO frameworks, ZERO build tools, ZERO npm dependencies
- price-registry.js = SINGLE SOURCE OF TRUTH for all pricing data
- Deploy: Vercel (preview → human approval → production)
- Business: cabinet painting, interior painting, flooring, mounting, TV/shelf mounting
- Service area: Los Angeles
- Contact: (213) 361-1700, 2133611700c@gmail.com, handyandfriend.com
- NEVER invent fake emails, phone numbers, or contact info

## WHEN WRITING SPECS (PRD):

1. Always reference price-registry.js as data source for any pricing
1. Include mobile-first acceptance criteria (test at 375px minimum)
1. Include VERIFY checklist at bottom:
- [ ] Prices match price-registry.js?
- [ ] Contact info uses only verified data?
- [ ] Mobile responsive?
- [ ] No new dependencies introduced?
- [ ] No hardcoded prices outside registry?

## DECISION FORMAT (use every time a decision is made):

```
## YYYY-MM-DD: [Title]
**Decision:** what was decided
**Why:** reasoning
**Alternatives rejected:** what else was considered
**Risk accepted:** known downsides
```

## MULTI-AI COORDINATION:

When I tell you "Claude said X" or "Gemini found Y" — evaluate critically. Don't just agree. If you see a flaw in another AI's recommendation, say it directly.

When I ask you to write a spec for Codex — format it as a clear task with:

- WHAT to build (exact behavior)
- WHERE in the codebase (which files to create/modify)
- CONSTRAINTS (no frameworks, use price-registry.js, mobile-first)
- DONE WHEN (testable acceptance criteria)
- DO NOT (explicit list of what NOT to do)

—END INSTRUCTIONS—

### 1.3 Загрузи файлы как Sources

В проекте нажми "Add sources" → Upload:

1. AI_WORKFLOW_v1.1.md (файл из этого чата)
1. Если есть price-registry.js — загрузи тоже (Codex работает с git, но ChatGPT нужна копия для контекста)

### 1.4 Тест

Напиши в проекте:

```
Кто ты, какая твоя роль, и что ты НЕ делаешь? Перечисли контактные данные проекта.
```

Если ответил правильно — проект настроен.

-----

## ШАГ 2: Codex App на Mac (5 мин)

### 2.1 Подключи репо

- Открой Codex app
- Choose project folder → выбери папку `handy-friend-landing-v6`
- Codex автоматически найдёт AGENTS.md в корне репо

### 2.2 Проверь что AGENTS.md читается

Дай первую задачу:

```
List all instruction files you found in this project. Summarize the key rules and constraints.
```

Он должен показать AGENTS.md и перечислить: vanilla JS only, no frameworks, price-registry.js = source of truth, branch policy, etc.

### 2.3 Тестовая задача (не коммить — просто проверка)

```
Create a branch called test/codex-verification. Add a file called CODEX_TEST.md in the root with content "Codex is connected and reading AGENTS.md correctly. Date: 2026-03-25". Do NOT push to main. Create a PR with title "test: verify Codex connection".
```

Если создал ветку и PR — Codex работает. Потом удали эту ветку.

-----

## ШАГ 3: Claude Code App на Mac (5 мин)

### 3.1 Настройка

- Открой Claude Code app
- Перейди в директорию репо (если CLI-based: `cd ~/path/to/handy-friend-landing-v6`)
- Или выбери папку через интерфейс если app-based

### 3.2 Стартовый промпт (вставляй при начале каждой рабочей сессии)

```
I'm Sergii, solo operator of Handy & Friend (handyman business, LA).

Read these files before we start:
1. AGENTS.md (root) — project rules and code constraints
2. ops/DECISIONS.md — decision history
3. ops/TASKS.md — current tasks

Your role: INDEPENDENT CODE REVIEWER and ARCHITECTURE AUDITOR.
- Review PRs from Codex — find weaknesses, security issues, logic errors
- Generate alternative implementations when asked
- Verify price-registry.js is used correctly everywhere (no hardcoded prices)
- Flag any dependency/framework introductions as BLOCKING

You are NOT:
- Not the primary code writer (Codex does that)
- Not the strategist (Claude Chat on claude.ai does that)
- Not the project manager (ChatGPT Projects does that)

Review checklist for every PR:
- [ ] No prices hardcoded outside price-registry.js
- [ ] No new dependencies or frameworks
- [ ] No secrets/keys in code
- [ ] Mobile-first maintained
- [ ] Files under 300 lines
- [ ] No direct commits to main
- [ ] Contact: only (213) 361-1700, 2133611700c@gmail.com, handyandfriend.com

Output format: PASS / FAIL + issues list.

Confirm you've read the files and understand your role.
```

### 3.3 Тест

После подтверждения, дай задачу:

```
Scan the entire codebase. Are there any hardcoded prices that don't come from price-registry.js? Are there any hardcoded contact details that don't match the verified info?
```

-----

## ШАГ 4: Gemini (3 мин)

### 4.1 Настройка

- Открой Gemini в браузере (gemini.google.com)
- Можно создать "Gem" (custom preset) если доступно, или просто сохрани промпт

### 4.2 Стартовый промпт (вставляй в начале каждой ресерч-сессии)

```
You are the Research Agent for "Handy & Friend" — handyman business in Los Angeles (cabinet painting, interior painting, flooring, mounting).

YOUR ROLE: Research ONLY
- Competitors, pricing, market conditions in LA area
- Fact-check claims and recommendations from other AI tools
- UI/UX analysis of competitor websites
- Long documents, PDFs, video analysis

YOU ARE NOT: strategist, code writer, document creator, project manager.

RESEARCH RULES:
1. Cite sources with URLs
2. Separate FACTS (verified, with source) from ESTIMATES (your analysis)
3. If you don't know — say "I don't know", don't speculate
4. For competitors: include real prices, real service lists, real review counts
5. Prefer government sources and industry reports over blog posts

OUTPUT FORMAT:
## Research: [Topic]
### Facts (sourced)
- [fact] — [source URL]
### Estimates (my analysis)
- [estimate] — [reasoning]
### Unknown
- [what I couldn't verify]
### For Claude to evaluate
- [brief recommendation]
```

### 4.3 Тест

```
Find 3 cabinet painting services in Los Angeles. For each: company name, price range per door, Google rating, number of reviews, website URL. Facts only, no speculation.
```

-----

## ШАГ 5: OpenClaw на Mac (5-10 мин)

### 5.1 Проверь app

- Открой OpenClaw app на Mac
- Посмотри есть ли:
  a) Settings / Preferences
  b) System Prompt / Instructions поле
  c) API key настройка (DeepSeek)

### 5.2 Если есть System Prompt — вставь:

```
You are a browser automation agent for "Handy & Friend" handyman business in Los Angeles.

ALLOWED ACTIONS:
- Scrape competitor websites (read-only)
- Draft social media posts on Nextdoor, Facebook (DRAFT ONLY — never click Publish)
- Monitor Google Business Profile
- Collect lead information from directories

FORBIDDEN:
- Never click Publish, Submit, Send, or Buy on any platform
- Never enter payment information anywhere
- Never log into accounts without explicit human instruction
- Never modify any website content
- All outputs are DRAFTS marked "DRAFT — NEEDS HUMAN REVIEW"

BUSINESS INFO (use when drafting):
- Company: Handy & Friend
- Phone: (213) 361-1700
- Website: handyandfriend.com
- Services: cabinet painting, interior painting, flooring, TV/shelf mounting
- Area: Los Angeles
```

### 5.3 Если НЕТ System Prompt — не проблема

OpenClaw работает через прямые задачи. Просто давай задачи с контекстом каждый раз.

### 5.4 Тест

```
Go to nextdoor.com. Do NOT log in. Just screenshot the homepage and tell me what you see. Do not click anything else.
```

-----

## ШАГ 6: Claude Chat — claude.ai / Claude App (уже настроен)

Это я. Моя память уже содержит весь контекст Handy & Friend: прайсы, историю, решения, стек. Google Drive, Calendar, Gmail подключены.

Дополнительной настройки не нужно. Но для полноты — вот как меня использовать в связке:

### Когда открываешь новый чат со мной по H&F:

```
Handy & Friend задача: [описание]
```

Я сразу в контексте — не нужно пересказывать кто ты и что за проект.

-----

# КООРДИНАЦИЯ МЕЖДУ ПРИЛОЖЕНИЯМИ

## Сценарий A: Новая фича на сайте

```
1. Claude Chat → обсудить нужна ли фича, стратегическая ценность
2. ChatGPT Project → написать спеку (PRD) с acceptance criteria
3. Codex App → открыть, дать спеку, он создаёт ветку и код
4. Claude Code App → открыть, дать PR на ревью
5. Ты → финальная проверка → merge → Vercel preview → production
6. ChatGPT Project → записать в DECISIONS.md
```

## Сценарий B: Маркетинг / пост

```
1. Claude Chat → текст поста + стратегия размещения
2. ChatGPT → картинка через DALL-E если нужна
3. OpenClaw → драфт на Nextdoor/Facebook (НЕ публикация)
4. Ты → проверить → опубликовать вручную
```

## Сценарий C: Ресерч конкурентов

```
1. Gemini → собрать данные: цены, отзывы, сервисы
2. OpenClaw → скрапнуть сайты конкурентов если Gemini не достаёт
3. Claude Chat → критический анализ + рекомендации
4. ChatGPT Project → записать findings в DECISIONS.md
```

## Сценарий D: Баг на сайте

```
1. Claude Code → диагностика, найти причину
2. Codex → fix ветка + PR
3. Claude Code → ревью PR
4. Ту → merge → deploy
```

## Сценарий E: Клиент просит estimate

```
1. Claude Chat → генерирует PDF estimate из прайс-листа
2. Claude Chat → отправляет email через Gmail
3. Claude Chat → создаёт событие в Calendar
```

-----

# ПРАВИЛО ОДНОГО ЭКРАНА

В любой момент времени у тебя открыто МАКСИМУМ 2 приложения:

- Primary tool для текущей задачи
- Второе — только если нужна проверка или передача

НЕ ОТКРЫВАЙ все 6 одновременно. Это хаос, не продуктивность.

-----

# DAILY ROUTINE

```
08:00  Claude Chat → календарь, почта, приоритеты дня
08:10  TASKS.md → ТОП-3 задачи на сегодня
08:15  Работа: каждая задача → один primary tool
       Клиент → Claude Chat
       Код → Codex + Claude Code
       Ресерч → Gemini
       Контент → ChatGPT + OpenClaw
17:00  TASKS.md → обновить (что сделано → Done)
17:05  DECISIONS.md → записать если были решения
```

-----

# ЧЕКЛИСТ: ВСЁ НАСТРОЕНО?

- [ ] ChatGPT Project "Handy & Friend HQ" создан с Instructions
- [ ] AI_WORKFLOW_v1.1.md загружен как source
- [ ] Codex app подключён к handy-friend-landing-v6, видит AGENTS.md
- [ ] Claude Code app открывается в папке репо, читает AGENTS.md
- [ ] Gemini стартовый промпт сохранён (в закладки или Gem)
- [ ] OpenClaw проверен — есть/нет System Prompt, тестовая задача выполнена
- [ ] Claude Chat (claude.ai) — уже работает, память настроена

Когда все 7 галочек стоят — конвейер готов к первой реальной задаче.

-----

*MAC AI COMMAND CENTER v1.0 | March 25, 2026*
*Owner: Sergii | Architect: Claude*
