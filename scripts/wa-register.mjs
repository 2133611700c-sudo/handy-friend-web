#!/usr/bin/env node
/**
 * WhatsApp Cloud API — Phone Number Registration Script
 *
 * Usage:
 *   node scripts/wa-register.mjs [--method SMS|VOICE] [--otp <6-digit-code>]
 *
 * Steps:
 *   1. node scripts/wa-register.mjs            — requests OTP (SMS by default)
 *   2. Answer the call / read the SMS on +1 213-361-1700
 *   3. node scripts/wa-register.mjs --otp 123456  — verifies OTP, completes registration
 *   4. Script prints final phone status
 *
 * Env vars required (pulled from Vercel prod or .env.local):
 *   WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 */

import { execSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { readFileSync, existsSync } from 'node:fs';

// ── Load env ──────────────────────────────────────────────────────────────────

function loadEnv() {
  // Try .env.local first
  if (existsSync('.env.local')) {
    const lines = readFileSync('.env.local', 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.error('ERROR: WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID must be set.');
    console.error('Run: npx vercel env pull --environment=production .env.local --yes');
    process.exit(1);
  }

  return { token, phoneId };
}

// ── Graph API helpers ─────────────────────────────────────────────────────────

async function graphPost(path, body, token) {
  const res = await fetch(`https://graph.facebook.com/v20.0${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function graphGet(path, token) {
  const res = await fetch(
    `https://graph.facebook.com/v20.0${path}?fields=display_phone_number,verified_name,code_verification_status,quality_rating,platform_type,account_mode&access_token=${token}`
  );
  return res.json();
}

// ── Main ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const otpIndex = args.indexOf('--otp');
const methodIndex = args.indexOf('--method');
const otp = otpIndex !== -1 ? args[otpIndex + 1] : null;
const method = methodIndex !== -1 ? args[methodIndex + 1] : 'SMS';

const { token, phoneId } = loadEnv();

// Always print current status first
console.log('\n── Current phone status ────────────────────────────────');
const status = await graphGet(`/${phoneId}`, token);
if (status.error) {
  console.error('Status check failed:', JSON.stringify(status.error, null, 2));
  process.exit(1);
}
console.log(`  Phone:        ${status.display_phone_number}`);
console.log(`  Name:         ${status.verified_name}`);
console.log(`  Verification: ${status.code_verification_status}`);
console.log(`  Platform:     ${status.platform_type}`);
console.log(`  Account mode: ${status.account_mode}`);

if (status.code_verification_status === 'VERIFIED') {
  console.log('\n✅ Already verified! Testing message send...');
  // Test with a safe internal message to a dummy number
  const testRes = await graphPost(`/${phoneId}/messages`, {
    messaging_product: 'whatsapp',
    to: '19991234567',
    type: 'text',
    text: { body: 'Internal registration test — ignore' },
  }, token);
  if (testRes.error?.code === 133010) {
    console.log('⚠️  Still getting 133010 despite VERIFIED status. Meta may need a few minutes.');
  } else if (testRes.messages) {
    console.log('✅ Message send succeeded! Registration complete.');
  } else {
    console.log('Response:', JSON.stringify(testRes, null, 2));
  }
  process.exit(0);
}

if (otp) {
  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  console.log(`\n── Verifying OTP: ${otp} ──────────────────────────────────`);
  const verifyRes = await graphPost(`/${phoneId}/verify_code`, {
    code: otp,
  }, token);

  if (verifyRes.error) {
    console.error('❌ verify_code failed:');
    console.error(JSON.stringify(verifyRes.error, null, 2));
    console.log('\nCommon causes:');
    console.log('  - Wrong code (typo) → retry with correct OTP');
    console.log('  - OTP expired (>10 min) → run without --otp to get new code');
    process.exit(1);
  }

  if (verifyRes.success) {
    console.log('✅ verify_code succeeded!');
    // Re-check status
    console.log('\n── Updated phone status ────────────────────────────────');
    const newStatus = await graphGet(`/${phoneId}`, token);
    console.log(`  Verification: ${newStatus.code_verification_status}`);
    console.log(`  Platform:     ${newStatus.platform_type}`);
    console.log(`  Quality:      ${newStatus.quality_rating}`);

    if (newStatus.code_verification_status === 'VERIFIED') {
      console.log('\n🎉 Phone registered successfully for WhatsApp Cloud API!');
      console.log('Next: send a real test message from your phone to +1 213-361-1700');
      console.log('Expected: Alex AI replies within 10 seconds');
    } else {
      console.log('\n⚠️  Verification accepted but status not yet VERIFIED — wait 1-2 min and re-run.');
    }
  } else {
    console.log('Unexpected response:', JSON.stringify(verifyRes, null, 2));
  }

} else {
  // ── Step 1: Request OTP ───────────────────────────────────────────────────
  console.log(`\n── Requesting OTP via ${method} ─────────────────────────────`);
  console.log(`  Sending to: +1 213-361-1700`);

  const codeRes = await graphPost(`/${phoneId}/request_code`, {
    code_method: method,
    language: 'en_US',
  }, token);

  if (codeRes.error) {
    const err = codeRes.error;
    console.error(`\n❌ request_code failed (code ${err.code}.${err.error_subcode || ''}):`);
    console.error(`   ${err.error_user_msg || err.message}`);

    if (err.error_subcode === 2388091 || err.error_subcode === 2388367) {
      console.log('\n⏳ Rate limited — too many OTP requests on this number today.');
      console.log('   Wait 24 hours (Meta hard limit) then re-run this script.');
      console.log('   Alternatively, verify via Meta Business Manager UI:');
      console.log('   business.facebook.com → WhatsApp Manager → Phone Numbers → Verify');
    }
    process.exit(1);
  }

  if (codeRes.success) {
    console.log(`\n✅ OTP sent via ${method} to +1 213-361-1700`);
    console.log('\nNext steps:');
    console.log('  1. Answer the SMS or voice call on +1 213-361-1700');
    console.log('  2. Note the 6-digit OTP code');
    console.log('  3. Run: node scripts/wa-register.mjs --otp <YOUR_CODE>');
    console.log('\n  OTP expires in ~10 minutes.');
  } else {
    console.log('Unexpected response:', JSON.stringify(codeRes, null, 2));
  }
}
