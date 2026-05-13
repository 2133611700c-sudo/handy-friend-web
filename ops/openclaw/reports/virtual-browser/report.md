# OpenClaw Virtual Browser Audit — 2026-05-13T07:33:23.262Z

Target: https://handyandfriend.com

## Summary

```json
{
  "ok": true,
  "target": "https://handyandfriend.com",
  "generated_at": "2026-05-13T07:33:23.261Z",
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
| desktop | / | 200 | yes | 3434 | 18 | 7 | 3 |  |  | ops/openclaw/reports/virtual-browser/desktop-home.png |
| desktop | /book | 200 | yes | 1639 | 7 | 3 | 0 |  |  | ops/openclaw/reports/virtual-browser/desktop-book.png |
| desktop | /pricing | 200 | yes | 2510 | 5 | 3 | 0 |  |  | ops/openclaw/reports/virtual-browser/desktop-pricing.png |
| desktop | /services | 200 | yes | 1838 | 8 | 2 | 0 |  |  | ops/openclaw/reports/virtual-browser/desktop-services.png |
| desktop | /messenger | 200 | yes | 1766 | 0 | 0 | 0 |  |  | ops/openclaw/reports/virtual-browser/desktop-messenger.png |
| mobile | / | 200 | yes | 2194 | 18 | 7 | 3 |  |  | ops/openclaw/reports/virtual-browser/mobile-home.png |
| mobile | /book | 200 | yes | 1502 | 7 | 3 | 0 |  |  | ops/openclaw/reports/virtual-browser/mobile-book.png |
| mobile | /pricing | 200 | yes | 2270 | 5 | 3 | 0 |  |  | ops/openclaw/reports/virtual-browser/mobile-pricing.png |
| mobile | /services | 200 | yes | 1752 | 8 | 2 | 0 |  |  | ops/openclaw/reports/virtual-browser/mobile-services.png |
| mobile | /messenger | 200 | yes | 1913 | 0 | 0 | 0 |  |  | ops/openclaw/reports/virtual-browser/mobile-messenger.png |

## Risks and control

- This is a GitHub-hosted virtual browser audit, not the Dell OpenClaw local runtime.
- It must not send real customer messages, post to social networks, or submit real forms.
- It collects screenshots and DOM-derived evidence only.