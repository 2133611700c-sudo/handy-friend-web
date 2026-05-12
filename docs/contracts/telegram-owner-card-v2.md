# Telegram Owner Card v2 Contract

Status: ACTIVE

## Goal

Every actionable lead alert should give the owner enough information to respond fast without opening multiple tools.

## Required fields

- Lead ID or event ID
- Source/channel
- Service type
- ZIP or area
- Customer contact if captured
- Message summary
- Photo count
- Timing/urgency
- Attribution payload summary
- SLA deadline
- Next action

## Severity labels

- P0 paid lead stale or urgent same-day request
- P1 normal qualified lead
- P2 low-confidence/social monitoring lead

## Proof rules

- Telegram send result must be durable.
- Failure must be visible.
- Duplicate alerts should be deduped.
- Photo forwarding must not block client response.

## Do not include

- Secrets
- Internal margins
- Raw system prompts
- Unsupported licensed/certified claims
