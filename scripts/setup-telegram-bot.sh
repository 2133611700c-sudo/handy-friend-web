#!/bin/bash
# Telegram Bot Setup for Lead Hunter
# Uses existing TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID from Vercel env

echo "Telegram Bot Setup for Lead Hunter"
echo "==================================="
echo ""

# Check if tokens already exist in environment
if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
  echo "Found existing Telegram credentials in environment."
  echo "Bot Token: ${TELEGRAM_BOT_TOKEN:0:10}..."
  echo "Chat ID: $TELEGRAM_CHAT_ID"
else
  echo "Telegram credentials not found in environment."
  echo ""
  echo "Handy & Friend already has these configured in Vercel."
  echo "To use them locally, add to your shell profile (~/.zshrc):"
  echo ""
  echo '  export TELEGRAM_BOT_TOKEN="your_token_here"'
  echo '  export TELEGRAM_CHAT_ID="your_chat_id_here"'
  echo ""
  echo "Get values from: https://vercel.com/dashboard → handy-friend → Settings → Environment Variables"
  echo ""
  read -p "Enter TELEGRAM_BOT_TOKEN: " BOT_TOKEN
  read -p "Enter TELEGRAM_CHAT_ID: " CHAT_ID

  if [ -z "$BOT_TOKEN" ] || [ -z "$CHAT_ID" ]; then
    echo "ERROR: Both values required."
    exit 1
  fi

  export TELEGRAM_BOT_TOKEN="$BOT_TOKEN"
  export TELEGRAM_CHAT_ID="$CHAT_ID"
fi

# Test message
echo ""
echo "Sending test message..."

RESPONSE=$(curl -s -X POST \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -d "chat_id=${TELEGRAM_CHAT_ID}" \
  -d "text=Lead Hunter connected! System ready. Run 'bash exo.sh leads health' to check status." \
  -d "parse_mode=HTML")

if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "Test message sent successfully!"
  echo ""
  echo "Check your Telegram — you should see the message."
  echo ""
  echo "For OpenClaw integration:"
  echo "  openclaw channel add telegram --token \"\$TELEGRAM_BOT_TOKEN\" --chat-id \"\$TELEGRAM_CHAT_ID\""
else
  echo "ERROR sending message:"
  echo "$RESPONSE"
  echo ""
  echo "Common issues:"
  echo "  1. Bot token is wrong"
  echo "  2. Chat ID is wrong — send /start to your bot first"
  echo "  3. Bot was not started — open Telegram, find your bot, send /start"
fi
