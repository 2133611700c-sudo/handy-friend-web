/**
 * Service-specific required/optional fields tracker.
 * Determines what information Alex still needs to collect
 * based on service intent and conversation history.
 */

const SERVICE_FIELDS = {
  tv_mounting: {
    required: ['tv_size', 'wall_type', 'photos', 'zip'],
    optional: ['mount_available', 'wire_hiding', 'timing'],
    pricing_basis: 'service_call_150',
    ask_photos: true,
  },
  flooring_installation: {
    required: ['floor_type', 'sq_ft', 'photos', 'zip'],
    optional: ['subfloor_condition', 'current_flooring', 'materials_supplied', 'timing', 'baseboards'],
    pricing_basis: '3_per_sqft_labor_only',
    ask_photos: true,
  },
  interior_painting: {
    required: ['wall_area_sqft', 'photos', 'zip'],
    optional: ['num_rooms', 'num_coats', 'prep_state', 'paint_supplied', 'timing'],
    pricing_basis: '3_per_sqft_labor_only',
    ask_photos: true,
  },
  exterior_painting: {
    required: ['photos', 'zip'],
    optional: ['exterior_area', 'surface_condition', 'paint_supplied', 'timing'],
    pricing_basis: 'quote_after_photos',
    ask_photos: true,
  },
  cabinet_painting: {
    required: ['door_count', 'photos', 'zip'],
    optional: ['drawer_count', 'current_condition', 'paint_supplied', 'timing'],
    pricing_basis: '70_per_door_anchor',
    ask_photos: true,
  },
  kitchen_cabinet_painting: {
    required: ['door_count', 'photos', 'zip'],
    optional: ['drawer_count', 'current_condition', 'paint_supplied', 'timing'],
    pricing_basis: '70_per_door_anchor',
    ask_photos: true,
  },
  furniture_assembly: {
    required: ['item_count', 'zip'],
    optional: ['brand', 'item_types', 'photos', 'timing'],
    pricing_basis: 'service_call_150',
    ask_photos: false,
  },
  drywall_repair: {
    required: ['photos', 'zip'],
    optional: ['hole_size', 'location', 'timing'],
    pricing_basis: 'service_call_150',
    ask_photos: true,
  },
  minor_plumbing: {
    required: ['photos', 'zip'],
    optional: ['fixture_type', 'issue_description', 'timing'],
    pricing_basis: 'service_call_150',
    ask_photos: true,
  },
  minor_electrical: {
    required: ['photos', 'zip'],
    optional: ['fixture_type', 'issue_description', 'timing'],
    pricing_basis: 'service_call_150',
    ask_photos: true,
  },
  general_handyman: {
    required: ['photos', 'zip', 'description'],
    optional: ['timing'],
    pricing_basis: 'service_call_150',
    ask_photos: true,
  },
  unknown: {
    required: ['description', 'photos', 'zip'],
    optional: ['timing'],
    pricing_basis: 'unknown',
    ask_photos: true,
  },
};

function getServiceFields(serviceId) {
  return SERVICE_FIELDS[serviceId] || SERVICE_FIELDS.unknown;
}

function getMissingFields(serviceId, collectedFields = {}) {
  const def = getServiceFields(serviceId);
  return def.required.filter(f => !collectedFields[f.replace('_', '')]);
}

function buildMissingFieldsContext(serviceId, collectedFields = {}, lang = 'en') {
  const missing = getMissingFields(serviceId, collectedFields);
  if (!missing.length) return '';
  return `[CONTEXT: Still missing for ${serviceId}: ${missing.join(', ')}. Ask for these next, do not ask for already-collected fields: ${JSON.stringify(collectedFields)}]`;
}

module.exports = {
  SERVICE_FIELDS,
  getServiceFields,
  getMissingFields,
  buildMissingFieldsContext,
};
