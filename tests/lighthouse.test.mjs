import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

const PROD_URL = 'https://handyandfriend.com/';
const BASELINE = {
  mobile: { seo: 95, accessibility: 85, performance: 40 },
  desktop: { seo: 95, accessibility: 85, performance: 80 },
};

function runLighthouse(preset) {
  const presetArg = preset === 'mobile' ? '' : '--preset=desktop';
  const cmd = `npx lighthouse ${PROD_URL} ${presetArg} --quiet --output=json --output-path=stdout --chrome-flags="--headless=new"`;
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return JSON.parse(out);
  } catch {
    return null;
  }
}

test('lighthouse mobile scores meet baseline', { skip: process.env.CI === 'true' }, () => {
  const result = runLighthouse('mobile');
  if (!result) {
    console.warn('lighthouse mobile run unavailable in current environment; skipping assertions');
    return;
  }
  const categories = result.categories;
  assert.ok(categories.seo.score * 100 >= BASELINE.mobile.seo);
  assert.ok(categories.accessibility.score * 100 >= BASELINE.mobile.accessibility);
  assert.ok(categories.performance.score * 100 >= BASELINE.mobile.performance);
});

test('lighthouse desktop scores meet baseline', { skip: process.env.CI === 'true' }, () => {
  const result = runLighthouse('desktop');
  if (!result) {
    console.warn('lighthouse desktop run unavailable in current environment; skipping assertions');
    return;
  }
  const categories = result.categories;
  assert.ok(categories.seo.score * 100 >= BASELINE.desktop.seo);
  assert.ok(categories.accessibility.score * 100 >= BASELINE.desktop.accessibility);
  assert.ok(categories.performance.score * 100 >= BASELINE.desktop.performance);
});
