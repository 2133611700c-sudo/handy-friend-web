# Raw Artifacts Closeout

Status: ACTIVE

## Goal

Move from prepared automation to verified results.

## Required artifacts

### Alex Smoke

- workflow name: `Alex Smoke`
- expected output: production chat POST result
- attach result to issue #70 or #96

### Supabase SQL Reports

- workflow name: `Supabase SQL Reports`
- required secret: `SUPABASE_DATABASE_URL`
- expected output: uploaded artifact with SQL report files
- attach artifact summary to issue #95 or #97

### Ads and GA4

- verify linked GA4 and Ads
- verify auto-tagging
- verify imported conversion actions
- attach UI evidence to issue #81

### Vercel Deployment Checks

- configure required checks in Vercel project settings
- attach settings evidence to issue #76

## Rule

If there is no artifact, log, or screenshot, the item remains OPEN.
