# Resend Email Setup — Handy & Friend

## Status: NOT CONFIGURED (RESEND_API_KEY missing)

## Setup Steps (15 min)

### 1. Create Resend Account
1. Go to https://resend.com/signup
2. Sign up with your Google account
3. Free tier: 3,000 emails/month (more than enough)

### 2. Add Domain
1. In Resend dashboard → Domains → Add Domain
2. Enter: `handyandfriend.com`
3. Resend will give you 3 DNS records to add

### 3. Add DNS Records (in your domain registrar)
| Type | Name | Value |
|------|------|-------|
| TXT | `resend._domainkey.handyandfriend.com` | *(provided by Resend)* |
| MX | `handyandfriend.com` | `feedback-smtp.resend.com` (priority 10) |
| TXT | `handyandfriend.com` | `v=spf1 include:resend.com ~all` |

**Note**: DNS propagation takes 5-60 min. Resend shows verification status.

### 4. Get API Key
1. In Resend → Settings → API Keys → Create API Key
2. Name it: `handy-friend-production`
3. Copy the key (starts with `re_`)

### 5. Add to Vercel
```bash
npx vercel env add RESEND_API_KEY
# Paste the key
# Select: Production + Preview
```

### 6. Redeploy
```bash
npx vercel deploy --yes && npx vercel --prod --yes
```

### 7. Test
Submit a test lead on the form. You should receive:
- Owner notification email (to your Gmail)
- Customer auto-responder email (to the lead's email)
- Telegram notification (already works)

## What Gets Sent

| Email | From | To | When |
|-------|------|-----|------|
| Owner notification | `leads@handyandfriend.com` | Your Gmail | Every form submission |
| Customer auto-responder | `hello@handyandfriend.com` | Lead's email | Every form submission (if email provided) |

## Code Location
- Owner email: `api/submit-lead.js` line ~298
- Auto-responder: `api/submit-lead.js` → `sendCustomerAutoResponder()`
- Review push: `scripts/review_push.mjs` → `sendReviewEmail()`

## Cost Estimate
- 5-10 real leads/month × 2 emails each = 10-20 emails/month
- Free tier limit: 3,000/month
- **Cost: $0**
