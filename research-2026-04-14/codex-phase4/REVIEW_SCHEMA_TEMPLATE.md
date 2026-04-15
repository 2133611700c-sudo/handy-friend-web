# Review Schema Template — Phase 4

## Input JSON format
Create \`reviews/reviews.json\` using this schema:

```json
{
  "business": {
    "name": "Handy & Friend",
    "url": "https://handyandfriend.com/"
  },
  "reviews": [
    {
      "author": "Jane D.",
      "rating": 5,
      "date": "2026-04-10",
      "text": "TV mounted in 30 minutes, cleaned up after.",
      "neighborhood": "Hollywood",
      "service": "tv_mounting",
      "verified_source": "google"
    }
  ]
}
```

## Example JSON-LD output shape
The generator produces:
- \`HomeAndConstructionBusiness\`
- \`aggregateRating\` from all review ratings
- \`review[]\` with author, date, body, and rating

Example (3 reviews):
```json
{
  "@context": "https://schema.org",
  "@type": "HomeAndConstructionBusiness",
  "name": "Handy & Friend",
  "url": "https://handyandfriend.com/",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": 4.7,
    "reviewCount": 3,
    "bestRating": "5",
    "worstRating": "1"
  },
  "review": [
    {
      "@type": "Review",
      "author": {"@type": "Person", "name": "Jane D."},
      "datePublished": "2026-04-10",
      "reviewBody": "TV mounted in 30 minutes, cleaned up after.",
      "reviewRating": {"@type": "Rating", "ratingValue": "5", "bestRating": "5", "worstRating": "1"}
    }
  ]
}
```

## Integration plan
1. Collect at least 5 real reviews in \`reviews/reviews.json\`.
2. Run: \`python3 scripts/review-capture.py reviews/reviews.json\`.
3. Paste generated JSON-LD into \`index.html\` head during controlled release.
4. Replace sample testimonial disclaimer with verified customer content.
5. Update project memory/status to mark real-review mode enabled.

## QA rules
- Minimum review text length: 30 chars
- Maximum review text length: 500 chars
- Rating must be integer in [1..5]
- Reject blocked marketing words in review body
- Verify JSON-LD parses before merge
