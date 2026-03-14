# V4 Developer Change List
Date: 2026-03-14

## Scope
Exact implementation tasks derived from V4 audit.

## Changes
| Route/File | Current issue | Exact change | Priority | Owner | Validation |
|---|---|---|---|---|---|
| `/cabinet-painting` (source template path unresolved in current workspace) | Before/after currently reuse one image in some versions | Replace with two distinct assets (`before`, `after`) and add short proof caption under each | P0 | Dev + Sergii | Live HTML contains two different `img src`; manual visual check |
| `/cabinet-painting` | FAQ depth exists but proof density low | Add one dated project card (area + scope + duration + result) under BA block | P0 | Dev | Card visible in production; no placeholder text |
| `/services` | Discovery hub can be stronger for conversion | Add short proof snippets under top 3 services (cabinet, interior, TV) with links to matching pages | P1 | Dev | CTR to service pages improves; links live |
| `/review` redirect handler | Must remain permanent | Keep 301 redirect to Google write-review placeid URL | P0 | Dev | `curl -I /review` shows `301` + correct target |
| `/pricing/` behavior | Canonical split risk if slash/non-slash both 200 | Keep 301 `/pricing/` -> `/pricing` | P1 | Dev | `curl -I /pricing/` returns `301` |
| `sitemap.xml` generation source path unresolved | Risk of stale list or wrong lastmod | Enforce sitemap build to include exactly canonical URLs and fresh lastmod on content update | P1 | Dev | `loc_count` and lastmod verified after deploy |
| Lead follow-up automation script path unresolved | Inconsistent quote follow-up execution | Add trigger rule: when quote sent and no reply in 24h -> send follow-up script | P1 | Dev | Event log shows follow-up sent |
| Review request workflow script path unresolved | Review velocity low | Add post-job status hook: `completed` -> send review request template once | P0 | Dev | Sent-review log count matches completed jobs |
| KPI pipeline (`ops/KPI_SCOREBOARD.csv`) | Missing conversion/economics fields | Add columns for qualified leads, quotes sent, close rate, response SLA, review request rate | P0 | Codex | CSV has new headers + baseline row |
| Daily board (`ops/TODAY_EXECUTION_BOARD.md`) | Too broad action list | Replace with top-3 P0 actions tied to revenue blockers | P0 | Codex | Board updated with owner + verification |

## Notes
- Website source templates are not present in this workspace; route-level tasks are exact, file paths require repo path confirmation [Needs Verification].
- Do not deploy without preflight: `bash scripts/ops/vercel-preflight.sh`.
