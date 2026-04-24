# EXOSKELETON — Claude Code Integration Map

> How Claude Code connects to every tool in the stack.
> Updated: 2026-03-26

## Architecture

```
                    ┌──────────────────────┐
                    │     CLAUDE CODE      │
                    │   (центр управления) │
                    └──────┬───────────────┘
                           │
          ┌────────────────┼────────────────────┐
          │                │                    │
    TERMINAL          CHROME MCP          VERCEL MCP
          │                │                    │
    ┌─────┴─────┐    ┌────┴────┐          ┌────┴────┐
    │ codex exec│    │ Gemini  │          │ deploy  │
    │ openclaw  │    │ ChatGPT │          │ logs    │
    │ gh CLI    │    │ any URL │          │ status  │
    │ curl      │    └─────────┘          └─────────┘
    └───────────┘
```

## Connection Methods

### 1. CODEX (Code Writer)
- **How:** `codex exec --full-auto -C $PROJECT_DIR "task"`
- **Output:** stdout + `--output-last-message logs/codex-last-output.txt`
- **Capabilities:** Read/write files, run commands in sandbox
- **Cannot:** Create git branches (sandbox restriction), push to remote
- **Bridge:** pipeline.sh handles git + PR around Codex

### 2. OPENCLAW (Browser Automation)
- **How:** `openclaw agent --message "task"` via terminal
- **Config:** DeepSeek API connected (`sk-67e97...`)
- **Model:** deepseek/deepseek-reasoner
- **Capabilities:** Scrape websites, draft posts, monitor pages
- **Cannot:** Publish content (safety rule)

### 3. GEMINI (Research)
- **How:** Chrome MCP → navigate to gemini.google.com → type prompt → read response
- **Capabilities:** Research, fact-check, competitor analysis, long docs
- **Latency:** Slower (browser interaction), use for research tasks only

### 4. CHATGPT (Knowledge Base)
- **How:** Chrome MCP → navigate to ChatGPT → interact with "Handy & Friend HQ" project
- **Capabilities:** DALL-E images, project context, specs, Canvas
- **Latency:** Slower (browser interaction)

### 5. GITHUB
- **How:** `gh` CLI — PRs, issues, actions, releases
- **Direct:** Full access, no browser needed

### 6. VERCEL
- **How:** Vercel MCP tools — deploy, logs, status, preview URLs
- **Direct:** Full access through MCP

### 7. PRODUCTION SITE
- **How:** `curl` for health checks, Chrome MCP for visual verification
- **Direct:** Both methods available

## Task Routing (Claude Code decides)

| Task Type | Tool | Method |
|-----------|------|--------|
| Write code | Codex | `codex exec` |
| Review code | Claude Code | Direct (I am Claude Code) |
| Research competitors | Gemini | Chrome MCP |
| Generate image | ChatGPT | Chrome MCP → DALL-E |
| Write spec/PRD | ChatGPT | Chrome MCP → HQ project |
| Scrape website | OpenClaw | `openclaw agent` |
| Draft social post | OpenClaw | `openclaw agent` |
| Deploy | Vercel | Vercel MCP |
| Check site health | curl | Terminal |
| Manage PRs | GitHub | `gh` CLI |
| Client estimate | Claude Code | Direct (PDF generation) |

## Quick Commands Reference

```bash
# Codex — write code
codex exec --full-auto -C ~/handy-friend-landing-v6 "task"

# OpenClaw — browser task
openclaw agent --message "scrape competitor prices from example.com"

# GitHub — PR management
gh pr list
gh pr create --title "..." --body "..."
gh pr merge N --squash

# Full pipeline — Codex + Claude review + PR
bash pipeline.sh "task description"

# Status check
bash exo.sh status
```
