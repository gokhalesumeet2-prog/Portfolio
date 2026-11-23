/* Dark preview: the light / dark switch in the top nav.
   The mode is stored per browser and applied before first paint by the
   small inline script in each page's head; this file only builds the
   toggle and flips the mode. */
(function () {
  var root = document.documentElement;
  var get = function () { return root.getAttribute('data-mode') === 'dark' ? 'dark' : 'light'; };
  var save = function (m) { try { localStorage.setItem('rMode', m); } catch (e) {} };

  var links = document.querySelector('body > nav .links');
  if (!links) return;
  var b = document.createElement('button');
  b.type = 'button';
  b.className = 'r-mode';
  b.setAttribute('role', 'switch');
  b.innerHTML = '<span class="r-mode-glow" aria-hidden="true"></span><span class="r-mode-knob" aria-hidden="true"></span>';
  var label = function () {
    var dark = get() === 'dark';
    b.setAttribute('aria-checked', dark ? 'true' : 'false');
    b.setAttribute('aria-label', 'Dark mode');
    b.title = dark ? 'Switch to light' : 'Switch to dark';
  };
  label();
  links.insertBefore(b, links.firstChild);

  var t = 0;
  b.addEventListener('click', function () {
    var next = get() === 'dark' ? 'light' : 'dark';
    root.classList.add('r-mode-anim');
    root.setAttribute('data-mode', next);
    save(next); label();
    clearTimeout(t);
    t = setTimeout(function () { root.classList.remove('r-mode-anim'); }, 600);
  });
})();
