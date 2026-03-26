(function () {
  var SESSION_SHOWN = 'hf_exit_shown';
  var SESSION_SUBMITTED = 'hf_exit_submitted';
  var SESSION_QUOTE_SUBMITTED = 'hf_quote_submitted';
  var START_TIME = Date.now();
  var isMobile = window.matchMedia('(max-width: 991px)').matches;
  var popupOpen = false;
  var mobileTimerId = null;
  var maxScrollRatio = 0;

  function hasKey(key) {
    try { return sessionStorage.getItem(key) === '1'; } catch (_) { return false; }
  }

  function setKey(key) {
    try { sessionStorage.setItem(key, '1'); } catch (_) {}
  }

  function canShow() {
    if (popupOpen) return false;
    if (Date.now() - START_TIME < 10000) return false;
    if (hasKey(SESSION_SHOWN)) return false;
    if (hasKey(SESSION_QUOTE_SUBMITTED)) return false;
    return true;
  }

  function closePopup() {
    var overlay = document.getElementById('hf-exit-overlay');
    if (overlay) overlay.remove();
    popupOpen = false;
  }

  function validPhone(raw) {
    var digits = String(raw || '').replace(/\D/g, '');
    return digits.length >= 7;
  }

  function createPopup() {
    if (!canShow()) return;
    setKey(SESSION_SHOWN);
    popupOpen = true;

    var overlay = document.createElement('div');
    overlay.id = 'hf-exit-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Quick quote popup');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;';

    overlay.innerHTML = '' +
      '<div style="background:#fff;max-width:420px;width:100%;border-radius:12px;padding:20px;box-sizing:border-box;position:relative">' +
        '<button type="button" aria-label="Close popup" id="hf-exit-close" style="position:absolute;top:10px;right:10px;border:none;background:transparent;font-size:22px;line-height:1;cursor:pointer">&times;</button>' +
        '<h3 style="margin:0 0 8px;font-size:22px;color:#111">Before You Go</h3>' +
        '<p style="margin:0 0 14px;color:#444">Get a fast quote via WhatsApp.</p>' +
        '<form id="hf-exit-form" aria-label="Exit intent quote form" style="display:flex;flex-direction:column;gap:12px">' +
          '<input aria-label="Phone number" id="hf-exit-phone" type="tel" placeholder="Phone Number" required style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:10px;font-size:16px;box-sizing:border-box">' +
          '<select aria-label="Select service" id="hf-exit-service" required style="width:100%;padding:12px;border:1px solid #d1d5db;border-radius:10px;font-size:16px;box-sizing:border-box;background:#fff">' +
            '<option value="">Select Service</option>' +
            '<option value="TV Mounting">TV Mounting</option>' +
            '<option value="Furniture Assembly">Furniture Assembly</option>' +
            '<option value="Painting">Painting</option>' +
            '<option value="Flooring">Flooring</option>' +
            '<option value="Plumbing">Plumbing</option>' +
            '<option value="Electrical">Electrical</option>' +
            '<option value="Other">Other</option>' +
          '</select>' +
          '<button aria-label="Submit quote request" type="submit" style="padding:12px 14px;border:none;border-radius:10px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer">Get Quote on WhatsApp</button>' +
        '</form>' +
        '<p style="margin:10px 0 0;color:#555;font-size:13px">Or call <a href="tel:+12133611700" aria-label="Call 213 361 1700" style="color:#2563eb;text-decoration:none">(213) 361-1700</a></p>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closePopup();
    });

    var closeBtn = document.getElementById('hf-exit-close');
    if (closeBtn) closeBtn.addEventListener('click', closePopup);

    var form = document.getElementById('hf-exit-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var phoneValue = document.getElementById('hf-exit-phone').value;
      var serviceValue = document.getElementById('hf-exit-service').value;
      if (!validPhone(phoneValue)) return;
      if (!serviceValue) return;

      setKey(SESSION_SUBMITTED);
      var message = 'Hi Handy & Friend, my phone is ' + phoneValue + '. I need help with ' + serviceValue + '.';
      var url = 'https://wa.me/12133611700?text=' + encodeURIComponent(message);

      document.dispatchEvent(new CustomEvent('hf:exit-intent-submitted', {
        detail: { phone: phoneValue, service: serviceValue }
      }));

      window.open(url, '_blank', 'noopener');
      closePopup();
    });
  }

  function onDesktopMouseMove(e) {
    if (isMobile) return;
    if (e.clientY < 10) createPopup();
  }

  function onMobileScrollBack() {
    if (!isMobile || !canShow()) return;
    var doc = document.documentElement;
    var maxScrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
    var currentRatio = window.scrollY / maxScrollable;
    if (currentRatio > maxScrollRatio) maxScrollRatio = currentRatio;
    if (maxScrollRatio - currentRatio >= 0.3) createPopup();
  }

  function markQuoteSubmitted() {
    setKey(SESSION_QUOTE_SUBMITTED);
  }

  document.addEventListener('mousemove', onDesktopMouseMove, { passive: true });
  document.addEventListener('scroll', onMobileScrollBack, { passive: true });
  var leadForm = document.getElementById('leadForm');
  if (leadForm) leadForm.addEventListener('submit', markQuoteSubmitted, true);

  if (isMobile) {
    mobileTimerId = window.setTimeout(function () {
      if (canShow()) createPopup();
    }, 45000);
  }

  window.addEventListener('beforeunload', function () {
    if (mobileTimerId) window.clearTimeout(mobileTimerId);
  });
})();
