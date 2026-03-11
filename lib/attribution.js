/**
 * Canonical attribution normalization and channel classification.
 * Used by submit-lead and diagnostics to keep Ads/analytics mapping stable.
 */

function asString(value) {
  return String(value || '').trim();
}

function lower(value) {
  return asString(value).toLowerCase();
}

function normalizeAttribution(raw) {
  const safe = raw && typeof raw === 'object' ? raw : {};
  const clickId = safe.clickId && typeof safe.clickId === 'object' ? safe.clickId : {};

  const normalized = {
    pageUrl: asString(safe.pageUrl),
    referrer: asString(safe.referrer),
    utmSource: asString(safe.utmSource),
    utmMedium: asString(safe.utmMedium),
    utmCampaign: asString(safe.utmCampaign),
    utmContent: asString(safe.utmContent),
    utmTerm: asString(safe.utmTerm),
    placementId: asString(safe.placementId),
    landingPath: asString(safe.landingPath),
    lang: asString(safe.lang),
    ga4ClientId: asString(safe.ga4ClientId),
    clickId: {
      fbclid: asString(clickId.fbclid),
      gclid: asString(clickId.gclid),
      msclkid: asString(clickId.msclkid),
      ttclid: asString(clickId.ttclid),
      gbraid: asString(clickId.gbraid),
      wbraid: asString(clickId.wbraid)
    }
  };

  normalized.channel = classifyAttributionChannel(normalized);
  normalized.summary = buildAttributionSummary(normalized);
  return normalized;
}

function classifyAttributionChannel(attr) {
  const source = lower(attr.utmSource);
  const medium = lower(attr.utmMedium);
  const campaign = lower(attr.utmCampaign);
  const content = lower(attr.utmContent);
  const term = lower(attr.utmTerm);
  const placement = lower(attr.placementId);
  const ref = lower(attr.referrer);
  const landing = lower(attr.landingPath);
  const hasGclid = Boolean(attr?.clickId?.gclid);
  const hasGoogleBraids = Boolean(attr?.clickId?.gbraid || attr?.clickId?.wbraid);
  const hasFbclid = Boolean(attr?.clickId?.fbclid);

  const googleText = [source, medium, campaign, content, term, placement, ref, landing].join(' ');
  const paidGoogle =
    hasGclid ||
    hasGoogleBraids ||
    (source === 'google' && /(cpc|ppc|paid|sem|searchads)/.test(medium));

  if (source === 'google' && /(lsa|local services|local_service_ads)/.test(googleText)) {
    return 'google_lsa';
  }

  if (paidGoogle) {
    if (/(pmax|performance max)/.test(googleText)) return 'google_ads_pmax';
    if (/(display|gdn|youtube|video)/.test(googleText)) return 'google_ads_display';
    return 'google_ads_search';
  }

  if ((source === 'google' || (!source && /google\./.test(ref))) && /(gbp|maps|business|profile|gmb|local)/.test(googleText)) {
    return 'google_business';
  }

  if (source === 'google' || (!source && /google\./.test(ref))) return 'google_organic';

  if (source === 'facebook' || hasFbclid) {
    return /(paid|cpc|ads)/.test(medium) ? 'facebook_ads' : 'facebook_organic';
  }

  if (source === 'instagram') {
    return /(paid|cpc|ads)/.test(medium) ? 'instagram_ads' : 'instagram_organic';
  }

  if (!source && /facebook\.com|fb\.com/.test(ref)) return 'facebook_organic';
  if (!source && /instagram\.com/.test(ref)) return 'instagram_organic';
  if (!source && /nextdoor\.com/.test(ref)) return 'nextdoor';
  if (!source && /yelp\.com/.test(ref)) return 'yelp';

  if (source === 'nextdoor') return 'nextdoor';
  if (source === 'craigslist') return 'craigslist';
  if (source === 'thumbtack') return 'thumbtack';
  if (source === 'yelp') return 'yelp';
  if (source === 'referral') return 'referral';
  if (source === 'whatsapp') return 'whatsapp';

  if (!source && !medium && !campaign && !content && !term && !placement && !ref && !hasGclid && !hasFbclid) {
    return 'website_form';
  }

  return 'other';
}

function buildAttributionSummary(attr) {
  const parts = [];
  if (attr.utmSource) parts.push(`src=${attr.utmSource}`);
  if (attr.utmMedium) parts.push(`med=${attr.utmMedium}`);
  if (attr.utmCampaign) parts.push(`cmp=${attr.utmCampaign}`);
  if (attr.placementId) parts.push(`plc=${attr.placementId}`);

  const clickLabels = [];
  if (attr.clickId?.gclid) clickLabels.push('gclid');
  if (attr.clickId?.gbraid) clickLabels.push('gbraid');
  if (attr.clickId?.wbraid) clickLabels.push('wbraid');
  if (attr.clickId?.fbclid) clickLabels.push('fbclid');
  if (attr.clickId?.msclkid) clickLabels.push('msclkid');
  if (attr.clickId?.ttclid) clickLabels.push('ttclid');
  if (clickLabels.length) parts.push(`click=${clickLabels.join(',')}`);
  if (attr.referrer) parts.push(`ref=${attr.referrer}`);
  return parts.join(' | ') || 'direct';
}

function buildSourceDetails(attr) {
  return {
    channel: attr.channel || 'other',
    summary: attr.summary || 'direct',
    utmSource: attr.utmSource || '',
    utmMedium: attr.utmMedium || '',
    utmCampaign: attr.utmCampaign || '',
    utmContent: attr.utmContent || '',
    utmTerm: attr.utmTerm || '',
    placementId: attr.placementId || '',
    pageUrl: attr.pageUrl || '',
    landingPath: attr.landingPath || '',
    referrer: attr.referrer || '',
    clickId: {
      gclid: attr.clickId?.gclid || '',
      gbraid: attr.clickId?.gbraid || '',
      wbraid: attr.clickId?.wbraid || '',
      fbclid: attr.clickId?.fbclid || '',
      msclkid: attr.clickId?.msclkid || '',
      ttclid: attr.clickId?.ttclid || ''
    }
  };
}

module.exports = {
  normalizeAttribution,
  classifyAttributionChannel,
  buildAttributionSummary,
  buildSourceDetails
};
