/* ── shared.js — Shared JS for service landing pages ── */
/* GA4/GTM init, event tracking, form handler, UTM persistence */

(function(){
  'use strict';

  /* ── 1. dataLayer + gtag stub ── */
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  window.gtag = gtag;

  /* ── 2. Load third-party scripts (deferred) ── */
  function idle(fn){
    if ('requestIdleCallback' in window) requestIdleCallback(fn, {timeout: 3500});
    else setTimeout(fn, 3500);
  }
  function loadScript(src, cb){
    var s = document.createElement('script'); s.async = true; s.src = src;
    if (cb) s.onload = cb;
    document.head.appendChild(s);
  }

  idle(function(){
    /* GTM */
    dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
    loadScript('https://www.googletagmanager.com/gtm.js?id=GTM-NQTL3S6Q');

    /* GA4 + Google Ads */
    loadScript('https://www.googletagmanager.com/gtag/js?id=G-Z05XJ8E281', function(){
      gtag('js', new Date());
      gtag('config', 'G-Z05XJ8E281');
      if (window.HF_GOOGLE_ADS_ID) gtag('config', window.HF_GOOGLE_ADS_ID);
    });

    /* Meta Pixel */
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window,document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init','741929941112529');
    fbq('track','PageView');
  });

  /* ── 3. UTM & Click-ID persistence ── */
  try {
    var p = new URLSearchParams(window.location.search || '');
    ['utm_source','utm_medium','utm_campaign','utm_content','utm_term',
     'gclid','fbclid','gbraid','wbraid','msclkid','ttclid'].forEach(function(k){
      var v = p.get(k);
      if (v) sessionStorage.setItem('hf_' + k, v);
    });
  } catch(e) {}

  /* ── 4. Core event emitter ── */
  window.emitCoreEvent = function(eventName, params) {
    var payload = Object.assign({ page_location: window.location.href }, params || {});
    if (typeof gtag === 'function') gtag('event', eventName, payload);
    if (typeof dataLayer !== 'undefined') dataLayer.push(Object.assign({ event: eventName }, payload));
  };

  function getOrCreateSessionId() {
    try {
      var k = 'hf_session_id';
      var existing = localStorage.getItem(k);
      if (existing) return existing;
      var created = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(k, created);
      return created;
    } catch (e) {
      return 'sess_' + Date.now();
    }
  }

  function postCtaEvent(eventName, extra) {
    try {
      var payload = {
        session_id: getOrCreateSessionId(),
        event_name: eventName,
        page_path: window.location.pathname || '/',
        channel_source: 'real_website_chat',
        is_test: false,
        metadata: Object.assign({ ts: new Date().toISOString() }, extra || {})
      };
      if (typeof window.hfPostCtaEvent === 'function') {
        window.hfPostCtaEvent(eventName, extra || {});
        return;
      }
      if (navigator.sendBeacon) {
        var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon('/api/health?type=cta_event', blob);
        return;
      }
      fetch('/api/health?type=cta_event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify(payload)
      }).catch(function(){});
    } catch (e) {}
  }

  /* ── 5. Phone / email / WhatsApp click tracking ──
     DISABLED on root landing page (index.html ships its own richer listener
     at ~line 595 that also fires Google Ads phone_call conversion + beacon
     fallback). This shared listener kept only for service sub-pages which do
     NOT have inline tracking. Root page sets window.__HF_INLINE_CLICK_TRACKING
     = true in its own handler initialization block to disable this. */
  document.addEventListener('click', function(e) {
    if (window.__HF_INLINE_CLICK_TRACKING) return; // root page has its own listener
    var link = e.target.closest('a[href]');
    if (!link) return;
    var href = (link.getAttribute('href') || '').trim();
    var text = (link.textContent || '').trim().slice(0, 120);

    if (href.indexOf('tel:') === 0) {
      emitCoreEvent('phone_click', { link_url: href, link_text: text });
      postCtaEvent('phone_click', { link_url: href, link_text: text });
      if (typeof fbq !== 'undefined') fbq('trackCustom', 'phone_click', { link_url: href });
    } else if (href.indexOf('mailto:') === 0) {
      emitCoreEvent('email_click', { link_url: href, link_text: text });
      postCtaEvent('email_click', { link_url: href, link_text: text });
    } else if (href.indexOf('wa.me') > -1 || href.indexOf('whatsapp') > -1) {
      emitCoreEvent('whatsapp_click', { link_url: href, link_text: text });
      postCtaEvent('whatsapp_click', { link_url: href, link_text: text });
      if (typeof fbq !== 'undefined') fbq('trackCustom', 'whatsapp_click', { link_url: href });
    }
  });

  /* ── 6. Collect attribution data ── */
  window.collectAttribution = function(){
    var params = new URLSearchParams(window.location.search || '');
    function getParam(k){ return params.get(k) || (function(){ try{ return sessionStorage.getItem('hf_'+k)||''; }catch(e){ return ''; } })(); }
    return {
      utmSource: getParam('utm_source'),
      utmMedium: getParam('utm_medium'),
      utmCampaign: getParam('utm_campaign'),
      utmContent: getParam('utm_content'),
      utmTerm: getParam('utm_term'),
      gclid: getParam('gclid'),
      fbclid: getParam('fbclid'),
      gbraid: getParam('gbraid'),
      wbraid: getParam('wbraid'),
      pageUrl: window.location.href,
      referrer: document.referrer,
      ga4ClientId: (function(){ try{ return (document.cookie.match(/_ga=([^;]+)/)||[])[1]||''; }catch(e){ return ''; } })()
    };
  };

  /* ── 7. Form submission handler ── */
  window.handleLeadForm = function(formEl) {
    if (!formEl) return;
    formEl.addEventListener('submit', function(e) {
      e.preventDefault();
      var phoneVal = (formEl.querySelector('[name="phone"]') || {}).value || '';
      if (phoneVal.replace(/\D/g,'').length < 10) {
        var phoneField = formEl.querySelector('[name="phone"]');
        if (phoneField) { phoneField.focus(); phoneField.style.borderColor = '#e53e3e'; }
        return;
      }
      /* Honeypot anti-bot */
      var honey = formEl.querySelector('[name="website"]');
      if (honey && honey.value) return;

      var btn = formEl.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

      var data = {
        full_name: (formEl.querySelector('[name="full_name"]') || {}).value || '',
        phone: (formEl.querySelector('[name="phone"]') || {}).value || '',
        email: (formEl.querySelector('[name="email"]') || {}).value || '',
        service_type: (formEl.querySelector('[name="service_type"]') || {}).value || '',
        message: (formEl.querySelector('[name="message"]') || {}).value || '',
        zip: (formEl.querySelector('[name="zip"]') || {}).value || '',
        source: 'website_service_page',
        attribution: collectAttribution()
      };

      fetch('/api/submit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      .then(function(res) { return res.json(); })
      .then(function(json) {
        if (json.ok || json.success || json.id) {
          /* Enhanced Conversions: set user_data BEFORE firing conversion events */
          if (typeof gtag === 'function') {
            var ud = {};
            if (data.email) ud.email = data.email.trim().toLowerCase();
            if (data.phone) ud.phone_number = data.phone.replace(/[^+\d]/g, '');
            if (ud.email || ud.phone_number) gtag('set', 'user_data', ud);
          }
          /* GA4 events */
          emitCoreEvent('generate_lead', { value: 100, currency: 'USD', event_label: data.service_type || 'general' });
          emitCoreEvent('form_submit', { value: 100, currency: 'USD', event_label: data.service_type || 'general' });
          if (typeof fbq !== 'undefined') fbq('track', 'Lead', { content_name: data.service_type });

          /* Show success */
          formEl.innerHTML = '<div class="sp-form-success"><h3>✓ Request Sent!</h3><p>We\'ll get back to you within 30 minutes during business hours.</p><p style="margin-top:16px"><a href="tel:+12133611700" style="color:#ff6b35;font-weight:700;font-size:18px">📞 Call Now: (213) 361-1700</a></p></div>';
        } else {
          if (btn) { btn.disabled = false; btn.textContent = 'Get Free Estimate'; }
          alert('Something went wrong. Please call us at (213) 361-1700.');
        }
      })
      .catch(function() {
        if (btn) { btn.disabled = false; btn.textContent = 'Get Free Estimate'; }
        alert('Network error. Please call us at (213) 361-1700.');
      });
    });
  };

  /* ── 8. Auto-init forms on DOMContentLoaded ── */
  document.addEventListener('DOMContentLoaded', function(){
    var form = document.getElementById('sp-lead-form');
    if (form) handleLeadForm(form);

    /* Reset phone error styling on input */
    var phoneInput = document.getElementById('phone');
    if (phoneInput) {
      phoneInput.addEventListener('input', function(){
        this.style.borderColor = '';
      });
    }

    /* Pre-fill service from ?service= param */
    var serviceParam = new URLSearchParams(window.location.search).get('service');
    if (serviceParam) {
      /* Alias map: short param values → actual dropdown option values */
      var serviceAliases = {
        'tv_mounting': 'tv_mounting',
        'furniture_assembly': 'furniture_assembly',
        'flooring': 'flooring',
        'interior_painting': 'interior_painting',
        'drywall': 'drywall'
      };
      /* Service label map for message prefill */
      var serviceLabels = {
        'tv_mounting': 'TV Mounting',
        'furniture_assembly': 'Furniture Assembly',
        'flooring': 'Flooring Installation',
        'interior_painting': 'Interior Painting',
        'drywall': 'Drywall Repair'
      };
      var resolvedParam = serviceAliases[serviceParam] || serviceParam;
      var sel = document.querySelector('[name="service_type"]');
      if (sel) {
        for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].value === resolvedParam) { sel.selectedIndex = i; break; }
        }
      }
      /* Pre-fill message field */
      var label = serviceLabels[serviceParam] || serviceParam.replace(/_/g, ' ');
      var msgField = document.getElementById('message');
      if (msgField && !msgField.value) {
        msgField.value = 'Interested in ' + label;
      }
    }

    /* Lightbox */
    var lightbox = document.getElementById('sp-lightbox');
    var lightboxImg = document.getElementById('sp-lightbox-img');
    if (lightbox) {
      document.querySelectorAll('[data-lightbox]').forEach(function(el){
        el.addEventListener('click', function(){
          lightboxImg.src = el.getAttribute('data-lightbox') || el.src;
          lightbox.classList.add('active');
        });
      });
      lightbox.addEventListener('click', function(e){
        if (e.target === lightbox || e.target.classList.contains('sp-lightbox-close'))
          lightbox.classList.remove('active');
      });
      document.addEventListener('keydown', function(e){
        if (e.key === 'Escape') lightbox.classList.remove('active');
      });
    }

    /* Inject mobile sticky CTA bar if not already present */
    if (!document.querySelector('.sp-book-sticky') && window.location.pathname !== '/book') {
      var stickyBar = document.createElement('div');
      stickyBar.className = 'sp-book-sticky';
      stickyBar.innerHTML = '<a href="tel:+12133611700">\uD83D\uDCDE Call (213) 361-1700</a><a href="/book">Get Free Estimate</a>';
      document.body.appendChild(stickyBar);
    }
  });

  /* ── 9. Google Ads ID ── */
  window.HF_GOOGLE_ADS_ID = 'AW-17971094967';

  /* ── 10. Hamburger menu ── */
  var burger = document.getElementById('spBurger');
  var spNav  = document.getElementById('spNav');
  if (burger && spNav) {
    burger.addEventListener('click', function() {
      var isOpen = spNav.classList.toggle('open');
      burger.setAttribute('aria-expanded', isOpen);
      burger.innerHTML = isOpen ? '&#x2715;' : '&#9776;';
    });
    spNav.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', function() {
        spNav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        burger.innerHTML = '&#9776;';
      });
    });
    document.addEventListener('click', function(e) {
      if (!burger.contains(e.target) && !spNav.contains(e.target)) {
        spNav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        burger.innerHTML = '&#9776;';
      }
    });
  }
})();
