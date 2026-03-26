# handy-friend-web
Official web application for Handy&Friend. Cabinet Refinishing & Handyman services in LA.

## Factory stability
Use the deterministic operations protocol:

- `/docs/FACTORY_ZERO_DOWNTIME_PROTOCOL.md`
- `node ops/build-asset-inventory.mjs`
- `node ops/build-post-pack.mjs`
- `node ops/factory-guard.mjs`
- `GET /api/health` — unified health check (replaces legacy factory-health/funnel-health)
- `GET /api/health?type=stats&key=SECRET` — dashboard stats
