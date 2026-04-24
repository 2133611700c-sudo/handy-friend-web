/**
 * Generate assets/js/price-registry.browser.js from the canonical
 * lib/price-registry.js source of truth.
 *
 * The browser bundle exposes only the public pricing model:
 *   - Service Call: $150, 2 hours included, $75/hour after.
 *   - Materials policy.
 *   - Project estimate per-sf values for interior painting and flooring.
 *   - Service-category buckets (service_call / quote_only / project_estimate).
 *
 * No legacy service-specific numbers, no combo discounts, no fallback
 * defaults. If a key is missing from the registry the build fails loudly.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const {
  getPricingSourceVersion,
  getServiceCall,
  getMaterialsPolicy,
  getProjectEstimates,
  getCanonicalPriceMatrix,
  listServicesByCategory,
  SERVICE_CATEGORY
} = require('../lib/price-registry.js');

const browserRegistry = {
  version: getPricingSourceVersion(),
  service_call: getServiceCall(),
  materials_policy: getMaterialsPolicy(),
  project_estimate: getProjectEstimates(),
  canonical: getCanonicalPriceMatrix(),
  categories: {
    service_call: listServicesByCategory(SERVICE_CATEGORY.SERVICE_CALL),
    quote_only: listServicesByCategory(SERVICE_CATEGORY.QUOTE_ONLY),
    project_estimate: listServicesByCategory(SERVICE_CATEGORY.PROJECT_ESTIMATE)
  }
};

const banner = '/* Auto-generated from lib/price-registry.js. Do not edit manually. */';
const out = `${banner}\nwindow.HF_PRICE_REGISTRY = ${JSON.stringify(browserRegistry, null, 2)};\n`;
const outPath = path.resolve(__dirname, '../assets/js/price-registry.browser.js');
fs.writeFileSync(outPath, out, 'utf8');
console.log(`Generated ${outPath}`);
