/**
 * AI Intake Endpoint
 * Receives query + photos from the search bar.
 * - Calls DeepSeek AI for response (private, not public)
 * - Sends to Telegram for follow-up
 * POST /api/ai-intake
 * Body: { query: string, photos: [{dataUrl, name}], lang: string }
 */

const { restInsert, logLeadEvent } = require('./_lib/supabase-admin.js');
const { sendTelegramMessage, sendTelegramPhoto } = require('../lib/telegram/send.js');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { query = '', photos = [], lang = 'en', leadId = '' } = req.body || {};
  const safePhotos = Array.isArray(photos) ? photos.slice(0, 6) : [];

  if (!query && !safePhotos.length) {
    return res.status(400).json({ success: false, error: 'query or photos required' });
  }

  let aiResponse = null;

  try {
    // 1. Store user message for analytics if we have lead context.
    if (leadId && query) {
      await restInsert('ai_conversations', {
        lead_id: String(leadId),
        message_role: 'user',
        message_text: String(query).slice(0, 8000)
      }, { returning: false });
    }

    // 2. Call DeepSeek AI (only if API key configured)
    if (process.env.DEEPSEEK_API_KEY) {
      try {
        aiResponse = await callDeepSeekAI(query, lang);
        console.log('[AI_INTAKE] DeepSeek response received');
      } catch (aiErr) {
        console.warn('[AI_INTAKE] DeepSeek failed:', aiErr.message);
        // Continue to Telegram anyway
      }
    }

    // 3. Send to Telegram via unified sender (async, don't wait)
    //    The unified sender writes durable telegram_sends row automatically.
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      const text = buildMessage({ query, lang, photoCount: safePhotos.length, aiResponse });
      sendTelegramMessage({
        source: 'ai_intake',
        leadId: leadId ? String(leadId) : null,
        text,
        timeoutMs: 4000
      }).catch(err => console.error('[AI_INTAKE] Telegram msg failed:', err.message));

      for (const photo of safePhotos) {
        sendTelegramPhoto({
          source: 'ai_intake',
          leadId: leadId ? String(leadId) : null,
          photo: String(photo?.dataUrl || ''),
          caption: `📸 ${String(query || 'AI search photo').slice(0, 200)}`,
          timeoutMs: 4000
        }).catch(err =>
          console.error('[AI_INTAKE] Photo send failed:', err.message)
        );
      }
    }

    if (leadId) {
      await logLeadEvent(String(leadId), 'ai_summary_saved', {
        source: 'ai_intake',
        has_query: Boolean(query),
        has_ai_response: Boolean(aiResponse),
        photo_count: safePhotos.length
      });
    }

    // 4. Return AI response to client immediately (don't wait for Telegram)
    return res.status(200).json({
      success: true,
      aiResponse,
      sentTelegram: !!process.env.TELEGRAM_BOT_TOKEN
    });
  } catch (err) {
    console.error('[AI_INTAKE_ERROR]', err.message);
    if (leadId) {
      await logLeadEvent(String(leadId), 'validation_failed', {
        stage: 'ai_intake',
        error: String(err.message || 'ai_intake_error').slice(0, 240)
      });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
}

/* ── DeepSeek AI Call ── */
async function callDeepSeekAI(query, lang = 'en') {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not configured');

  const systemMsg = lang === 'ru'
    ? 'Ты опытный мастер на все руки. Дай краткий, практичный совет по цене, срокам и следующим шагам. Если нужны фото, скажи какие. Будь дружелюбен и профессионален. Ответ до 200 слов.'
    : lang === 'uk'
    ? 'Ти досвідчений майстер на всі руки. Дай короткий, практичний поради щодо ціни, термінів та наступних кроків. Якщо потрібні фото, скажи які. Будь дружелюбним і професійним. Відповідь до 200 слів.'
    : 'You are an experienced handyman. Give brief, practical advice about pricing, timeline, and next steps. If photos are needed, say which ones. Be friendly and professional. Keep response under 200 words.';

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'user', content: query }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    const errData = await response.text().catch(() => '');
    throw new Error(`DeepSeek API error: ${response.status} ${errData}`);
  }

  const data = await response.json();
  if (!data.choices || !data.choices[0]?.message?.content) {
    throw new Error('Invalid DeepSeek response format');
  }

  return data.choices[0].message.content;
}

/* ── Message builder ── */
function buildMessage({ query, lang, photoCount, aiResponse }) {
  const now = new Date().toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const photoLine = photoCount > 0
    ? `📸 <b>Photos attached:</b> ${photoCount}`
    : '📷 No photos';

  const aiLine = aiResponse
    ? `\n\n🤖 <b>AI Response:</b>\n${escapeHtml(aiResponse)}`
    : '';

  return `🤖 <b>New AI Search Request</b>

💬 <b>Query:</b> ${escapeHtml(query || '—')}
🌐 <b>Language:</b> ${escapeHtml(lang.toUpperCase())}
${photoLine}
⏰ <b>Time (LA):</b> ${now}${aiLine}`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
