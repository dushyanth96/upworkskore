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
    var seatsOpen = null;
    function renderSeats() {
      if (spots && seatsOpen !== null) spots.textContent = seatsOpen + ' of 10 seats open';
    }
    // Live seat count. Static "Only 10 seats" stays if the call fails.
    try {
      fetch('/api/seats').then(function (res) {
        if (!res.ok) throw new Error('bad status');
        return res.json();
      }).then(function (data) {
        if (data && data.ok === true && typeof data.open === 'number') {
          seatsOpen = data.open;
          renderSeats();
        }
      }).catch(function () { /* keep static fallback */ });
    } catch (e) { /* noop */ }
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

      // Spam trap filled: pretend success, send nothing.
      var honey = form.querySelector('input[name="_honey"]');
      if (honey && honey.value) {
        note.textContent = 'Seat held. Watch your inbox for the install link.';
        form.reset();
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Holding…';
      note.textContent = 'Holding your seat…';

      function postJSON(url, data) {
        return fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data)
        }).then(function (res) {
          if (!res.ok) throw new Error('bad status ' + res.status);
          return res.json().catch(function () { return {}; });
        });
      }

      // Store first: only a saved claim produces credentials to forward.
      // Both legs must land, otherwise the owner would never see the password.
      postJSON('/api/beta', { email: val, _honey: '' }).then(function (data) {
        if (!(data && data.ok === true && data.password)) throw new Error('store failed');
        return postJSON('https://formsubmit.co/ajax/upworkskore@proton.me', {
          email: val,
          _subject: '[SEAT] New beta seat claimed',
          _template: 'table',
          _captcha: 'false',
          _honey: '',
          Message: 'New beta seat claim: ' + val + '\nTemporary password (forward to user in the invite mail): ' + data.password
        });
      }).then(function () {
        note.textContent = 'Seat held for ' + val + '. Confirmation mail arrives within 48 hours with install link and login credentials.';
        submit.textContent = 'Seat held';
        submit.disabled = true;
        email.disabled = true;
        if (seatsOpen !== null && seatsOpen > 0) seatsOpen -= 1;
        renderSeats();
      }).catch(function () {
        note.textContent = 'Could not hold your seat. Check your connection and try again.';
        submit.disabled = false;
        submit.textContent = 'Claim a free seat';
      });
    });
    if (email) email.addEventListener('input', function () {
      email.classList.remove('invalid');
      email.removeAttribute('aria-invalid');
    });

    // Feedback form : stores to D1 via Pages Function, emails via FormSubmit.
    var fbForm = document.getElementById('feedbackForm');
    if (fbForm) fbForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var fbName = document.getElementById('fbName');
      var fbEmail = document.getElementById('fbEmail');
      var fbEmailError = document.getElementById('fbEmailError');
      var fbMessage = document.getElementById('fbMessage');
      var fbMessageError = document.getElementById('fbMessageError');
      var fbNote = document.getElementById('fbNote');
      var fbSubmit = document.getElementById('fbSubmit');
      var honey = fbForm.querySelector('input[name="_honey"]');

      var emailVal = (fbEmail.value || '').trim();
      var messageVal = (fbMessage.value || '').trim();
      var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
      var messageOk = messageVal.length >= 10 && messageVal.length <= 5000;
      fbEmailError.hidden = emailOk;
      fbMessageError.hidden = messageOk;
      fbEmail.classList.toggle('invalid', !emailOk);
      fbMessage.classList.toggle('invalid', !messageOk);
      if (!emailOk) { fbEmail.focus(); return; }
      if (!messageOk) { fbMessage.focus(); return; }

      // Spam trap filled: pretend success, send nothing.
      if (honey && honey.value) {
        fbNote.textContent = 'Received. Thank you for writing in.';
        fbForm.reset();
        return;
      }

      var picked = fbForm.querySelector('input[name="category"]:checked');
      var category = picked ? picked.value : 'wrong-score';
      var isTester = document.getElementById('fbTester').checked;
      var payload = {
        name: (fbName.value || '').trim(),
        email: emailVal,
        isTester: isTester,
        category: category,
        message: messageVal
      };

      fbSubmit.disabled = true;
      fbSubmit.textContent = 'Sending…';
      fbNote.textContent = 'Sending your feedback…';

      function postJSON(url, data) {
        return fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data)
        }).then(function (res) {
          if (!res.ok) throw new Error('bad status ' + res.status);
          return res.json().catch(function () { return {}; });
        });
      }

      var store = postJSON('/api/feedback', payload);
      var mail = postJSON('https://formsubmit.co/ajax/upworkskore@proton.me', {
        name: payload.name || '(no name)',
        email: payload.email,
        _subject: (isTester ? '[TESTER] ' : '') + '[UpworkSkore feedback] ' + category,
        _template: 'table',
        _captcha: 'false',
        _honey: '',
        Tester: isTester ? 'yes, one of the 10' : 'no',
        Category: category,
        Message: messageVal
      });

      Promise.allSettled([store, mail]).then(function (results) {
        var saved = results[0].status === 'fulfilled' && results[0].value && results[0].value.ok !== false;
        var mailed = results[1].status === 'fulfilled';
        if (saved || mailed) {
          fbNote.textContent = 'Received. Thank you for writing in.';
          fbForm.reset();
          fbSubmit.textContent = 'Sent';
        } else {
          fbNote.textContent = 'Could not send. Check your connection and try again.';
          fbSubmit.disabled = false;
          fbSubmit.textContent = 'Send feedback';
        }
      });
    });
  });
})();
