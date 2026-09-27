(function () {
  'use strict';

  var root = document.documentElement;

  /* ---------- theme toggle (shared "theme" key with the rest of the site) ---------- */
  var toggle = document.getElementById('themeToggle');

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    var dark = theme === 'dark';
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0a0c12' : '#ffffff');
  }

  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

  toggle.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  /* ---------- header background once the page scrolls ---------- */
  var header = document.querySelector('.site-header');
  var ticking = false;
  function updateHeader() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(updateHeader); }
  }, { passive: true });
  updateHeader();

  /* ---------- image fallback: show a labelled placeholder if a file is missing ---------- */
  function showPlaceholder(img) {
    if (img.dataset.failed) return;
    img.dataset.failed = '1';
    var ph = document.createElement('div');
    ph.className = 'ph';
    ph.setAttribute('role', 'img');
    ph.setAttribute('aria-label', img.alt || 'Image placeholder');
    ph.style.cssText = 'display:grid;place-items:center;width:100%;height:100%;padding:16px;text-align:center;background:var(--surface);color:var(--muted);font:400 13px/1.4 var(--font-ui);';
    ph.textContent = 'Image not found: ' + img.getAttribute('src');
    img.replaceWith(ph);
  }
  document.querySelectorAll('img').forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) showPlaceholder(img);
    else img.addEventListener('error', function () { showPlaceholder(img); });
  });

  /* ---------- page-load reveal ---------- */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { root.classList.add('is-ready'); });
  });
})();
