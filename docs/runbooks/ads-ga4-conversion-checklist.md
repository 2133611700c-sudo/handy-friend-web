# Ads / GA4 Conversion Checklist

Status: ACTIVE

## Goal

Ensure Google Ads counts real lead actions.

## Required setup

- GA4 linked to Google Ads.
- Auto-tagging enabled.
- GA4 key events active.
- Correct events imported into Google Ads conversion actions.

## Canonical lead events

- `phone_click`
- `whatsapp_click`
- `form_submit`
- `lead_created`

## Primary candidates

Use only real lead intent events as primary conversions.

## Do not optimize on

- page_view
- pricing page view
- book page view
- scroll
- generic engagement

## Reconcile weekly

Compare Ads conversions, GA4 events, Supabase leads, Telegram proofs, and booked jobs.

## Stop rule

Do not increase Ads budget while conversions and CRM proof do not match.
