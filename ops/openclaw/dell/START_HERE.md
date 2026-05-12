# Dell OpenClaw — START HERE

Status: ACTIVE
Purpose: Use Dell/WSL2 as the browser/local execution hand for ChatGPT when GitHub/Vercel tools are not enough.

## Goal
Bring Dell OpenClaw online, verify runtime, run safe browser audit, and return evidence without sending real client messages.

## Safety rules

- No real customer messages.
- No WhatsApp/Facebook/Nextdoor posting.
- No passwords/tokens in logs/screenshots.
- No destructive production actions.
- Synthetic/public checks only.

## Step 1 — Open terminal on Dell

Run:

```bash
mkdir -p ~/work
cd ~/work
```

If repo exists:

```bash
cd ~/work/handy-friend-web || cd ~/work/bravo1/output/audit-src/handy-friend-web
```

If repo does not exist:

```bash
gh repo clone 2133611700c-sudo/handy-friend-web ~/work/handy-friend-web
cd ~/work/handy-friend-web
```

## Step 2 — Update repo

```bash
git status --short
git pull --ff-only origin main
```

If local changes exist, do not overwrite. Report them first.

## Step 3 — Run Dell self-check

```bash
bash ops/openclaw/dell/dell-self-check.sh
```

Expected output:
- OS info
- git/node/npm/python versions
- repo status
- OpenClaw files found
- browser runner syntax PASS

## Step 4 — Run local public browser audit

Only after self-check PASS:

```bash
npm install --no-audit --no-fund
npm install --no-save --no-audit --no-fund playwright@latest
npx playwright install chromium
TARGET_ORIGIN=https://handyandfriend.com \
ROUTES='/,/book,/pricing,/services,/messenger' \
OUT_DIR=ops/openclaw/reports/dell-browser \
node scripts/openclaw-virtual-browser-audit.mjs
```

Expected outputs:

```text
ops/openclaw/reports/dell-browser/result.json
ops/openclaw/reports/dell-browser/report.md
ops/openclaw/reports/dell-browser/*.png
```

## Step 5 — Return evidence

Commit only reports/artifacts if safe and useful:

```bash
git status --short
```

If reports exist and no secrets are present:

```bash
git add ops/openclaw/reports/dell-browser
git commit -m "ops(openclaw): add Dell browser audit evidence"
git push origin main
```

If Git blocks PNG size or repo pollution is a concern, do not commit screenshots. Instead keep local files and report:
- exact path
- summary from `result.json`
- any failed pages
- any bad claims
- any missing links

## Step 6 — Optional synthetic Alex QA

Only after browser audit PASS. Do not submit real customer lead unless marked synthetic/test.

Synthetic questions:
1. How much is TV mounting?
2. Can you help with drywall repair in Hollywood?
3. Do you do electrical panel work?
4. Can you come today?
5. I need a quote for painting, I have photos.

Expected:
- no licensed/bonded/certified claims
- no final quote when scope unknown
- asks for photos/ZIP/timing where needed
- escalates trade-regulated work

## Current blockers still separate

- Supabase SQL Reports need real Postgres URI.
- VPS runner is optional if Dell stays available.
