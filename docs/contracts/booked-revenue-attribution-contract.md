# Booked Revenue Attribution Contract

Status: ACTIVE

## Goal

Connect marketing and lead sources to booked jobs and real revenue, not just clicks or raw leads.

## Required lifecycle stages

- lead_created
- contacted
- estimate_sent
- booked
- completed
- lost
- spam

## Required fields

- lead_id
- source
- campaign/source details
- service_type
- quoted_amount when available
- booked_amount when available
- completed_amount when available
- stage
- booked_at
- completed_at
- lost_reason when applicable

## Attribution output

Report by source:

- leads
- contacted
- estimates
- booked
- completed
- revenue
- conversion rate
- average job value

## Decision rules

- Do not scale paid source on clicks alone.
- Prefer sources with booked/completed proof.
- If leads exist but booked is zero, inspect SLA and sales follow-up.
- If booked exists but source is missing, fix attribution before optimizing.

## Control rule

Every booked job should trace back to a lead source or be marked as manual/direct with reason.
