#!/usr/bin/env bash
# Run AFTER successful Path B migration:
# - new WABA created via Meta UI
# - new phone_number_id assigned
# - Cloud API /messages works
#
# Usage:
#   ./scripts/post-migration-update.sh <NEW_PHONE_NUMBER_ID> <NEW_WABA_ID>
#
# Example:
#   ./scripts/post-migration-update.sh 123456789012345 987654321098765

set -euo pipefail

NEW_PHONE_ID="${1:?need NEW_PHONE_NUMBER_ID}"
NEW_WABA_ID="${2:?need NEW_WABA_ID}"

echo "===================================="
echo "Post-Migration Vercel Env Update"
echo "===================================="
echo "New phone_number_id: $NEW_PHONE_ID"
echo "New WABA ID:         $NEW_WABA_ID"
echo

# 1. Update Vercel env
cd "$(dirname "$0")/.."
echo "→ Removing old WHATSAPP_PHONE_NUMBER_ID..."
vercel env rm WHATSAPP_PHONE_NUMBER_ID production --yes 2>&1 | tail -1
echo "→ Adding new WHATSAPP_PHONE_NUMBER_ID=$NEW_PHONE_ID..."
echo "$NEW_PHONE_ID" | vercel env add WHATSAPP_PHONE_NUMBER_ID production 2>&1 | tail -1

echo "→ Adding META_PHONE_NUMBER_ID + META_WABA_ID (new naming)..."
echo "$NEW_PHONE_ID" | vercel env add META_PHONE_NUMBER_ID production 2>&1 | tail -1 || true
echo "$NEW_WABA_ID" | vercel env add META_WABA_ID production 2>&1 | tail -1 || true

# 2. Redeploy
echo
echo "→ Redeploying production..."
npx vercel --prod --yes 2>&1 | tail -3

# 3. Verify webhook GET
sleep 5
WEBHOOK_TOKEN=$(grep '^WHATSAPP_VERIFY_TOKEN=' /tmp/vercel-env-check.txt | sed 's/WHATSAPP_VERIFY_TOKEN="\(.*\)"/\1/')
echo
echo "→ Webhook GET verify..."
curl -s "https://handyandfriend.com/api/alex-webhook?hub.mode=subscribe&hub.verify_token=${WEBHOOK_TOKEN}&hub.challenge=post_migration_check"
echo

echo
echo "===================================="
echo "✅ Vercel env + deploy updated"
echo
echo "NEXT STEPS (manual in Meta UI):"
echo "1. Go to https://developers.facebook.com/apps/767361159439856/whatsapp-business/wa-settings/"
echo "2. Webhook section → set Callback URL: https://handyandfriend.com/api/alex-webhook"
echo "3. Verify token: \$WHATSAPP_VERIFY_TOKEN value"
echo "4. Subscribe fields: messages, message_status"
echo "5. Switch to NEW WABA $NEW_WABA_ID and confirm subscription is on this WABA"
echo
echo "Then run Cloud API send proof:"
echo "  curl -X POST https://graph.facebook.com/v19.0/$NEW_PHONE_ID/messages \\"
echo "    -H \"Authorization: Bearer \$META_SYSTEM_USER_TOKEN\" \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"messaging_product\":\"whatsapp\",\"to\":\"<your-test-phone>\",\"type\":\"template\",\"template\":{\"name\":\"hello_world\",\"language\":{\"code\":\"en_US\"}}}'"
