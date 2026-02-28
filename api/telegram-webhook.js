/**
 * Telegram Webhook Handler - Vercel Serverless Function
 * HandyMans one-tap customer reply workflow.
 */

const { templatesEN } = require('./telegram-templates.js');
const { loadLeadContext, saveLeadContext, sanitizePhone } = require('./lead-context-store.js');
const { getReplyTemplate, normalizeLang, templateKeyForAction } = require('./reply-templates.js');

const COMMANDS = [
  { command: 'start', description: 'Start HandyMans assistant' },
  { command: 'help', description: 'How to use one-tap replies' },
  { command: 'menu', description: 'Refresh bot menu' },
  { command: 'templates', description: 'Show quick reply templates' },
  { command: 'status', description: 'Status workflow reference' }
];

const ACTION_MAP = {
  taken: { status: 'TAKEN', toast: '✅ Lead marked as taken' },
  askaddr: { status: 'WAITING_ADDRESS', toast: '📍 Address request selected' },
  askphoto: { status: 'WAITING_PHOTOS', toast: '📸 Photo request selected' },
  cb15: { status: 'CALLBACK_15_MIN', toast: '⏱ 15-minute callback selected' },
  decline: { status: 'DECLINED', toast: '❌ Lead marked as declined' },
  // Backward compatibility
  accept: { status: 'TAKEN', toast: '✅ Lead accepted' },
  address: { status: 'WAITING_ADDRESS', toast: '📍 Address request selected' },
  schedule: { status: 'CALLBACK_15_MIN', toast: '⏱ Callback selected' },
  details: { status: 'WAITING_PHOTOS', toast: '📸 Need photos selected' }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { callback_query, message } = req.body || {};

  if (callback_query) {
    return handleCallbackQuery(callback_query, res);
  }
  if (message) {
    return handleMessage(message, res);
  }

  return res.status(200).json({ ok: true });
}

async function handleCallbackQuery(callbackQuery, res) {
  const { id: queryId, data, from } = callbackQuery;
  const parsed = parseCallbackData(data || '');
  const { action, leadId } = parsed;

  let fallbackUsed = false;

  try {
    if (action === 'reply') {
      await answerCallback(queryId, '💬 Opening one-tap reply panel');
      const replyResult = await handleReplyPanel(parsed, callbackQuery);
      return res.status(replyResult.ok ? 200 : 404).json({
        ok: replyResult.ok,
        action,
        leadId,
        panelSent: replyResult.panelSent,
        fallbackUsed: replyResult.fallbackUsed,
        errorCode: replyResult.errorCode
      });
    }

    if (action === 'copy') {
      await answerCallback(queryId, '📋 Copy text prepared');
      const copyResult = await handleCopyTemplate(parsed, callbackQuery);
      return res.status(copyResult.ok ? 200 : 404).json({
        ok: copyResult.ok,
        action,
        leadId,
        panelSent: copyResult.panelSent,
        fallbackUsed: copyResult.fallbackUsed,
        errorCode: copyResult.errorCode
      });
    }

    const actionCfg = ACTION_MAP[action] || {
      status: 'UPDATED',
      toast: '✅ Action logged'
    };

    await answerCallback(queryId, actionCfg.toast);

    const resolved = await resolveLeadContext(leadId, callbackQuery.message?.text);
    const context = resolved.context;
    fallbackUsed = resolved.fallbackUsed;

    const lang = normalizeLang(context?.lang || 'en');
    const templateAction = templateKeyForAction(action);
    const templateText = getReplyTemplate(action, lang, context || {});

    const statusLog = {
      timestamp: new Date().toISOString(),
      userId: from?.id,
      username: from?.username || 'unknown',
      action,
      status: actionCfg.status,
      leadId,
      data,
      fallbackUsed
    };
    console.log('[TELEGRAM_ACTION_LOG]', JSON.stringify(statusLog));

    await saveLeadContext({
      ...(context || {}),
      leadId,
      statusEvent: {
        action,
        status: actionCfg.status,
        by: from?.username || from?.first_name || String(from?.id || 'unknown')
      }
    });

    await sendMessage(
      process.env.TELEGRAM_CHAT_ID,
      buildStatusLogText({
        leadId,
        action,
        status: actionCfg.status,
        operator: from?.username || from?.first_name || String(from?.id || 'unknown')
      }),
      'HTML'
    );

    const panelMessageId = await sendOneTapPanel({
      leadId,
      lang,
      templateAction,
      templateText,
      context,
      heading: '💬 One-Tap Reply Ready'
    });

    return res.status(200).json({
      ok: true,
      action,
      leadId,
      status: actionCfg.status,
      panelSent: Boolean(panelMessageId),
      fallbackUsed
    });
  } catch (err) {
    const errorCode = err.code || 'WEBHOOK_ERROR';
    console.error('[WEBHOOK_ERROR]', errorCode, err.message);
    await safeSendMessage(
      process.env.TELEGRAM_CHAT_ID,
      `🚨 <b>Webhook Error</b>\nLead: <code>${escapeHtml(leadId)}</code>\nAction: <code>${escapeHtml(action)}</code>\nCode: <code>${escapeHtml(errorCode)}</code>`,
      'HTML'
    );
    return res.status(500).json({
      ok: false,
      action,
      leadId,
      panelSent: false,
      fallbackUsed,
      errorCode
    });
  }
}

async function handleReplyPanel(parsed, callbackQuery) {
  const { leadId, lang, templateAction } = parsed;
  const resolved = await resolveLeadContext(leadId, callbackQuery.message?.text);
  const context = resolved.context;

  if (!context?.phone) {
    await sendMessage(
      process.env.TELEGRAM_CHAT_ID,
      `❌ <b>Lead not found</b>\nLead ID: <code>${escapeHtml(leadId)}</code>\nNo phone in context.`,
      'HTML'
    );
    return { ok: false, panelSent: false, fallbackUsed: resolved.fallbackUsed, errorCode: 'LEAD_CONTEXT_NOT_FOUND' };
  }

  const chosenLang = normalizeLang(lang || context.lang || 'en');
  const chosenAction = templateAction || 'greeting';
  const templateText = getReplyTemplate(chosenAction, chosenLang, context);

  const panelMessageId = await sendOneTapPanel({
    leadId,
    lang: chosenLang,
    templateAction: chosenAction,
    templateText,
    context,
    heading: chosenLang === 'ru' ? '💬 Шаблон RU готов' : '💬 EN Template Ready'
  });

  return { ok: true, panelSent: Boolean(panelMessageId), fallbackUsed: resolved.fallbackUsed };
}

async function handleCopyTemplate(parsed, callbackQuery) {
  const { leadId, lang, templateAction } = parsed;
  const resolved = await resolveLeadContext(leadId, callbackQuery.message?.text);
  const context = resolved.context;

  if (!context?.phone) {
    await sendMessage(
      process.env.TELEGRAM_CHAT_ID,
      `❌ <b>Lead not found</b>\nLead ID: <code>${escapeHtml(leadId)}</code>\nNo phone in context.`,
      'HTML'
    );
    return { ok: false, panelSent: false, fallbackUsed: resolved.fallbackUsed, errorCode: 'LEAD_CONTEXT_NOT_FOUND' };
  }

  const chosenLang = normalizeLang(lang || context.lang || 'en');
  const text = getReplyTemplate(templateAction || 'greeting', chosenLang, context || {});

  await sendMessage(
    process.env.TELEGRAM_CHAT_ID,
    `📋 <b>Copy this message</b>\n\n<code>${escapeHtml(text)}</code>`,
    'HTML'
  );

  return { ok: true, panelSent: true, fallbackUsed: resolved.fallbackUsed };
}

async function sendOneTapPanel({ leadId, lang, templateAction, templateText, context, heading }) {
  const links = buildReplyLinks(context?.phone, templateText);
  if (!links) {
    const err = new Error('No valid customer phone');
    err.code = 'PHONE_NOT_AVAILABLE';
    throw err;
  }

  const launcherUrl = buildLauncherUrl({
    leadId,
    lang,
    action: templateAction,
    phone: links.phone,
    text: templateText
  });

  const otherLang = lang === 'ru' ? 'en' : 'ru';
  const panelText = `${heading}\n\n<b>Lead:</b> <code>${escapeHtml(leadId)}</code>\n<b>Phone:</b> <code>${escapeHtml(links.phone)}</code>\n\n<b>Message:</b>\n<code>${escapeHtml(templateText)}</code>`;

  const replyMarkup = {
    inline_keyboard: [
      [{ text: '🧭 Open One-Tap Panel', url: launcherUrl }],
      [{ text: '📍 WhatsApp', url: links.whatsApp }],
      [
        { text: '📋 Copy Text', callback_data: `copy:${lang}:${templateAction}:${leadId}` },
        { text: otherLang === 'ru' ? '💬 Ответ RU' : '💬 Reply EN', callback_data: `reply:${otherLang}:${templateAction}:${leadId}` }
      ]
    ]
  };

  return await sendMessage(process.env.TELEGRAM_CHAT_ID, panelText, 'HTML', replyMarkup);
}

function buildLauncherUrl({ leadId, lang, action, phone, text }) {
  const baseUrl = process.env.PUBLIC_SITE_URL || 'https://handyandfriend.com';
  const params = new URLSearchParams({
    leadId: String(leadId || ''),
    lang: String(lang || 'en'),
    action: String(action || 'greeting'),
    phone: String(phone || ''),
    text: String(text || '')
  });
  return `${baseUrl}/r/one-tap?${params.toString()}`;
}

async function resolveLeadContext(leadId, fallbackMessageText) {
  const context = await loadLeadContext(leadId);
  if (context?.phone) {
    return { context, fallbackUsed: false };
  }

  const parsed = parseContextFromMessage(fallbackMessageText || '', leadId);
  if (parsed?.phone) {
    saveLeadContext(parsed).catch((err) => console.error('[LEAD_CONTEXT_PARSE_SAVE_ERROR]', err.message));
    return { context: parsed, fallbackUsed: true };
  }

  return { context: null, fallbackUsed: true };
}

function parseContextFromMessage(text, leadId) {
  const raw = String(text || '');
  if (!raw) return null;

  const ctxMatch = raw.match(/CTX:([\w-]+):([+\d\s()-]+)/i);
  if (ctxMatch) {
    return {
      leadId: String(leadId || ctxMatch[1] || ''),
      phone: sanitizePhone(ctxMatch[2]),
      name: '',
      service: '',
      lang: 'en',
      source: 'ctx_machine_tag'
    };
  }

  const phoneMatch = raw.match(/Phone:\s*([^\n]+)/i);
  const nameMatch = raw.match(/Name:\s*([^\n]+)/i);
  const serviceMatch = raw.match(/Service:\s*([^\n]+)/i);

  const phone = sanitizePhone((phoneMatch && phoneMatch[1]) || '');
  if (!phone) return null;

  return {
    leadId: String(leadId || ''),
    phone,
    name: (nameMatch && nameMatch[1] ? nameMatch[1].trim() : ''),
    service: (serviceMatch && serviceMatch[1] ? serviceMatch[1].trim() : ''),
    lang: 'en',
    source: 'legacy_text_parse'
  };
}

function buildReplyLinks(phoneInput, text) {
  const phone = sanitizePhone(phoneInput || '');
  if (!phone) return null;

  const encoded = encodeURIComponent(text);
  const waPhone = phone.replace(/\D/g, '');

  return {
    phone,
    smsIos: `sms:${phone}&body=${encoded}`,
    smsAndroid: `sms:${phone}?body=${encoded}`,
    whatsApp: `https://wa.me/${waPhone}?text=${encoded}`,
    call: `tel:${phone}`
  };
}

async function handleMessage(message, res) {
  const { text } = message;
  if (!text) {
    return res.status(200).json({ ok: true });
  }

  if (text === '/start') {
    await ensureMenuConfigured();
    const welcomeText = `
🛠 <b>HandyMans CRM Assistant</b>

Я веду лиды с сайта и даю one-tap ответы клиенту.
Нажмите /help для инструкций.
    `.trim();

    await sendMessage(process.env.TELEGRAM_CHAT_ID, welcomeText, 'HTML');
    return res.status(200).json({ ok: true });
  }

  if (text === '/help') {
    const helpText = `
<b>HandyMans Bot Commands</b>

/start - перезапуск ассистента
/help - справка
/menu - обновить меню команд
/templates - быстрые шаблоны
/status - карта статусов

<b>Как отвечать клиенту:</b>
1) Нажмите 💬 Ответ RU или 💬 Reply EN
2) Нажмите 🧭 Open One-Tap Panel
3) Выберите SMS iPhone / SMS Android / Call / WhatsApp
    `.trim();

    await sendMessage(process.env.TELEGRAM_CHAT_ID, helpText, 'HTML');
    return res.status(200).json({ ok: true });
  }

  if (text === '/menu') {
    await ensureMenuConfigured();
    await sendMessage(process.env.TELEGRAM_CHAT_ID, '✅ Меню HandyMans обновлено.', 'HTML');
    return res.status(200).json({ ok: true });
  }

  if (text === '/templates') {
    const keyTemplates = [
      templatesEN.greeting_received,
      templatesEN.request_address,
      templatesEN.callback_confirm,
      templatesEN.followup_3day
    ].filter(Boolean);

    const templatesText = [
      '<b>Quick Templates</b>',
      '',
      ...keyTemplates.map((t, i) => `${i + 1}. ${escapeHtml(t)}`)
    ].join('\n');

    await sendMessage(process.env.TELEGRAM_CHAT_ID, templatesText, 'HTML');
    return res.status(200).json({ ok: true });
  }

  if (text === '/status') {
    const statusGuide = `
<b>Lead Status Flow</b>

NEW → TAKEN → WAITING_ADDRESS/WAITING_PHOTOS → CALLBACK_15_MIN → WON

If lead is not a fit: DECLINED
    `.trim();

    await sendMessage(process.env.TELEGRAM_CHAT_ID, statusGuide, 'HTML');
    return res.status(200).json({ ok: true });
  }

  console.log(`[TELEGRAM_MESSAGE] ${text}`);
  return res.status(200).json({ ok: true });
}

function parseCallbackData(data) {
  const raw = String(data || '');

  if (raw.includes(':')) {
    const parts = raw.split(':');
    const action = parts[0] || '';

    // reply:lang:templateAction:leadId (new)
    if (action === 'reply' && parts.length >= 4) {
      return {
        action,
        lang: parts[1] || 'en',
        templateAction: parts[2] || 'greeting',
        leadId: parts.slice(3).join(':') || 'unknown'
      };
    }

    // reply:lang:leadId (legacy)
    if (action === 'reply' && parts.length === 3) {
      return {
        action,
        lang: parts[1] || 'en',
        templateAction: 'greeting',
        leadId: parts[2] || 'unknown'
      };
    }

    if (action === 'copy') {
      return {
        action,
        lang: parts[1] || 'en',
        templateAction: parts[2] || 'greeting',
        leadId: parts.slice(3).join(':') || 'unknown'
      };
    }
  }

  const firstUnderscore = raw.indexOf('_');
  if (firstUnderscore === -1) {
    return { action: raw, leadId: 'unknown', lang: 'en', templateAction: 'greeting' };
  }
  const legacyAction = raw.slice(0, firstUnderscore);
  return {
    action: legacyAction,
    leadId: raw.slice(firstUnderscore + 1) || 'unknown',
    lang: 'en',
    templateAction: templateKeyForAction(legacyAction)
  };
}

function buildStatusLogText({ leadId, action, status, operator }) {
  const when = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  return `📒 <b>Lead Status Log</b>\n\n<b>Lead ID:</b> <code>${escapeHtml(leadId)}</code>\n<b>Action:</b> ${escapeHtml(action)}\n<b>Status:</b> ${escapeHtml(status)}\n<b>Operator:</b> ${escapeHtml(operator)}\n<b>Time:</b> ${escapeHtml(when)} PT`;
}

async function ensureMenuConfigured() {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands: COMMANDS })
    });
  } catch (err) {
    console.error('[TELEGRAM_SET_COMMANDS_ERROR]', err.message);
  }
}

async function answerCallback(callbackQueryId, text) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: false
    })
  });
}

async function sendMessage(chatId, text, parseMode = 'HTML', replyMarkup = null) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
    disable_web_page_preview: true
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));
  if (!data.ok) {
    const err = new Error(data.description || 'Telegram sendMessage failed');
    err.code = 'TELEGRAM_SEND_FAILED';
    err.meta = data;
    throw err;
  }
  return data.result?.message_id || null;
}

async function safeSendMessage(chatId, text, parseMode = 'HTML') {
  try {
    await sendMessage(chatId, text, parseMode);
    return true;
  } catch (err) {
    console.error('[TELEGRAM_SAFE_SEND_ERROR]', err.message);
    return false;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
