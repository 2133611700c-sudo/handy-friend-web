# Photo / Media Proof Contract

Status: ACTIVE

## Goal

Photos from WhatsApp, Messenger, site upload, or monitored lead sources must be visible to the owner without blocking client response.

## Required fields

- lead_id or event_id
- source/channel
- media_count
- media_type
- received_at
- forwarded_to_telegram_at or skip_reason
- storage reference if applicable
- dedupe key

## Rules

- Client response must not wait on slow media forwarding.
- Telegram owner alert should include photo count and available previews/links.
- Failures must be logged and visible.
- Duplicate media should not spam Telegram repeatedly.
- Do not expose private customer media publicly.

## Acceptance

- A lead with photos has durable media proof or explicit skip reason.
- Telegram alert shows photo count.
- Outbox/DLQ shows failed media delivery if forwarding fails.
