/**
 * One-tap customer reply templates (free flow, no paid SMS API).
 */

const ACTION_TO_TEMPLATE = {
  taken: 'taken',
  accept: 'taken',
  askaddr: 'askaddr',
  address: 'askaddr',
  askphoto: 'askphoto',
  details: 'askphoto',
  cb15: 'cb15',
  schedule: 'cb15',
  decline: 'decline',
  greeting: 'greeting'
};

const TEMPLATES = {
  ru: {
    greeting: 'Здравствуйте! Это HandyMans. Получил вашу заявку, сейчас проверю детали и вернусь с ответом.',
    taken: 'Здравствуйте! Это HandyMans. Я взял вашу заявку в работу и свяжусь с вами в течение 15 минут.',
    askaddr: 'Подскажите, пожалуйста, точный адрес и ZIP code для расчета выезда.',
    askphoto: 'Пришлите, пожалуйста, 2-6 фото зоны работ. Так я дам точную цену быстрее.',
    cb15: 'Принял заявку. Перезвоню через 15 минут для согласования деталей.',
    decline: 'Спасибо за обращение! Сейчас не сможем взять этот заказ.'
  },
  en: {
    greeting: 'Hi! This is HandyMans. I received your request and will review details right now.',
    taken: 'Hi! This is HandyMans. I have taken your request and will contact you within 15 minutes.',
    askaddr: 'Please send your full address and ZIP code so I can finalize travel estimate.',
    askphoto: 'Please send 2-6 photos of the work area so I can give you an accurate quote faster.',
    cb15: 'Got your request. I will call you back in 15 minutes to confirm details.',
    decline: 'Thank you for reaching out. Unfortunately, we cannot take this job right now.'
  }
};

function normalizeLang(lang) {
  const raw = String(lang || '').toLowerCase();
  if (raw.startsWith('ru')) return 'ru';
  return 'en';
}

function templateKeyForAction(action) {
  return ACTION_TO_TEMPLATE[action] || 'greeting';
}

function getReplyTemplate(action, lang, context = {}) {
  const normalizedLang = normalizeLang(lang);
  const key = templateKeyForAction(action);
  const template = TEMPLATES[normalizedLang][key] || TEMPLATES.en.greeting;

  const name = context.name ? ` ${String(context.name).trim()}` : '';
  if (normalizedLang === 'ru' && key === 'greeting' && name) {
    return `Здравствуйте${name}! Это HandyMans. Получил вашу заявку, сейчас проверю детали и вернусь с ответом.`;
  }
  if (normalizedLang === 'en' && key === 'greeting' && name) {
    return `Hi${name}! This is HandyMans. I received your request and will review details right now.`;
  }
  return template;
}

module.exports = {
  getReplyTemplate,
  normalizeLang,
  templateKeyForAction
};
