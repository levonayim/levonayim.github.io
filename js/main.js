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
        dlg.dispatchEvent(new Event('cm:open'));   // lets an open-straight-in modal (no password) start loading its content
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

    // Larger view of a screen from the full details (shown here so it covers the whole window)
    var lightbox = null;
    function openLightbox(src, alt, type) {
      var u; try { u = new URL(src, location.href); } catch (e) { return; }
      if (u.origin !== location.origin) return;
      if (!lightbox) {
        lightbox = document.createElement('dialog');
        lightbox.className = 'lightbox';
        lightbox.setAttribute('aria-label', 'Larger view');
        lightbox.innerHTML = '<div class="lb-panel"><img class="lb-img" alt="" /><video class="lb-img lb-video" controls loop playsinline hidden></video></div>';
        lightbox.addEventListener('click', function (e) { if (e.target.tagName !== 'VIDEO') lightbox.close(); });   // click/tap anywhere outside a video's controls (or Esc) closes
        lightbox.addEventListener('close', function () { var v = lightbox.querySelector('video'); v.pause(); v.removeAttribute('src'); v.load(); });
        document.body.appendChild(lightbox);
      }
      var img = lightbox.querySelector('img.lb-img'), vid = lightbox.querySelector('video');
      img.hidden = type === 'video'; vid.hidden = type !== 'video';
      if (type === 'video') { vid.src = u.href; var pp = vid.play(); if (pp && pp.catch) pp.catch(function () {}); }
      else { img.src = u.href; img.alt = typeof alt === 'string' ? alt : ''; }
      lightbox.showModal();
    }

    // "Enter password to see full details": the dashed bar turns into a password field right in the modal.
    // The gated page is still an encrypted file (staticrypt), but it is fetched and decrypted here (same scheme and the same
    // 7-day "remember me" as the standalone prompt), then shown inside the modal in a shadow root: no iframe, no second page.
    // Closing the modal resets everything.
    var KEY_PASS = 'staticrypt_passphrase', KEY_EXP = 'staticrypt_expiration';
    var FORWARD = { persona_carousel: 1, annotations_toggle: 1, image_enlarged: 1, footer_link_click: 1 };   // events the details may ask us to send
    var te = new TextEncoder(), subtle = window.crypto && crypto.subtle;
    function toHex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join(''); }
    function fromHex(h) { var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; }
    function pbkdf2(pw, salt, iter, hash) {
      return subtle.importKey('raw', te.encode(pw), 'PBKDF2', false, ['deriveBits']).then(function (k) {
        return subtle.deriveBits({ name: 'PBKDF2', hash: hash, iterations: iter, salt: te.encode(salt) }, k, 256);
      }).then(toHex);
    }
    function hashPassword(pw, salt) {   // staticrypt's three rounds (600k iterations in total)
      return pbkdf2(pw, salt, 1000, 'SHA-1').then(function (h) { return pbkdf2(h, salt, 14000, 'SHA-256'); }).then(function (h) { return pbkdf2(h, salt, 585000, 'SHA-256'); });
    }
    function decode(signed, hashed) {   // resolves with the page's HTML, or null when the password is wrong
      var mac = signed.slice(0, 64), msg = signed.slice(64), raw = fromHex(hashed);
      return subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']).then(function (hk) {
        return subtle.sign('HMAC', hk, te.encode(msg));
      }).then(function (sig) {
        if (toHex(sig) !== mac) return null;
        return subtle.importKey('raw', raw, 'AES-CBC', false, ['decrypt']).then(function (k) {
          return subtle.decrypt({ name: 'AES-CBC', iv: fromHex(msg.slice(0, 32)) }, k, fromHex(msg.slice(32)));
        }).then(function (out) { return new TextDecoder().decode(out); });
      }).catch(function () { return null; });
    }
    function rememberedHash() {   // the hashed password saved by an earlier unlock, unless its 7 days are over
      try {
        var exp = localStorage.getItem(KEY_EXP), h = localStorage.getItem(KEY_PASS);
        if (exp && Date.now() > parseInt(exp, 10)) { localStorage.removeItem(KEY_PASS); localStorage.removeItem(KEY_EXP); return null; }
        return h || null;
      } catch (e) { return null; }
    }
    function remember(hashed) {
      try { localStorage.setItem(KEY_PASS, hashed); localStorage.setItem(KEY_EXP, String(Date.now() + 7 * 24 * 60 * 60 * 1000)); } catch (e) {}
    }
    function forget() { try { localStorage.removeItem(KEY_PASS); localStorage.removeItem(KEY_EXP); } catch (e) {} }

    document.querySelectorAll('a[data-details-frame]').forEach(function (cta) {
      var dlg = cta.closest('dialog');
      var panel = dlg.querySelector('.case-modal-panel');
      var pageUrl = new URL(cta.getAttribute('data-details-frame').split('?')[0], location.href);   // the encrypted page; its images, css and links resolve from here
      var payload = null;            // promise: { msg, salt }
      var gate = null, host = null, themeObs = null, unlocked = false;

      function loadPayload() {      // fetched once, ahead of the click when possible, so unlocking only has the maths left
        if (!payload) payload = fetch(pageUrl.href).then(function (r) { if (!r.ok) throw new Error('fetch'); return r.text(); }).then(function (t) {
          var m = /staticryptConfig\s*=\s*(\{[^}]*\})/.exec(t); if (!m) throw new Error('format');
          var c = JSON.parse(m[1]);
          return { msg: c.staticryptEncryptedMsgUniqueVariableName, salt: c.staticryptSaltUniqueVariableName };
        });
        payload.catch(function () { payload = null; });
        return payload;
      }
      ['pointerenter', 'touchstart', 'focus'].forEach(function (t) { cta.addEventListener(t, loadPayload, { once: true, passive: true }); });

      function updateCompact() {   // title + X shrink once the unlocked details are scrolled away from the top (hysteresis avoids flicker)
        if (!unlocked) { dlg.classList.remove('is-compact'); return; }
        var y = panel.scrollTop;
        if (y > 12) dlg.classList.add('is-compact'); else if (y < 4) dlg.classList.remove('is-compact');
      }

      var HOST = {
        embedded: true,
        track: function (event, src) {
          if (!FORWARD[event]) return;
          var p = {}; src = src || {};
          for (var k in src) { var v = src[k]; if (typeof v === 'string') p[k] = v.slice(0, 120); else if (typeof v === 'number' || typeof v === 'boolean') p[k] = v; }
          track(event, p);
        },
        lightbox: openLightbox,
        navigate: function (u) { location.href = u; }
      };

      function abs(doc) {   // relative paths in the page point at its own folder, not the homepage's
        doc.querySelectorAll('[src],[poster],[href]').forEach(function (el) {
          ['src', 'poster', 'href'].forEach(function (a) {
            var v = el.getAttribute(a);
            if (v && v.charAt(0) !== '#' && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(v)) el.setAttribute(a, new URL(v, pageUrl).href);
          });
        });
      }

      function show(html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        abs(doc);
        var codes = Array.prototype.map.call(doc.querySelectorAll('body script'), function (s) { return s.textContent; });
        doc.querySelectorAll('script, .back').forEach(function (n) { n.remove(); });
        return fetch(new URL('details.css', pageUrl).href).then(function (r) { return r.text(); }).then(function (css) {
          host = document.createElement('div');
          host.className = 'cm-details';
          var sr = host.attachShadow({ mode: 'open' });
          var st = document.createElement('style'); st.textContent = css;
          var wrap = document.createElement('div'); wrap.className = 'd-body embed';
          Array.prototype.slice.call(doc.body.childNodes).forEach(function (n) { wrap.appendChild(document.importNode(n, true)); });
          sr.append(st, wrap);
          function syncTheme() { if (document.documentElement.getAttribute('data-theme') === 'dark') host.setAttribute('data-theme', 'dark'); else host.removeAttribute('data-theme'); }
          syncTheme();
          themeObs = new MutationObserver(syncTheme); themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
          dlg.classList.add('is-full');   // the modal grows to full screen once we're in
          if (gate) gate.replaceWith(host); else cta.replaceWith(host);
          gate = null;
          codes.forEach(function (code) { try { new Function('R', 'HOST', code)(sr, HOST); } catch (e) { if (window.console) console.error(e); } });
          unlocked = true;
          panel.addEventListener('scroll', updateCompact, { passive: true });
          track(currentProject + '_details_unlocked');
          requestAnimationFrame(function () { requestAnimationFrame(function () { host.classList.add('is-in'); }); });
          if (!cta.hasAttribute('data-details-auto')) setTimeout(function () { if (host) host.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 350);
        });
      }

      function unlockWith(hashed) {   // true when the hash opens the page
        return loadPayload().then(function (p) { return decode(p.msg, hashed); }).then(function (html) {
          if (html === null) return false;
          return show(html).then(function () { return true; });
        });
      }

      function showForm(note) {
        gate = document.createElement('form');
        gate.className = 'cm-gate'; gate.noValidate = true;
        gate.innerHTML = '<label class="cm-gate-title" for="gatePw-' + dlg.id + '">Enter password to see full details</label>' +
          '<div class="cm-gate-row"><input id="gatePw-' + dlg.id + '" class="cm-gate-input" type="password" autocomplete="current-password" placeholder="Password" required />' +
          '<button class="cm-gate-btn" type="submit">Unlock</button></div>' +
          '<label class="cm-gate-remember"><input type="checkbox" checked /> Remember me for 7 days</label>' +
          '<p class="cm-gate-msg" role="alert" aria-live="polite"></p>';
        var input = gate.querySelector('input[type=password]'), btn = gate.querySelector('button'), msg = gate.querySelector('.cm-gate-msg'), rem = gate.querySelector('input[type=checkbox]');
        if (note) msg.textContent = note;
        gate.addEventListener('submit', function (e) {
          e.preventDefault();
          if (!input.value) { input.focus(); return; }
          input.disabled = btn.disabled = true; gate.classList.add('is-busy'); msg.textContent = 'Unlocking…';
          loadPayload().then(function (p) { return hashPassword(input.value, p.salt); }).then(function (hashed) {
            return unlockWith(hashed).then(function (ok) {
              if (ok) { if (rem.checked) remember(hashed); return; }
              input.disabled = btn.disabled = false; gate.classList.remove('is-busy');
              msg.textContent = 'That password didn’t work. Please try again.';
              gate.classList.remove('is-wrong'); void gate.offsetWidth; gate.classList.add('is-wrong');
              input.select();
            });
          }).catch(function () {
            input.disabled = btn.disabled = false; gate.classList.remove('is-busy');
            msg.textContent = 'Couldn’t load the details. Check your connection and try again.';
          });
        });
        cta.replaceWith(gate);
        setTimeout(function () { input.focus({ preventScroll: true }); gate.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60);
      }

      function reset() {
        unlocked = false;
        dlg.classList.remove('is-full', 'is-compact');
        panel.removeEventListener('scroll', updateCompact);
        if (themeObs) { themeObs.disconnect(); themeObs = null; }
        if (host) { host.replaceWith(cta); host = null; } else if (gate) { gate.replaceWith(cta); }
        gate = null;
      }
      dlg.addEventListener('close', reset);

      // No password (Kashoo): the modal opens straight into the full page, from the top. The page is plain HTML, fetched and shown the same way.
      if (cta.hasAttribute('data-details-auto')) {
        dlg.addEventListener('cm:open', function () {
          track(currentProject + '_details_click');
          fetch(pageUrl.href).then(function (r) { if (!r.ok) throw new Error('fetch'); return r.text(); }).then(function (html) {
            if (!dlg.open || unlocked) return;   // closed again before it arrived
            return show(html).then(function () { panel.scrollTop = 0; });
          }).catch(function () { cta.textContent = 'Couldn’t load the case study. Open it as a page instead.'; cta.classList.remove('cm-cta-auto'); });
        });
        return;
      }

      cta.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        track(currentProject + '_details_click');
        var saved = rememberedHash();
        if (!saved) { showForm(); return; }
        cta.classList.add('is-busy'); cta.textContent = 'Unlocking…';   // a still-valid remembered password opens it straight away
        unlockWith(saved).then(function (ok) {
          if (ok) return;
          forget(); cta.classList.remove('is-busy'); cta.textContent = 'Enter password to see full details'; showForm();
        }).catch(function () { cta.classList.remove('is-busy'); cta.textContent = 'Enter password to see full details'; showForm(); });
      });
    });
  })();

});
