# Handy & Friend — Master Price Sheet
**Version:** 2026.04.24-v1-one-price  
**Source of truth:** `lib/price-registry.js`  
**Last updated:** 2026-04-24

---

## THE MODEL (read this first)

| | |
|---|---|
| **Service Call** | **$150** |
| Includes | Up to 2 hours on-site for the agreed scope |
| Additional labor | $75/hour — only after included 2h, only when approved in writing |
| Materials / parking / disposal | Extra only when stated in writing before work starts |

> All prices are **labor only**. Client provides materials unless otherwise written into the quote.

---

## $150 SERVICE CALL — small jobs (public price)

| Service | What's included | Quote-only variants |
|---|---|---|
| **TV Mounting** | Standard wall mount up to 65" on drywall or studs. Surface cable management. | Hidden-wire / in-wall wiring, fire-block walls |
| **Furniture Assembly** | Small to medium pieces fitting in 2 hours. IKEA shelves, desks, tables, small dressers. | PAX/Elfa closet systems, bed frames, multiple complex pieces |
| **Art & Mirror Hanging** | Up to 5 standard pieces, level-checked. Drywall or stud walls. | Gallery walls >5 pieces, oversized mirrors with structural anchoring |
| **Plumbing (minor)** | Faucet swap, shower head replacement, toilet tank repair, re-caulk tub/shower. | New supply lines, permit-required work, anything beyond like-for-like |
| **Electrical (minor)** | Light fixture replacement in existing box, outlet/switch swap, smart doorbell/lock install. | New circuits, panel work, permit-required work |
| **Drywall Repair** | Small patches up to 6". Texture matching for same-color refresh. | Medium 6–12", large 12"+, multi-coat color change, water damage |
| **Door Repair / Adjustment** | Hinge adjustment, latch fix, handle/knob replacement, strike plate alignment. | New door install, pre-hung replacement, exterior door install |

**Overflow:** $75/hr after 2h — only when approved in writing before work continues.

---

## PROJECT ESTIMATE — per square foot (public price, dedicated pages only)

| Service | Rate | Unit | Notes |
|---|---|---|---|
| **Interior Painting** | $3.00/sf | Labor only | Written quote required. Materials separate. |
| **Flooring Installation** | $3.00/sf | Labor only | Written quote required. Materials separate. |

### Interior Painting — detailed breakdown

| Item | Rate |
|---|---|
| Walls — 1 coat | $3.00/sf |
| Walls — 2 coats | $3.75/sf |
| Ceiling — smooth | $3.75/sf |
| Ceiling — textured | $4.25/sf |
| Baseboard painting | $3.00/sf |
| Crown molding (ornate) | $3.75/sf |
| Door casing (per side) | $30 each |
| Baseboard install (labor) | $2.50/lf |
| Door slab painting | $65 each |

### Flooring Installation — detailed breakdown

| Item | Rate |
|---|---|
| Laminate or LVP | $3.00/sf |
| Demo / removal | $1.50/sf |
| Underlayment | $0.50/sf |
| Transition strip | $30 each |

---

## QUOTE ONLY — no public price (photos required before any estimate)

| Service | Why quote-only |
|---|---|
| **Kitchen Cabinet Painting** | Price depends on door count, condition, finish type |
| **Furniture Painting** | Price depends on piece count, surface prep, finish |
| **Door Installation** | Price depends on door type, frame condition, pre-hung vs slab |
| **Vanity Installation** | Price depends on existing plumbing config and fixture size |
| **Backsplash Installation** | Price depends on tile type, sq ft, surface prep |
| **Hidden-wire TV (in-wall)** | Price depends on wall type, fire blocking, run length |

**Process for quote-only:** customer texts photos → manager reviews → written quote sent → scope confirmed before any work starts.

---

## RULES — what to quote, what not to quote

| ✅ Allowed | ❌ Never quote |
|---|---|
| $150 service call | $185, $120, $105, $75 flat, $140 |
| $75/hr overflow (approved in writing) | "starts at", "from $" |
| $3.00/sf for painting or flooring | Per-door price for cabinets |
| "Quote after photos" for complex jobs | Per-piece price for furniture painting |

---

## CROSS-SELL CLUSTERS

| Cluster | Services |
|---|---|
| **Wall install** | TV Mounting + Furniture Assembly + Art & Mirror Hanging |
| **Renovation** | Interior Painting + Flooring + Drywall + Door Install |
| **Paint refresh** | Kitchen Cabinet Painting + Furniture Painting + Interior Painting |
| **Standalone** | Plumbing, Electrical, Door Repair |

> When booking 2+ services same visit: one trip, manager quotes bundled scope. No automatic 20% combo discount.

---

## QUICK REFERENCE — customer-facing phrases

| Scenario | Say this |
|---|---|
| Standard TV mount | "$150 service call — up to 2 hours, cable management included. $75/hr after if needed, approved in writing first." |
| Hidden-wire TV | "Hidden-wire jobs are quoted after photos — text a photo of your wall and TV location." |
| Cabinet painting | "Quote after photos — text photos of your cabinets and we'll send a written price." |
| Interior painting 300sf | "$3/sf labor estimate — that's roughly $900 for 300sf. Written quote confirms final total." |
| Flooring 400sf | "$3/sf labor — roughly $1,200 for 400sf. Written quote required before we start." |
| Customer says "too expensive" | "Our price is $150 — that's fixed. It covers the full job within 2 hours. Happy to schedule a free scope call." |
| Customer quotes old price ($185) | "That's outdated — current price is $150 service call, up to 2 hours included." |

---

*Source: `lib/price-registry.js` → `getAlexPricingCatalogLines()` + `SERVICES` object*  
*Do not edit prices here — edit the registry and redeploy.*
