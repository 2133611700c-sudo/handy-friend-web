# BEFORE Snapshot — Pre-Migration 014
## Captured: 2026-03-09T20:02:09Z

### Table Counts
| Table | Count |
|-------|-------|
| leads | 79 |
| jobs | 20 |
| lead_events | 160 |

### Leads Breakdown
| Category | Count |
|----------|-------|
| Total | 79 |
| Test (is_test=true) | 74 |
| Prod (is_test=false) | 5 |

### Prod Leads Detail
| ID | Stage | Name | Phone | Service |
|----|-------|------|-------|---------|
| lead_1773024.. | new | Sandra Kirby | 5758050706 | mirrors |
| lead_1773024.. | new | Sandra Kirby | 5758050706 | mirrors |
| lead_1773024.. | new | Sandra Kirby | 5758050706 | mirrors |
| lead_1773024.. | new | Sandra Kirby | 5758050706 | mirrors |
| chat_1772464.. | new | Unknown | 310-663-5792 | cabinet painting |

### Jobs (all unlinked)
| Status | Jobs | Revenue |
|--------|------|---------|
| Linked to leads | 0 | $0 |
| Unlinked | 20 | $3,925 |

### Dashboard Stats (BEFORE)
| Metric | Value | Problem |
|--------|-------|---------|
| leads_total | 79 | Includes 74 test leads |
| stale_leads | 75 | Includes test leads |
| conversion_rate | 0.0% | No pipeline progression |
| revenue | $0 | Pipeline disconnected from jobs |
| jobs_revenue | $3,425 | Real but not linked |
| jobs_completed | 17 | — |
| avg_job_rating | 4.76 | — |
