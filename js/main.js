/* ------------------------------------------------------------------
   Levona Yim — portfolio
   1) Theme: apply saved theme immediately (runs in <head>, before paint)
   2) Header: morphs once the hero scrolls out of view
   3) Theme toggle: sun icon in the nav
------------------------------------------------------------------- */

// 1) Apply saved theme before first paint
try {
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
} catch (e) {}

document.addEventListener('DOMContentLoaded', function () {

  // 2) Header morph — once the hero is mostly out of view:
  // hero state = nav pill only; scrolled state = name + nav.
  (function () {
    var header = document.getElementById('siteHeader');
    var hero = document.getElementById('hero');
    if (!('IntersectionObserver' in window)) { header.classList.add('is-scrolled'); return; }
    new IntersectionObserver(function (entries) {
      header.classList.toggle('is-scrolled', !entries[0].isIntersecting);
    }, { threshold: 0.35 }).observe(hero);
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

    btn.addEventListener('click', function () {
      var dark = root.getAttribute('data-theme') !== 'dark';
      apply(dark);
      try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
    });
  })();

});
