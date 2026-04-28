# Path A — WhatsApp Cloud API Migration Approval

**Date:** 2026-04-25
**Owner:** Sergii (Handy & Friend / SK Logistics LLC)
**Phone:** +1 213-361-1700 (digits 2133611700)
**Decision:** Approved deletion of WhatsApp Business mobile app account to free number for Cloud API registration.

## Approval text
> "I approve deleting WhatsApp Business app account for +12133611700 to move this number to official WhatsApp Cloud API."

## Scope
- Delete account from WhatsApp Business mobile app on iPhone
- Wait for Meta number release (~5 min)
- Run /request_code → /verify_code → /register via Graph API
- Set 2FA PIN
- Reconfigure webhook for Cloud API delivery
- Disable Mac bridge after Cloud E2E proven
