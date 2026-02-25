# 💰 CALCULATOR PRICING FINALIZATION

**CRITICAL:** The calculator is the first touch point for 60% of leads. Pricing must be:
- ✅ Realistic (not too high, won't scare away leads)
- ✅ Competitive (within market range for LA)
- ✅ Profitable (cover costs + margin)
- ✅ Consistent (matches what you actually quote)

**Current Status:** All prices are pre-filled in calculator. This guide helps you verify, adjust, and test them.

---

## PART 1: UNDERSTAND CURRENT PRICING STRUCTURE

### 1.1 Service Pricing Models

The calculator uses **3 pricing models:**

| Model | Services | How It Works | Current Prices |
|-------|----------|-------------|-----------------|
| **Fixed Service Call** | TV, Furniture, Art, Plumbing, Electrical | $150 base + $70/hr after 2h | $150 entry, extra hours $70 |
| **Per Square Foot (Paint)** | Painting, Drywall | Price × room area (sq ft) | $2.25–$4.00/sf |
| **Per Square Foot (Flooring)** | Flooring (Laminate, LVP) | Price × room area (sq ft) | $4.25–$5.00/sf |

### 1.2 Current Pricing Breakdown

#### Fixed Price Services:

```
TV MOUNTING:
  - Basic mount (up to 65", drywall/studs): $150
  - Mount + concealed wires: $220

FURNITURE ASSEMBLY:
  - Small items (2–3 pcs): $150
  - Dresser (3–6 drawers): $200
  - Bed frame (storage/lift): $275
  - PAX/large closet: $70/hr (min 4h = $280)

ART & MIRRORS HANGING:
  - Up to 5 pcs (max 40 lbs each): $150
  - Curtain rods/blinds (1st window): $150
  - Each additional window: +$30

PLUMBING (Cosmetic Only):
  - Faucet replacement: $195
  - Shower head replacement: $150
  - Toilet tank/flapper repair: $150
  - Re-caulk tub/shower: $215

ELECTRICAL (Like-for-Like Only):
  - Light fixture swap: $175
  - Outlets/switches (1st 3): $150
  - Additional outlet/switch each: +$20
  - Smart doorbell/lock: $195
```

#### Per-Square-Foot Services:

```
PAINTING:
  - Walls (1 coat, same color): $2.25/sf
  - Walls (2 coats, color change): $3.00/sf
  - Ceiling (smooth, 2 coats): $2.50/sf
  - Ceiling (textured, 2 coats): $3.25/sf
  - Ceiling (semi-gloss/gloss, 2 coats): $4.00/sf

Add-ons:
  + Sanding/prep: +$0.80/sf
  + Wallpaper removal: +$1.60/sf
  + Paint stripping: +$1.20/sf
  + Mold treatment: +$2.00/sf

FLOORING:
  - Laminate: $4.25/sf
  - LVP (vinyl plank): $5.00/sf

Add-ons:
  + Demo existing floor: +$2.00/sf
  + Underlayment: +$0.75/sf

TRIM & MILLWORK:
  - Baseboards (2 coats): $4.50/lf
  - Door casings (2 coats): $5.00/lf
  - Crown molding (2 coats): $6.00/lf
```

### 1.3 Minimum Order & Hourly Rate

```
BASE RATES (All services):
- Service call minimum: $150
- Hourly rate (after 2h): $70/hour
- Minimum order (paint/flooring): $500

EXAMPLE CALCULATION (Painting):
- 300 sq ft room, walls 2 coats
- Cost: 300 sf × $3.00 = $900
- Hourly: (300 sf ÷ 50 sf/hr) × $70 = 6h × $70 = $420
- Actual: $900 (paint model used)
- Result: >$500 minimum, price = $900 ✓
```

---

## PART 2: MARKET COMPARISON (LA Area)

### 2.1 Competitive Rates in Los Angeles

**TV Mounting:**
- Market range: $100–$250 (depending on complexity)
- Current price: $150–$220 ✅ (mid-market)

**Furniture Assembly:**
- Market range: $75–$200 per item
- Current price: $150–$275 ✅ (mid to premium)

**Painting:**
- Market range: $1.50–$5.00/sf (Labor only)
- Current price: $2.25–$4.00/sf ✅ (lower-mid market, competitive)

**Flooring:**
- Market range: $3.00–$8.00/sf (Labor only)
- Current price: $4.25–$5.00/sf ✅ (mid-market)

**Plumbing (Cosmetic):**
- Market range: $100–$250 per call
- Current price: $150–$215 ✅ (mid-market)

**Electrical (Like-for-Like):**
- Market range: $100–$300 per call
- Current price: $150–$195 ✅ (mid-market)

### 2.2 Our Position

```
🏆 COMPETITIVE ADVANTAGE:
✅ LOWER PAINT PRICES ($2.25–$4.00/sf vs market $2.50–$5.00)
✅ REASONABLE MINIMUMS ($150 call vs market $200–$500)
✅ TRANSPARENT PRICING (all quoted upfront, no surprises)

⚠️ PERCEPTION RISK:
❌ TOO LOW = "unprofessional" or "low quality"
❌ TOO HIGH = "overpriced" (customers go elsewhere)

CURRENT STATUS: Good balance. Competitive without being suspicious.
```

---

## PART 3: ADJUST PRICING (If Needed)

### 3.1 ONLY IF You Want to Change Prices

**⚠️ WARNING:** Only modify if you have REAL data:
- Quotes you've actually given
- Costs you've actually incurred
- Market research you've done

**Otherwise:** Keep current pricing (tested, competitive).

### 3.2 How Prices Are Stored

All prices are in `/assets/js/main.js` in the **T.en** object (English).

**Location:** Lines 140–260 in `main.js`

**Structure:**
```javascript
T.en = {
  base: ["$150 service call", "$70/hr after 2h", "$500 min · paint & floors"],
  dr: {
    tv: [
      ["Standard mount (up to 65\") — drywall / studs", "$150", "1–1.5h"],
      ["Mount + concealed wires (in-wall or cable channel)", "$220", "2–2.5h"]
    ],
    // ... more services
  }
}
```

### 3.3 Edit Prices (Advanced)

**To change a price:**

1. Open `/assets/js/main.js`
2. Find line with the service (e.g., line 203 for TV basic)
3. Change the price string
4. Update ALL 4 languages (T.en, T.es, T.ru, T.ua)
5. Test calculator
6. Commit & deploy

**Example: Change TV Basic from $150 → $175**

```javascript
BEFORE:
["Standard mount (up to 65\") — drywall / studs","$150","1–1.5h"],

AFTER:
["Standard mount (up to 65\") — drywall / studs","$175","1–1.5h"],
```

**Then update other languages with same number.**

---

## PART 4: TEST CALCULATOR (All 7 Services)

### 4.1 Test Fixed-Price Services (TV, Furniture, Art, Plumbing, Electrical)

**Test Case 1: TV Mounting**

```
1. Open https://handyandfriend.com/#calcBox
2. Select Service: "📺 TV Mounting"
3. Select Option: "Standard mount (up to 65\") - $150"
4. Click Calculate
5. Expected Result: $150 shown as estimate
6. Verify in Meta Pixel Helper: "Lead" event fires with value $150 ✅
```

**Test Case 2: Furniture Assembly (Small)**

```
1. Select Service: "🛋️ Furniture Assembly"
2. Select Option: "Small items (2–3 pcs) - $150"
3. Click Calculate
4. Expected Result: $150 shown
5. Verify SMS capture option appears below ✅
```

**Test Case 3: Furniture Assembly (Large)**

```
1. Select Service: "🛋️ Furniture Assembly"
2. Select Option: "Bed frame (storage/lift) - $275"
3. Click Calculate
4. Expected Result: $275 shown
5. Check that estimate value updates ✅
```

**Test Case 4: Art & Mirrors**

```
1. Select Service: "🪞 Mirrors & Art Hanging"
2. Select Option: "Art/Mirrors (up to 5 pcs) - $150"
3. Click Calculate
4. Expected Result: $150 shown ✅
```

**Test Case 5: Plumbing**

```
1. Select Service: "🚰 Plumbing"
2. Select Option: "Faucet replacement - $195"
3. Click Calculate
4. Expected Result: $195 shown ✅
```

**Test Case 6: Electrical**

```
1. Select Service: "⚡ Electrical"
2. Select Option: "Light fixture swap - $175"
3. Click Calculate
4. Expected Result: $175 shown ✅
```

### 4.2 Test Area-Based Services (Painting, Flooring)

**Test Case 7: Painting - 1 Coat**

```
1. Select Service: "🎨 Painting & Walls"
2. Select Painting Type: "Painting — 1 coat (same color)"
3. Enter Room Dimensions:
   - Length: 20 ft
   - Width: 15 ft
   - Click "Calculate room area"
   - Should show: "20 ft × 15 ft = 300 sq ft"
4. No add-ons selected
5. Click Calculate
6. Expected: 300 sf × $2.25 = $675 ✅
7. Verify SMS capture shows: "Estimate: $675" ✅
```

**Test Case 8: Painting - 2 Coats**

```
1. Select Service: "🎨 Painting & Walls"
2. Select Painting Type: "Painting — 2 coats (color change)"
3. Enter Room Dimensions:
   - Length: 20 ft
   - Width: 15 ft
4. No add-ons
5. Click Calculate
6. Expected: 300 sf × $3.00 = $900 ✅
```

**Test Case 9: Painting with Add-On**

```
1. Select Service: "🎨 Painting & Walls"
2. Select Painting Type: "Painting — 1 coat (same color)"
3. Enter Room Dimensions: 20 ft × 15 ft (300 sf)
4. Add-ons: Check "✓ Wallpaper removal"
5. Click Calculate
6. Expected:
   - Main: 300 sf × $2.25 = $675
   - Add-on: 300 sf × $1.60 = $480
   - Total: $1,155 ✅
7. Verify in MetaPixel Helper: "Lead" event shows value $1155 ✅
```

**Test Case 10: Flooring - Laminate**

```
1. Select Service: "🏠 Flooring"
2. Select Flooring Type: "Flooring — Laminate ($4.25/sf)"
3. Enter Room Dimensions: 20 ft × 15 ft (300 sf)
4. No add-ons
5. Click Calculate
6. Expected: 300 sf × $4.25 = $1,275 ✅
```

**Test Case 11: Flooring with Add-On**

```
1. Select Service: "🏠 Flooring"
2. Select Flooring Type: "Flooring — LVP ($5.00/sf)"
3. Enter Room Dimensions: 20 ft × 15 ft (300 sf)
4. Add-ons: Check "✓ Demo existing floor"
5. Click Calculate
6. Expected:
   - Main: 300 sf × $5.00 = $1,500
   - Add-on: 300 sf × $2.00 = $600
   - Total: $2,100 ✅
```

**Test Case 12: Check Minimum Order (Paint)**

```
1. Select Service: "🎨 Painting & Walls"
2. Select: "Painting — 1 coat"
3. Enter SMALL room: 8 ft × 8 ft (64 sf)
4. No add-ons
5. Click Calculate
6. Expected:
   - Normal price: 64 sf × $2.25 = $144
   - But minimum is $500
   - Result: $500 (minimum applied) ✅
   - You should see badge: "⚠️ Minimum order applied (min $500)" ✅
```

### 4.3 Verify All Results Display Correctly

After each test case, verify:

```
✅ Estimate amount shows (e.g., "$675")
✅ SMS capture form appears below with estimate value
✅ Meta Pixel Helper shows "Lead" event with correct value
✅ Form button shows "Get Your Quote in 2 Min"
✅ No console errors (F12 → Console tab)
```

---

## PART 5: LANGUAGE TRANSLATIONS

### 5.1 Verify Pricing in All Languages

Prices should appear in ALL 4 languages. Test:

1. Open https://handyandfriend.com/#calcBox
2. In calculator header, should see language selector
3. Switch to each language:
   - **English (EN)** → prices in USD
   - **Spanish (ES)** → prices same, Spanish labels
   - **Russian (RU)** → prices same, Russian labels
   - **Ukrainian (UA)** → prices same, Ukrainian labels

**All 4 languages should show EXACT SAME prices** (only labels translated).

---

## PART 6: PRICING STRATEGY (For Future)

### 6.1 Pricing Tiers

Consider offering tiers later (not now):

```
CURRENT (Simple):
  TV Mounting: $150 base, $220 deluxe

FUTURE (Advanced):
  TV Mounting:
    - Small (32-43"): $125
    - Medium (50-65"): $150
    - Large (70-85"): $200
    - Deluxe (concealed): $250
```

**For now:** Keep pricing simple. Complexity scares leads away.

### 6.2 When to Adjust Prices

**Raise prices if:**
- You're getting 10+ leads/week and converting 50%+
- Customers never complain about price
- You're booked out 2+ weeks in advance

**Lower prices if:**
- You're getting <3 leads/week
- Leads say price is too high (in calls)
- Competitors are significantly cheaper

---

## ✅ VERIFICATION CHECKLIST

- [ ] All 7 services have prices in calculator
- [ ] Fixed services ($150, $200, etc.) calculate correctly
- [ ] Painting per-sq-ft calculation correct (room area × price/sf)
- [ ] Flooring per-sq-ft calculation correct
- [ ] Add-ons add correctly to total
- [ ] Minimum order applied ($500 min for paint/flooring)
- [ ] SMS capture form shows estimated amount
- [ ] Meta Pixel fires "Lead" event with estimate value
- [ ] Form button shows correct text in all languages
- [ ] All prices appear in EN, ES, RU, UA
- [ ] Console shows no JavaScript errors (F12)
- [ ] Calculator shows "Estimate only · Final price after photos"
- [ ] Phone number 213-361-1700 visible in estimate area

**If ALL ✅ → Pricing is finalized and ready for ads**

---

## PRICING DATA TO COLLECT

**For future optimization, start tracking:**

| Data | Purpose | How to Collect |
|------|---------|---------------|
| **Jobs Won** | Actual pricing customers accept | Lead form + booking confirmation |
| **Jobs Lost** | Pricing objections | Note in CRM when customer declines |
| **Time Spent** | Validate hourly rate ($70/hr) | Track actual hours per job |
| **Material Costs** | Ensure margin (should be 50%+) | Keep receipts |
| **Competitor Pricing** | Market position | Google "handyman near me", check ads |
| **Lead Source** | Which channel brings best quality | GA4 + Pixel attribution |

---

## NEXT STEPS

1. ✅ **Pricing finalized and tested?**
2. → Continue with **GBP Photo Checklist**
3. → Then **LSA Documents Preparation**
4. → Then **Google Ads Keyword Research**

**When calculator pricing is verified working, report:** "Calculator pricing verified for all 7 services" → I'll provide next guide.

---

## PRICING SUMMARY (Quick Reference)

```
TV MOUNTING: $150–$220
FURNITURE: $150–$280
ART & MIRRORS: $150–$180
PLUMBING: $150–$215
ELECTRICAL: $150–$195
PAINTING: $2.25–$4.00/sf (min $500)
FLOORING: $4.25–$5.00/sf (min $500)

BASE RATES:
- Service call: $150
- Hourly (after 2h): $70/hr
- Minimum (paint/flooring): $500

ONLINE ESTIMATE: Instant (via calculator)
FINAL QUOTE: After photos or site visit (may differ)
```

---

## SUPPORT LINKS

- **Calculator Test:** https://handyandfriend.com/#calcBox
- **File to Edit Prices:** `/assets/js/main.js` (Lines 140–260)
- **Meta Pixel Helper:** Chrome extension
- **DevTools Console:** F12 (check for errors)

