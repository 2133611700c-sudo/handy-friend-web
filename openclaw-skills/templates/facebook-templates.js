/**
 * Facebook Service-Specific Response Templates
 * 13 services with short no-price conversion replies
 * For use by facebook-hunter SKILL
 * Posted as Handy & Friend Page (not personal profile)
 */

const FACEBOOK_TEMPLATES = {
  tv_mounting: {
    service_id: "tv_mounting",
    service_name: "TV Mounting",
    scope: "GREEN",
    priority: 1,
    template:
      "We can help with TV mounting. Quick quote: handyandfriend.com — (213) 361-1700",
    word_count: 25,
    price_mention: false,
  },

  kitchen_cabinet_painting: {
    service_id: "kitchen_cabinet_painting",
    service_name: "Cabinet Painting",
    scope: "GREEN",
    priority: 1,
    template:
      "We can help with cabinet painting. Send details: handyandfriend.com — (213) 361-1700",
    word_count: 23,
    price_mention: false,
  },

  interior_painting: {
    service_id: "interior_painting",
    service_name: "Interior Painting",
    scope: "GREEN",
    priority: 1,
    template:
      "We can help with interior painting. Fast quote: handyandfriend.com — (213) 361-1700",
    word_count: 22,
    price_mention: false,
  },

  flooring: {
    service_id: "flooring",
    service_name: "Flooring Installation",
    scope: "GREEN",
    priority: 1,
    template:
      "We can help with flooring (LVP/laminate). Quick quote: handyandfriend.com — (213) 361-1700",
    word_count: 21,
    price_mention: false,
  },

  drywall: {
    service_id: "drywall",
    service_name: "Drywall Repair",
    scope: "GREEN",
    priority: 2,
    template:
      "We can help with drywall repair. Fast quote: handyandfriend.com — (213) 361-1700",
    word_count: 20,
    price_mention: false,
  },

  furniture_assembly: {
    service_id: "furniture_assembly",
    service_name: "Furniture Assembly",
    scope: "GREEN",
    priority: 2,
    template:
      "We can help with furniture assembly. Send photos: handyandfriend.com — (213) 361-1700",
    word_count: 18,
    price_mention: false,
  },

  art_mirrors: {
    service_id: "art_mirrors",
    service_name: "Art & Mirror Hanging",
    scope: "GREEN",
    priority: 3,
    template:
      "We can help with art/mirror hanging. Details: handyandfriend.com — (213) 361-1700",
    word_count: 21,
    price_mention: false,
  },

  furniture_painting: {
    service_id: "furniture_painting",
    service_name: "Furniture Painting",
    scope: "GREEN",
    priority: 3,
    template:
      "We can help with furniture painting. Quick quote: handyandfriend.com — (213) 361-1700",
    word_count: 17,
    price_mention: false,
  },

  plumbing: {
    service_id: "plumbing",
    service_name: "Plumbing",
    scope: "GREEN",
    priority: 3,
    template:
      "We can help with minor plumbing. Details: handyandfriend.com — (213) 361-1700",
    word_count: 17,
    price_mention: false,
  },

  electrical: {
    service_id: "electrical",
    service_name: "Electrical",
    scope: "GREEN",
    priority: 3,
    template:
      "We can help with minor electrical work. Fast quote: handyandfriend.com — (213) 361-1700",
    word_count: 17,
    price_mention: false,
  },

  door_installation: {
    service_id: "door_installation",
    service_name: "Door Installation",
    scope: "GREEN",
    priority: 2,
    template:
      "We can help with door installation. Details: handyandfriend.com — (213) 361-1700",
    word_count: 18,
    price_mention: false,
  },

  vanity_installation: {
    service_id: "vanity_installation",
    service_name: "Vanity Installation",
    scope: "GREEN",
    priority: 3,
    template:
      "We can help with vanity installation. Quick quote: handyandfriend.com — (213) 361-1700",
    word_count: 16,
    price_mention: false,
  },

  backsplash: {
    service_id: "backsplash",
    service_name: "Backsplash Installation",
    scope: "GREEN",
    priority: 3,
    template:
      "We can help with backsplash installation. Send details: handyandfriend.com — (213) 361-1700",
    word_count: 18,
    price_mention: false,
  },
};

/**
 * Export for use in facebook-hunter SKILL
 */
module.exports = { FACEBOOK_TEMPLATES };

/**
 * Helper function to get template by service_id
 */
function getFacebookTemplate(service_id) {
  const template = FACEBOOK_TEMPLATES[service_id];
  if (!template) {
    return null;
  }
  return template.template;
}

module.exports.getFacebookTemplate = getFacebookTemplate;

/**
 * Helper to get all service IDs
 */
function getAllServiceIds() {
  return Object.keys(FACEBOOK_TEMPLATES);
}

module.exports.getAllServiceIds = getAllServiceIds;
