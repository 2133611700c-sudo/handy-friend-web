/**
 * Canonical pricing registry for Handy & Friend.
 * Single source of truth used by chat, messenger, diagnostics, SEO checks,
 * and the browser-side calculator bundle.
 *
 * Public model (frozen 2026-04-24):
 *   Service Call — $150. Includes up to 2 hours on-site for the agreed scope.
 *   $75/hour after included time, only when approved in writing.
 *   Materials, parking, disposal, and third-party purchases are extra only
 *   when stated in writing before work starts.
 *
 * Painting and flooring are the only services with a public per-sf number
 * ($3.00/sq ft labor estimate), and only on their dedicated subpages,
 * labeled as project estimate — labor only, materials separate.
 *
 * Everything else is either a $150 service call or quote after photos.
 */

const PRICING_SOURCE_VERSION = '2026.04.24-v1-one-price';

const SERVICE_CALL = Object.freeze({
  price: 150,
  included_hours: 2,
  hourly_after: 75,
  currency: 'USD',
  label: 'Service Call — $150',
  sub_label: 'Includes up to 2 hours on-site for the agreed scope',
  overflow_label: '$75/hour after included time, only when approved in writing'
});

const MATERIALS_POLICY =
  'Materials, parking, disposal, and third-party purchases are extra only when stated in writing before work starts.';

const PROJECT_ESTIMATE = Object.freeze({
  interior_painting: { labor_per_sf: 3.0, currency: 'USD' },
  flooring: { labor_per_sf: 3.0, currency: 'USD' }
});

const SERVICE_CATEGORY = Object.freeze({
  SERVICE_CALL: 'service_call',
  QUOTE_ONLY: 'quote_only',
  PROJECT_ESTIMATE: 'project_estimate'
});

const SERVICES = {
  tv_mounting: {
    service_id: 'tv_mounting',
    label: 'TV Mounting',
    category: SERVICE_CATEGORY.SERVICE_CALL,
    unit: 'fixed',
    base_prices: { standard: 150 },
    covers: ['standard wall mount up to 65"', 'drywall or stud walls', 'surface cable management'],
    quote_only_variants: ['hidden-wire installation', 'in-wall wiring with fire blocks'],
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'wall_install'
  },
  furniture_assembly: {
    service_id: 'furniture_assembly',
    label: 'Furniture Assembly',
    category: SERVICE_CATEGORY.SERVICE_CALL,
    unit: 'fixed',
    base_prices: { small_item: 150 },
    covers: ['small to medium pieces fitting in 2 hours', 'IKEA shelves, desks, tables, small dressers'],
    quote_only_variants: ['PAX/Elfa closet systems', 'bed frames with multi-part assembly', 'multiple complex pieces'],
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'wall_install'
  },
  art_mirrors: {
    service_id: 'art_mirrors',
    label: 'Art & Mirror Hanging',
    category: SERVICE_CATEGORY.SERVICE_CALL,
    unit: 'fixed',
    base_prices: { up_to_5_pieces: 150 },
    covers: ['up to 5 standard pieces', 'drywall or stud walls', 'level-checked'],
    quote_only_variants: ['gallery walls beyond 5 pieces', 'oversized mirrors needing structural anchoring'],
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'wall_install'
  },
  plumbing: {
    service_id: 'plumbing',
    label: 'Plumbing (Minor / Handyman)',
    category: SERVICE_CATEGORY.SERVICE_CALL,
    unit: 'fixed',
    base_prices: { minor_fixture: 150 },
    covers: ['faucet swap', 'shower head replacement', 'toilet tank repair', 're-caulk tub/shower'],
    quote_only_variants: ['new supply lines', 'permit-required work', 'anything beyond like-for-like swaps'],
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'standalone'
  },
  electrical: {
    service_id: 'electrical',
    label: 'Electrical (Minor / Handyman)',
    category: SERVICE_CATEGORY.SERVICE_CALL,
    unit: 'fixed',
    base_prices: { minor_fixture: 150 },
    covers: ['light fixture replacement in existing box', 'outlet/switch swap', 'smart doorbell/lock install'],
    quote_only_variants: ['new circuits', 'panel work', 'permit-required work'],
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'standalone'
  },
  drywall: {
    service_id: 'drywall',
    label: 'Drywall Repair',
    category: SERVICE_CATEGORY.SERVICE_CALL,
    unit: 'fixed',
    base_prices: { small_patch: 150 },
    covers: ['small patches up to 6"', 'texture matching for same-color refresh'],
    quote_only_variants: ['medium patches 6-12"', 'large patches 12"+', 'multi-coat color change', 'water damage repair'],
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger'],
    cross_sell_cluster: 'renovation'
  },
  door_minor: {
    service_id: 'door_minor',
    label: 'Door Repair / Adjustment',
    category: SERVICE_CATEGORY.SERVICE_CALL,
    unit: 'fixed',
    base_prices: { minor_adjustment: 150 },
    covers: ['hinge adjustment', 'latch fix', 'handle or knob replacement', 'strike plate alignment'],
    quote_only_variants: ['new door install', 'full pre-hung replacement', 'exterior door install'],
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger'],
    cross_sell_cluster: 'standalone'
  },
  interior_painting: {
    service_id: 'interior_painting',
    label: 'Interior Painting',
    category: SERVICE_CATEGORY.PROJECT_ESTIMATE,
    unit: 'sq_ft',
    project_estimate: {
      labor_per_sf: 3.0,
      note: 'Project estimate — labor only, materials separate, written quote required. Not a $150 service call.'
    },
    base_prices: {
      wall_1coat: 3.0,
      wall_2coats: 3.75,
      ceiling_smooth: 3.75,
      ceiling_textured: 4.25,
      baseboard: 3.0,
      crown_ornate: 3.75,
      door_casing_side: 30,
      baseboard_install: 2.5,
      door_slab: 65
    },
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'renovation'
  },
  flooring: {
    service_id: 'flooring',
    label: 'Flooring Installation',
    category: SERVICE_CATEGORY.PROJECT_ESTIMATE,
    unit: 'sq_ft',
    project_estimate: {
      labor_per_sf: 3.0,
      note: 'Project estimate — labor only, materials separate, written quote required. Not a $150 service call.'
    },
    base_prices: {
      laminate: 3.0,
      lvp: 3.0,
      demo: 1.5,
      underlayment: 0.5,
      transition: 30
    },
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'renovation'
  },
  door_installation: {
    service_id: 'door_installation',
    label: 'Door Installation',
    category: SERVICE_CATEGORY.QUOTE_ONLY,
    unit: 'quote_only',
    channel_visibility: ['website', 'ai_chat', 'messenger'],
    cross_sell_cluster: 'renovation'
  },
  vanity_installation: {
    service_id: 'vanity_installation',
    label: 'Vanity Installation',
    category: SERVICE_CATEGORY.QUOTE_ONLY,
    unit: 'quote_only',
    channel_visibility: ['website', 'ai_chat', 'messenger'],
    cross_sell_cluster: 'renovation'
  },
  backsplash: {
    service_id: 'backsplash',
    label: 'Backsplash Installation',
    category: SERVICE_CATEGORY.QUOTE_ONLY,
    unit: 'quote_only',
    channel_visibility: ['website', 'ai_chat', 'messenger'],
    cross_sell_cluster: 'renovation'
  },
  kitchen_cabinet_painting: {
    service_id: 'kitchen_cabinet_painting',
    label: 'Kitchen Cabinet Painting',
    category: SERVICE_CATEGORY.QUOTE_ONLY,
    unit: 'quote_only',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'paint_refresh'
  },
  furniture_painting: {
    service_id: 'furniture_painting',
    label: 'Furniture Painting',
    category: SERVICE_CATEGORY.QUOTE_ONLY,
    unit: 'quote_only',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'paint_refresh'
  }
};

/**
 * PRICE_MATRIX — canonical public entry price per service.
 *   number  = $150 service call (or per-sf project estimate for paint/floor)
 *   null    = quote-only, no public price
 *
 * Downstream consumers must treat `null` as a signal to render
 * "Quote after photos" copy, not a number.
 */
const PRICE_MATRIX = {
  tv_mounting: 150,
  furniture_assembly: 150,
  art_mirrors: 150,
  plumbing: 150,
  electrical: 150,
  drywall: 150,
  door_minor: 150,
  interior_painting: 3.0,
  flooring: 3.0,
  door_installation: null,
  vanity_installation: null,
  backsplash: null,
  kitchen_cabinet_painting: null,
  furniture_painting: null
};

function getPricingSourceVersion() {
  return PRICING_SOURCE_VERSION;
}

function getServiceCall() {
  return { ...SERVICE_CALL };
}

function getMaterialsPolicy() {
  return MATERIALS_POLICY;
}

function getProjectEstimates() {
  return JSON.parse(JSON.stringify(PROJECT_ESTIMATE));
}

function getCanonicalPriceMatrix() {
  return { ...PRICE_MATRIX };
}

function getServices() {
  return SERVICES;
}

function getService(serviceId) {
  return SERVICES[serviceId] || null;
}

function getServiceCategory(serviceId) {
  const svc = SERVICES[serviceId];
  return svc ? svc.category : null;
}

function listServicesByCategory(category) {
  return Object.values(SERVICES)
    .filter(s => s.category === category)
    .map(s => s.service_id);
}

function getAlexPricingCatalogLines() {
  return [
    'PRICING MODEL (frozen 2026-04-24)',
    '',
    'Service Call: $150',
    '- Includes up to 2 hours of labor on-site for the agreed scope.',
    '- Additional labor: $75/hour, only after the included 2 hours and only when approved in writing.',
    '- Materials, parking, disposal, and third-party purchases are extra only when stated in writing before work starts.',
    '',
    'Covered by $150 service call (most small jobs):',
    '- TV mounting — standard wall mount up to 65" on drywall or studs',
    '- Small drywall patch (up to 6")',
    '- Furniture assembly — small to medium pieces fitting in 2 hours',
    '- Art and mirror hanging — up to 5 standard pieces',
    '- Minor plumbing — faucet, shower head, toilet tank, re-caulk',
    '- Minor electrical — light fixture, outlet/switch swap, smart doorbell/lock',
    '- Minor door repair — hinge, latch, handle, strike plate',
    '',
    'Quote after photos (larger scope, no public price):',
    '- Hidden-wire TV installation',
    '- Medium or large drywall repair, texture matching, water damage',
    '- PAX / Elfa / closet systems, bed frames, complex multi-piece assembly',
    '- Door installation (pre-hung, slab, exterior)',
    '- Vanity installation',
    '- Backsplash installation',
    '- Kitchen cabinet painting',
    '- Furniture painting',
    '',
    'Project estimate (dedicated subpages only — labor only, materials separate, written quote required):',
    '- Interior painting: $3.00/sq ft labor (walls/ceiling baseline)',
    '- Flooring installation: $3.00/sq ft labor (laminate, LVP)',
    '',
    'Rules when quoting customers:',
    '- Lead with "$150 service call, up to 2 hours included" for small jobs.',
    '- For quote-only services, ask for photos or measurements before any number.',
    '- Never quote a dollar amount other than $150, $75/hour, or $3.00/sq ft.',
    '- Always mention that materials are extra only when written into the quote.'
  ];
}

function getMessengerPostbackTexts() {
  return {
    GET_STARTED: "Hi! I'm Alex from Handy & Friend. Tell me what service you need and I'll guide you to the right estimate.",
    ICE_TV: 'TV mounting is one of our most requested services. Send your phone number and I will guide you to the right estimate.',
    ICE_CABINET: 'Kitchen cabinet painting is quoted after photos. Send your phone and photos of the kitchen for a written quote.',
    ICE_SERVICES: 'We handle TV mounting, drywall repair, furniture assembly, art and mirror hanging, minor plumbing and electrical, interior painting, flooring, cabinet painting, furniture painting, door and vanity install, and backsplash. Send your phone and service details for exact pricing.',
    ICE_BOOK: 'Ready to book? Send:\n1) Service\n2) ZIP/area\n3) Phone number\n\nOur manager confirms time and final estimate quickly.',
    MENU_QUOTE: 'Send your service, area, and phone. I will guide you to the estimate right away.',
    MENU_SERVICES: 'Tell me your service and area, then share your phone number. I will return the estimate and next steps.'
  };
}

module.exports = {
  PRICING_SOURCE_VERSION,
  SERVICE_CATEGORY,
  getPricingSourceVersion,
  getServiceCall,
  getMaterialsPolicy,
  getProjectEstimates,
  getCanonicalPriceMatrix,
  getServices,
  getService,
  getServiceCategory,
  listServicesByCategory,
  getAlexPricingCatalogLines,
  getMessengerPostbackTexts
};
