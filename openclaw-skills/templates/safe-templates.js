/**
 * Safe Nextdoor Response Templates (NO PRICES)
 * For use by nextdoor-hunter-safe SKILL
 */

const SAFE_TEMPLATES = {
  tv_mounting: {
    service_id: "tv_mounting",
    service_name: "TV Mounting",
    scope: "GREEN",
    priority: 1,
    template:
      "Hi [name]! TV mounting is what we do daily. Professional & insured, clean installation. Free estimate: (213) 361-1700",
    word_count: 18,
    price_mention: false,
  },

  kitchen_cabinet_painting: {
    service_id: "kitchen_cabinet_painting",
    service_name: "Cabinet Painting",
    scope: "GREEN",
    priority: 1,
    template:
      "Hi [name]! Cabinet painting is our specialty. Professional spray finish with premium paint included. Free estimate: (213) 361-1700",
    word_count: 19,
    price_mention: false,
  },

  interior_painting: {
    service_id: "interior_painting",
    service_name: "Interior Painting",
    scope: "GREEN",
    priority: 1,
    template:
      "Hi [name]! We paint interiors with professional finish. Walls, ceilings, trim - we do it all. Free estimate: (213) 361-1700",
    word_count: 20,
    price_mention: false,
  },

  flooring: {
    service_id: "flooring",
    service_name: "Flooring Installation",
    scope: "GREEN",
    priority: 1,
    template:
      "Hi [name]! We install laminate/LVP flooring with professional finish. Quick turnaround. Free estimate: (213) 361-1700",
    word_count: 17,
    price_mention: false,
  },

  drywall: {
    service_id: "drywall",
    service_name: "Drywall Repair",
    scope: "GREEN",
    priority: 2,
    template:
      "Hi [name]! We patch drywall holes and repair damage. Professional finish. Free estimate: (213) 361-1700",
    word_count: 16,
    price_mention: false,
  },

  furniture_assembly: {
    service_id: "furniture_assembly",
    service_name: "Furniture Assembly",
    scope: "GREEN",
    priority: 2,
    template:
      "Hi [name]! We assemble furniture regularly - IKEA, Wayfair, all brands. Professional & insured. Free estimate: (213) 361-1700",
    word_count: 18,
    price_mention: false,
  },

  art_mirrors: {
    service_id: "art_mirrors",
    service_name: "Art & Mirror Hanging",
    scope: "GREEN",
    priority: 3,
    template:
      "Hi [name]! We hang art, mirrors, shelves with precision. Professional & insured. Free estimate: (213) 361-1700",
    word_count: 17,
    price_mention: false,
  },

  furniture_painting: {
    service_id: "furniture_painting",
    service_name: "Furniture Painting",
    scope: "GREEN",
    priority: 3,
    template:
      "Hi [name]! We paint furniture with professional finish. Premium paint included. Free estimate: (213) 361-1700",
    word_count: 17,
    price_mention: false,
  },

  plumbing: {
    service_id: "plumbing",
    service_name: "Plumbing",
    scope: "GREEN",
    priority: 3,
    template:
      "Hi [name]! We handle minor plumbing - faucets, toilets, shower heads. Professional & insured. Free estimate: (213) 361-1700",
    word_count: 18,
    price_mention: false,
  },

  electrical: {
    service_id: "electrical",
    service_name: "Electrical",
    scope: "GREEN",
    priority: 3,
    template:
      "Hi [name]! We do like-for-like electrical work - lights, outlets, switches. Professional & insured. Free estimate: (213) 361-1700",
    word_count: 19,
    price_mention: false,
  },

  door_installation: {
    service_id: "door_installation",
    service_name: "Door Installation",
    scope: "GREEN",
    priority: 2,
    template:
      "Hi [name]! We install interior and exterior doors professionally. Clean setup. Free estimate: (213) 361-1700",
    word_count: 17,
    price_mention: false,
  },

  vanity_installation: {
    service_id: "vanity_installation",
    service_name: "Vanity Installation",
    scope: "GREEN",
    priority: 3,
    template:
      "Hi [name]! We install bathroom vanities professionally. Clean work. Free estimate: (213) 361-1700",
    word_count: 15,
    price_mention: false,
  },

  backsplash: {
    service_id: "backsplash",
    service_name: "Backsplash Installation",
    scope: "GREEN",
    priority: 3,
    template:
      "Hi [name]! We install kitchen backsplash - tile or peel & stick. Professional finish. Free estimate: (213) 361-1700",
    word_count: 18,
    price_mention: false,
  },

  // Generic template for when service is not detected
  generic: {
    service_id: "generic",
    service_name: "Generic Handyman",
    scope: "GREEN",
    priority: 4,
    template:
      "Hi [name]! We can help with that. Professional & insured handyman service. Free estimate: (213) 361-1700",
    word_count: 16,
    price_mention: false,
  },
};

/**
 * Export for use in nextdoor-hunter-safe SKILL
 */
module.exports = { SAFE_TEMPLATES };

/**
 * Helper function to get safe template by service_id
 */
function getSafeTemplate(service_id) {
  const template = SAFE_TEMPLATES[service_id];
  if (!template) {
    return SAFE_TEMPLATES.generic.template;
  }
  return template.template;
}

module.exports.getSafeTemplate = getSafeTemplate;

/**
 * Helper to get all service IDs
 */
function getAllSafeServiceIds() {
  return Object.keys(SAFE_TEMPLATES);
}

module.exports.getAllSafeServiceIds = getAllSafeServiceIds;