const { uploadLeadPhoto, logLeadEvent } = require('./_lib/supabase-admin.js');
const { getClientIp, checkRateLimit } = require('./_lib/rate-limit.js');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method Not Allowed' });

  const ip = getClientIp(req);
  const rate = checkRateLimit({
    key: `upload-lead-photos:${ip}`,
    limit: 12,
    windowMs: 60 * 1000
  });
  if (!rate.ok) {
    res.setHeader('Retry-After', String(rate.retryAfterSec));
    return res.status(429).json({ success: false, error: 'Too many upload attempts. Please retry shortly.' });
  }

  const { leadId, photos } = req.body || {};
  const safePhotos = Array.isArray(photos) ? photos.slice(0, 6) : [];

  if (!leadId) {
    return res.status(400).json({ success: false, error: 'leadId is required' });
  }

  if (!safePhotos.length) {
    return res.status(400).json({ success: false, error: 'photos array is required' });
  }

  const uploaded = [];
  const failed = [];

  for (const photo of safePhotos) {
    const result = await uploadLeadPhoto({ leadId, photo, now: new Date() });
    if (result.ok) {
      uploaded.push(result.data);
      await logLeadEvent(leadId, 'photo_uploaded', {
        file_path: result.data.filePath,
        file_name: result.data.fileName,
        mime_type: result.data.mimeType,
        file_size: result.data.fileSize
      });
    } else {
      failed.push({
        name: String(photo?.name || 'unknown'),
        error: result.error || 'upload_failed'
      });
      await logLeadEvent(leadId, 'validation_failed', {
        stage: 'upload_photo',
        file_name: String(photo?.name || 'unknown'),
        error: result.error || 'upload_failed'
      });
    }
  }

  return res.status(200).json({
    success: uploaded.length > 0,
    leadId,
    uploadedCount: uploaded.length,
    failedCount: failed.length,
    uploaded: uploaded.map((item) => ({
      filePath: item.filePath,
      fileName: item.fileName,
      mimeType: item.mimeType,
      fileSize: item.fileSize
    })),
    failed
  });
}
