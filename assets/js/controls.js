/* Chrome controls — theme toggle, sound toggle, the new-york clock. */

/* ---------- controls: theme, sound, clock ---------- */
(function(){
  const root  = document.documentElement;
  const tBtn  = document.getElementById('themeBtn');
  const sBtn  = document.getElementById('soundBtn');
  const clock = document.getElementById('clock');
  const snd   = window.__snd;

  /* --- sound: try immediately, fall back to the first real gesture --- */
  const sndHint = document.getElementById('sndHint');
  function paintSound(){
    if (sndHint) sndHint.classList.toggle('show',
      !snd.muted() && !snd.running() && performance.now() > 1400);
    sBtn.classList.toggle('muted', snd.muted());
    sBtn.classList.toggle('pending', !snd.muted() && !snd.running());
    sBtn.setAttribute('aria-label', snd.muted() ? 'Turn sound on' : 'Turn sound off');
  }
  /* Try to start the moment the page exists. On a return visit — or
     anywhere the browser already trusts this origin — this succeeds and
     the ambience is running before the first frame is painted. */
  if (!snd.muted()) snd.ensure();
  paintSound();

  /* Otherwise the browser is waiting for a gesture, and it will not accept
     a mouse move as one. So: listen for everything that does count, in the
     capture phase so nothing can swallow it first, and keep quietly
     retrying for the first stretch in case the page was opened in a
     background tab. The instant it is allowed, it starts. */
  const EVENTS = ['pointerdown','pointerup','mousedown','keydown',
                  'touchstart','touchend','wheel','scroll','click'];
  let poll = 0;
  const unlock = ()=>{
    if (!snd.muted()) snd.ensure();
    paintSound();
    if (snd.running()) stopTrying();
  };
  const stopTrying = ()=>{
    EVENTS.forEach(e=> removeEventListener(e, unlock, true));
    document.removeEventListener('visibilitychange', unlock);
    clearInterval(poll);
  };
  EVENTS.forEach(e=> addEventListener(e, unlock, true, {passive:true}));
  document.addEventListener('visibilitychange', unlock);
  poll = setInterval(()=>{ if (snd.muted()) return; unlock(); }, 700);
  setTimeout(paintSound, 1500);
  setTimeout(()=> clearInterval(poll), 30000);

  sBtn.addEventListener('click', e=>{
    e.stopPropagation();
    snd.setMuted(!snd.muted());
    paintSound();
    if (!snd.muted()) snd.select();
  });

  /* --- theme --- */
  window.__setTheme = function(next, quiet){
    root.setAttribute('data-theme', next);
    try{ sessionStorage.setItem('theme', next); }catch(e){}
    tBtn.setAttribute('aria-label',
      next === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    if (!quiet) snd.select();
  };
  window.__setTheme(root.getAttribute('data-theme'), true);

  /* --- the PSP part: a tick when you move onto something, a fuller
         note when you commit to it --- */
  const targets = 'a, button, [role="button"], .head';
  let lastMove = 0;
  document.addEventListener('pointerover', e=>{
    if (!e.target.closest || !e.target.closest(targets)) return;
    if (e.pointerType === 'touch') return;
    /* the project list plays its own note per row — see work.js */
    if (e.target.closest('.proj-list') || e.target.closest('.mw-rail')) return;
    const now = performance.now();
    if (now - lastMove < 55) return;       /* detents can come close together */
    lastMove = now;
    snd.move();
  });
  /* the sun cursor belongs to the hero scene, so it is simply absent on the
     pages that don't have one */
  const sun = document.getElementById('cursor');
  if (sun){
    addEventListener('pointerdown', ()=> sun.classList.add('press'));
    ['pointerup','pointercancel'].forEach(ev=> addEventListener(ev, ()=> sun.classList.remove('press')));
  }
  document.addEventListener('pointerdown', e=>{
    if (e.target.closest && e.target.closest(targets) && e.target.closest('#soundBtn') === null)
      snd.select();
  });

  /* --- the tone under the fixed chrome ---
     The nav and the clock float over whatever happens to be behind them, so
     they have to invert against it — and not against a percentage of one
     section, or mid-scroll you get white type on cream, or dark type on
     blue, for as long as the ratio takes to cross its threshold. So measure
     it: find the fold under the nav's own baseline, and the one under the
     bottom chrome, and read the tone each declares. #meanwhile rewrites its
     own data-chrome as the panels swap, and says so with an event.

     This lives here rather than in work.js because every page has chrome and
     only the homepage has a project list. */
  const navEl = document.querySelector('nav');
  /* [data-chrome] rather than section[data-chrome]: the sign-off is a
     <footer>, and it declares a tone like every other fold does */
  const folds = [...document.querySelectorAll('[data-chrome]')];
  let ticking = false;
  function toneAt(y){
    for (const s of folds){
      const r = s.getBoundingClientRect();
      if (r.top <= y && r.bottom > y) return s.dataset.chrome;
    }
    return null;
  }
  function paintChrome(){
    ticking = false;
    const navLine = navEl ? navEl.getBoundingClientRect().bottom - 6 : 40;
    document.body.classList.toggle('nav-cream', toneAt(navLine) === 'light');
    document.body.classList.toggle('on-cream', toneAt(innerHeight - 54) === 'light');
  }
  function queueChrome(){
    if (!ticking){ ticking = true; requestAnimationFrame(paintChrome); }
  }
  addEventListener('scroll', queueChrome, {passive:true});
  addEventListener('resize', queueChrome);
  document.addEventListener('mw:chrome', queueChrome);
  paintChrome();

  /* --- new york, always, wherever the visitor is --- */
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone:'America/New_York', hour:'numeric', minute:'2-digit', hour12:true
  });
  function paintClock(){
    clock.innerHTML = 'new york<i class="sep">/</i>' +
      fmt.format(new Date()).toLowerCase().replace(' ', ' ');
  }
  paintClock();
  setInterval(paintClock, 10000);
  setTimeout(()=> clock.classList.add('in'), 1400);

  /* --- the render / geometric toggle lives with the hero eye. It is on
     screen while the first fold is in view and slips away the moment you
     scroll past it, coming back when the hero returns. The fade and slide
     are carried by CSS; here we only flip the class as the fold crosses the
     viewport edge. --- */
  const panel = document.getElementById('panel');
  const hero  = document.getElementById('hero');
  if (panel && hero && 'IntersectionObserver' in window){
    /* The hero is exactly one screen tall, so "any part touching" keeps it
       counted as visible right up until the next fold has fully taken over —
       which is why the toggle used to linger into the work section. Tie it to
       how much of the hero is on screen instead: it hides once the hero is
       less than half visible, and comes back when it crosses back over half. */
    new IntersectionObserver(([e])=>{
      panel.classList.toggle('gone', e.intersectionRatio < 0.5);
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] }).observe(hero);
  }
})();
