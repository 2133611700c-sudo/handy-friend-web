# 🔍 GA4 EVENT TESTING & VERIFICATION

**CRITICAL:** Verify GA4 is tracking events BEFORE you spend money on Google Ads.

---

## STEP 1: Open Google Analytics 4

1. Go to https://analytics.google.com
2. Sign in with same Google account as ads.google.com
3. Select property: **"Handy & Friend (G-Z05XJ8E281)"**
4. In left menu: **Admin** → **Events**

**You should see:**
```
✅ form_submit (auto-tracked)
✅ page_view (auto-tracked)
✅ first_visit (auto-tracked)
```

---

## STEP 2: Create Conversion Events

**This is critical** - GA4 tracks events, but you must mark them as "conversions" to see them in ads.

### Create "form_submit" Conversion:
1. In Admin → Events → scroll to `form_submit`
2. Click the **3-dot menu** → "Mark as conversion"
3. You should see checkbox ✅ next to `form_submit`

### Create "sms_lead" Conversion (if SMS form exists):
1. In Admin → Events → look for `sms_lead`
2. If not exist → click **"Create event"** → name it `sms_lead` → Save
3. Mark as conversion ✅

### Create "phone_click" Conversion (optional):
1. In Admin → Events → **"Create event"**
2. Name: `phone_click`
3. Description: "User clicked phone number"
4. Save → Mark as conversion ✅

### Create "whatsapp_click" Conversion (optional):
1. In Admin → Events → **"Create event"**
2. Name: `whatsapp_click`
3. Description: "User clicked WhatsApp button"
4. Save → Mark as conversion ✅

---

## STEP 3: REAL-TIME TEST (Verify It Works)

**Open 2 windows side-by-side:**
- **Left:** Your site → https://handyandfriend.com
- **Right:** GA4 Real-Time Report → Admin → Real-time

### Test 1: Form Submission
```
LEFT window:
1. Click on "Get a Quote in 2 Minutes" button
2. Fill form: Name, Email, Phone, Service
3. Click "Get Your Quote in 2 Min" button

RIGHT window (Real-time):
1. Watch the counter increase (Events)
2. Look for "form_submit" in the event list
3. You should see it within 2-3 seconds
```

**Expected:** ✅ Real-time shows `form_submit` event fired

**If NOT showing:**
- Check browser console (F12) for JavaScript errors
- Check that form is actually submitting (look for success message)
- Refresh GA4 page

### Test 2: SMS Form (if you filled SMS checkbox)
```
LEFT window:
1. Click calculator → select service → enter room size → calculate
2. Result appears + SMS form appears below
3. Enter phone number + check consent box
4. Click "Text me this estimate"

RIGHT window (Real-time):
1. Watch for "sms_lead" event to appear
2. Should show within 2-3 seconds
```

**Expected:** ✅ Real-time shows `sms_lead` event

### Test 3: Phone Call Click (optional)
```
LEFT window:
1. Scroll to bottom → find phone number link
2. Right-click → "Copy link" (don't actually call)

RIGHT window (Real-time):
1. Actually click phone number on LEFT
2. Watch for "phone_click" event in Real-time
3. Should appear within 2-3 seconds
```

**Expected:** ✅ Real-time shows `phone_click` event

---

## STEP 4: Check 24-Hour Report

**Wait 24 hours**, then check full data:

1. GA4 → **Explore** (left menu)
2. Create blank exploration
3. Add metric: **Event count**
4. Add dimension: **Event name**
5. Filter: **Event name contains "form_submit"**

You should see a row like:
```
Event Name          | Event Count
form_submit         | 3
sms_lead            | 1
phone_click         | 2
whatsapp_click      | 2
page_view           | 45
```

---

## STEP 5: Link to Google Ads

Once GA4 is tracking:

1. Go to **ads.google.com**
2. Tools → **Measurement** → **Google Analytics 4**
3. Click **"Link to Google Analytics"**
4. Select property: **"Handy & Friend (G-Z05XJ8E281)"**
5. Select **"form_submit"** as conversion

Now Google Ads will show which campaigns drive conversions.

---

## ✅ VERIFICATION CHECKLIST

- [ ] GA4 property exists: G-Z05XJ8E281
- [ ] form_submit event shows in Admin → Events
- [ ] sms_lead event created (if using SMS)
- [ ] phone_click event created (if tracking calls)
- [ ] whatsapp_click event created (if tracking WhatsApp)
- [ ] All events marked as conversions ✅
- [ ] Real-time test passed (events appearing in 2-3 sec)
- [ ] 24-hour data shows event count > 0
- [ ] Google Ads linked to GA4
- [ ] form_submit conversion selected in Google Ads as Primary
- [ ] Duplicate counting disabled (no parallel GTM+gtag conversion tags for same event)

**If ALL ✅ → You're ready for Google Ads launch**

---

## 🚨 IF EVENTS NOT TRACKING

**Check these:**

1. **JavaScript console errors?**
   - F12 → Console tab → Any red errors?
   - If yes: Screenshot and send

2. **Form actually submitting?**
   - Fill form → click submit
   - Page should show "✅ Quote Request Received!"
   - Check browser console (F12) for fetch errors

3. **GA4 code on page?**
   - View page source (Ctrl+U)
   - Search for "G-Z05XJ8E281"
   - Should appear in `<script>` tag

4. **Formspree working?**
   - Check email: forms should send to 2133611700c@gmail.com
   - If email not received: form broke

---

## 💡 PRO TIP

Once events are tracking:
- GA4 automatically shows which traffic sources drive conversions
- You can see: "Google Ads → form_submit → 5 conversions"
- This helps you optimize ad spend

---

## Measurement Contract (Locked)

- Primary path for Google Ads measurement: **GA4 imported conversions**.
- Canonical lead events in code: `form_submit`, `sms_lead`, `phone_click`, `whatsapp_click`.
- Use GTM for transport only; do not duplicate Google Ads conversion tags for the same event.

**NEXT:** Once you verify GA4 working, move to Meta Pixel testing.
