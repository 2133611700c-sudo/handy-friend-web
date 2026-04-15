# Font Optimization Plan — 2026-04-15

Reference: [Optimize WebFont loading](https://web.dev/articles/optimize-webfont-loading)

## 1. Current state measurement
- Google Fonts references in live home HTML: 3
- Current `font-display: swap` occurrences in live home HTML: 0
- Current preload hints in live home HTML: 1
- Approximate `<head>` payload size (bytes): 14922

## 2. Ranked optimizations by LCP impact
1. Preload only the hero-critical Playfair Display 700 face.
2. Reduce initial font CSS request size by loading Latin-critical subset first.
3. Keep `font-display: swap` on all first-paint families.
4. Defer non-critical font families until after first render.
5. Optional: self-host critical font files in `/assets/fonts/` to reduce third-party latency.

## 3. Risks
- Subset-first strategy can miss non-Latin glyphs for RU/UA/HE views if not layered correctly.
- Self-hosting introduces asset/version management overhead and requires cache strategy updates.
- Aggressive deferral can produce visual shifts if fallback metrics are not tuned.

## 4. Implementation checklist (for Claude Block E.2)
- [ ] Replace current fonts.googleapis URL with smaller critical-first request.
- [ ] Add `<link rel=\"preload\" as=\"font\" crossorigin>` for Playfair 700.
- [ ] Move non-critical families to deferred load after DOMContentLoaded.
- [ ] Re-run mobile Lighthouse and target Performance >= 80 and LCP < 3s.

## 5. Rollback plan
- Revert the font optimization commit.
- Re-run Lighthouse to confirm baseline recovery.
- Redeploy baseline if metrics regress.
