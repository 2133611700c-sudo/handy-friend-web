/* consent-vitals.js
 * Purpose:
 * - Apply Consent Mode V2 defaults early
 * - Send Core Web Vitals (LCP/INP/CLS/FCP/TTFB) to GA4
 * Safe to include on pages that do NOT load assets/js/shared.js.
 */
(function(){
  'use strict';

  if (window.__HF_CONSENT_VITALS_INIT) return;
  window.__HF_CONSENT_VITALS_INIT = true;

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function(){ window.dataLayer.push(arguments); };
  }

  try {
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
      functionality_storage: 'granted',
      security_storage: 'granted',
      personalization_storage: 'denied',
      wait_for_update: 500
    });
  } catch (_) {}

  function idle(fn){
    if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 3500 });
    else setTimeout(fn, 3500);
  }

  function loadScript(src, cb){
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    if (cb) s.onload = cb;
    document.head.appendChild(s);
  }

  idle(function(){
    if (window.webVitals) {
      wireVitals();
      return;
    }
    loadScript('https://unpkg.com/web-vitals@3.5.2/dist/web-vitals.iife.js', wireVitals);
  });

  function wireVitals(){
    if (!window.webVitals || window.__HF_VITALS_WIRED) return;
    window.__HF_VITALS_WIRED = true;
    function send(metric){
      if (typeof window.gtag !== 'function') return;
      window.gtag('event', metric.name, {
        event_category: 'Web Vitals',
        event_label: metric.id,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        metric_value: metric.value,
        metric_rating: metric.rating,
        metric_delta: metric.delta,
        metric_navigation_type: metric.navigationType,
        non_interaction: true
      });
    }
    window.webVitals.onLCP(send);
    window.webVitals.onINP(send);
    window.webVitals.onCLS(send);
    window.webVitals.onFCP(send);
    window.webVitals.onTTFB(send);
  }
})();
