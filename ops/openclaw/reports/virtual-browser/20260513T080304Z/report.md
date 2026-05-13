# OpenClaw Virtual Browser Audit — 2026-05-13T08:03:28.557Z

Target: https://handyandfriend.com

## Summary

```json
{
  "ok": true,
  "target": "https://handyandfriend.com",
  "generated_at": "2026-05-13T08:03:28.556Z",
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
| desktop | / | 200 | yes | 3639 | 18 | 7 | 3 |  |  | ops/openclaw/reports/virtual-browser/20260513T080304Z/desktop-home.png |
| desktop | /book | 200 | yes | 1921 | 7 | 3 | 0 |  |  | ops/openclaw/reports/virtual-browser/20260513T080304Z/desktop-book.png |
| desktop | /pricing | 200 | yes | 2542 | 5 | 3 | 0 |  |  | ops/openclaw/reports/virtual-browser/20260513T080304Z/desktop-pricing.png |
| desktop | /services | 200 | yes | 2104 | 8 | 2 | 0 |  |  | ops/openclaw/reports/virtual-browser/20260513T080304Z/desktop-services.png |
| desktop | /messenger | 200 | yes | 2368 | 0 | 0 | 0 |  |  | ops/openclaw/reports/virtual-browser/20260513T080304Z/desktop-messenger.png |
| mobile | / | 200 | yes | 2308 | 18 | 7 | 3 |  |  | ops/openclaw/reports/virtual-browser/20260513T080304Z/mobile-home.png |
| mobile | /book | 200 | yes | 1520 | 7 | 3 | 0 |  |  | ops/openclaw/reports/virtual-browser/20260513T080304Z/mobile-book.png |
| mobile | /pricing | 200 | yes | 2355 | 5 | 3 | 0 |  |  | ops/openclaw/reports/virtual-browser/20260513T080304Z/mobile-pricing.png |
| mobile | /services | 200 | yes | 1770 | 8 | 2 | 0 |  |  | ops/openclaw/reports/virtual-browser/20260513T080304Z/mobile-services.png |
| mobile | /messenger | 200 | yes | 2126 | 0 | 0 | 0 |  |  | ops/openclaw/reports/virtual-browser/20260513T080304Z/mobile-messenger.png |

## Risks and control

- This is a GitHub-hosted virtual browser audit, not the Dell OpenClaw local runtime.
- It must not send real customer messages, post to social networks, or submit real forms.
- It collects screenshots and DOM-derived evidence only.