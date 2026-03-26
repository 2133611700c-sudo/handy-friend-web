---
name: review-requester
description: Sends Google Review request to clients 48 hours after job completion
---

# Review Requester

## Trigger
Check ops/completed-jobs.json every 6 hours.
Find jobs where: completed_date + 48 hours <= now AND review_sent = false

## Message Template
"Hi [name]! This is Sergii from Handy & Friend. Thank you for choosing us for your [service]! If you were happy with the work, a quick Google review really helps our small business grow: https://handyandfriend.com/review Thank you!"

## Rules
1. Send only ONCE per client
2. Never send to clients with complaints (status = "complaint")
3. Log every sent message with timestamp
4. If WhatsApp fails — do NOT retry automatically, flag for manual send
5. Update review_sent = true after sending
