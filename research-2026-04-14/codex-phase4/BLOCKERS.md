# Blockers — Phase 4 Codex Block F

## QA sweep scope mismatch (non-blocking for this commit)
The broad banned-word sweep across `lib/ scripts/ tests/` still returns pre-existing hits in files outside Block F ownership:
- `lib/alex-one-truth.js`
- `lib/lead-pipeline.js`
- `scripts/social_classifier.py`
- `tests/pricing-policy.test.js`

These files were not modified in this block per isolation rules.
All newly created Phase 4 files pass the banned-word sweep.
