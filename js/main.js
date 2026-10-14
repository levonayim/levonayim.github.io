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

});
