/**
 * Nextdoor Service-Specific Response Templates
 * 13 services with short no-price conversion replies
 * For use by nextdoor-hunter SKILL
 */

const NEXTDOOR_TEMPLATES = {
  tv_mounting: {
    service_id: "tv_mounting",
    service_name: "TV Mounting",
    scope: "GREEN",
    priority: 1,
    template:
      "Hi [name]! We can help with TV mounting. Quick quote: handyandfriend.com (213) 361-1700",
    word_count: 26,
    price_mention: false,
  },

  kitchen_cabinet_painting: {
    service_id: "kitchen_cabinet_painting",
    service_name: "Cabinet Painting",
    scope: "GREEN",
    priority: 1,
    template:
      "Hi [name]! We can help with cabinet painting. Send details: handyandfriend.com (213) 361-1700",
    word_count: 30,
    price_mention: false,
  },

  interior_painting: {
    service_id: "interior_painting",
    service_name: "Interior Painting",
    scope: "GREEN",
    priority: 1,
    template:
      "Hi [name]! We can help with interior painting. Fast quote: handyandfriend.com (213) 361-1700",
    word_count: 28,
    price_mention: false,
  },

  flooring: {
    service_id: "flooring",
    service_name: "Flooring Installation",
    scope: "GREEN",
    priority: 1,
    template:
      "Hi [name]! We can help with flooring (LVP/laminate). Quote: handyandfriend.com (213) 361-1700",
    word_count: 21,
    price_mention: false,
  },

  drywall: {
    service_id: "drywall",
    service_name: "Drywall Repair",
    scope: "GREEN",
    priority: 2,
    template:
      "Hi [name]! We can help with drywall repair. Quick quote: handyandfriend.com (213) 361-1700",
    word_count: 20,
    price_mention: false,
  },

  furniture_assembly: {
    service_id: "furniture_assembly",
    service_name: "Furniture Assembly",
    scope: "GREEN",
    priority: 2,
    template:
      "Hi [name]! We can help with furniture assembly. Send photos: handyandfriend.com (213) 361-1700",
    word_count: 22,
    price_mention: false,
  },

  art_mirrors: {
    service_id: "art_mirrors",
    service_name: "Art & Mirror Hanging",
    scope: "GREEN",
    priority: 3,
    template:
      "Hi [name]! We can help with art/mirror hanging. Details: handyandfriend.com (213) 361-1700",
    word_count: 23,
    price_mention: false,
  },

  furniture_painting: {
    service_id: "furniture_painting",
    service_name: "Furniture Painting",
    scope: "GREEN",
    priority: 3,
    template:
      "Hi [name]! We can help with furniture painting. Fast quote: handyandfriend.com (213) 361-1700",
    word_count: 19,
    price_mention: false,
  },

  plumbing: {
    service_id: "plumbing",
    service_name: "Plumbing",
    scope: "GREEN",
    priority: 3,
    template:
      "Hi [name]! We can help with minor plumbing. Quote: handyandfriend.com (213) 361-1700",
    word_count: 20,
    price_mention: false,
  },

  electrical: {
    service_id: "electrical",
    service_name: "Electrical",
    scope: "GREEN",
    priority: 3,
    template:
      "Hi [name]! We can help with minor electrical work. Details: handyandfriend.com (213) 361-1700",
    word_count: 21,
    price_mention: false,
  },

  door_installation: {
    service_id: "door_installation",
    service_name: "Door Installation",
    scope: "GREEN",
    priority: 2,
    template:
      "Hi [name]! We can help with door installation. Fast quote: handyandfriend.com (213) 361-1700",
    word_count: 22,
    price_mention: false,
  },

  vanity_installation: {
    service_id: "vanity_installation",
    service_name: "Vanity Installation",
    scope: "GREEN",
    priority: 3,
    template:
      "Hi [name]! We can help with vanity installation. Details: handyandfriend.com (213) 361-1700",
    word_count: 19,
    price_mention: false,
  },

  backsplash: {
    service_id: "backsplash",
    service_name: "Backsplash Installation",
    scope: "GREEN",
    priority: 3,
    template:
      "Hi [name]! We can help with backsplash installation. Quote: handyandfriend.com (213) 361-1700",
    word_count: 19,
    price_mention: false,
  },
};

/**
 * Export for use in nextdoor-hunter SKILL
 */
module.exports = { NEXTDOOR_TEMPLATES };

/**
 * Helper function to get template by service_id
 */
function getNextdoorTemplate(service_id) {
  const template = NEXTDOOR_TEMPLATES[service_id];
  if (!template) {
    return null;
  }
  return template.template;
}

module.exports.getNextdoorTemplate = getNextdoorTemplate;

/**
 * Helper to get all service IDs
 */
function getAllServiceIds() {
  return Object.keys(NEXTDOOR_TEMPLATES);
}

module.exports.getAllServiceIds = getAllServiceIds;
