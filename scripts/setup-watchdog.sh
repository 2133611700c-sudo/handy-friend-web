#!/bin/bash
# Lead Hunter Watchdog Setup
# Auto-starts OpenClaw on Mac boot, restarts if crashed

PLIST_NAME="com.handyfriend.leadhunter"
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$PLIST_DIR/$PLIST_NAME.plist"
PROJECT_DIR="$HOME/handy-friend-landing-v6"
OPENCLAW_PATH="/opt/homebrew/bin/openclaw"

echo "Setting up Lead Hunter Watchdog..."

# Check OpenClaw exists
if [ ! -x "$OPENCLAW_PATH" ]; then
  echo "ERROR: OpenClaw not found at $OPENCLAW_PATH"
  echo "Install OpenClaw first, then re-run this script."
  exit 1
fi

# Create log directory
mkdir -p "$PROJECT_DIR/ops"

# Create plist
cat > "$PLIST_PATH" << 'PLISTEOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.handyfriend.leadhunter</string>
  <key>ProgramArguments</key>
  <array>
    <string>/opt/homebrew/bin/openclaw</string>
  </array>
  <key>WorkingDirectory</key>
  <string>WORKING_DIR_PLACEHOLDER</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>WORKING_DIR_PLACEHOLDER/ops/hunter.log</string>
  <key>StandardErrorPath</key>
  <string>WORKING_DIR_PLACEHOLDER/ops/hunter-error.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
PLISTEOF

# Replace placeholder with actual path
sed -i '' "s|WORKING_DIR_PLACEHOLDER|$PROJECT_DIR|g" "$PLIST_PATH"

# Load the agent
launchctl unload "$PLIST_PATH" 2>/dev/null
launchctl load "$PLIST_PATH"

echo "Watchdog installed at: $PLIST_PATH"
echo "OpenClaw will auto-start on boot and restart if it crashes."

# Prevent Mac sleep when on power (display can sleep)
echo ""
echo "Configuring Mac sleep settings (requires sudo)..."
echo "This prevents Mac from sleeping when plugged in."
echo "Display will still sleep after 15 minutes."
sudo pmset -c sleep 0 displaysleep 15 disksleep 0

echo ""
echo "Verification:"
launchctl list | grep handyfriend
echo ""
echo "Done! Run 'bash exo.sh leads health' to verify."
