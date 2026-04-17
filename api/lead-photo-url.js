const { createSignedObjectUrl, restInsert } = require('./_lib/supabase-admin.js');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

  const { leadId, filePath, expiresIn } = req.body || {};
  if (!leadId || !filePath) {
    return res.status(400).json({ success: false, error: 'leadId and filePath are required' });
  }

  const result = await createSignedObjectUrl(String(filePath), Number(expiresIn || 3600));
  if (!result.ok) {
    await restInsert('lead_events', {
      lead_id: String(leadId),
      event_type: 'validation_failed',
      event_data: {
        stage: 'signed_url',
        error: result.error || 'sign_failed'
      }
    }, { returning: false });
    return res.status(500).json({ success: false, error: 'Failed to generate signed url' });
  }

  return res.status(200).json({
    success: true,
    signedUrl: result.data.signedUrl,
    expiresIn: Number(expiresIn || 3600)
  });
}
