# OpenClaw Virtual Browser Audit — 2026-05-13T08:01:49.621Z

Target: https://handyandfriend.com

## Summary

```json
{
  "ok": true,
  "target": "https://handyandfriend.com",
  "generated_at": "2026-05-13T08:01:49.621Z",
  "pages_checked": 10,
  "failed_pages": [],
  "bad_claims": [],
  "brand_errors": [],
  "missing_phone_links": [
    {
      "viewport": "desktop",
      "route": "/messenger"
    },
    {
      "viewport": "mobile",
      "route": "/messenger"
    }
  ],
  "missing_whatsapp_links": [
    {
      "viewport": "desktop",
      "route": "/messenger"
    },
    {
      "viewport": "mobile",
      "route": "/messenger"
    }
  ],
  "missing_messenger_links": [
    {
      "viewport": "desktop",
      "route": "/book"
    },
    {
      "viewport": "desktop",
      "route": "/pricing"
    },
    {
      "viewport": "desktop",
      "route": "/services"
    },
    {
      "viewport": "desktop",
      "route": "/messenger"
    },
    {
      "viewport": "mobile",
      "route": "/book"
    },
    {
      "viewport": "mobile",
      "route": "/pricing"
    },
    {
      "viewport": "mobile",
      "route": "/services"
    },
    {
      "viewport": "mobile",
      "route": "/messenger"
    }
  ]
}
```

## Results

| viewport | route | status | ok | ms | phone | whatsapp | messenger | bad claims | brand errors | screenshot |
|---|---|---:|---:|---:|---:|---:|---:|---|---|---|
| desktop | / | 200 | yes | 3156 | 18 | 7 | 3 |  |  | ops/openclaw/reports/virtual-browser/20260513T080127Z/desktop-home.png |
| desktop | /book | 200 | yes | 1591 | 7 | 3 | 0 |  |  | ops/openclaw/reports/virtual-browser/20260513T080127Z/desktop-book.png |
| desktop | /pricing | 200 | yes | 2309 | 5 | 3 | 0 |  |  | ops/openclaw/reports/virtual-browser/20260513T080127Z/desktop-pricing.png |
| desktop | /services | 200 | yes | 1695 | 8 | 2 | 0 |  |  | ops/openclaw/reports/virtual-browser/20260513T080127Z/desktop-services.png |
| desktop | /messenger | 200 | yes | 1820 | 0 | 0 | 0 |  |  | ops/openclaw/reports/virtual-browser/20260513T080127Z/desktop-messenger.png |
| mobile | / | 200 | yes | 2112 | 18 | 7 | 3 |  |  | ops/openclaw/reports/virtual-browser/20260513T080127Z/mobile-home.png |
| mobile | /book | 200 | yes | 1616 | 7 | 3 | 0 |  |  | ops/openclaw/reports/virtual-browser/20260513T080127Z/mobile-book.png |
| mobile | /pricing | 200 | yes | 2208 | 5 | 3 | 0 |  |  | ops/openclaw/reports/virtual-browser/20260513T080127Z/mobile-pricing.png |
| mobile | /services | 200 | yes | 1652 | 8 | 2 | 0 |  |  | ops/openclaw/reports/virtual-browser/20260513T080127Z/mobile-services.png |
| mobile | /messenger | 200 | yes | 1897 | 0 | 0 | 0 |  |  | ops/openclaw/reports/virtual-browser/20260513T080127Z/mobile-messenger.png |

## Risks and control

- This is a GitHub-hosted virtual browser audit, not the Dell OpenClaw local runtime.
- It must not send real customer messages, post to social networks, or submit real forms.
- It collects screenshots and DOM-derived evidence only.