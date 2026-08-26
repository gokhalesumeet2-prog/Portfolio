/* About page — the board opens at full size and can be moved around inside. */

(function(){
  const zoom  = document.querySelector('.ab-zoom');
  const box   = document.getElementById('board');
  if (!zoom || !box) return;
  const close = box.querySelector('.ab-close');
  const snd   = window.__snd;
  const calm  = matchMedia('(prefers-reduced-motion: reduce)');

  /* The full-size copy is not in the markup: it is a 2636px image, and the
     visitors who never ask to see it should not pay for it. It is built on
     the first open and kept after that. */
  let big = null;
  function build(){
    if (big) return big;
    const small = zoom.querySelector('img');
    big = new Image();
    /* derived from the thumbnail rather than written out, so the page can
       move to another folder without this file having to hear about it */
    big.src = small.src.replace(/\.webp$/, '@2x.webp');
    big.alt = small.alt;
    big.decoding = 'async';
    box.appendChild(big);
    return big;
  }

  /* Where the visitor was before the board took over the screen. */
  let held = null;

  function centre(){
    box.scrollLeft = Math.max(0, (box.scrollWidth  - box.clientWidth ) / 2);
    box.scrollTop  = Math.max(0, (box.scrollHeight - box.clientHeight) / 2);
  }

  function open(){
    if (!box.hidden) return;
    held = document.activeElement;
    const img = build();
    box.hidden = false;
    document.body.classList.add('boarded');
    /* the scroll box has no size until it has been laid out, so centring
       waits a frame — and again for the decode, since until the image has
       arrived scrollWidth is still just the width of the box */
    requestAnimationFrame(()=>{ box.classList.add('in'); centre(); });
    (img.decode ? img.decode().catch(()=>{}) : Promise.resolve()).then(centre);
    if (img.complete) centre(); else img.addEventListener('load', centre, {once:true});
    close.focus({preventScroll:true});
  }

  function shut(){
    if (box.hidden) return;
    box.classList.remove('in');
    document.body.classList.remove('boarded');
    const done = ()=>{ box.hidden = true; };
    calm.matches ? done() : setTimeout(done, 300);
    if (held && held.focus) held.focus({preventScroll:true});
    held = null;
  }

  zoom.addEventListener('click', open);

  close.addEventListener('click', e=>{ e.stopPropagation(); shut(); });

  /* --- click again to close, but not when the click was a drag ---
     The image is wider than the window, so a press on it might mean "close
     this" or it might mean "move it left". Distance tells them apart: a
     press that never travelled is a click. */
  let panning = false, sx = 0, sy = 0, ox = 0, oy = 0, travel = 0;
  box.addEventListener('pointerdown', e=>{
    if (e.button !== 0) return;
    panning = true; travel = 0;
    sx = e.clientX; sy = e.clientY;
    ox = box.scrollLeft; oy = box.scrollTop;
    box.classList.add('drag');
    /* only capture once the pointer has actually moved, so a plain click
       still lands on whatever is under it */
  });
  box.addEventListener('pointermove', e=>{
    if (!panning) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    travel = Math.max(travel, Math.hypot(dx, dy));
    if (travel < 4) return;
    if (box.setPointerCapture && e.pointerId != null){
      try{ box.setPointerCapture(e.pointerId); }catch(err){}
    }
    box.scrollLeft = ox - dx;
    box.scrollTop  = oy - dy;
  });
  const release = e=>{
    if (!panning) return;
    panning = false;
    box.classList.remove('drag');
    if (travel < 4 && !e.target.closest('.ab-close')) shut();
  };
  box.addEventListener('pointerup', release);
  box.addEventListener('pointercancel', ()=>{ panning = false; box.classList.remove('drag'); });

  /* --- keyboard ---
     Escape closes. Tab has nowhere else to go: the dialog holds one control,
     so the focus trap is a single line. */
  document.addEventListener('keydown', e=>{
    if (box.hidden) return;
    if (e.key === 'Escape'){ e.preventDefault(); shut(); if (snd) snd.select(); }
    if (e.key === 'Tab'){ e.preventDefault(); close.focus(); }
  });
})();
