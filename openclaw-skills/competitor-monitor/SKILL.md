---
name: competitor-monitor
description: Weekly scan of competitor websites for price changes in LA
---

# Competitor Monitor

## Schedule
Run every Monday at 9:00 AM PT

## Competitors to Track
1. Socal Cabinet Painting (Thumbtack)
2. Cabinet Painting by Adriano (Thumbtack)
3. Blue River Painting
4. Any new competitors found via Google search "cabinet painting Los Angeles"

## What to Capture
- Company name
- Services offered
- Price ranges (per door, per sqft, etc.)
- Google rating and review count
- Any promotions or discounts advertised

## Output
Generate: ~/handy-friend-landing-v6/ops/COMPETITOR_REPORT.md
Compare prices to our price-registry.js

## Alert
If a competitor's price is 20%+ lower than ours on any service — flag for Sergii

## Rules
1. READ ONLY — never interact with competitor sites
2. Use actual published prices only, never estimate
3. Include source URLs for all data
