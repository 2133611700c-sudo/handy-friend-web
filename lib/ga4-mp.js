/**
 * GA4 Measurement Protocol — server-side event sending
 * Docs: https://developers.google.com/analytics/devguides/collection/protocol/ga4
 *
 * Env vars:
 *   GA4_MEASUREMENT_ID  – e.g. G-Z05XJ8E281
 *   GA4_API_SECRET      – created in GA4 Admin → Data Streams → Measurement Protocol API secrets
 */

const GA4_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
const GA4_DEBUG     = 'https://www.google-analytics.com/debug/mp/collect';

/**
 * Send a server-side event to GA4 via Measurement Protocol.
 *
 * @param {string}  clientId   – GA4 client_id (from cookie _ga or generated)
 * @param {string}  eventName  – e.g. 'lead_created', 'lead_booked'
 * @param {Object}  params     – event parameters
 * @param {Object}  [opts]     – options
 * @param {string}  [opts.userId]      – optional user_id for cross-device
 * @param {boolean} [opts.debug]       – send to debug endpoint
 * @param {boolean} [opts.nonInteraction] – mark as non-interaction
 * @returns {Promise<{ok: boolean, status?: number, body?: any}>}
 */
async function sendGA4Event(clientId, eventName, params = {}, opts = {}) {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret     = process.env.GA4_API_SECRET;

  if (!measurementId || !apiSecret) {
    return { ok: false, reason: 'missing_env', detail: 'GA4_MEASUREMENT_ID or GA4_API_SECRET not set' };
  }

  if (!clientId) {
    // Generate a pseudo client_id for server-originated events
    clientId = `server.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  }

  const endpoint = opts.debug ? GA4_DEBUG : GA4_ENDPOINT;
  const url = `${endpoint}?measurement_id=${measurementId}&api_secret=${apiSecret}`;

  const body = {
    client_id: clientId,
    events: [{
      name: eventName,
      params: {
        ...params,
        engagement_time_msec: '100',  // required for events to show in reports
        session_id: params.session_id || String(Date.now()),
      }
    }]
  };

  if (opts.userId) {
    body.user_id = opts.userId;
  }

  if (opts.nonInteraction) {
    body.non_personalized_ads = true;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // MP returns 204 on success, debug endpoint returns JSON
    if (opts.debug) {
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, body: json };
    }

    return { ok: res.status === 204 || res.ok, status: res.status };
  } catch (err) {
    return { ok: false, reason: 'fetch_error', detail: err.message };
  }
}

/**
 * Convenience: fire a lead lifecycle event.
 *
 * @param {'lead_created'|'lead_qualified'|'lead_booked'|'lead_paid'} stage
 * @param {Object} leadData – { lead_id, source, service_type, value, phone_hash }
 * @param {string} [clientId]
 */
async function trackLeadEvent(stage, leadData = {}, clientId) {
  const params = {
    lead_id:      leadData.lead_id || '',
    source:       leadData.source || '',
    service_type: leadData.service_type || '',
    currency:     'USD',
  };

  if (leadData.value) {
    params.value = Number(leadData.value);
  }

  if (leadData.phone_hash) {
    params.phone_hash = leadData.phone_hash;
  }

  return sendGA4Event(clientId, stage, params, { nonInteraction: true });
}

module.exports = { sendGA4Event, trackLeadEvent };
