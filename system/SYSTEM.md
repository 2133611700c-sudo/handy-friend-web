# Handy & Friend — Unified Multi-Agent System v1

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   CONTROL PLANE                      │
│  goal_parser → task_decomposer → provider_router     │
│  budget_allocator → risk_classifier → artifact_reg   │
└──────────┬──────────────┬──────────────┬────────────┘
           │              │              │
┌──────────▼──┐  ┌───────▼──────┐  ┌───▼───────────┐
│  EXECUTION  │  │   MEMORY     │  │    POLICY      │
│   PLANE     │  │   PLANE      │  │    PLANE       │
│             │  │              │  │                │
│ • Research  │  │ • Project    │  │ • Routing      │
│ • Code      │  │ • Operational│  │ • Budget       │
│ • Browser   │  │ • Skill      │  │ • Human Review │
│ • Media     │  │              │  │ • Publish Gate │
│ • Content   │  │              │  │ • Access       │
│ • Publishing│  │              │  │                │
│ • QA        │  │              │  │                │
└─────────────┘  └──────────────┘  └────────────────┘
```

## Planes

| Plane | Location | Purpose |
|---|---|---|
| Control | `control-plane/` | Orchestration, decomposition, routing |
| Execution | `execution-plane/` | Worker configs, provider abstractions |
| Memory | `memory-plane/` | Project facts, op logs, skill perf |
| Policy | `policy-plane/` | Rules, budgets, gates, access |
| Skills | `skill-registry/` | Formalized skill contracts |

## Provider Map

| Provider | Strengths | Use For |
|---|---|---|
| Claude (Opus/Sonnet) | Deep reasoning, code, planning | Control plane, code, strategy |
| Codex | Parallel coding, isolated worktrees | Feature work, refactor, tests |
| Gemini | Multimodal, image/video gen | Media, visual concepts |
| Perplexity | Real-time web research | Fresh facts, competitor intel |
| Cursor | IDE agent, browser testing | UI tests, quick coding loops |
| DeepSeek | Cheap reasoning/drafting | Bulk drafts, classification |
| OpenClaw | Browser automation | First-party sites, form fills |

## Quick Start

1. Read `policy-plane/routing-policy.yaml` for provider routing
2. Read `policy-plane/budget-policy.yaml` for cost limits
3. Browse `skill-registry/` for available skills
4. Check `memory-plane/` for operational context
