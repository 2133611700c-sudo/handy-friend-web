# Architectural Decisions (ADR Log)

## D-001
- Date: 2026-03-10
- Context: Atlas, ChatGPT app, and Codex do not provide guaranteed shared live context.
- Decision: Use repository files + git history as the explicit handoff layer.
- Consequences: Higher discipline required; in return, execution is reproducible and auditable.
- Status: Accepted

## D-002
- Date: 2026-03-10
- Context: Need continuity across sessions without relying on chat memory.
- Decision: Mandatory contracts: `EXEC_SPEC.md`, `STATUS.md`, `RUN_REPORT.md`, `VALIDATION_CHECKLIST.md`, `DECISIONS.md`.
- Consequences: Slight documentation overhead; major reduction in context loss.
- Status: Accepted
