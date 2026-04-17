#!/usr/bin/env python3
"""
Idempotent tracking block injector.

Inserts the same GA4+AW+Meta-Pixel block used on index.html / tv-mounting
into every static landing page under the repo root that doesn't already
have GA4 (measurement id G-Z05XJ8E281). Skips files that already contain
it. Reports what changed.

Usage:
    python3 scripts/inject_tracking.py [--dry-run]

Safe to run repeatedly.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MEASUREMENT_ID = 'G-Z05XJ8E281'

# Pages to receive tracking. One file per directory. Order doesn't matter.
TARGETS = [
    'cabinet-painting/index.html',
    'interior-painting/index.html',
    'plumbing/index.html',
    'electrical/index.html',
    'door-installation/index.html',
    'vanity-installation/index.html',
    'backsplash/index.html',
    'flooring/index.html',
    'art-hanging/index.html',
    'furniture-painting/index.html',
    'reviews/index.html',
    'gallery/index.html',
]

TRACKING_BLOCK = """
  <!-- ===== TRACKING: GA4 + Google Ads + Meta Pixel + reCAPTCHA ===== -->
  <meta name="recaptcha-site-key" content="6Le1C3gsAAAAAGTzWCcplce_QCITlw1vcqQXjqEy">
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    window.HF_GOOGLE_ADS_ID = 'AW-17971094967';
    gtag('config', 'G-Z05XJ8E281');
    gtag('config', window.HF_GOOGLE_ADS_ID);
    var recaptchaMeta = document.querySelector('meta[name="recaptcha-site-key"]');
    window.HF_RECAPTCHA_SITE_KEY = recaptchaMeta ? recaptchaMeta.content.trim() : '';
    window._gtagReady = false;
  </script>
  <script>
  (function(){
    function loadScript(src,cb){var s=document.createElement('script');s.async=true;s.src=src;if(cb)s.onload=cb;document.head.appendChild(s);}
    function idle(fn){if('requestIdleCallback' in window)requestIdleCallback(fn,{timeout:3500});else setTimeout(fn,3500);}
    function loadGoogleTracking(){loadScript('https://www.googletagmanager.com/gtag/js?id=G-Z05XJ8E281',function(){window._gtagReady=true;gtag('config','G-Z05XJ8E281',{send_page_view:false});gtag('config',window.HF_GOOGLE_ADS_ID);});}
    if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',loadGoogleTracking);}else{loadGoogleTracking();}
    idle(function(){
      dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});
      loadScript('https://www.googletagmanager.com/gtm.js?id=GTM-NQTL3S6Q');
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init','741929941112529');
      fbq('track','PageView');
    });
    var rcLoaded=false;
    function loadRecaptcha(){if(rcLoaded||!window.HF_RECAPTCHA_SITE_KEY)return;rcLoaded=true;loadScript('https://www.google.com/recaptcha/api.js?render='+encodeURIComponent(window.HF_RECAPTCHA_SITE_KEY));}
    document.addEventListener('focusin',function(e){if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')loadRecaptcha();},{once:true});
    setTimeout(loadRecaptcha,8000);
  })();
  </script>
  <noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=741929941112529&ev=PageView&noscript=1"/></noscript>
  <!-- ===== END TRACKING ===== -->
"""

# Insert AFTER the first <meta name="robots" ...> tag, BEFORE the next
# <link rel="canonical"> (matches the pattern used on index.html and
# the already-patched service pages).
INSERTION_RE = re.compile(
    r'(<meta\s+name="robots"[^>]*>)(\s*\n)',
    re.IGNORECASE
)


def patch(path: Path, dry: bool) -> str:
    text = path.read_text(encoding='utf-8')

    if MEASUREMENT_ID in text:
        return 'skip-already-present'

    m = INSERTION_RE.search(text)
    if not m:
        return 'skip-no-robots-meta-anchor'

    new_text = text[:m.end()] + TRACKING_BLOCK + text[m.end():]
    if dry:
        return 'would-insert'

    path.write_text(new_text, encoding='utf-8')
    return 'inserted'


def main():
    dry = '--dry-run' in sys.argv
    results = []
    for rel in TARGETS:
        p = ROOT / rel
        if not p.exists():
            results.append((rel, 'missing'))
            continue
        res = patch(p, dry)
        results.append((rel, res))

    print(f'{"DRY-RUN" if dry else "APPLIED"}:\n')
    for rel, res in results:
        mark = '✅' if res in ('inserted', 'would-insert', 'skip-already-present') else '⚠️'
        print(f'  {mark} {rel:40s} {res}')

    bad = [r for _, r in results if r.startswith('skip-no-') or r == 'missing']
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
