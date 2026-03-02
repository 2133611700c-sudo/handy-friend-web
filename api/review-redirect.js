/**
 * Stable public review link.
 * /review -> GOOGLE_REVIEW_URL
 */
export default async function handler(req, res) {
  const target =
    process.env.GOOGLE_REVIEW_URL ||
    'https://g.co/kgs/handyandfriend';

  if (!target) {
    return res.status(503).json({
      ok: false,
      error: 'GOOGLE_REVIEW_URL_NOT_CONFIGURED',
      message: 'Set GOOGLE_REVIEW_URL in environment variables.'
    });
  }

  return res.redirect(302, target);
}
