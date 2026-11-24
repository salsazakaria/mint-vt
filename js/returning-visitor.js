/* =====================================================================
   MINT landing — returning-visitor copy swap
   ---------------------------------------------------------------------
   Rules
   - First visit: store a timestamp in localStorage `mint_first_visit`.
   - The decision is made once per browser session and kept in
     sessionStorage `mint_visit_session` ("returning" | "default"), so a
     reload or moving between pages never changes it mid-session.
   - A visitor is RETURNING when, at the start of a NEW session:
       • `mint_first_visit` exists and is less than 7 days old, and
       • isLoggedIn() is false.
   - First visit ever, or a timestamp 7+ days old (or in the future):
     the timestamp is overwritten with "now" and the default copy shows.
   - Storage unavailable / throws → default copy.
   - Default copy stays in the HTML (SEO, no-JS). Returning copy lives in
     COPY below and is applied to elements marked data-rv="<key>".

   Timing (no flash of old copy)
   - This file is loaded synchronously in <head>, after the stylesheet.
     It decides immediately and adds `is-returning` to <html> before the
     first paint. CSS hides [data-rv] elements while
     `html.is-returning:not(.rv-ready)`; the swap runs on
     DOMContentLoaded and adds `rv-ready`. A 1.5 s failsafe adds
     `rv-ready` regardless, so nothing can stay hidden.
   - The "Welcome back" pill is plain HTML shown by CSS
     (html.is-returning .rv-eyebrow), so it needs no swap.

   Testing helpers (console logging happens only when one is present)
     ?returning=1   force the returning view (storage untouched)
     ?returning=0   force the default view  (storage untouched)
     ?reset-visit   clear both keys, then decide as a first visit
   ===================================================================== */
(function () {
  'use strict';

  var FIRST_VISIT_KEY = 'mint_first_visit';
  var SESSION_KEY = 'mint_visit_session';
  var WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  var root = document.documentElement;

  /**
   * TODO(auth): return true when the visitor is signed in.
   * Wire this to the real auth cookie / storage key once the site has auth,
   * e.g. `return /(?:^|;\s*)mint_session=/.test(document.cookie);`
   * Signed-in visitors always get the default copy.
   */
  function isLoggedIn() {
    return false;
  }

  var params;
  try { params = new URLSearchParams(window.location.search); } catch (e) { params = null; }
  var forced = params ? params.get('returning') : null; // "1" | "0" | null
  var reset = params ? params.has('reset-visit') : false;
  var debug = forced !== null || reset;

  function decide() {
    if (forced === '1') return { returning: true, reason: 'forced by ?returning=1' };
    if (forced === '0') return { returning: false, reason: 'forced by ?returning=0' };
    try {
      var ls = window.localStorage, ss = window.sessionStorage;
      if (reset) { ls.removeItem(FIRST_VISIT_KEY); ss.removeItem(SESSION_KEY); }

      // decision already made for this session (reloads, page-to-page)
      var cached = ss.getItem(SESSION_KEY);
      if (cached === 'returning' || cached === 'default') {
        return { returning: cached === 'returning', reason: 'same session (' + cached + ')' };
      }

      var now = Date.now();
      var first = parseInt(ls.getItem(FIRST_VISIT_KEY) || '', 10);
      var age = now - first;
      var result;
      if (!first || isNaN(first) || age < 0 || age >= WINDOW_MS) {
        ls.setItem(FIRST_VISIT_KEY, String(now));
        result = { returning: false, reason: !first || isNaN(first) ? 'first visit' : 'first visit older than 7 days, reset' };
      } else if (isLoggedIn()) {
        result = { returning: false, reason: 'logged in' };
      } else {
        result = { returning: true, reason: 'new session, first visit ' + Math.round(age / 3600000) + 'h ago' };
      }
      ss.setItem(SESSION_KEY, result.returning ? 'returning' : 'default');
      return result;
    } catch (e) {
      return { returning: false, reason: 'storage unavailable' };
    }
  }

  var decision = decide();
  if (debug && window.console) console.info('[mint] returning visitor:', decision.returning, '—', decision.reason);
  if (!decision.returning) return;

  root.classList.add('is-returning');

  // Returning copy. `html` entries are hard-coded markup (never user input);
  // everything else is set with textContent.
  var COPY = {
    'hero-headline': { html: 'Ready to ship your<br /><span class="text-mint-red">first model</span>?' },
    'hero-description': { text: 'Paste one setup prompt into your agent. Your first production-ready model is minutes away.' },
    'hero-cta': { text: 'Connect Your Agent' },
    'how-heading': { html: 'Three steps.<br />You’re on <span class="dim">step one.</span>' },
    // mobile: Your agent’s / 3D expert is / one prompt away.   desktop: Your agent’s 3D expert / is one prompt away.
    'cta-heading': { html: 'Your agent’s<br class="lg:hidden" /> 3D expert<br class="max-lg:hidden" /> is<br class="lg:hidden" /> one prompt away.' },
    'cta-subtext': { text: 'Paste the setup prompt, connect your account, ship your first model.' },
  };

  function reveal() { root.classList.add('rv-ready'); }
  var failsafe = setTimeout(reveal, 1500);

  function swap() {
    try {
      var els = document.querySelectorAll('[data-rv]');
      for (var i = 0; i < els.length; i++) {
        var c = COPY[els[i].getAttribute('data-rv')];
        if (!c) continue;
        if (c.html) els[i].innerHTML = c.html; else els[i].textContent = c.text;
      }
    } finally {
      clearTimeout(failsafe);
      reveal();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', swap);
  else swap();
})();
