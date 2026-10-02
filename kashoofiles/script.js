(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- theme toggle ---------- */
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
    // Shared "theme" key (same as the homepage) so the choice carries over when navigating between pages.
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  /* ---------- reading progress bar + header scroll state ---------- */
  var header = document.querySelector('.site-header');
  var ticking = false;
  function updateProgress() {
    var max = root.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    root.style.setProperty('--p', p.toFixed(4));
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(updateProgress); }
  }, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  /* ---------- image fallback: show a labelled placeholder if a file is missing ---------- */
  function showPlaceholder(img) {
    if (img.dataset.failed) return;
    img.dataset.failed = '1';
    var ph = document.createElement('div');
    ph.className = 'ph';
    ph.setAttribute('role', 'img');
    ph.setAttribute('aria-label', img.alt || 'Image placeholder');
    var w = img.getAttribute('width'), h = img.getAttribute('height');
    if (w && h) ph.style.aspectRatio = w + ' / ' + h;
    ph.innerHTML = '<span>Export this image from Figma and save it as</span><code></code>';
    ph.querySelector('code').textContent = img.getAttribute('src');
    img.replaceWith(ph);
  }
  document.querySelectorAll('img').forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) showPlaceholder(img);
    else img.addEventListener('error', function () { showPlaceholder(img); });
  });

  /* ---------- autoplay video (hero): respect reduced-motion ---------- */
  document.querySelectorAll('video.autoplay-video').forEach(function (video) {
    if (reduceMotion) {
      video.pause();
    } else {
      video.play();
    }
  });

  /* ---------- count-up for the impact numbers ---------- */
  function format(value, decimals) {
    return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  function countUp(el) {
    var target = parseFloat(el.dataset.count);
    var decimals = parseInt(el.dataset.decimals || '0', 10);
    var suffix = el.dataset.suffix || '';
    if (reduceMotion) return;
    var start = null, duration = 1100;
    function frame(t) {
      if (start === null) start = t;
      var k = Math.min(1, (t - start) / duration);
      var eased = 1 - Math.pow(1 - k, 3);
      el.textContent = format(target * eased, decimals) + suffix;
      if (k < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  var counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { countUp(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { io.observe(el); });
  }

  /* ---------- suggested sections: ?draft in the URL, or press D ---------- */
  function setDraft(on) { document.body.classList.toggle('show-draft', on); }
  if (/[?&]draft\b/.test(location.search)) setDraft(true);
  document.addEventListener('keydown', function (e) {
    if (e.key.toLowerCase() !== 'd' || e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    setDraft(!document.body.classList.contains('show-draft'));
  });

  /* ---------- page-load reveal ---------- */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { root.classList.add('is-ready'); });
  });
})();
