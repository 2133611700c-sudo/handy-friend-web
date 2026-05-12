export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'HEAD') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  const origin = 'https://handyandfriend.com';
  const routes = ['/', '/book', '/pricing', '/services', '/messenger', '/api/health'];
  const startedAt = new Date().toISOString();
  const results = [];

  for (const route of routes) {
    const url = `${origin}${route}`;
    const started = Date.now();
    const item = { route, url, ok: false, status: null, ms: null, bytes: 0, checks: {}, findings: [] };
    try {
      const response = await fetch(url, {
        redirect: 'manual',
        headers: {
          'user-agent': 'HandyFriend-OpenCloud-Agent/1.0',
          accept: 'text/html,application/json,text/plain,*/*'
        }
      });
      const text = await response.text();
      item.status = response.status;
      item.ms = Date.now() - started;
      item.bytes = text.length;
      item.ok = response.status >= 200 && response.status < 400;
      item.checks.phone = /2133611700|213[\s\-)]*361[\s-]*1700|\+12133611700/.test(text);
      item.checks.whatsapp = /wa\.me|whatsapp/i.test(text);
      item.checks.messenger = /m\.me|messenger/i.test(text);
      item.checks.canonicalEmail = /2133611700c@gmail\.com/i.test(text);
      item.checks.legacyEmail = /hello@handyandfriend\.com/i.test(text);
      item.checks.oldHours7pm = /8\s?(am|AM)?[–\- ]?7\s?(pm|PM)?|19:00/.test(text);
      item.checks.riskyClaim = /licensed and bonded|best in LA|#1 handyman|certified/i.test(text);
      if (!item.ok) item.findings.push('bad_status');
      if (item.checks.legacyEmail) item.findings.push('legacy_email');
      if (item.checks.oldHours7pm) item.findings.push('old_hours_7pm');
      if (item.checks.riskyClaim) item.findings.push('risky_claim');
      if (route !== '/messenger' && route !== '/api/health' && !item.checks.phone) item.findings.push('missing_phone');
    } catch (err) {
      item.ms = Date.now() - started;
      item.error = String(err?.message || err).slice(0, 200);
      item.findings.push('fetch_error');
    }
    results.push(item);
  }

  const failed = results.filter((r) => !r.ok || r.findings.length > 0);
  return res.status(failed.length ? 207 : 200).json({
    ok: failed.length === 0,
    service: 'handy-friend-opencloud-agent',
    generated_at: startedAt,
    completed_at: new Date().toISOString(),
    target_origin: origin,
    summary: {
      routes_checked: results.length,
      failed_or_warn_routes: failed.length,
      findings: failed.flatMap((r) => r.findings.map((finding) => ({ route: r.route, finding })))
    },
    results,
    safety: {
      public_read_only: true,
      no_customer_messages: true,
      no_secrets: true,
      no_destructive_actions: true
    }
  });
}
