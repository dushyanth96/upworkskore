/* UpworkSkore landing : theme, scroll reveals, badge demo, scrollspy, form. No libraries. */
(function () {
  'use strict';

  var root = document.documentElement;

  function currentTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('usk-theme', t); } catch (e) { /* noop */ }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('themeToggle');
    if (btn) btn.addEventListener('click', function () {
      applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });

    try {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function (e) {
        try {
          if (!localStorage.getItem('usk-theme')) applyTheme(e.matches ? 'dark' : 'light');
        } catch (err) { /* noop */ }
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    } catch (e) { /* noop */ }

    // One motion device: fade-up on entry. Skipped when reduced motion is set.
    try {
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var els = document.querySelectorAll('.reveal');
      if (reduce || !('IntersectionObserver' in window)) {
        els.forEach(function (el) { el.classList.add('in'); });
      } else {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
          });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
        els.forEach(function (el) { io.observe(el); });
      }
    } catch (e) { /* noop */ }

    // Hero demo: badges open and close like the extension does.
    document.querySelectorAll('.browser .usk-badge').forEach(function (badge) {
      badge.addEventListener('click', function () {
        var card = badge.closest('.feed-card');
        if (!card) return;
        var panel = card.querySelector('.coll');
        if (!panel) return;
        var open = panel.classList.toggle('open');
        panel.classList.toggle('shut', !open);
        badge.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });

    // Scrollspy: mark the nav link for the section in view.
    try {
      var links = document.querySelectorAll('.nav-links a[href^="#"]');
      var map = {};
      links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
      if ('IntersectionObserver' in window && links.length) {
        var spy = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            links.forEach(function (a) { a.classList.remove('active'); a.removeAttribute('aria-current'); });
            var a = map[en.target.id];
            if (a) { a.classList.add('active'); a.setAttribute('aria-current', 'true'); }
          });
        }, { rootMargin: '-38% 0px -55% 0px' });
        Object.keys(map).forEach(function (id) {
          var s = document.getElementById(id);
          if (s) spy.observe(s);
        });
      }
    } catch (e) { /* noop */ }

    // Beta form : front-end only. Point to the Supabase endpoint at launch.
    var form = document.getElementById('betaForm');
    var email = document.getElementById('betaEmail');
    var note = document.getElementById('betaNote');
    var spots = document.getElementById('spotsLeft');
    var submit = form ? form.querySelector('button[type="submit"]') : null;
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = (email.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        note.textContent = 'Enter a valid email and I will hold your seat.';
        email.classList.add('invalid');
        email.setAttribute('aria-invalid', 'true');
        email.focus();
        return;
      }
      email.classList.remove('invalid');
      email.removeAttribute('aria-invalid');
      try { localStorage.setItem('usk-beta-email', val); } catch (err) { /* noop */ }
      note.textContent = 'Seat held for ' + val + '. Watch your inbox for the install link.';
      if (submit) { submit.textContent = 'Seat held'; submit.disabled = true; }
      email.disabled = true;
      if (spots) spots.textContent = '6 of 10 seats open';
    });
    if (email) email.addEventListener('input', function () {
      email.classList.remove('invalid');
      email.removeAttribute('aria-invalid');
    });
  });
})();
