/* Global rotating-sun cursor.
   The homepage grows this cursor out of the hero scene (hero.js). Every other
   page has no hero, so this small script stands the same cursor up on its own:
   it borrows the #cursor element and its spin/press styling from site.css, then
   follows the pointer 1:1 the way the homepage does after the reveal.
   Skipped on coarse pointers (touch), where there is nothing to follow. */
(function () {
  if (!matchMedia('(pointer:fine)').matches) return;
  if (document.getElementById('cursor')) return; // homepage already owns it

  var el = document.createElement('div');
  el.id = 'cursor';
  el.innerHTML = '<i></i>';

  function start() {
    document.body.appendChild(el);
    document.body.style.cursor = 'none';

    // reveal on the first real move so it never sits parked in a corner
    var shown = false;
    addEventListener('pointermove', function (e) {
      el.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
      if (!shown) { el.classList.add('on'); shown = true; }
    }, { passive: true });

    // the little "press" pull-in, same as the homepage
    addEventListener('pointerdown', function () { el.classList.add('press'); }, { passive: true });
    addEventListener('pointerup',   function () { el.classList.remove('press'); }, { passive: true });

    // hide when the pointer leaves the window, restore when it comes back
    document.addEventListener('pointerleave', function () { el.classList.remove('on'); });
    document.addEventListener('pointerenter', function () { el.classList.add('on'); });
  }

  if (document.body) start();
  else addEventListener('DOMContentLoaded', start);
})();
