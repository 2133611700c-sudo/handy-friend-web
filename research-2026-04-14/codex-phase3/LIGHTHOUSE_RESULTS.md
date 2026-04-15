# Lighthouse Live Audit — 2026-04-15

## Mobile
- Performance: 42/100
- Accessibility: 88/100
- Best Practices: 58/100
- SEO: 100/100

### Core Web Vitals (mobile)
- LCP: 11.9 s (target <2.5s)
- FID/INP: n/a (target <200ms)
- CLS: 0.003 (target <0.1)
- TBT: 660 ms
- Speed Index: 13.3 s

## Desktop
- Performance: 87/100
- Accessibility: 88/100
- Best Practices: 58/100
- SEO: 100/100

### Core Web Vitals (desktop)
- LCP: 2.4 s (target <2.5s)
- FID/INP: n/a (target <200ms)
- CLS: 0.025 (target <0.1)
- TBT: 60 ms
- Speed Index: 1.1 s

## Top 5 issues found
1. Reduce unused JavaScript — Est savings of 582 KiB
2. First Contentful Paint — 3.4 s
3. Largest Contentful Paint — 11.9 s
4. Speed Index — 13.3 s
5. Total Blocking Time — 660 ms

## Recommended actions (no code changes — report only)
- Compress and resize hero/gallery images; serve modern formats where possible.
- Reduce render-blocking CSS/JS and defer non-critical scripts.
- Remove or split unused JavaScript loaded on first paint.
- Improve server response consistency and cache static assets aggressively.
- Re-run Lighthouse after each image and script optimization batch to confirm gains.

## Notes
- The provided command with `--preset=mobile` failed on Lighthouse v13 (invalid preset value). Mobile audit was run using the default preset; desktop used `--preset=desktop`.
