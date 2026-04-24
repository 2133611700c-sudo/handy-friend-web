# UTM Convention — Handy & Friend

## Strict Naming Rules

All UTMs must be **lowercase, hyphenated** (no spaces, no CamelCase).

## Parameter Template

```
utm_source={platform}
utm_medium={type}
utm_campaign={YYYY-MM}_{service-or-theme}
utm_content={variant}  (optional)
```

## Canonical Values

### utm_source
| Value | Platform |
|-------|----------|
| `nextdoor` | Nextdoor posts/ads |
| `craigslist` | Craigslist posts |
| `facebook` | Facebook page/posts |
| `google` | Google Ads / organic |
| `yelp` | Yelp |
| `thumbtack` | Thumbtack |
| `referral` | Word of mouth / card |
| `whatsapp` | WhatsApp |

### utm_medium
| Value | Meaning |
|-------|---------|
| `organic` | Free post / profile |
| `cpc` | Paid click |
| `post` | Social media post |
| `messenger` | DM / chat |
| `referral` | Referral link |
| `email` | Email campaign |

### utm_campaign format
`YYYY-MM_{service-keyword}`

Examples:
- `2026-03_cabinet-painting`
- `2026-03_tv-mounting-special`
- `2026-03_general-handyman`
- `2026-03_spring-refresh`

## Ready-to-Use Links

### Nextdoor
```
https://handyandfriend.com/?utm_source=nextdoor&utm_medium=post&utm_campaign=2026-03_cabinet-painting
https://handyandfriend.com/?utm_source=nextdoor&utm_medium=post&utm_campaign=2026-03_tv-mounting
https://handyandfriend.com/?utm_source=nextdoor&utm_medium=post&utm_campaign=2026-03_general-handyman
```

### Craigslist
```
https://handyandfriend.com/?utm_source=craigslist&utm_medium=post&utm_campaign=2026-03_cabinet-painting
https://handyandfriend.com/?utm_source=craigslist&utm_medium=post&utm_campaign=2026-03_tv-mounting
https://handyandfriend.com/?utm_source=craigslist&utm_medium=post&utm_campaign=2026-03_painting
```

### Facebook Page Posts
```
https://handyandfriend.com/?utm_source=facebook&utm_medium=post&utm_campaign=2026-03_cabinet-painting
https://handyandfriend.com/?utm_source=facebook&utm_medium=post&utm_campaign=2026-03_tv-mounting
https://handyandfriend.com/?utm_source=facebook&utm_medium=post&utm_campaign=2026-03_general-handyman
```

### Facebook Messenger (CTA links)
```
https://handyandfriend.com/?utm_source=facebook&utm_medium=messenger&utm_campaign=2026-03_messenger-cta
```

### Google Ads (auto via gclid, but backup UTMs)
```
https://handyandfriend.com/?utm_source=google&utm_medium=cpc&utm_campaign=2026-03_cabinet-painting
```

### Yelp Profile
```
https://handyandfriend.com/?utm_source=yelp&utm_medium=organic&utm_campaign=2026-03_profile
```

## Attribution Verification

After posting, check:
```
curl "https://handyandfriend.com/api/health?type=attribution"
```

The `channel_split` should show the new channel appearing within 24h of first lead.

## End-to-End Test

1. Open a UTM link in incognito
2. Submit chat or form with a 555-phone (will auto-flag as test)
3. Check Supabase: lead should have `channel`, `source_details` with UTM params
4. Check `is_test = true` (auto-detected by trigger)
