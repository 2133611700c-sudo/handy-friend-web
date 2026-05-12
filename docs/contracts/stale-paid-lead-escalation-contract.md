# Stale Paid Lead Escalation Contract

Status: ACTIVE

## Goal

Paid-source leads must not sit unseen or uncontacted.

## Paid sources

- `google_ads_search`
- `google_lsa`
- paid social when tagged
- any source with `gclid` or paid UTM evidence

## Escalation levels

- P0: paid lead in `new` for more than 20 minutes
- P0: paid lead has no Telegram proof
- P1: paid lead contacted but no follow-up after 4 hours
- P1: paid lead has missing source details or broken attribution

## Required Telegram escalation fields

- lead_id
- source
- service_type
- ZIP or area
- age_minutes
- contact method
- message summary
- next action

## Control rule

A paid lead can be marked safe only when it has owner visibility and a stage update: contacted, booked, lost, spam, or explicit skip reason.
