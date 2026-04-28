/**
 * Per-customer WhatsApp conversation memory.
 * Stores and retrieves conversation history from Supabase whatsapp_messages table
 * using direct REST calls (no SDK dependency).
 * Each customer phone has a conversation context including previous messages,
 * detected service intent, collected fields, and missing fields.
 */

function sbHeaders() {
  return {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
    'Content-Type': 'application/json',
  };
}

function sbUrl(path) {
  return `${(process.env.SUPABASE_URL || '').replace(/\/$/, '')}/rest/v1/${path}`;
}

/**
 * Load last N messages for customer phone from whatsapp_messages table.
 * Returns array of {role, content} for use as conversationHistory.
 */
async function loadConversationHistory(customerPhone, limit = 10) {
  try {
    const url = sbUrl(
      `whatsapp_messages?customer_phone=eq.${encodeURIComponent(customerPhone)}&order=created_at.desc&limit=${limit}&select=direction,body,created_at`
    );
    const res = await fetch(url, { headers: sbHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    // Reverse to get chronological order, map to messages format
    return data.reverse().map(row => ({
      role: row.direction === 'in' ? 'user' : 'assistant',
      content: row.body || '',
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Extract collected fields from conversation history.
 * Returns an object with known fields: zip, tv_size, wall_type, sq_ft, etc.
 */
function extractCollectedFields(history) {
  const fields = {};
  const allText = history.map(m => m.content).join(' ');

  // ZIP code
  const zipMatch = allText.match(/\b(\d{5})\b/);
  if (zipMatch) fields.zip = zipMatch[1];

  // TV size
  const tvMatch = allText.match(/\b(\d{2,3})["\s-]*(?:inch|in\b|")/i);
  if (tvMatch) fields.tv_size = tvMatch[1] + ' inch';

  // Square footage
  const sqFtMatch = allText.match(/\b(\d+)\s*(?:sq\.?\s*ft|square\s*feet|кв\.?\s*(?:фут|м))/i);
  if (sqFtMatch) fields.sq_ft = sqFtMatch[1];

  // Wall type
  if (/brick|кирпич/i.test(allText)) fields.wall_type = 'brick';
  else if (/concrete|бетон/i.test(allText)) fields.wall_type = 'concrete';
  else if (/drywall|гипсокартон/i.test(allText)) fields.wall_type = 'drywall';

  return fields;
}

/**
 * Build a "collected fields summary" string for Alex context injection.
 * Example: "Customer already provided: ZIP=90038, TV size=65 inch"
 */
function buildCollectedFieldsSummary(fields) {
  if (!Object.keys(fields).length) return '';
  const parts = Object.entries(fields).map(([k, v]) => `${k}=${v}`);
  return `[CONTEXT: Customer already provided: ${parts.join(', ')}. Do NOT ask for these again.]`;
}

module.exports = {
  loadConversationHistory,
  extractCollectedFields,
  buildCollectedFieldsSummary,
};
