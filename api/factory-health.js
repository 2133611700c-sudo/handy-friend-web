/**
 * Factory health endpoint.
 * Provides a single diagnostic view for lead pipeline readiness.
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const env = process.env;
  const hasTelegram = Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);
  const hasRecaptcha = Boolean(env.RECAPTCHA_SECRET_KEY);
  const durableStore = Boolean(env.FIREBASE_CONFIG);
  const publicSiteUrl = env.PUBLIC_SITE_URL || 'https://handyandfriend.com';

  const checks = {
    telegramConfigured: hasTelegram,
    recaptchaConfigured: hasRecaptcha,
    durableStorageConfigured: durableStore,
    launcherBaseUrlConfigured: Boolean(env.PUBLIC_SITE_URL),
    resendConfigured: Boolean(env.RESEND_API_KEY),
    sendgridConfigured: Boolean(env.SENDGRID_API_KEY)
  };

  const criticalFailures = [];
  if (!checks.telegramConfigured) criticalFailures.push('TELEGRAM_NOT_CONFIGURED');
  if (!checks.durableStorageConfigured) criticalFailures.push('DURABLE_STORAGE_NOT_CONFIGURED');

  const status = criticalFailures.length ? 'degraded' : 'healthy';
  const httpCode = criticalFailures.length ? 503 : 200;

  return res.status(httpCode).json({
    ok: criticalFailures.length === 0,
    status,
    timestamp: new Date().toISOString(),
    environment: env.VERCEL_ENV || 'local',
    publicSiteUrl,
    checks,
    criticalFailures,
    guidance: [
      'Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID for operator delivery.',
      'Set FIREBASE_CONFIG for durable lead context persistence.',
      'Set PUBLIC_SITE_URL for stable one-tap launcher URLs.'
    ]
  });
}
