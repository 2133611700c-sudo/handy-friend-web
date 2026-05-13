# ChatGPT Handoff

OpenClaw returns structured output for ChatGPT decision:

- Goal
- Facts
- Evidence
- Unknowns
- Risks
- Recommended next action

Rules:

- Do not claim DONE without verification evidence.
- Use `PASS | FAIL | BLOCKED | DEGRADED`.
- If uncertain, return `BLOCKED` or `UNVERIFIED` wording in details.
