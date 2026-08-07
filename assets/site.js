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
  if (mclose) mclose.onclick = navClose;
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
