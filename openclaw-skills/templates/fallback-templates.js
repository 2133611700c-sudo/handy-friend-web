/**
 * Fallback Generic Templates
 * Used when service_id cannot be detected
 * Rotating templates (current Nextdoor/Facebook logic)
 */

const NEXTDOOR_FALLBACK = {
  GREEN: [
    // Template 1: Friendly neighbor
    "Hi [name]! I'm Sergii, your local handyman in [area]. I do [service] professionally. Professional & insured, free estimate. (213) 361-1700",

    // Template 2: Competitive
    "Hi [name]! We handle [service] with competitive rates, professional & insured. Free estimate — call (213) 361-1700",

    // Template 3: Social proof
    "Hi [name]! I'm Sergii — just finished a similar project nearby. [service] is exactly what we do. Free estimate! (213) 361-1700",

    // Template 4: Short & direct
    "Hi [name]! I can help with [service]. Professional work, free estimate. (213) 361-1700",

    // Template 5: Specific
    "Hi [name]! This is exactly what I do. Let's discuss your [service] project. Free estimate — (213) 361-1700",
  ],

  YELLOW:
    "Hi [name]! That might be something I can help with — depends on scope. Mind if I take a quick look? No charge for the estimate. (213) 361-1700 — Sergii",
};

const FACEBOOK_FALLBACK = {
  GREEN: [
    // Template 1: Professional brand
    "Handy & Friend here! We do [service] professionally. Professional & insured, free estimates. (213) 361-1700",

    // Template 2: Portfolio
    "We handle [service] — check our work at handyandfriend.com. Free estimates — (213) 361-1700",

    // Template 3: Local friendly
    "Local LA handyman — [service] is one of our specialties! Free estimates. Call (213) 361-1700",
  ],

  YELLOW:
    "Handy & Friend here! That might be something we can help with. Message us for details — (213) 361-1700",
};

/**
 * Get random template from array
 */
function getRandomTemplate(templates) {
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Get rotating template (never consecutive repeats)
 * Requires state tracking: lastUsedIndex
 */
function getRotatingTemplate(templates, lastUsedIndex = -1) {
  const candidates = templates.filter(
    (_, index) => index !== lastUsedIndex
  );
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Get Nextdoor fallback template
 */
function getNextdoorFallback(scope = "GREEN", lastUsedIndex = -1) {
  if (scope === "YELLOW") {
    return NEXTDOOR_FALLBACK.YELLOW;
  }
  return getRotatingTemplate(NEXTDOOR_FALLBACK.GREEN, lastUsedIndex);
}

/**
 * Get Facebook fallback template
 */
function getFacebookFallback(scope = "GREEN", lastUsedIndex = -1) {
  if (scope === "YELLOW") {
    return FACEBOOK_FALLBACK.YELLOW;
  }
  return getRotatingTemplate(FACEBOOK_FALLBACK.GREEN, lastUsedIndex);
}

module.exports = {
  NEXTDOOR_FALLBACK,
  FACEBOOK_FALLBACK,
  getRandomTemplate,
  getRotatingTemplate,
  getNextdoorFallback,
  getFacebookFallback,
};
