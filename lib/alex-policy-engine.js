/**
 * Shared policy engine for Alex across web chat and messenger.
 */

const PHONE_REGEX = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;

const SERVICE_KEYWORDS = [
  { id: 'kitchen_cabinet_painting', keywords: ['cabinet', 'kitchen cabinet', 'drawer', 'facade', 'шкаф', 'фасад', 'кухон', 'gabinete', 'gabinetes', 'armario'] },
  { id: 'furniture_painting', keywords: ['furniture painting', 'refinish furniture', 'paint furniture', 'paint dresser', 'paint chair', 'paint table', 'покраска мебели', 'фарбування меблів', 'pintar muebles'] },
  { id: 'interior_painting', keywords: ['interior painting', 'paint walls', 'wall paint', 'paint room', 'paint ceiling', 'ceiling', 'покраска стен', 'покрасить стен', 'фарбування стін', 'pintura interior', 'pintar pared', 'pared'] },
  { id: 'flooring', keywords: ['flooring', 'laminate', 'lvp', 'vinyl floor', 'vinyl plank', 'укладка пола', 'ламинат', 'підлога', 'ламінат', 'piso', 'pisos'] },
  { id: 'tv_mounting', keywords: ['tv mount', 'tv mounting', 'mount tv', 'mount a tv', 'hang tv', 'hang a tv', 'tv install', 'television', 'монтаж тв', 'повесить тв', 'повесить телевизор', 'телевизор', 'телевізор', 'montaje tv', 'montar tv', 'televisor', 'colgar tv'] },
  { id: 'art_mirrors', keywords: ['mirror', 'art hanging', 'picture hanging', 'hang art', 'hang picture', 'hang mirror', 'curtain', 'curtain rod', 'зеркал', 'картин', 'повесить картин', 'карниз', 'дзеркал', 'espejo', 'cuadro', 'cortina'] },
  { id: 'furniture_assembly', keywords: ['furniture assembly', 'assemble', 'ikea', 'bed frame', 'dresser', 'bookshelf', 'сборка мебели', 'собрать мебел', 'збирання меблів', 'зібрати меблі', 'ensamblaje', 'armar muebles'] },
  { id: 'plumbing', keywords: ['plumbing', 'faucet', 'toilet', 'shower head', 'shower replace', 're-caulk', 'recaulk', 'caulk', 'сантех', 'кран', 'унитаз', 'душ', 'plomeria', 'grifo', 'inodoro', 'sanitario', 'ducha'] },
  { id: 'electrical', keywords: ['electrical', 'light fixture', 'outlet', 'switch', 'smart lock', 'doorbell', 'smart device', 'электр', 'розетка', 'выключатель', 'світильник', 'розетк', 'electrica', 'tomacorriente', 'interruptor'] }
];

// Regex patterns for fuzzy matching when keywords fail (non-adjacent words)
const SERVICE_PATTERNS = [
  { id: 'tv_mounting', patterns: [/\bmount\b.*\btv\b/i, /\btv\b.*\bmount/i, /\bhang\b.*\btv\b/i, /\btv\b.*\bhang/i, /\btv\b.*\bwall\b/i, /\btv\b.*\bbrick/i, /\btv\b.*\bwire/i] },
  { id: 'kitchen_cabinet_painting', patterns: [/\bpaint\b.*\bcabinet/i, /\bcabinet\b.*\bpaint/i, /\bкраси\w*.*\bшкаф/i, /\bшкаф\w*.*\bкраси/i, /\bpintar\b.*\bgabinete/i] },
  { id: 'interior_painting', patterns: [/\bpaint\b.*\b(wall|room|interior|ceiling)/i, /\b(wall|room|interior)\b.*\bpaint/i, /\bкраси\w*.*\b(стен|комнат|потолок)/i] },
  { id: 'flooring', patterns: [/\b(install|lay|replace)\b.*\b(floor|laminate|lvp|vinyl)/i, /\b(floor|laminate|lvp)\b.*\b(install|lay|replace)/i, /\bпокла\w*.*\b(пол|ламинат|підлог)/i] },
  { id: 'plumbing', patterns: [/\b(install|replace|fix|change)\b.*\b(faucet|toilet|shower|sink)/i, /\b(faucet|toilet|shower)\b.*\b(install|replace|fix|change)/i, /\b(замен|установ)\w*.*\b(кран|унитаз|душ|смесител)/i, /\b(instalar|cambiar)\b.*\b(grifo|inodoro|ducha)/i] },
  { id: 'electrical', patterns: [/\b(install|replace|fix)\b.*\b(outlet|switch|light|fixture|doorbell)/i, /\b(outlet|switch|fixture)\b.*\b(install|replace|fix)/i] },
  { id: 'furniture_assembly', patterns: [/\b(assemble|put together|build)\b.*\b(furniture|ikea|bed|desk|shelf|dresser)/i, /\b(ikea|furniture)\b.*\b(assemble|build)/i, /\b(собра\w*|зібра\w*)\b.*\b(мебел|меблі|шкаф|стол|кроват)/i] },
  { id: 'art_mirrors', patterns: [/\b(hang|mount|install)\b.*\b(art|mirror|picture|frame|curtain)/i, /\b(art|mirror|picture)\b.*\b(hang|mount|install)/i] },
];

const CROSS_SELL_TEXT = {
  en: {
    tv_mounting: 'By the way, we can also hang mirrors/art in the same visit from $150. Want me to add it?',
    art_mirrors: 'By the way, we can also mount your TV in the same visit from $150. Want me to add it?',
    furniture_assembly: 'By the way, we can also mount your TV in the same visit from $150. Want me to add it?',
    kitchen_cabinet_painting: 'By the way, we can also add furniture painting in the same visit (minimum service call applies). Want me to add it?',
    furniture_painting: 'By the way, we can also add cabinet painting from $75/door (minimum service call applies). Want me to add it?',
    interior_painting: 'By the way, we can also add flooring from $3/sq ft in the same visit. Want me to add it?',
    flooring: 'By the way, we can also add interior painting from $3/sq ft in the same visit. Want me to add it?',
    generic: 'By the way, we can bundle one more related service in the same visit. Want me to add it?'
  },
  ru: {
    generic: 'Кстати, можно добавить еще одну услугу в этот же визит и сэкономить 20%.'
  },
  uk: {
    generic: 'До речі, можна додати ще одну послугу в цей же візит і зекономити 20%.'
  },
  es: {
    generic: 'Por cierto, puedes agregar otro servicio en la misma visita y ahorrar 20%.'
  }
};

function detectPhone(text) {
  return PHONE_REGEX.test(String(text || ''));
}

function inferServiceType(text) {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return { serviceId: '', confidence: 0 };

  // Phase 1: exact keyword substring match
  let best = { serviceId: '', score: 0 };
  for (const entry of SERVICE_KEYWORDS) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (t.includes(kw)) score += kw.length > 6 ? 2 : 1;
    }
    if (score > best.score) best = { serviceId: entry.id, score };
  }

  if (best.serviceId) {
    const confidence = Math.min(1, 0.45 + best.score * 0.08);
    return { serviceId: best.serviceId, confidence: Number(confidence.toFixed(2)) };
  }

  // Phase 2: regex pattern matching for non-adjacent words
  for (const entry of SERVICE_PATTERNS) {
    for (const pat of entry.patterns) {
      if (pat.test(t)) {
        return { serviceId: entry.id, confidence: 0.5 };
      }
    }
  }

  return { serviceId: '', confidence: 0 };
}

function isStandaloneService(serviceId) {
  return serviceId === 'plumbing' || serviceId === 'electrical';
}

function hasCrossSellNudge(text) {
  const t = String(text || '').toLowerCase();
  return (
    t.includes('by the way') ||
    t.includes('кстати') ||
    t.includes('до речі') ||
    t.includes('por cierto') ||
    t.includes('same visit')
  );
}

function appendCrossSellNudge({ reply, lang = 'en', serviceId = '' }) {
  const text = String(reply || '').trim();
  if (!text) return text;
  if (hasCrossSellNudge(text)) return text;
  if (isStandaloneService(serviceId)) return text;

  const l = CROSS_SELL_TEXT[lang] || CROSS_SELL_TEXT.en;
  const line = l[serviceId] || l.generic || CROSS_SELL_TEXT.en.generic;
  return `${text}\n\n${line}`;
}

function stripDollarAmounts(text) {
  return String(text || '').replace(/\$\s*\d[\d,.]*(?:\.\d+)?(?:\s*[-–]\s*\$\s*\d[\d,.]*(?:\.\d+)?)?/g, 'pricing');
}

module.exports = {
  detectPhone,
  inferServiceType,
  isStandaloneService,
  appendCrossSellNudge,
  stripDollarAmounts,
  hasCrossSellNudge
};
