/**
 * Telegram Response Templates - English & Russian
 * Copy-paste these for quick replies in Telegram
 * Use {name}, {service}, {amount}, {time}, {phone}, {email}, {address} variables
 */

const templatesEN = {
  // ===== GREETING TEMPLATES =====
  greeting_received: "Hi {name}! 👋 Thanks for reaching out. I got your {service} request. Let me review the details and I'll call you within 10 minutes with an accurate quote!",

  greeting_quick: "Got it {name}! 📝 We're reviewing your {service} request. If you can send photos/videos of the job, it'll help us give you a more accurate quote. Cheers! 😊",

  greeting_busy: "Thanks for reaching out {name}! 🙏 We're slammed today but I'll get back to you with a quote for your {service} within 2 hours. Stay tuned!",

  // ===== SERVICE-SPECIFIC QUALIFICATION =====
  tv_qualify: "For TV mounting, {name}, I need a few details:\n1️⃣ TV size & weight (65\", 75\" etc)\n2️⃣ Mount type (fixed, tilting, full motion)\n3️⃣ Cable management (hide in walls, surface)\n\nShoot me a photo if you got one! 📸",

  furniture_qualify: "For furniture assembly, {name}:\n1️⃣ What furniture? (bed, dresser, bookcase)\n2️⃣ How many pieces?\n3️⃣ Is it flat-pack or pre-assembled?\n\nPhotos help! 📷",

  paint_qualify: "For painting {name}:\n1️⃣ Square footage of area?\n2️⃣ Current color → desired color\n3️⃣ Single or double coat?\n4️⃣ Any prep work needed?\n\nPhotos of the walls would be perfect! 🎨",

  plumb_qualify: "Quick heads up {name} - we handle cosmetic plumbing only (no major permits). For your request:\n1️⃣ What exactly? (faucet, toilet, shower head, caulking)\n2️⃣ Any leaks or damage?\n\nPhoto helps! 🚰",

  electric_qualify: "For electrical work {name}, we do like-for-like replacements:\n1️⃣ How many outlets/switches?\n2️⃣ Smart device? (doorbell, lock)\n3️⃣ Location?\n\nShoot a photo! ⚡",

  floor_qualify: "For flooring {name}:\n1️⃣ Square footage?\n2️⃣ Material? (laminate, vinyl, hardwood)\n3️⃣ Need demo of old flooring?\n4️⃣ Removal of existing?\n\nPhotos appreciated! 🏠",

  art_qualify: "For hanging art/mirrors {name}:\n1️⃣ How many pieces?\n2️⃣ Total weight?\n3️⃣ Wall type? (drywall, studs, concrete)\n\nPhotos of what you want hung! 🖼️",

  // ===== QUOTE TEMPLATES =====
  quote_ready: "✅ Quote ready for your {service}!\n\n💰 Total: {amount}\n⏱️ Time: {time}\n\nLook good? Ready to book? Just reply YES and we'll get you scheduled! 🙌",

  quote_site_visit: "✅ For your {service}, I think we should do a quick 15-min site visit to nail down the exact details and give you the most accurate quote. \n\n📍 When works best for you? Morning or afternoon?",

  quote_follow_up: "Still interested in your {service} {name}? Happy to answer any questions about the quote or move forward! 💪",

  // ===== CALLBACK SCHEDULING =====
  callback_confirm: "Perfect {name}! ✅ I'll call you at {phone} {time}.\n\nIf plans change, just send me a message here. See you then! 😊",

  callback_reschedule: "No worries {name}! 👍 When works better for a quick call?\n\n📞 Morning (8-12pm)\n📞 Afternoon (12-5pm)  \n📞 Evening (5-8pm)\n\nJust let me know! ⏰",

  callback_options: "Great! {name} Let's find a time that works. I'm available:\n\n✅ Today 2pm or 5pm\n✅ Tomorrow 10am or 2pm\n\nWhich works? Or propose another time! 📅",

  // ===== JOB CONFIRMED TEMPLATES =====
  job_confirmed: "🎉 Booking confirmed {name}!\n\n📅 {date} at {time}\n📍 Address: {address}\n💼 Service: {service}\n\nI'll be there! Any last-minute questions, just reply here. Thanks! 👍",

  job_reminder: "Quick reminder {name}! 📅 Your {service} is scheduled for {time} tomorrow at {address}. See you then! 🔧",

  // ===== ADDRESS/PAYMENT REQUEST =====
  request_address: "Got it {name}! To confirm everything, can you send me:\n\n📍 Full address (street, apt/unit number if applicable)\n\nThanks! 👍",

  request_payment_details: "Perfect! {name} 💰 Here's what we need:\n\n1️⃣ Is the quote {amount} looking good?\n2️⃣ Ready to secure the appointment?\n\nPayment options: 💳 Card, 💸 Cash, 📱 Venmo, PayPal\n\nLet me know! 😊",

  // ===== FOLLOW-UP TEMPLATES =====
  followup_3day: "Hey {name}! 👋 Just checking in - still interested in your {service}? Happy to answer questions or move forward! 😊",

  followup_5day: "{name}, we'd love to help with your {service}! If you have any questions about the quote or process, hit me up. We're here to help! 💪",

  followup_final: "Final check-in {name}! 📞 Really hoping we can help with your {service}. If something changed, no worries - just let me know. Otherwise, let's get this scheduled! ✅",

  // ===== REJECTION/UNABLE TO HELP =====
  unable_to_help: "Thanks for reaching out {name}, but unfortunately we can't help with {service}. I'd recommend calling around to find someone who specializes in this. Good luck! 🙌",

  // ===== URGENT/SPECIAL REQUESTS =====
  urgent_help: "{name}, I see this is urgent! 🚨 Let me check our availability right now and get back to you in 5 minutes. Stand by! ⚡",

  thank_you: "Thank you {name}! 🙏 Really appreciate the business. If you need anything else, you know where to find us! 😊",
};

// ===== RUSSIAN TEMPLATES =====
const templatesRU = {
  // ===== ПРИВЕТСТВЕННЫЕ ШАБЛОНЫ =====
  greeting_received: "Привет {name}! 👋 Спасибо за обращение. Получил вашу заявку на {service}. Рассмотрю детали и позвоню в течение 10 минут с точной ценой!",

  greeting_quick: "Понял {name}! 📝 Рассматриваем вашу заявку на {service}. Если пришлёте фото/видео работы - смогу дать точнее цену. Спасибо! 😊",

  greeting_busy: "Спасибо за обращение {name}! 🙏 Сейчас в разгаре работ, но я вам перезвоню с ценой на {service} в течение 2 часов. Ждите!",

  // ===== УТОЧНЯЮЩИЕ ВОПРОСЫ ПО УСЛУГЕ =====
  tv_qualify: "Для монтажа ТВ {name}, мне нужны детали:\n1️⃣ Размер и вес ТВ (65\", 75\" и т.д.)\n2️⃣ Тип крепления (фиксированное, наклонное, подвижное)\n3️⃣ Прятать ли кабели или оставить видимыми\n\nЕсли есть фото - отправьте! 📸",

  furniture_qualify: "Для сборки мебели {name}:\n1️⃣ Какая мебель? (кровать, комод, шкаф)\n2️⃣ Сколько предметов?\n3️⃣ Разобранная или собранная?\n\nФото помогут! 📷",

  paint_qualify: "Для покраски {name}:\n1️⃣ Квадратура помещения?\n2️⃣ Текущий цвет → желаемый цвет\n3️⃣ Один слой или два?\n4️⃣ Нужна ли подготовка?\n\nФото стен будут отлично! 🎨",

  plumb_qualify: "Внимание {name} - мы берёмся только за косметический ремонт сантехники (без больших разрешений). Для вашей заявки:\n1️⃣ Что именно? (кран, унитаз, душевая лейка, герметизация)\n2️⃣ Есть ли утечки или повреждения?\n\nФото помогут! 🚰",

  electric_qualify: "Для электро работ {name}, мы делаем замену на аналогичную:\n1️⃣ Сколько розеток/выключателей?\n2️⃣ Умное устройство? (дверной звонок, замок)\n3️⃣ Где находится?\n\nФото помогут! ⚡",

  floor_qualify: "Для полов {name}:\n1️⃣ Квадратура?\n2️⃣ Материал? (ламинат, винил, паркет)\n3️⃣ Нужно ли демонтировать старое?\n4️⃣ Вывез ли старый материал?\n\nФото помогут! 🏠",

  art_qualify: "Для развески картин/зеркал {name}:\n1️⃣ Сколько предметов?\n2️⃣ Общий вес?\n3️⃣ Тип стены? (гипсокартон, кирпич, бетон)\n\nФото того, что развешивать! 🖼️",

  // ===== ПРЕДЛОЖЕНИЕ ЦЕНЫ =====
  quote_ready: "✅ Цена для вашей услуги {service}!\n\n💰 Итого: {amount}\n⏱️ Время: {time}\n\nНравится? Готовы бронировать? Просто напишите ДА и мы вас запланируем! 🙌",

  quote_site_visit: "✅ Для вашей услуги {service}, я думаю нужен осмотр на месте (15 минут) чтобы дать точную цену.\n\n📍 Когда вам удобно? Утро или полдень?",

  quote_follow_up: "Всё ещё интересует ваша {service} {name}? Готов ответить на вопросы! 💪",

  // ===== НАЗНАЧЕНИЕ ОБРАТНОГО ЗВОНКА =====
  callback_confirm: "Отлично {name}! ✅ Позвоню вам в {time} на {phone}.\n\nЕсли планы изменятся - напишите. До встречи! 😊",

  callback_reschedule: "Без проблем {name}! 👍 Когда вам удобнее?\n\n📞 Утро (8-12)\n📞 Полдень (12-17)  \n📞 Вечер (17-20)\n\nДайте знать! ⏰",

  callback_options: "Отлично! {name} Давайте выберем удобное время. Я доступен:\n\n✅ Сегодня 14:00 или 17:00\n✅ Завтра 10:00 или 14:00\n\nЧто подойдёт? Или предложите другое время! 📅",

  // ===== ПОДТВЕРЖДЕНИЕ РАБОТЫ =====
  job_confirmed: "🎉 Бронь подтверждена {name}!\n\n📅 {date} в {time}\n📍 Адрес: {address}\n💼 Услуга: {service}\n\nБуду там! Если возникнут вопросы - напишите. Спасибо! 👍",

  job_reminder: "Напоминаю {name}! 📅 Ваша услуга {service} завтра в {time} по адресу {address}. До встречи! 🔧",

  // ===== ЗАПРОС АДРЕСА/ПЛАТЕЖА =====
  request_address: "Понял {name}! Чтобы всё подтвердить, отправьте мне:\n\n📍 Полный адрес (улица, номер квартиры если есть)\n\nСпасибо! 👍",

  request_payment_details: "Отлично! {name} 💰 Нужны детали:\n\n1️⃣ Цена {amount} вас устраивает?\n2️⃣ Готовы зарезервировать дату?\n\nВарианты оплаты: 💳 Карта, 💸 Наличные, 📱 Venmo, PayPal\n\nДайте знать! 😊",

  // ===== ПОВТОРНОЕ ОБРАЩЕНИЕ =====
  followup_3day: "Привет {name}! 👋 Всё ещё интересует {service}? Готов ответить на вопросы! 😊",

  followup_5day: "{name}, мы бы хотели помочь с вашей {service}! Если есть вопросы - пишите. Мы здесь! 💪",

  followup_final: "Последнее напоминание {name}! 📞 Очень хотим помочь с {service}. Если что-то изменилось - без проблем. Иначе - давайте планировать! ✅",

  // ===== ОТКАЗ =====
  unable_to_help: "Спасибо за обращение {name}, но мы не можем помочь с {service}. Рекомендую найти специалистов в этой области. Удачи! 🙌",

  // ===== СРОЧНЫЕ СЛУЧАИ =====
  urgent_help: "{name}, я вижу это срочно! 🚨 Проверю нашу доступность и перезвоню через 5 минут. Ждите! ⚡",

  thank_you: "Спасибо {name}! 🙏 Очень признателен за работу. Если что-то нужно - вы знаете где нас найти! 😊",
};

// ===== SERVICE QUALIFICATION MAPPING =====
const serviceQualifications = {
  'tv-mounting': {
    questions: ["TV size/weight?", "Mount type?", "Hide cables?"],
    templateEN: 'tv_qualify',
    templateRU: 'tv_qualify',
    avgQuoteTime: '24h'
  },
  'furniture-assembly': {
    questions: ["What furniture?", "# of pieces?", "Flatpack?"],
    templateEN: 'furniture_qualify',
    templateRU: 'furniture_qualify',
    avgQuoteTime: '24h'
  },
  'painting': {
    questions: ["Sq footage?", "Color?", "# coats?"],
    templateEN: 'paint_qualify',
    templateRU: 'paint_qualify',
    avgQuoteTime: '48h'
  },
  'plumbing': {
    questions: ["Which fixture?", "Leaks?", "Type of work?"],
    templateEN: 'plumb_qualify',
    templateRU: 'plumb_qualify',
    avgQuoteTime: '24h'
  },
  'electrical': {
    questions: ["# outlets?", "Smart device?", "Location?"],
    templateEN: 'electric_qualify',
    templateRU: 'electric_qualify',
    avgQuoteTime: '24h'
  },
  'flooring': {
    questions: ["Sq footage?", "Material?", "Demo?"],
    templateEN: 'floor_qualify',
    templateRU: 'floor_qualify',
    avgQuoteTime: '48-72h'
  },
  'mirrors': {
    questions: ["# pieces?", "Weight?", "Wall type?"],
    templateEN: 'art_qualify',
    templateRU: 'art_qualify',
    avgQuoteTime: '24h'
  },
  'other': {
    questions: ["Tell us details?", "Photos available?", "Urgency?"],
    templateEN: 'greeting_quick',
    templateRU: 'greeting_quick',
    avgQuoteTime: '48h'
  }
};

module.exports = { templatesEN, templatesRU, serviceQualifications };
