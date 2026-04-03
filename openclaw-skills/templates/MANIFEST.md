# OpenClaw Template Library — MANIFEST

**Version:** 2026-03-30
**Total Templates:** 13 services × 2 platforms = 26 templates
**Last Updated:** 2026-03-30T00:00:00Z

---

## Service Registry

| Service ID | Name | Keywords | Nextdoor | Facebook | Priority | Scope |
|-----------|------|----------|----------|----------|----------|-------|
| `tv_mounting` | TV Mounting | tv, mount, hang | ✅ | ✅ | 🔴 HIGH | GREEN |
| `kitchen_cabinet_painting` | Cabinet Painting | cabinet, kitchen, paint, doors, drawer | ✅ | ✅ | 🔴 HIGH | GREEN |
| `interior_painting` | Interior Painting | paint, walls, ceiling, room | ✅ | ✅ | 🔴 HIGH | GREEN |
| `flooring` | Flooring Installation | floor, laminate, lvp, vinyl | ✅ | ✅ | 🔴 HIGH | GREEN |
| `drywall` | Drywall Repair | drywall, hole, patch, wall | ✅ | ✅ | 🟡 MEDIUM | GREEN |
| `furniture_assembly` | Furniture Assembly | assemble, ikea, bed, dresser, furniture | ✅ | ✅ | 🟡 MEDIUM | GREEN |
| `art_mirrors` | Art & Mirror Hanging | mirror, art, picture, curtain rod, hang | ✅ | ✅ | 🟢 LOW | GREEN |
| `furniture_painting` | Furniture Painting | paint furniture, refinish, dresser, chair, table | ✅ | ✅ | 🟢 LOW | GREEN |
| `plumbing` | Plumbing | faucet, toilet, shower, plumbing | ✅ | ✅ | 🟢 LOW | GREEN |
| `electrical` | Electrical | light, fixture, outlet, switch, electric | ✅ | ✅ | 🟢 LOW | GREEN |
| `door_installation` | Door Installation | door, install, prehung, slab | ✅ | ✅ | 🟡 MEDIUM | GREEN |
| `vanity_installation` | Vanity Installation | vanity, bathroom, sink | ✅ | ✅ | 🟢 LOW | GREEN |
| `backsplash` | Backsplash Installation | backsplash, tile, kitchen | ✅ | ✅ | 🟢 LOW | GREEN |

---

## Template Structure

Each service template follows this structure:

```js
{
  service_id: "tv_mounting",
  service_name: "TV Mounting",
  category: "wall_install",
  scope: "GREEN",
  priority: 1,

  keywords: [
    // English
    "tv mount", "hang tv", "mount a tv", "mount tv",
    "television", "tv install", "tv installation",
    // Russian
    "монтаж тв", "повесить тв", "тв монтаж",
    // Spanish
    "montaje tv", "montar tv", "televisor"
  ],

  price_range: "competitive pricing-185",
  price_comment: "Standard competitive pricing, hidden wire competitive pricing",

  platforms: {
    nextdoor: {
      template: "Hi [name]! TV mounting is exactly what we do. Standard setup competitive pricing, hidden wire competitive pricing Professional & insured, free estimate. (213) 361-1700",
      char_limit: 280,
      word_count: 26,
      price_mentioned: true,
      tone: "friendly_specific"
    },
    facebook: {
      template: "Handy & Friend here! We install TVs professionally. Standard mount competitive pricing, hidden wire competitive pricing Check our work at handyandfriend.com — (213) 361-1700",
      char_limit: 280,
      word_count: 25,
      price_mentioned: true,
      tone: "professional_brand"
    }
  }
}
```

---

## Detection Rules

**Service Detection Algorithm:**

1. **Exact Match:** If post contains any keyword (case-insensitive)
2. **Scoring:**
   - 1+ keyword match = candidate
   - Multiple matches = higher confidence
3. **Priority Tiebreaker:**
   - If multiple services match, select highest priority (1=highest)
   - TV Mounting > Cabinet Painting > Interior Paint > Flooring > Others

**Fallback:** If no service detected → use generic GREEN template (current rotation)

---

## File Structure

```
openclaw-skills/templates/
├── MANIFEST.md (this file)
├── nextdoor-templates.js (13 service templates for Nextdoor)
├── facebook-templates.js (13 service templates for Facebook)
├── template-detector.js (detectService() function)
└── fallback-templates.js (generic GREEN/YELLOW/RED templates)
```

---

## Integration Points

### nextdoor-hunter/SKILL.md
- Import: `nextdoor-templates.js`
- Phase 3 Modification:
  ```
  service_id = detectService(post_text)
  if (service_id) {
    template = nextdoor_templates[service_id].template
  } else {
    template = GENERIC_GREEN_TEMPLATE
  }
  ```

### facebook-hunter/SKILL.md
- Import: `facebook-templates.js`
- Phase 3 Modification: Same as Nextdoor

---

## Localization

**Languages Supported:**
- English
- Russian
- Spanish
- Ukrainian (Russian keywords reused)

**Detection:** Language inferred from keyword match

---

## Metrics

**Template Performance Tracking:**
- Field: `template_used` → service_id (e.g., "tv_mounting")
- Tracked in: `/api/hunter-lead` → `template_used` field
- Analytics: Count responses per service template → optimize high-converting templates

---

## Change History

- **2026-03-30** — Initial creation, 13 services, 26 templates, Nextdoor+Facebook

---

## Next Steps

1. ✅ Create MANIFEST.md (this file)
2. ⏳ Create nextdoor-templates.js
3. ⏳ Create facebook-templates.js
4. ⏳ Create template-detector.js
5. ⏳ Create fallback-templates.js
6. ⏳ Update nextdoor-hunter/SKILL.md
7. ⏳ Update facebook-hunter/SKILL.md
8. ⏳ Test & deploy
