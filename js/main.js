/* ------------------------------------------------------------------
   Levona Yim — portfolio
   1) Theme: saved choice, else the system setting (runs in <head>, before paint)
   2) Header: frosted bar once scrolled
   3) Theme toggle: sun icon in the nav
------------------------------------------------------------------- */

// 1) Apply saved theme before first paint
// Saved choice wins; otherwise follow the visitor's system setting.
try {
  var saved = localStorage.getItem('theme');
  var dark = saved ? saved === 'dark'
    : !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) document.documentElement.setAttribute('data-theme', 'dark');
} catch (e) {}

document.addEventListener('DOMContentLoaded', function () {

  // 2) Header: gains its frosted bar once the page is scrolled (name | role lockup is always visible)
  (function () {
    var header = document.getElementById('siteHeader');
    function update() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
    window.addEventListener('scroll', update, { passive: true });
    update();
  })();

  // 3) Light / dark toggle (sun icon in the nav)
  (function () {
    var root = document.documentElement;
    var btn = document.getElementById('themeToggle');

    function apply(dark) {
      if (dark) root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    }

    apply(root.getAttribute('data-theme') === 'dark');

    // No saved choice: follow the system setting live as it changes.
    if (window.matchMedia) {
      var mq = matchMedia('(prefers-color-scheme: dark)');
      var follow = function (e) {
        var saved = null;
        try { saved = localStorage.getItem('theme'); } catch (err) {}
        if (!saved) apply(e.matches);
      };
      if (mq.addEventListener) mq.addEventListener('change', follow); else if (mq.addListener) mq.addListener(follow);
    }

    btn.addEventListener('click', function () {
      var dark = root.getAttribute('data-theme') !== 'dark';
      apply(dark);
      try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
    });
  })();

  // 4) Case study preview modal (native <dialog>: focus trap + Esc come built in)
  (function () {
    var opener = null;
    var currentProject = 'platform';   // which case study's modal is open (set from the dialog's data-project)

    // Analytics: named events go to Google Tag Manager's dataLayer (set up triggers/tags for them in GTM).
    function track(event, params) {
      try {
        var o = { event: event, project: currentProject };
        for (var k in (params || {})) o[k] = params[k];
        (window.dataLayer = window.dataLayer || []).push(o);
      } catch (e) {}
    }

    document.querySelectorAll('a[data-modal]').forEach(function (link) {
      var dlg = document.getElementById(link.getAttribute('data-modal'));
      if (!dlg || typeof dlg.showModal !== 'function') return; // no <dialog>: link just navigates
      link.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let "open in new tab" work
        e.preventDefault();
        opener = link;
        currentProject = dlg.getAttribute('data-project') || 'platform';
        track(currentProject + '_modal_open');
        dlg.showModal();
        dlg.querySelector('.case-modal-panel').scrollTop = 0;
      });
    });
    document.querySelectorAll('dialog.case-modal').forEach(function (dlg) {
      dlg.addEventListener('click', function (e) {
        // click on the dimmed backdrop (outside the panel) or the X closes it
        if (e.target === dlg) { dlg.dataset.closedBy = 'backdrop'; dlg.close(); }
        else if (e.target.closest('[data-close]')) { dlg.dataset.closedBy = 'x_button'; dlg.close(); }
      });
      dlg.addEventListener('cancel', function () { dlg.dataset.closedBy = 'esc_key'; });
      dlg.addEventListener('close', function () {
        // registered before the reset below, so is-full still tells us whether they opened the full details
        track(currentProject + '_modal_close', { method: dlg.dataset.closedBy || 'other', details_opened: dlg.classList.contains('is-full') });
        delete dlg.dataset.closedBy;
        if (opener) opener.focus();
      });
    });

    // Homepage closing links (LinkedIn / email)
    document.querySelectorAll('.cta-section a').forEach(function (a) {
      a.addEventListener('click', function () {
        track('footer_link_click', { project: 'home', page: 'home', link: /^mailto:/.test(a.getAttribute('href')) ? 'email' : 'linkedin', url: a.getAttribute('href') });
      });
    });

    // Larger view of a screen from the full details (opened from inside the iframe, shown here so it covers the whole window)
    var lightbox = null;
    function openLightbox(src, alt) {
      var u; try { u = new URL(src, location.href); } catch (e) { return; }
      if (u.origin !== location.origin) return;
      if (!lightbox) {
        lightbox = document.createElement('dialog');
        lightbox.className = 'lightbox';
        lightbox.setAttribute('aria-label', 'Larger view');
        lightbox.innerHTML = '<div class="lb-panel"><img class="lb-img" alt="" /></div>';
        lightbox.addEventListener('click', function () { lightbox.close(); });   // click/tap anywhere (or Esc) closes
        document.body.appendChild(lightbox);
      }
      var img = lightbox.querySelector('.lb-img');
      img.src = u.href; img.alt = typeof alt === 'string' ? alt : '';
      lightbox.showModal();
    }

    // "Enter password to see full details": the modal expands to full screen and the bar is swapped
    // for the gated page in an iframe. That page is its own (encrypted) document, so the password
    // prompt and the content both live inside it. Closing the modal resets everything.
    document.querySelectorAll('a[data-details-frame]').forEach(function (cta) {
      var dlg = cta.closest('dialog');
      var panel = dlg.querySelector('.case-modal-panel');
      var frame = null, raf = 0, unlockedSent = false;
      var FORWARD = { persona_carousel: 1, annotations_toggle: 1, image_enlarged: 1, footer_link_click: 1 };   // events the details page may ask us to send
      function sendView() {   // tell the page which part of it is on screen (it can't see the modal's scrolling itself)
        raf = 0;
        if (!frame || !frame.contentWindow) return;
        var r = frame.getBoundingClientRect(), pr = panel.getBoundingClientRect();
        try { frame.contentWindow.postMessage({ type: 'platform-details-view', top: pr.top - r.top, bottom: pr.bottom - r.top }, location.origin); } catch (e) {}
      }
      function queueView() { if (!raf) raf = setTimeout(sendView, 40); }   // small throttle while scrolling
      // Title + X shrink once the unlocked details are scrolled away from the top (never on the modal or the password prompt)
      function updateCompact() {
        if (!frame || !unlockedSent) { dlg.classList.remove('is-compact'); return; }
        var past = panel.scrollTop;   // big only at the very top; hysteresis avoids flicker
        if (past > 12) dlg.classList.add('is-compact'); else if (past < 4) dlg.classList.remove('is-compact');
      }
      function onPanelScroll() { queueView(); updateCompact(); }
      function bleedPx() { return Math.round(parseFloat(getComputedStyle(panel).paddingLeft) || 0); }
      function sendBleed() {
        if (!frame || !frame.contentWindow) return;
        try { frame.contentWindow.postMessage({ type: 'platform-details-bleed', px: bleedPx() }, location.origin); } catch (e) {}
      }
      function onMessage(ev) {
        if (!frame || ev.origin !== location.origin || ev.source !== frame.contentWindow) return;
        var d = ev.data; if (!d) return;
        if (d.type === 'platform-details-ready') {
          // the details page only runs once it has been decrypted, so its first message means the password worked
          if (!unlockedSent) { unlockedSent = true; track(currentProject + '_details_unlocked'); }
          sendBleed(); sendView(); updateCompact(); return;
        }
        if (d.type === 'platform-details-track' && FORWARD[d.event]) {
          var p = {}, src = d.params || {};
          for (var k in src) { var v = src[k]; if (typeof v === 'string') p[k] = v.slice(0, 120); else if (typeof v === 'number' || typeof v === 'boolean') p[k] = v; }
          track(d.event, p); return;
        }
        if (d.type === 'platform-details-lightbox') { openLightbox(d.src, d.alt); return; }
        if (d.type === 'platform-details-height' && d.height > 0) { frame.style.height = Math.ceil(d.height) + 'px'; queueView(); }
      }
      function reset() {
        unlockedSent = false;
        dlg.classList.remove('is-full', 'is-compact');
        window.removeEventListener('message', onMessage);
        panel.removeEventListener('scroll', onPanelScroll); window.removeEventListener('resize', queueView); window.removeEventListener('resize', sendBleed);
        if (frame) { frame.replaceWith(cta); frame = null; }
      }
      dlg.addEventListener('close', reset);
      cta.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        track(currentProject + '_details_click');
        frame = document.createElement('iframe');
        frame.className = 'cm-frame';
        frame.title = 'Full case study details';
        dlg.classList.add('is-full');   // set first, so the padding we read below is the final (full-screen) one
        frame.src = cta.getAttribute('data-details-frame') + '&bleed=' + bleedPx();
        frame.setAttribute('scrolling', 'no');
        window.addEventListener('message', onMessage);
        panel.addEventListener('scroll', onPanelScroll, { passive: true }); window.addEventListener('resize', queueView); window.addEventListener('resize', sendBleed);
        cta.replaceWith(frame);
        // once the modal has grown, bring the prompt / content into view
        setTimeout(function () { if (frame) frame.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 450);
      });
    });
  })();

});
