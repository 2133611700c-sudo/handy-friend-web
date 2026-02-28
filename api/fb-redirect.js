/**
 * Stable public Facebook recommendation link.
 * /fb -> FACEBOOK_PAGE_URL
 */
export default async function handler(req, res) {
  const target =
    process.env.FACEBOOK_PAGE_URL ||
    'https://www.facebook.com/profile.php?id=61588215297678&locale=en_US';

  if (!target) {
    return res.status(503).json({
      ok: false,
      error: 'FACEBOOK_PAGE_URL_NOT_CONFIGURED',
      message: 'Set FACEBOOK_PAGE_URL in environment variables.'
    });
  }

  return res.redirect(302, target);
}
