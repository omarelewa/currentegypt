/* Current — shared site behavior (v2)
   One cached file for all pages: nav, reveals, counters, lightbox,
   filters, quote form, conversion tracking. No libraries. */
(function () {
  'use strict';

  /* Paste the real Formspree endpoint here when created, e.g.
     'https://formspree.io/f/abcdwxyz'. Empty = email-app fallback. */
  var QUOTE_ENDPOINT = '';

  var doc = document, root = doc.documentElement;
  root.classList.add('js');

  var REDUCED = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var FINE = window.matchMedia ? matchMedia('(hover: hover) and (pointer: fine)') : { matches: false };
  var AR = root.getAttribute('dir') === 'rtl';

  /* ---------- conversion event tracking (no-op until analytics lands) ---------- */
  function track(name, props) {
    try {
      if (window.plausible) window.plausible(name, { props: props || {} });
      else if (window.gtag) window.gtag('event', name, props || {});
    } catch (e) { /* never break the page for analytics */ }
  }
  doc.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a') : null;
    if (!a || !a.href) return;
    if (a.href.indexOf('wa.me') > -1) track('whatsapp_click', { page: location.pathname });
    else if (a.href.indexOf('tel:') === 0) track('call_click', { page: location.pathname });
    else if (/\.pdf($|\?)/.test(a.href)) track('profile_download', { page: location.pathname });
  });

  /* ---------- header ---------- */
  var hdr = doc.getElementById('hdr');
  addEventListener('scroll', function () {
    if (hdr) hdr.classList.toggle('scrolled', scrollY > 10);
  }, { passive: true });

  /* ---------- mobile nav (keyboard + screen-reader aware) ---------- */
  var mnav = doc.getElementById('mnav'),
      burger = doc.getElementById('burger'),
      mclose = doc.getElementById('mclose');
  function navOpen() {
    if (!mnav) return;
    mnav.classList.add('open');
    doc.body.classList.add('nav-open');
    doc.body.style.overflow = 'hidden';
    if (burger) burger.setAttribute('aria-expanded', 'true');
    if (mclose) mclose.focus();
  }
  function navClose() {
    if (!mnav || !mnav.classList.contains('open')) return;
    mnav.classList.remove('open');
    doc.body.classList.remove('nav-open');
    doc.body.style.overflow = '';
    if (burger) { burger.setAttribute('aria-expanded', 'false'); burger.focus(); }
  }
  if (burger && mnav) {
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-controls', 'mnav');
    mnav.setAttribute('role', 'dialog');
    mnav.setAttribute('aria-modal', 'true');
    burger.onclick = navOpen;
  }
  if (mclose) {
    /* its only content is a bare multiplication sign, which screen readers
       announce as a symbol or skip. Named the same way the lightbox close is. */
    mclose.setAttribute('aria-label', AR ? 'إغلاق القائمة' : 'Close menu');
    mclose.innerHTML = '<span aria-hidden="true">&#10005;</span>';
    mclose.onclick = navClose;
  }
  if (mnav) mnav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', navClose); });

  /* ---------- reveal on scroll (batch-scoped stagger) ---------- */
  var revealTargets = [].slice.call(doc.querySelectorAll('.reveal'));
  var choreo = [].slice.call(doc.querySelectorAll('.steps, .jtl'));
  function show(el) { el.classList.add('in'); }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries, obs) {
      var batch = entries.filter(function (e) { return e.isIntersecting; });
      batch.sort(function (a, b) {
        return (a.boundingClientRect.top - b.boundingClientRect.top) ||
               (a.boundingClientRect.left - b.boundingClientRect.left);
      });
      batch.forEach(function (e, i) {
        var el = e.target;
        if (!REDUCED.matches && el.classList.contains('reveal')) {
          var step = matchMedia('(max-width: 560px)').matches ? Math.min(i, 2) : Math.min(i, 6);
          el.style.setProperty('--d', (step * 70) + 'ms');
          el.addEventListener('transitionend', function te() {
            el.style.removeProperty('--d');
            el.removeEventListener('transitionend', te);
          });
        }
        show(el);
        obs.unobserve(el);
      });
    }, { threshold: 0, rootMargin: '0px 0px -6% 0px' });
    revealTargets.concat(choreo).forEach(function (el) { io.observe(el); });
  } else {
    revealTargets.concat(choreo).forEach(show);
  }
  /* safety nets: content must never stay hidden */
  function seen() {
    var vh = innerHeight || root.clientHeight || 800;
    revealTargets.concat(choreo).forEach(function (el) {
      if (el.getBoundingClientRect().top < vh) show(el);
    });
  }
  seen();
  addEventListener('load', seen);
  doc.addEventListener('focusin', function (e) {
    var r = e.target.closest ? e.target.closest('.reveal') : null;
    if (r) show(r);
  });

  /* ---------- animated stat counters ---------- */
  function initCounters() {
    var nums = [].slice.call(doc.querySelectorAll('.stat .num, .hstat b'));
    if (!nums.length) return;
    nums.forEach(function (el) {
      var node = el.firstChild;
      if (!node || node.nodeType !== 3) return;
      var m = /^\s*(\d+)/.exec(node.nodeValue);
      if (!m) return;
      var target = parseInt(m[1], 10);
      if (!isFinite(target) || target < 2) return;
      if (REDUCED.matches || !('IntersectionObserver' in window)) return; /* keep final value */
      var cio = new IntersectionObserver(function (es, o) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          o.unobserve(el);
          var w = el.getBoundingClientRect().width;
          if (w) el.style.minWidth = Math.ceil(w) + 'px'; /* no layout shift while counting */
          var t0 = null, DUR = 1300;
          function tick(ts) {
            if (!t0) t0 = ts;
            var p = Math.min((ts - t0) / DUR, 1);
            var eased = 1 - Math.pow(2, -10 * p);
            node.nodeValue = String(Math.round(target * eased));
            if (p < 1) requestAnimationFrame(tick);
            else { node.nodeValue = String(target); el.style.minWidth = ''; }
          }
          node.nodeValue = '0';
          requestAnimationFrame(tick);
        });
      }, { threshold: 0.5 });
      cio.observe(el);
    });
  }
  initCounters();

  /* ---------- magnetic primary CTAs (desktop pointers only) ---------- */
  if (FINE.matches && !REDUCED.matches) {
    [].slice.call(doc.querySelectorAll('.btn-primary, .btn-wa')).forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
        var dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        btn.style.transition = 'transform 80ms linear';
        btn.style.transform = 'translate(' + (dx * 4).toFixed(1) + 'px,' + (dy * 4).toFixed(1) + 'px)';
      });
      btn.addEventListener('pointerleave', function () {
        btn.style.transition = 'transform .4s cubic-bezier(.34,1.56,.64,1)';
        btn.style.transform = '';
      });
    });
  }

  /* ---------- lightbox (keyboard accessible) ---------- */
  var lb = doc.querySelector('.lightbox');
  if (lb) {
    /* the image is created here, not shipped as an empty <img> in markup */
    var lbi = lb.querySelector('img');
    if (!lbi) { lbi = doc.createElement('img'); lbi.alt = ''; lb.appendChild(lbi); }
    var lastTrigger = null;
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', AR ? 'عرض الصورة' : 'Image viewer');
    var lbx = lb.querySelector('.x');
    if (lbx) { lbx.setAttribute('role', 'button'); lbx.setAttribute('tabindex', '0'); lbx.setAttribute('aria-label', AR ? 'إغلاق' : 'Close'); }
    function lbOpen(g) {
      lastTrigger = g;
      lbi.src = g.dataset.full || g.src;
      lbi.alt = g.alt || '';
      lb.classList.add('open');
      if (lbx) lbx.focus();
    }
    function lbClose() {
      lb.classList.remove('open');
      if (lastTrigger) lastTrigger.focus();
    }
    doc.querySelectorAll('.gallery img').forEach(function (g) {
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.addEventListener('click', function () { lbOpen(g); });
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lbOpen(g); }
      });
    });
    lb.addEventListener('click', function (e) { if (e.target !== lbi) lbClose(); });
    if (lbx) lbx.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lbClose(); }
    });
  }

  /* one Escape handler for nav + lightbox */
  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    navClose();
    if (lb && lb.classList.contains('open')) {
      lb.classList.remove('open');
    }
  });

  /* ---------- projects filter (with View Transitions when available) ---------- */
  var fbtns = doc.querySelectorAll('.fbtn');
  if (fbtns.length) {
    fbtns.forEach(function (b) {
      b.onclick = function () {
        var apply = function () {
          fbtns.forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          var f = b.dataset.f;
          doc.querySelectorAll('#pgrid .proj').forEach(function (p) {
            p.classList.toggle('hide', f !== 'all' && p.dataset.cat !== f);
          });
        };
        if (doc.startViewTransition && !REDUCED.matches) doc.startViewTransition(apply);
        else apply();
      };
    });
  }

  /* ---------- sticky mobile bar: entrance + stay out of the form's way ---------- */
  var mbar = doc.querySelector('.mbar');
  if (mbar) {
    setTimeout(function () { mbar.classList.add('on'); }, REDUCED.matches ? 0 : 450);
    var quoteCard = doc.getElementById('quote');
    if (quoteCard && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { mbar.classList.toggle('tuck', e.isIntersecting); });
      }, { threshold: 0.15 }).observe(quoteCard);
    }
  }

  /* ---------- quote form ---------- */
  function buildMailto(fd) {
    var NL = String.fromCharCode(10);
    var rows = [];
    fd.forEach(function (v, k) {
      if (v && k.charAt(0) !== '_') rows.push(k.charAt(0).toUpperCase() + k.slice(1) + ': ' + v);
    });
    var body = encodeURIComponent('New project inquiry from currentegypt.com' + NL + NL + rows.join(NL));
    var subj = encodeURIComponent('Project inquiry from ' + (fd.get('company') || fd.get('name') || 'website'));
    return 'mailto:admin@currentegypt.com?subject=' + subj + '&body=' + body;
  }
  doc.querySelectorAll('form[data-quote]').forEach(function (f) {
    /* contextual prefill from ?service= / ?ref= */
    try {
      var qs = new URLSearchParams(location.search);
      var svc = qs.get('service'), ref = qs.get('ref');
      var sel = f.querySelector('select[name="service"]');
      if (svc && sel) {
        [].slice.call(sel.options).forEach(function (o) {
          if (o.value.toLowerCase().indexOf(svc.toLowerCase()) > -1 ||
              o.text.toLowerCase().indexOf(svc.toLowerCase()) > -1) sel.value = o.value || o.text;
        });
      }
      if (ref) {
        var msg = f.querySelector('textarea[name="message"]');
        if (msg && !msg.value) msg.value = (AR ? 'مشروع مشابه لـ: ' : 'Similar to: ') + ref;
      }
    } catch (err) { /* URLSearchParams unsupported: skip prefill */ }

    var pageField = f.querySelector('input[name="page"]');
    if (pageField) pageField.value = location.pathname;

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var hp = f.querySelector('input[name="_gotcha"]');
      if (hp && hp.value) return; /* bot */
      var btn = f.querySelector('button[type="submit"]');
      var err = f.querySelector('.form-err');
      var fd = new FormData(f);
      var okTitle = f.getAttribute('data-ok-title') || 'Inquiry received.';
      var okBody = f.getAttribute('data-ok-body') || 'Our estimating team replies within one business day.';
      var okWa = f.getAttribute('data-ok-wa') || 'WhatsApp us now';
      var waHref = 'https://wa.me/201069668444?text=' + encodeURIComponent(
        (AR ? 'مرحبًا Current، أرسلت للتو طلب عرض سعر عبر الموقع باسم ' : 'Hello Current, I just sent a quote request via your website for ') +
        (fd.get('company') || fd.get('name') || ''));
      /* h3, not h4: the card sits under an h3, and .form-ok is styled on h3 */
      function panel(title, body, extraHref, extraLabel, extraClass) {
        var card = f.closest('.cta-card') || f;
        card.innerHTML =
          '<div class="form-ok"><div class="tick">&#10003;</div><h3>' + title + '</h3><p>' + body + '</p>' +
          '<a class="btn ' + extraClass + '" target="_blank" rel="noopener" href="' + extraHref + '">' + extraLabel + '</a>' +
          '<p class="fine"><a href="' + waHref + '" target="_blank" rel="noopener">' + okWa + '</a></p></div>';
      }
      if (QUOTE_ENDPOINT) {
        if (btn) { btn.disabled = true; btn.setAttribute('data-label', btn.textContent); btn.innerHTML = '<span class="spin"></span>'; }
        fetch(QUOTE_ENDPOINT, { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } })
          .then(function (r) {
            if (!r.ok) throw new Error('send failed');
            track('quote_submit', { page: location.pathname });
            panel(okTitle, okBody, waHref, okWa, 'btn-wa');
          })
          .catch(function () {
            if (btn) { btn.disabled = false; btn.textContent = btn.getAttribute('data-label') || 'Send'; }
            if (err) err.classList.add('show');
          });
      } else {
        /* No endpoint yet, so this only OPENS the visitor's email app. Nothing
           has reached us until they press send, and saying "inquiry received"
           here would be untrue. The panel says what actually happened and keeps
           the mailto link so they can reopen it if the app never appeared. */
        var mail = buildMailto(fd);
        track('quote_mailto_opened', { page: location.pathname });
        location.href = mail;
        panel(
          f.getAttribute('data-mail-title') || 'Almost there. Send the email.',
          f.getAttribute('data-mail-body') || 'We opened your email app with your details filled in. Send that message and we will reply within one business day.',
          mail,
          f.getAttribute('data-mail-retry') || 'Open my email app again',
          'btn-primary'
        );
      }
    });
  });
})();

/* Current — motion graphics (v3)
   A decorative layer, kept in its own closure so nothing above it changes.
   It injects the blueprint survey overlay that every hero carries, rebuilds
   the homepage trust strip as a continuous client marquee, marks the sector
   icons so the stylesheet can draw them, and drives the read-progress
   hairline on browsers without scroll-driven animations.

   Everything here is ornament. No content is created, every node is
   aria-hidden, and a page with JavaScript off is simply the page without
   the ornament. */
(function () {
  'use strict';

  var doc = document;
  var REDUCED = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function node(markup) {
    var t = doc.createElement('template');
    t.innerHTML = markup.trim();
    return t.content.firstChild;
  }

  /* ---------- 1. survey overlay ----------
     A surveyor's plot that draws itself behind the headline: plot outline,
     interior division lines, then the two dimension lines, and finally the
     survey point pops in. Each path holds several subpaths, and because
     pathLength is normalised to 1 the dash sweeps through them in order, so
     one path is one drawing stage. */
  var SURVEY =
    '<div class="mg-survey" aria-hidden="true">' +
    '<svg viewBox="0 0 320 300" fill="none" focusable="false" preserveAspectRatio="xMidYMid meet">' +
      '<g stroke="currentColor" stroke-width="1.3" stroke-linecap="square">' +
        '<path data-draw="1" pathLength="1" d="M34 258V86h96V38h152v220z" opacity=".9"/>' +
        '<path data-draw="2" pathLength="1" d="M130 86v172M130 158h152M34 158h96" opacity=".42"/>' +
        '<path data-draw="3" pathLength="1" d="M34 282h248M34 274v16M282 274v16" opacity=".6"/>' +
        '<path data-draw="4" pathLength="1" d="M300 38v220M292 38h16M292 258h16" opacity=".6"/>' +
      '</g>' +
      '<g data-pop>' +
        '<circle cx="130" cy="158" r="4.5" fill="currentColor" opacity=".85"/>' +
        '<circle cx="130" cy="158" r="12" stroke="currentColor" stroke-width="1.3" opacity=".5"/>' +
      '</g>' +
    '</svg></div>';

  /* The same plot seen from above, drawn wide and short. This is what phones
     and tablets get, since the portrait version needs a column beside the
     headline that narrow screens do not have. The stylesheet swaps the two at
     1100px, and both carry the .mg-survey class so every rule below about
     drawing, reduced motion and print covers them without being repeated. */
  var BAND =
    '<div class="mg-survey mg-survey-band" aria-hidden="true">' +
    /* 360x76 is about 4.7:1, which is the shape of this strip on a phone, so
       the drawing fills the width instead of sitting small in the middle. */
    '<svg viewBox="0 0 360 76" fill="none" focusable="false" preserveAspectRatio="xMidYMax meet">' +
      '<g stroke="currentColor" stroke-width="1.3" stroke-linecap="square">' +
        '<path data-draw="1" pathLength="1" d="M24 50V22h104V10h208v40z" opacity=".9"/>' +
        '<path data-draw="2" pathLength="1" d="M128 22v28M128 36h208" opacity=".42"/>' +
        '<path data-draw="3" pathLength="1" d="M24 64h312M24 59v10M336 59v10" opacity=".6"/>' +
      '</g>' +
      '<g data-pop>' +
        '<circle cx="128" cy="36" r="3.5" fill="currentColor" opacity=".85"/>' +
        '<circle cx="128" cy="36" r="8" stroke="currentColor" stroke-width="1.3" opacity=".5"/>' +
      '</g>' +
    '</svg></div>';

  var hero = doc.querySelector('.hero') || doc.querySelector('.page-hero');
  if (hero && !hero.querySelector('.mg-survey')) {
    hero.appendChild(node(SURVEY));
    hero.appendChild(node(BAND));
  }

  /* ---------- 2. client marquee ----------
     Only where the full logo wall is also on the page, which is the homepage.
     The track is built from those same images and then filled a second time,
     so translating it by half its width loops seamlessly. The copies are
     decorative: each logo is already named, once, in the wall below. */
  (function marquee() {
    var strip = doc.querySelector('.trust .logo-row');
    if (!strip) return;
    var wall = doc.querySelectorAll('.logo-wall .cell img');
    if (wall.length < 10) return;

    var track = doc.createElement('div');
    track.className = 'mg-track';
    function fill() {
      [].forEach.call(wall, function (im) {
        var src = im.getAttribute('src');
        if (!src) return;
        var cell = doc.createElement('div');
        cell.className = 'cell';
        var copy = doc.createElement('img');
        copy.src = src;
        copy.alt = '';
        copy.loading = 'lazy';
        copy.decoding = 'async';
        cell.appendChild(copy);
        track.appendChild(cell);
      });
    }
    fill();
    fill();
    if (!track.childNodes.length) return;

    var box = doc.createElement('div');
    box.className = 'mg-marquee';
    box.setAttribute('aria-hidden', 'true');
    box.appendChild(track);
    strip.parentNode.replaceChild(box, strip);
  })();

  /* ---------- 3. sector icons draw themselves ----------
     Restricted to the decorative sector tiles. The small inline icons inside
     buttons, phone links and location lines are affordances, not ornament,
     and animating those would be noise. */
  [].forEach.call(doc.querySelectorAll('.sect .ic svg path, .sect .ic svg line, .sect .ic svg polyline'),
    function (p) {
      p.setAttribute('pathLength', '1');
      p.setAttribute('class', ((p.getAttribute('class') || '') + ' mg-ink').trim());
    });

  /* ---------- 4. read progress ----------
     Pure CSS where scroll-driven animations exist. This is the fallback for
     everywhere else, and it is skipped entirely when less motion is asked
     for, since the stylesheet hides the hairline in that case. */
  var native = window.CSS && CSS.supports && CSS.supports('animation-timeline', 'scroll()');
  if (!native && !REDUCED.matches) {
    var hdr = doc.getElementById('hdr');
    if (hdr) {
      var queued = false;
      var measure = function () {
        queued = false;
        var h = doc.documentElement.scrollHeight - innerHeight;
        hdr.style.setProperty('--mg-p', h > 0 ? Math.min(scrollY / h, 1).toFixed(4) : '0');
      };
      addEventListener('scroll', function () {
        if (!queued) { queued = true; requestAnimationFrame(measure); }
      }, { passive: true });
      addEventListener('resize', measure, { passive: true });
      measure();
    }
  }
})();

/* Current — motion graphics, phase 2 (v3)
   Where phase 1 drew ornament, this draws the facts the page already
   states: a project's span against the company's history, the portfolio
   across its sectors, the two percentages at their real proportion, and a
   drafting title block closing the footer.

   Nothing here holds a number. Counts, years, percentages and sector names
   are all read from the DOM, so a figure that changes in the HTML changes
   here and can never drift. Every injected node is aria-hidden, because
   each one restates something already on the page as text. */
(function () {
  'use strict';

  var doc = document;
  var AR = doc.documentElement.getAttribute('dir') === 'rtl';
  var FOUNDED = 1993;

  /* Reveal helper: these are injected after the phase 1 observer has already
     collected its targets, so each one carries its own. */
  function onSeen(el) {
    if (!('IntersectionObserver' in window)) { el.classList.add('in'); return; }
    new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        el.classList.add('in');
        obs.unobserve(el);
      });
    }, { threshold: 0, rootMargin: '0px 0px -5% 0px' }).observe(el);
  }

  /* ---------- 1. programme bar ----------
     The fact labels are translated (Timeline / المدة), so this matches on the
     shape of the VALUE instead. Arabic pages write years in Latin digits, so
     one pattern serves both. Anchoring to 19xx/20xx and to the whole value
     keeps it off quantities such as "250,000 m2" or "200 staff". */
  var YEAR_VALUE = /^\s*(19|20)\d{2}(\s*[–—-]\s*(19|20)\d{2})?\s*(\([^)]*\))?\s*$/;

  function programmeBar() {
    var facts = doc.querySelector('.facts');
    if (!facts) return;

    var found = null;
    [].slice.call(facts.querySelectorAll('b')).some(function (b) {
      var t = (b.textContent || '').trim();
      if (YEAR_VALUE.test(t)) { found = t; return true; }
      return false;
    });
    if (!found) return;

    var years = found.match(/(19|20)\d{2}/g).map(Number);
    var from = years[0];
    var to = years.length > 1 ? years[1] : years[0];
    var end = new Date().getFullYear();
    if (to < from || from < FOUNDED || to > end) return;

    var span = end - FOUNDED;
    if (span <= 0) return;

    var el = doc.createElement('div');
    el.className = 'mg-prog';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<div class="mg-prog-track"><i style="--l:' + ((from - FOUNDED) / span).toFixed(4) +
      ';--w:' + Math.max((to - from) / span, 0.02).toFixed(4) + '"></i></div>' +
      '<div class="mg-prog-axis"><span>' + FOUNDED + '</span><span>' + end + '</span></div>';
    facts.parentNode.insertBefore(el, facts.nextSibling);
    onSeen(el);
  }

  /* ---------- 2. portfolio diagram ----------
     Labels come from the filter chips, which are already translated on the
     Arabic page, so the diagram inherits correct Arabic and can never
     disagree with the chips directly above it. */
  function portfolio() {
    var grid = doc.getElementById('pgrid');
    if (!grid) return;
    var cards = [].slice.call(grid.querySelectorAll('.proj[data-cat]'));
    if (cards.length < 4) return;

    var rows = [];
    [].slice.call(doc.querySelectorAll('.fbtn[data-f]')).forEach(function (b) {
      var key = b.getAttribute('data-f');
      if (key === 'all') return;
      var n = cards.filter(function (c) { return c.getAttribute('data-cat') === key; }).length;
      if (n > 0) rows.push({ label: (b.textContent || '').trim(), n: n });
    });
    if (rows.length < 2) return;

    var max = rows.reduce(function (m, r) { return r.n > m ? r.n : m; }, 0);
    var el = doc.createElement('div');
    el.className = 'mg-folio';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = rows.map(function (r, idx) {
      return '<div class="mg-folio-row" style="--d:' + (idx * 90) + 'ms">' +
        '<span class="k"></span>' +
        '<span class="b"><i style="--w:' + (r.n / max).toFixed(4) + '"></i></span>' +
        '<span class="n">' + r.n + '</span></div>';
    }).join('');
    /* labels go in as text, never as markup, since they come from the page */
    [].slice.call(el.querySelectorAll('.k')).forEach(function (k, i) {
      k.textContent = rows[i].label;
    });
    grid.parentNode.insertBefore(el, grid);
    onSeen(el);
  }

  /* ---------- 3. honest stat meters ----------
     Only a stat that IS a proportion gets a meter. "30+" and "25+" are
     counts, and drawing them to a width would invent a denominator the site
     does not have, so they keep the plain rule they have today. */
  function statMeters() {
    [].slice.call(doc.querySelectorAll('.stats .stat')).forEach(function (st) {
      var num = st.querySelector('.num');
      var suffix = num && num.querySelector('i');
      if (!num || !suffix || (suffix.textContent || '').trim() !== '%') return;
      var m = /(\d+)/.exec(num.textContent || '');
      var bar = st.querySelector('.bar');
      if (!m || !bar) return;
      bar.classList.add('mg-meter');
      bar.style.setProperty('--v', (Math.min(parseInt(m[1], 10), 100) / 100).toFixed(4));
    });
  }

  /* ---------- 4. footer title block ----------
     The ruled box in the corner of a drawing sheet. Every value is a fact
     already stated elsewhere on the page, which is why the block is
     aria-hidden: a second announcement would be noise. No revision or sheet
     number, since either would imply a fact the site does not have. */
  function titleBlock() {
    var foot = doc.querySelector('footer .wrap');
    var grid = foot && foot.querySelector('.foot-grid');
    if (!foot || !grid) return;

    var fields = AR
      ? [['الجهة', 'Current for Construction Supply'],
         ['النطاق', 'مصر · السعودية · ليبيا'],
         ['يعمل منذ', '1993']]
      : [['DRAWN BY', 'Current for Construction Supply'],
         ['TERRITORY', 'Egypt · KSA · Libya'],
         ['IN PRACTICE SINCE', '1993']];

    var el = doc.createElement('div');
    el.className = 'mg-tblock';
    el.setAttribute('aria-hidden', 'true');
    fields.forEach(function (f) {
      var cell = doc.createElement('div');
      cell.className = 'cell';
      var k = doc.createElement('span');
      k.className = 'k';
      k.textContent = f[0];
      var v = doc.createElement('b');
      v.textContent = f[1];
      cell.appendChild(k);
      cell.appendChild(v);
      el.appendChild(cell);
    });
    foot.insertBefore(el, grid);
  }

  programmeBar();
  portfolio();
  statMeters();
  titleBlock();
})();
