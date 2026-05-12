# Lead Quality Scoring Contract

Status: ACTIVE

## Goal

Prioritize leads that are most likely to become booked paid jobs.

## Score inputs

- Source quality
- Service type
- ZIP or area quality
- Phone/contact captured
- Photos provided
- Timing/urgency
- Message clarity
- Paid source vs organic source
- Repeat customer signal
- Stale age

## Suggested scoring

- +25 phone/contact present
- +20 photo present
- +20 high-value service
- +15 same-week timing
- +15 qualified ZIP/area
- +10 paid source with attribution
- -25 no contact
- -20 vague request
- -30 stale over SLA
- -50 spam/irrelevant

## Priority bands

- 80-100: P0 hot lead
- 60-79: P1 qualified lead
- 40-59: P2 needs clarification
- 0-39: low priority or spam review

## Required output

- lead_id
- score
- priority
- reasons
- next_action

## Control rule

Paid leads with high score must be surfaced to Telegram immediately and must not remain in `new` beyond SLA.
