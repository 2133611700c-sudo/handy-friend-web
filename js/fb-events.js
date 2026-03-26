(function () {
  function hasKey(key) {
    try { return sessionStorage.getItem(key) === '1'; } catch (_) { return false; }
  }

  function setKey(key) {
    try { sessionStorage.setItem(key, '1'); } catch (_) {}
  }

  function trackOnce(flagKey, fn) {
    if (hasKey(flagKey)) return;
    fn();
    setKey(flagKey);
  }

  function canFbq() {
    return typeof fbq !== 'undefined';
  }

  function observeServices() {
    var servicesTarget = document.querySelector('.seo-skeleton') || document.getElementById('servGrid');
    if (!servicesTarget || !('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        trackOnce('hf_fb_viewcontent', function () {
          if (canFbq()) fbq('track', 'ViewContent', { content_name: 'Services Section' });
        });
      });
    }, { threshold: 0.25 });

    observer.observe(servicesTarget);
  }

  function bindLeadForm() {
    var leadForm = document.getElementById('leadForm');
    if (!leadForm) return;

    leadForm.addEventListener('submit', function () {
      setKey('hf_quote_submitted');
      trackOnce('hf_fb_lead_quote', function () {
        if (canFbq()) fbq('track', 'Lead', { value: 150, currency: 'USD', source: 'quote_form' });
      });
    }, true);
  }

  function bindExitIntentLead() {
    if (hasKey('hf_exit_submitted')) {
      trackOnce('hf_fb_lead_exit', function () {
        if (canFbq()) fbq('track', 'Lead', { value: 150, currency: 'USD', source: 'exit_intent' });
      });
    }

    document.addEventListener('hf:exit-intent-submitted', function () {
      trackOnce('hf_fb_lead_exit', function () {
        if (canFbq()) fbq('track', 'Lead', { value: 150, currency: 'USD', source: 'exit_intent' });
      });
    });
  }

  function bindContactClicks() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href]');
      if (!link) return;
      var href = (link.getAttribute('href') || '').trim().toLowerCase();

      if (href.indexOf('tel:') === 0) {
        trackOnce('hf_fb_contact_phone', function () {
          if (canFbq()) fbq('track', 'Contact', { contact_type: 'phone' });
        });
        return;
      }

      if (href.indexOf('https://wa.me/') === 0 || href.indexOf('whatsapp') !== -1) {
        trackOnce('hf_fb_contact_whatsapp', function () {
          if (canFbq()) fbq('track', 'Contact', { contact_type: 'whatsapp' });
        });
      }
    }, true);
  }

  observeServices();
  bindLeadForm();
  bindExitIntentLead();
  bindContactClicks();
})();
