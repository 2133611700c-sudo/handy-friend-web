# 🔍 META PIXEL TESTING & VERIFICATION

**CRITICAL:** Verify Meta Pixel fires BEFORE you run Facebook/Instagram ads.

Meta Pixel ID: **741929941112529**

---

## STEP 1: Install Meta Pixel Helper (Chrome Extension)

1. Go to Chrome Web Store: https://chrome.google.com/webstore
2. Search: **"Meta Pixel Helper"**
3. Click **"Add to Chrome"**
4. Extension will appear in top-right corner (blue icon with "f")

---

## STEP 2: Open Your Site + Extension

1. Go to https://handyandfriend.com
2. Click **Meta Pixel Helper icon** (blue "f" in top-right)
3. A panel opens on the right side showing:
   ```
   Pixel ID: 741929941112529
   Status: Connected ✅
   Events tracked: ...
   ```

**You should see:**
```
✅ Pixel found
✅ Connected
✅ Standard events detected
```

If you see **❌ Pixel not found** → code missing, we need to fix.

---

## STEP 3: REAL-TIME TEST

**Open Meta Pixel Helper panel** (right side of screen)

### Test 1: Page View Event
```
Just by visiting the page, you should see:
✅ PageView event logged
   - URL: https://handyandfriend.com/
   - Timestamp: [current time]
```

### Test 2: Form Submission
```
1. Click "Get a Quote in 2 Minutes" button
2. Fill form: Name, Email, Phone, Service, Message
3. Click "Get Your Quote in 2 Min"

In Meta Pixel Helper panel, you should see:
✅ Lead event
   - Value: (amount if set)
   - Currency: USD
   - Timestamp: [current time]
```

**If NOT showing Lead event:**
- Check that form actually submitted (success message appears?)
- Check browser console (F12) for errors
- Verify Pixel Helper shows "Connected ✅"

### Test 3: SMS Capture Event (if using)
```
1. Click calculator → select service → enter size → calculate
2. See result + SMS form below
3. Enter phone + check consent
4. Click "Text me this estimate"

In Meta Pixel Helper panel:
✅ Lead event (or custom event if coded)
   - Timestamp: [current time]
```

---

## STEP 4: Verify Pixel in Meta Ads Manager

1. Go to https://business.facebook.com/
2. Log in with Facebook account
3. **Events Manager** (left menu)
4. Click your pixel: **741929941112529**
5. Go to **Test events** tab

You should see events coming in (with small delay, 15-30 sec):
```
✅ PageView
✅ ViewContent
✅ Lead
✅ Track (custom events)
```

---

## STEP 5: Set Up Conversions

**This is critical** - track which events are "conversions" for ads.

1. In Pixels → Your pixel → **Conversions**
2. Click **"Add conversion"**
3. Select event: **"Lead"**
4. Click **"Add conversion"**

Now when someone fills form → Meta tracks it as a lead → you see in ads dashboard.

---

## ✅ VERIFICATION CHECKLIST

- [ ] Meta Pixel Helper installed (Chrome extension)
- [ ] Helper shows "Connected ✅" on your site
- [ ] PageView event fires on page load
- [ ] Lead event fires on form submit
- [ ] SMS event fires (if SMS form exists)
- [ ] Ads Manager shows events in Test Events tab
- [ ] Lead conversion created in Ads Manager
- [ ] No JavaScript errors in console (F12)

**If ALL ✅ → Meta Pixel is working correctly**

---

## 🚨 IF PIXEL NOT TRACKING

**Check these:**

1. **Pixel code on page?**
   - View page source (Ctrl+U)
   - Search for "741929941112529"
   - Should appear in `<script>` tag

2. **Pixel Helper says "Not connected"?**
   - Refresh page (F5)
   - Clear browser cache (Ctrl+Shift+Delete)
   - Try in Incognito mode (Ctrl+Shift+N)

3. **Events not showing in Ads Manager?**
   - Wait 15-30 seconds after firing event
   - Check that you're looking at correct pixel ID
   - Try firing event again

4. **Form not submitting?**
   - Check browser console (F12) for errors
   - Verify success message appears after submit
   - Check that email is received (if using Formspree)

---

## 💡 PRO TIPS

1. **Pixel Helper shows data LIVE**
   - You don't need to wait 24 hours
   - If event fires → Pixel Helper shows it immediately

2. **Use Test Events tab for debugging**
   - Go to Ads Manager → Your pixel → Test Events
   - You can manually fire events to test conversion tracking
   - Very useful for testing before launch

3. **Once tracking works:**
   - Create Facebook Ads campaign
   - Select "Lead" as conversion objective
   - Meta will optimize for leads automatically

---

## NEXT STEPS

1. ✅ GA4 working?
2. ✅ Meta Pixel working?
3. → Move to Form Submission Test
4. → Move to Google Call Extensions
5. → Ready for ads launch!

---

**WHEN YOU'RE DONE:** Say "GA4 & Meta Pixel working" → I'll send next testing guide.
