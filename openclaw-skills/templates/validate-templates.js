/**
 * Template Validator — pre-post quality gate for OpenClaw hunters
 * Run: node validate-templates.js
 * Returns exit code 0 if all pass, 1 if any fail
 */

const { NEXTDOOR_TEMPLATES } = require('./nextdoor-templates');
const { FACEBOOK_TEMPLATES } = require('./facebook-templates');
const { SERVICE_KEYWORDS } = require('./template-detector');

const CHAR_LIMITS = {
  nextdoor: 140,
  facebook: 140,
};

const REQUIRED_PATTERNS = [
  { pattern: /\(213\) 361-1700/, label: 'phone number' },
  { pattern: /handyandfriend\.com/i, label: 'website mention' },
];

const BANNED_STRINGS = [
  'competitive pricing',
  'competitive rates',
  '[competitive]',
  'call for a quote'
];

let errors = 0;
let warnings = 0;

function check(label, condition, message, isWarning = false) {
  if (!condition) {
    const tag = isWarning ? 'WARN' : 'FAIL';
    console.log(`  [${tag}] ${label}: ${message}`);
    if (isWarning) warnings++;
    else errors++;
  }
}

function validateTemplate(serviceId, platform, template, charLimit) {
  console.log(`  ${platform}/${serviceId} (${template.length} chars)`);

  check(
    'char limit',
    template.length <= charLimit,
    `${template.length} chars > ${charLimit} limit`
  );

  for (const { pattern, label } of REQUIRED_PATTERNS) {
    check(label, pattern.test(template), `missing ${label}`);
  }

  for (const banned of BANNED_STRINGS) {
    check(
      'no placeholder text',
      !template.toLowerCase().includes(banned),
      `contains banned string: "${banned}"`
    );
  }

  check(
    'no prices allowed',
    !/\$\d/.test(template),
    'contains $ price, but no-price policy is active'
  );

  check(
    'no empty placeholders',
    !template.includes('{}') && !template.includes('undefined') && !template.includes('null'),
    'contains empty/undefined placeholder'
  );
}

// 1. Validate all service_ids exist in both templates AND detector
console.log('\n=== Service ID Coverage ===');
const detectorIds = new Set(Object.keys(SERVICE_KEYWORDS));
const nextdoorIds = new Set(Object.keys(NEXTDOOR_TEMPLATES));
const facebookIds = new Set(Object.keys(FACEBOOK_TEMPLATES));

for (const id of detectorIds) {
  const inND = nextdoorIds.has(id);
  const inFB = facebookIds.has(id);
  const status = inND && inFB ? '✓' : '✗';
  if (!inND || !inFB) {
    console.log(`  [FAIL] ${id}: detector=${true} nextdoor=${inND} facebook=${inFB}`);
    errors++;
  } else {
    console.log(`  ${status} ${id}`);
  }
}

for (const id of nextdoorIds) {
  if (!detectorIds.has(id)) {
    console.log(`  [WARN] ${id} in nextdoor-templates but NOT in detector`);
    warnings++;
  }
}

// 2. Validate each template
console.log('\n=== Nextdoor Templates ===');
for (const [serviceId, data] of Object.entries(NEXTDOOR_TEMPLATES)) {
  validateTemplate(serviceId, 'nextdoor', data.template, CHAR_LIMITS.nextdoor);
}

console.log('\n=== Facebook Templates ===');
for (const [serviceId, data] of Object.entries(FACEBOOK_TEMPLATES)) {
  validateTemplate(serviceId, 'facebook', data.template, CHAR_LIMITS.facebook);
}

// 3. Summary
console.log(`\n=== Results ===`);
console.log(`Errors:   ${errors}`);
console.log(`Warnings: ${warnings}`);

if (errors > 0) {
  console.log('\nFAIL — fix errors before deploying');
  process.exit(1);
} else if (warnings > 0) {
  console.log('\nPASS with warnings');
  process.exit(0);
} else {
  console.log('\nPASS — all templates valid');
  process.exit(0);
}
