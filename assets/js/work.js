/* Work section — project list, plate swapping, marker eyes. */

/* ---------- second fold: the work list ---------- */
(function(){
  const items = [...document.querySelectorAll('.proj')];
  if (!items.length) return;
  const work   = document.getElementById('work');
  const plates = [...document.querySelectorAll('.proj-plate')];

  /* the selection sticks — once you've looked at something it stays looked at,
     so you can move the cursor away without the page snapping back */
  function show(item){
    if (item.classList.contains('on')) return;
    items.forEach(i=> i.classList.toggle('on', i === item));
    plates.forEach(p=> p.classList.toggle('on', p.dataset.key === item.dataset.key));
    work.style.setProperty('--pbg', item.dataset.bg);
  }
  show(items[0]);
  work.style.setProperty('--pbg', items[0].dataset.bg);

  items.forEach((item,i)=>{
    item.addEventListener('pointerenter', ev=>{
      show(item);
      if (ev.pointerType !== 'touch' && window.__snd) window.__snd.pick(i);
    });
    item.addEventListener('focus',        ()=> show(item));

    /* The list is a picker first and a set of links second. Clicking an item
       that isn't showing yet only selects it — that's the whole point of the
       plate. Clicking the one already on screen opens its case study, so the
       href does its normal job. With a mouse, pointerenter has already made
       the item you're clicking the current one, so a single click opens it;
       on touch there is no hover, so it reads as tap to look, tap to open. */
    item.addEventListener('click', e=>{
      if (item.classList.contains('on')) return;
      /* cmd-click, middle-click and friends mean "open this somewhere else",
         and swallowing them would quietly break a habit people rely on */
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      show(item);
    });
  });

  /* ---------- optivento: the tablet in the drawing ----------
     The reveal is CSS. The dashboard's resting place sits inside the link,
     so moving from the tablet onto the dashboard never crosses a gap the
     browser can lose you in, and the anchor handles the click on its own.
     The only thing left to add is the sound the rest of the page would
     have made for a commitment this size. */
  const tap = document.querySelector('.op-tap');
  if (tap) tap.addEventListener('pointerenter', ev=>{
    if (ev.pointerType !== 'touch' && window.__snd) window.__snd.select();
  });

  /* the marker eye keeps watching you, same as the ones in the hero */
  const irises = [...document.querySelectorAll('.marker .mi')];
  let mx = innerWidth/2, my = innerHeight/2, raf = 0;
  addEventListener('pointermove', e=>{ mx = e.clientX; my = e.clientY;
    if (!raf) raf = requestAnimationFrame(track); }, {passive:true});
  function track(){
    raf = 0;
    for (const ir of irises){
      const p = ir.parentElement.getBoundingClientRect();
      if (!p.width) continue;
      const dx = mx-(p.left+p.width/2), dy = my-(p.top+p.height/2);
      const ang = Math.atan2(dy,dx);
      const r = Math.min(1, Math.hypot(dx,dy)/320) * p.width * 0.15;
      ir.style.transform =
        `translate(calc(-50% + ${(Math.cos(ang)*r).toFixed(2)}px), calc(-50% + ${(Math.sin(ang)*r).toFixed(2)}px))`;
    }
  }

  /* The fixed chrome has to invert against whatever is actually behind it,
     not against a percentage of one section — otherwise mid-scroll you get
     white type on cream, or dark type on blue, for as long as the ratio
     takes to cross its threshold. So measure it: find the section under the
     nav's own baseline and under the bottom chrome, and read the tone each
     one declares. #meanwhile rewrites its own data-chrome as panels swap. */
  const nav = document.querySelector('nav');
  const sections = [...document.querySelectorAll('section[data-chrome]')];
  let ticking = false;
  function toneAt(y){
    for (const s of sections){
      const r = s.getBoundingClientRect();
      if (r.top <= y && r.bottom > y) return s.dataset.chrome;
    }
    return null;
  }
  function paintChrome(){
    ticking = false;
    const navLine = nav ? nav.getBoundingClientRect().bottom - 6 : 40;
    const light = toneAt(navLine) === 'light';
    document.body.classList.toggle('nav-cream', light);
    document.body.classList.toggle('on-cream', toneAt(innerHeight - 54) === 'light');
  }
  function queueChrome(){
    if (!ticking){ ticking = true; requestAnimationFrame(paintChrome); }
  }
  addEventListener('scroll', queueChrome, {passive:true});
  addEventListener('resize', queueChrome);
  document.addEventListener('mw:chrome', queueChrome);
  paintChrome();

  const link = [...document.querySelectorAll('nav .links a')]
    .find(a=> a.textContent.trim() === 'work');
  if (link){
    link.setAttribute('href','#work');
    link.addEventListener('click', e=>{
      e.preventDefault();
      document.body.classList.add('scrollable');
      work.scrollIntoView({behavior:'smooth', block:'start'});
    });
  }
})();
