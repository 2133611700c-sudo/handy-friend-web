/**
 * Service Detection Logic
 * Detects service from post text and returns service_id
 */

const SERVICE_KEYWORDS = {
  tv_mounting: [
    // English
    "tv mount",
    "hang tv",
    "mount a tv",
    "mount tv",
    "television",
    "tv install",
    "tv installation",
    "tv bracket",
    "wall mount",
    // Russian
    "монтаж тв",
    "повесить тв",
    "тв монтаж",
    "телевизор",
    // Spanish
    "montaje tv",
    "montar tv",
    "televisor",
  ],

  kitchen_cabinet_painting: [
    // English
    "cabinet paint",
    "paint cabinet",
    "cabinet painting",
    "kitchen cabinet",
    "cabinet doors",
    "cabinet refacing",
    "cabinet refresh",
    "kitchen refresh",
    "cabinet refinish",
    "paint doors",
    // Russian
    "краска шкаф",
    "покрасить шкаф",
    "кухонный шкаф",
    "фасад кухни",
    // Spanish
    "pintar gabinete",
    "gabinete cocina",
    "armario cocina",
  ],

  interior_painting: [
    // English
    "interior paint",
    "paint room",
    "paint walls",
    "wall paint",
    "paint ceiling",
    "room painting",
    "house painting",
    "interior painter",
    "paint house",
    "repaint",
    // Russian
    "покраска стен",
    "покрасить стены",
    "краска комнат",
    "покраска дома",
    // Spanish
    "pintura interior",
    "pintar pared",
    "pintar habitacion",
  ],

  flooring: [
    // English
    "flooring",
    "floor install",
    "laminate",
    "lvp",
    "vinyl plank",
    "vinyl floor",
    "floor replacement",
    "install floor",
    "hardwood",
    "tile floor",
    // Russian
    "укладка пола",
    "ламинат",
    "пол установк",
    // Spanish
    "piso",
    "pisos",
    "piso vinilo",
  ],

  drywall: [
    // English
    "drywall",
    "drywall repair",
    "patch wall",
    "hole in wall",
    "wall hole",
    "drywall patch",
    "wall damage",
    "sheetrock",
    "gypsum",
    // Russian
    "гипсокартон",
    "дырка в стене",
    "заплатка",
    "повреждение стены",
    // Spanish
    "yeso",
    "pared rota",
    "pared dañada",
  ],

  furniture_assembly: [
    // English
    "furniture assembly",
    "assemble furniture",
    "ikea",
    "bed frame",
    "dresser",
    "bookshelf",
    "shelf assembly",
    "assemble bed",
    "furniture setup",
    // Russian
    "сборка мебели",
    "собрать мебель",
    "икеа",
    // Spanish
    "ensamblaje",
    "armar muebles",
    "montar muebles",
  ],

  art_mirrors: [
    // English
    "hanging mirror",
    "hang mirror",
    "mirror hanging",
    "hang art",
    "hanging art",
    "picture hanging",
    "hang picture",
    "artwork",
    "curtain rod",
    "curtain install",
    // Russian
    "повесить зеркало",
    "зеркало",
    "повесить картин",
    "картин",
    "карниз",
    // Spanish
    "colgar espejo",
    "espejo",
    "cuadro",
    "cortina",
  ],

  furniture_painting: [
    // English
    "furniture painting",
    "paint furniture",
    "furniture refinish",
    "refinish furniture",
    "paint dresser",
    "paint chair",
    "paint table",
    "furniture restore",
    // Russian
    "покраска мебели",
    "покрасить мебель",
    "фарбування меблів",
    // Spanish
    "pintar muebles",
    "muebles pintura",
  ],

  plumbing: [
    // English
    "plumbing",
    "plumber",
    "faucet",
    "toilet",
    "shower",
    "sink",
    "leak",
    "plumbing repair",
    "pipe",
    "caulk",
    // Russian
    "сантехника",
    "кран",
    "унитаз",
    "душ",
    "раковина",
    // Spanish
    "plomeria",
    "grifo",
    "inodoro",
    "ducha",
  ],

  electrical: [
    // English
    "electrical",
    "electrician",
    "light fixture",
    "outlet",
    "switch",
    "light switch",
    "ceiling fan",
    "smart lock",
    "doorbell",
    "electric work",
    // Russian
    "электр",
    "розетка",
    "выключатель",
    "светильник",
    // Spanish
    "electrica",
    "tomacorriente",
    "interruptor",
  ],

  door_installation: [
    // English
    "door install",
    "door installation",
    "door replacement",
    "door repair",
    "prehung door",
    "interior door",
    "exterior door",
    "slab door",
    "sliding door",
    // Russian
    "установка двер",
    "замена двер",
    "двер",
    // Spanish
    "puerta install",
    "puerta replacement",
    "puerta",
  ],

  vanity_installation: [
    // English
    "vanity install",
    "bathroom vanity",
    "vanity replacement",
    "bathroom sink",
    "vanity sink",
    // Russian
    "установка тумб",
    "тумба",
    "умывальник",
    // Spanish
    "mueble baño",
    "vanidad",
    "lavabo",
  ],

  backsplash: [
    // English
    "backsplash",
    "tile backsplash",
    "kitchen backsplash",
    "peel and stick",
    "peel & stick",
    "tile install",
    // Russian
    "фартук кухн",
    "плитка фартук",
    // Spanish
    "backsplash cocina",
    "azulejo cocina",
  ],
};

/**
 * Service priority for tie-breaking
 */
const SERVICE_PRIORITY = {
  tv_mounting: 1,
  kitchen_cabinet_painting: 1,
  interior_painting: 1,
  flooring: 1,
  drywall: 2,
  door_installation: 2,
  furniture_assembly: 2,
  art_mirrors: 3,
  furniture_painting: 3,
  plumbing: 3,
  electrical: 3,
  vanity_installation: 3,
  backsplash: 3,
};

/**
 * Main detection function
 * Input: post_text (string)
 * Output: service_id (string) or null
 */
function detectService(postText) {
  if (!postText || typeof postText !== "string") {
    return null;
  }

  const lowerText = postText.toLowerCase();
  const candidates = [];

  // Score each service
  for (const [serviceId, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        score++;
      }
    }

    if (score > 0) {
      candidates.push({
        service_id: serviceId,
        score: score,
        priority: SERVICE_PRIORITY[serviceId],
      });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // Sort by score (descending), then by priority (ascending)
  candidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score; // Higher score first
    }
    return a.priority - b.priority; // Lower priority number first
  });

  return candidates[0].service_id;
}

/**
 * Detection with confidence scores
 */
function detectServiceWithScore(postText) {
  if (!postText || typeof postText !== "string") {
    return null;
  }

  const lowerText = postText.toLowerCase();
  const candidates = [];

  for (const [serviceId, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        score++;
      }
    }

    if (score > 0) {
      candidates.push({
        service_id: serviceId,
        score: score,
        priority: SERVICE_PRIORITY[serviceId],
        confidence: Math.min(score * 0.3 + 0.4, 1.0), // 0.0-1.0
      });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.priority - b.priority;
  });

  return candidates[0];
}

module.exports = {
  detectService,
  detectServiceWithScore,
  SERVICE_KEYWORDS,
  SERVICE_PRIORITY,
};
