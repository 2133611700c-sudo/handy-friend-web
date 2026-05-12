# Tracking Debt Cleanup Checklist

Status: ACTIVE

## Goal

Remove confusing legacy event names without breaking live lead capture.

## Canonical events

- `phone_click`
- `whatsapp_click`
- `form_submit`
- `sms_lead`
- `lead_created`

## Known debt

- `click_whatsapp` may still exist in legacy CTA markup.
- Canonical GA4/Ads event must be `whatsapp_click`.

## Cleanup steps

1. Search templates and static HTML for legacy names.
2. Replace only one event family at a time.
3. Verify homepage is HTTP 200.
4. Verify `/api/health` is HTTP 200.
5. Verify GA4 DebugView or Tag Assistant sees canonical event.
6. Verify no old alias is imported as a primary Ads conversion.

## Stop condition

If live CTA stops working, revert immediately and keep alias as compatibility debt until a safer patch is ready.
