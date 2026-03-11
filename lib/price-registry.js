/**
 * Canonical pricing registry for Handy & Friend.
 * Single source of truth used by chat, messenger, diagnostics, and SEO checks.
 */

const PRICING_SOURCE_VERSION = '2026.03.06-v1';

const SERVICES = {
  tv_mounting: {
    service_id: 'tv_mounting',
    label: 'TV Mounting',
    unit: 'fixed',
    base_prices: {
      standard: 105,
      hidden_wire: 185
    },
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'wall_install'
  },
  furniture_assembly: {
    service_id: 'furniture_assembly',
    label: 'Furniture Assembly',
    unit: 'from',
    base_prices: {
      small_item: 75,
      dresser: 95,
      bed_frame: 115,
      pax_hourly: 50
    },
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'wall_install'
  },
  art_mirrors: {
    service_id: 'art_mirrors',
    label: 'Art & Mirror Hanging',
    unit: 'fixed',
    base_prices: {
      up_to_5_pieces: 95,
      curtain_first: 75,
      curtain_each: 30,
      service_call_min: 95
    },
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'wall_install'
  },
  interior_painting: {
    service_id: 'interior_painting',
    label: 'Interior Painting',
    unit: 'sq_ft',
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
    unit: 'sq_ft',
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
  kitchen_cabinet_painting: {
    service_id: 'kitchen_cabinet_painting',
    label: 'Kitchen Cabinet Painting',
    unit: 'door',
    base_prices: {
      full_package: 75,
      spray_both_sides: 70,
      spray_one_side: 40,
      roller_budget: 7.25,
      drawer_small: 25,
      drawer_large: 35,
      end_panel: 50,
      island: 175,
      interior_section: 30
    },
    material_policy: 'paint_included',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'paint_refresh'
  },
  furniture_painting: {
    service_id: 'furniture_painting',
    label: 'Furniture Painting',
    unit: 'piece',
    base_prices: {
      chair: 40,
      nightstand: 65,
      dresser: 170,
      dining_table: 130,
      builtin_lf: 60
    },
    material_policy: 'paint_included',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'paint_refresh'
  },
  plumbing: {
    service_id: 'plumbing',
    label: 'Plumbing',
    unit: 'fixed',
    base_prices: {
      faucet: 115,
      shower_head: 60,
      toilet_tank: 95,
      recaulk: 110
    },
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'standalone'
  },
  electrical: {
    service_id: 'electrical',
    label: 'Electrical',
    unit: 'fixed',
    base_prices: {
      light_fixture: 95,
      outlet_switch_first: 75,
      outlet_switch_additional: 30,
      smart_device: 85
    },
    material_policy: 'labor_only',
    channel_visibility: ['website', 'ai_chat', 'messenger', 'jsonld'],
    cross_sell_cluster: 'standalone'
  }
};

const PRICE_MATRIX = {
  tv_mounting: 105,
  furniture_assembly: 75,
  art_mirrors: 95,
  interior_painting: 3.0,
  flooring: 3.0,
  kitchen_cabinet_painting: 75,
  furniture_painting: 40,
  plumbing: 115,
  electrical: 95
};

function getPricingSourceVersion() {
  return PRICING_SOURCE_VERSION;
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

function getAlexPricingCatalogLines() {
  return [
    'Kitchen cabinet painting (paint included):',
    '- Full Package (spray both sides + frame): $75/door',
    '- Spray both sides: $70/door',
    '- Spray one side: $40/door',
    '- Roller finish (budget): $7.25/door',
    '- Drawer front small: $25 each',
    '- Drawer front large: $35 each',
    '- End panel / fridge panel: $50 each',
    '- Kitchen island full repaint: $175',
    '- Interior cabinet (shelves and walls): $30/section',
    '',
    'Furniture painting (paint included):',
    '- Dining chair: $40',
    '- Nightstand: $65',
    '- Dresser: $170',
    '- Dining table: $130',
    '- Built-in cabinetry: $60/lin ft',
    '',
    'Interior painting (labor only):',
    '- Walls/ceiling 1 coat: $3.00/sq ft',
    '- Walls/ceiling 2 coats: $3.75/sq ft',
    '- Ceiling smooth: $3.75/sq ft',
    '- Ceiling textured: $4.25/sq ft',
    '- Baseboards/crown: $3.00/lin ft',
    '- Crown ornate: $3.75/lin ft',
    '- Door casing/trim: $30/side',
    '- Door slab: $65/door',
    '- Baseboard install: $2.50/lin ft',
    '',
    'Flooring installation (labor only):',
    '- Laminate: $3.00/sq ft',
    '- LVP: $3.00/sq ft',
    '- Demo existing floor: $1.50/sq ft',
    '- Underlayment: $0.50/sq ft',
    '- Transition strip: $30 each',
    '',
    'TV and art mounting:',
    '- TV mount standard (up to 65"): $105',
    '- TV mount hidden wire: $185',
    '- Art/mirror hanging (up to 5 pcs): $95',
    '- Curtain rods first window: $75',
    '- Curtain rods each additional: $30',
    '- Service call minimum: $95',
    '',
    'Furniture assembly:',
    '- Small item: $75',
    '- Dresser/chest: $95',
    '- Bed frame: $115',
    '- PAX/closet system: $50/hour (min 4 hours)',
    '',
    'Minor plumbing (labor only):',
    '- Faucet installation: $115',
    '- Shower head replacement: $60',
    '- Toilet tank repair: $95',
    '- Re-caulk tub or shower: $110',
    '',
    'Minor electrical (labor only):',
    '- Light fixture replacement: $95',
    '- Outlet/switch (first 1-2): $75',
    '- Each additional outlet/switch: $30',
    '- Smart doorbell/lock install: $85'
  ];
}

function getMessengerPostbackTexts() {
  return {
    GET_STARTED: "Hi! I'm Alex from Handy & Friend. Tell me what service you need and I'll guide you to the right estimate.",
    ICE_TV: 'TV mounting is one of our most requested services. Send your phone number and I will calculate your exact quote right away.',
    ICE_CABINET: 'Kitchen cabinet painting is our core service. Send your phone and number of doors, and I will provide an exact quote.',
    ICE_SERVICES: 'We handle TV mounting, cabinet painting, interior painting, flooring, furniture assembly, art/mirror hanging, plumbing, and electrical. Send your phone and service details for exact pricing.',
    ICE_BOOK: 'Ready to book? Send:\n1) Service\n2) ZIP/area\n3) Phone number\n\nOur manager confirms time and final estimate quickly.',
    MENU_QUOTE: 'Send your service, area, and phone. I will provide the estimate right away.',
    MENU_SERVICES: 'Tell me your service and area, then share your phone number. I will return exact pricing and next steps.'
  };
}

module.exports = {
  getPricingSourceVersion,
  getCanonicalPriceMatrix,
  getServices,
  getService,
  getAlexPricingCatalogLines,
  getMessengerPostbackTexts
};
