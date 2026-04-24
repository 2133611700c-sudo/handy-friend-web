# AFTER Snapshot — Post-Migration 014
## Captured: 2026-03-09T20:19:46Z

### Table Counts
| Table | Count |
|-------|-------|
| leads | 79 |
| jobs | 20 |
| lead_events | 160+ |

### Leads Breakdown
| Category | Count |
|----------|-------|
| Total | 79 |
| Test (is_test=true) | 74 |
| Prod (is_test=false) | 5 |

### Jobs Linkage
| Status | Jobs | Revenue |
|--------|------|---------|
| Linked to leads | 0 | $0 |
| Unlinked | 20 | $3,925 |

### Dashboard Stats (AFTER — with is_test filter)
| Metric | Value | Change from BEFORE |
|--------|-------|--------------------|
| leads_total | 5 | ↓ from 79 (test filtered) ✅ |
| leads_prev | 0 | — |
| stale_leads | 1 | ↓ from 75 (test filtered) ✅ |
| conversion_rate | 0.0% | — (no pipeline progression yet) |
| revenue | $0 | — (pipeline disconnected from jobs) |
| jobs_revenue | $3,425 | — |
| jobs_completed | 17 | — |
| avg_job_rating | 4.76 | — |
| profit | $3,029.51 | NEW metric ✅ |
| expenses_total | $395.49 | — |
| leads_by_source | website_chat:1, google_ads_search:4 | — |
| leads_by_service | mirrors:4, cabinet_painting:1 | — |
| leads_total_all | 79 | NEW diagnostic ✅ |
| test_leads_count | 74 | NEW diagnostic ✅ |
| unmatched_jobs_count | 20 | NEW monitoring ✅ |
| jobs_linked_count | 0 | NEW monitoring ✅ |
| duplicate_leads_blocked | 40 | NEW monitoring ✅ |
| pipeline_progress_24h | 0 | NEW monitoring ✅ |

### Monitoring View (v_pipeline_monitoring)
| Metric | Value |
|--------|-------|
| duplicate_leads_blocked_24h | 1 |
| duplicate_leads_blocked_7d | 39 |
| unmatched_jobs_count | 20 |
| matched_jobs_count | 0 |
| pipeline_progress_24h | 0 |
| pipeline_progress_7d | 0 |
| prod_leads_total | 5 |
| test_leads_total | 74 |
| stale_leads | 1 |
| snapshot_leads_count | 79 |
| snapshot_jobs_count | 20 |

### DRY RUN Results
- **Jobs → Leads phone match: 0 matches**
- Reason: 5 prod leads (Sandra Kirby ×4 phone 5758050706, Unknown phone 3106635792) have no phone overlap with 20 job customers
- CONFIRM RUN was safe no-op for linking

### New DB Objects Created
| Object | Type | Purpose |
|--------|------|---------|
| phone_normalize(text) | Function | Normalize phone to 10-digit US format |
| advance_lead_stage(text, text, jsonb) | Function | Safe forward-only pipeline transitions |
| dashboard_stats(integer) | Function | Updated: filters is_test=false + 6 new metrics |
| v_pipeline_monitoring | View | Real-time dedup/linkage/pipeline health |
| _snapshot_014_leads | Table | Backup of leads before migration |
| _snapshot_014_jobs | Table | Backup of jobs before migration |
| _snapshot_014_lead_events | Table | Backup of lead_events before migration |
