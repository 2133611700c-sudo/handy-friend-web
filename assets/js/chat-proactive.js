(function () {
  var SHOWN_KEY = 'hf_chat_proactive_shown';
  var QUOTE_KEY = 'hf_quote_submitted';

  function hasKey(key) {
    try { return sessionStorage.getItem(key) === '1'; } catch (_) { return false; }
  }

  function setKey(key) {
    try { sessionStorage.setItem(key, '1'); } catch (_) {}
  }

  function isExitIntentOpen() {
    var overlay = document.getElementById('hf-exit-overlay');
    return !!overlay;
  }

  function scrollToQuoteForm() {
    var target = document.getElementById('leadForm') || document.getElementById('leadSection') || document.getElementById('calcBox');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function removeBubble() {
    var bubble = document.getElementById('hf-chat-proactive-bubble');
    if (!bubble) return;
    bubble.style.opacity = '0';
    setTimeout(function () { bubble.remove(); }, 180);
  }

  function showBubble() {
    if (hasKey(SHOWN_KEY)) return;
    if (hasKey(QUOTE_KEY)) return;
    if (isExitIntentOpen()) return;
    if (!document.getElementById('hf-chat-btn')) return;

    setKey(SHOWN_KEY);

    var bubble = document.createElement('div');
    bubble.id = 'hf-chat-proactive-bubble';
    bubble.setAttribute('role', 'button');
    bubble.setAttribute('tabindex', '0');
    bubble.setAttribute('aria-label', 'Quick estimate prompt');
    bubble.style.cssText = 'position:fixed;right:20px;bottom:90px;max-width:300px;background:#fff;box-shadow:0 10px 28px rgba(0,0,0,0.18);border-radius:12px;padding:12px 36px 12px 12px;z-index:9500;color:#111;cursor:pointer;opacity:0;transition:opacity 220ms ease;';
    bubble.innerHTML = '' +
      '<button type="button" aria-label="Close message" id="hf-chat-proactive-close" style="position:absolute;top:8px;right:10px;border:none;background:transparent;font-size:18px;line-height:1;cursor:pointer;color:#666">&times;</button>' +
      '<div style="font-size:14px;line-height:1.35">Hi! Need help choosing a service? I can give you a quick estimate</div>';

    document.body.appendChild(bubble);
    requestAnimationFrame(function () { bubble.style.opacity = '1'; });

    bubble.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'hf-chat-proactive-close') return;
      scrollToQuoteForm();
      removeBubble();
    });

    bubble.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        scrollToQuoteForm();
        removeBubble();
      }
    });

    var closeBtn = document.getElementById('hf-chat-proactive-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeBubble();
      });
    }
  }

  window.setTimeout(showBubble, 20000);
})();
