/**
 * Stable public review link.
 * /review -> GOOGLE_REVIEW_URL
 *
 * Priority:
 * 1. GOOGLE_REVIEW_URL env var (set once GBP verified + Place ID obtained)
 *    Format: https://search.google.com/local/writereview?placeid=ChIJ...
 * 2. Google Maps search fallback (always works, lands on business listing)
 * 3. If nothing → JSON error with setup instructions
 */
export default async function handler(req, res) {
  const target = process.env.GOOGLE_REVIEW_URL;

  if (target) {
    return res.redirect(302, target);
  }

  // Fallback: Google Maps search for the business (works before/after verification)
  const fallback = 'https://www.google.com/maps/search/Handy+Friend+Los+Angeles+CA+handyman';

  return res.redirect(302, fallback);
}
