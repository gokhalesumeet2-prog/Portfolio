/* sumeetgokhale.com — 1.1 KB of behaviour. Nothing more is needed. */
(function () {
  'use strict';

  /* Sticky header hairline, only once scrolled. */
  var head = document.querySelector('.masthead');
  if (head) {
    var sync = function () { head.classList.toggle('is-stuck', window.scrollY > 8); };
    sync();
    addEventListener('scroll', sync, { passive: true });
  }

  /* Entrance motion: three deliberate moments per page, not every block.
     Skipped entirely for reduced-motion and for browsers without IO. */
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var targets = document.querySelectorAll('.rise');
  if (calm || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* Footer year, so this never goes stale again. */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
