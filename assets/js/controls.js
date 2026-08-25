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
  const sun = document.getElementById('cursor');
  addEventListener('pointerdown', ()=> sun.classList.add('press'));
  ['pointerup','pointercancel'].forEach(ev=> addEventListener(ev, ()=> sun.classList.remove('press')));
  document.addEventListener('pointerdown', e=>{
    if (e.target.closest && e.target.closest(targets) && e.target.closest('#soundBtn') === null)
      snd.select();
  });

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
})();
