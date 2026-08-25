/* Hero scene — the seven eyes, the reveal, the cursor and the intro. */

(function(){
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage  = document.getElementById('stage');
  const copy   = document.getElementById('copy');
  const reveal = document.getElementById('reveal');
  const ring   = document.getElementById('ring');
  const cursorEl = document.getElementById('cursor');
  const hint   = document.getElementById('hint');
  const lines  = [...document.querySelectorAll('.line:not(#reveal)')];
  const head   = document.querySelector('.head');

  /* ---------- theme ---------- (works in every mode, reduced motion included) */
  const root = document.documentElement;
  let frozen = false;          /* true once the reveal has finished or been skipped */
  document.getElementById('themeBtn').addEventListener('click', ev=>{
    ev.stopPropagation();
    /* "see" carries a 1.15s transition delay for the reveal — don't make the
       theme swap wait on it */
    reveal.classList.add('instant'); void reveal.offsetWidth;
    requestAnimationFrame(()=> requestAnimationFrame(()=>{
      if (!frozen) reveal.classList.remove('instant');
    }));
    window.__setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  if (reduce){
    document.body.classList.add('scrollable');
    document.querySelectorAll('#panel [data-mode], #panel #replay').forEach(b=> b.style.display='none');
    return;
  }

  /* --------------------------------------------------------------
     EYE SPECS — the whole point: none of them agree with each other.
     bias  : angular disagreement, in radians
     gain  : how far the pupil is willing to travel
     stiff : how quickly it commits (lag)
     lead  : anticipation — fraction of cursor velocity it aims ahead
     -------------------------------------------------------------- */
  const SPECS = [
    { x:.50, y:.13, s:'clamp(74px,13vmin,132px)', bias:  .00, gain:1.00, stiff:.150, lead:.10, prime:true },
    { x:.145,y:.255,s:'clamp(50px,9vmin,94px)',   bias: -.30, gain: .74, stiff:.055, lead:.00 },
    { x:.855,y:.205,s:'clamp(36px,6.4vmin,64px)', bias:  .26, gain:1.18, stiff:.190, lead:.16 },
    { x:.075,y:.70, s:'clamp(32px,5.6vmin,56px)', bias:  .17, gain: .58, stiff:.085, lead:.00 },
    { x:.915,y:.685,s:'clamp(58px,10.5vmin,110px)',bias:-.13, gain: .92, stiff:.042, lead:.00 },
    { x:.255,y:.885,s:'clamp(27px,4.8vmin,46px)', bias: -.38, gain:1.30, stiff:.215, lead:.20 },
    { x:.715,y:.90, s:'clamp(44px,7.6vmin,78px)', bias:  .09, gain: .80, stiff:.100, lead:.06 }
  ];

  /* storage is unavailable in some privacy modes and on file:// in a few
     browsers — never let a read take the whole scene down with it */
  const store = {
    get(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } },
    set(k,v){ try{ sessionStorage.setItem(k,v); }catch(e){} }
  };

  /* render | geometric — prototype toggle, persisted across the reload */
  const MODE = store.get('eyeMode') || 'render';
  const GEO  = MODE === 'geo';
  if (GEO) document.body.classList.add('geo');
  document.querySelectorAll('#panel [data-mode]').forEach(b=>{
    if (b.dataset.mode === MODE) b.classList.add('sel');
    b.addEventListener('click', ev=>{
      ev.stopPropagation();
      store.set('eyeMode', b.dataset.mode);
      /* the visitor asked to see this mode: let the intro actually play */
      store.set('introWatch', '1');
      location.reload();
    });
  });

  /* ---------- hand-drawn geometry ----------
     Every eye is drawn by a different hand: its own seed, so its own wobble.
     Nothing here is a perfect circle. ------------------------------------- */
  const RNG = s => { let x = (s*2654435761)>>>0 || 7;
    return ()=>{ x = (x*1664525 + 1013904223)>>>0; return x/4294967296; }; };

  /* quadratic smoothing through jittered sample points */
  function smooth(pts, close){
    let d = 'M'+pts[0][0].toFixed(1)+' '+pts[0][1].toFixed(1);
    for (let i=1;i<pts.length-1;i++){
      const mx=(pts[i][0]+pts[i+1][0])/2, my=(pts[i][1]+pts[i+1][1])/2;
      d += ' Q'+pts[i][0].toFixed(1)+' '+pts[i][1].toFixed(1)+' '+mx.toFixed(1)+' '+my.toFixed(1);
    }
    const l = pts[pts.length-1];
    d += ' L'+l[0].toFixed(1)+' '+l[1].toFixed(1);
    return close ? d + ' Z' : d;
  }
  /* one lid stroke. `over` runs the marker slightly past the corner. */
  function lidArc(rand, up, jit, over){
    const x0=12, x1=108, cy=35, hh=24;
    const cxp=(x0+x1)/2, cyp = cy + (up ? -2*hh : 2*hh);
    const pts=[], N=10;
    for (let i=0;i<=N;i++){
      const t = -over + (i/N)*(1+2*over), mt = 1-t;
      pts.push([
        mt*mt*x0 + 2*mt*t*cxp + t*t*x1 + (rand()-.5)*jit,
        mt*mt*cy + 2*mt*t*cyp + t*t*cy + (rand()-.5)*jit
      ]);
    }
    return pts;
  }
  function roughRing(rand, cx, cy, r, jit){
    const pts=[], N=16;
    for (let i=0;i<=N;i++){
      const a=(i/N)*6.28318, rr=r+(rand()-.5)*jit;
      pts.push([cx+Math.cos(a)*rr, cy+Math.sin(a)*rr]);
    }
    return pts;
  }

  function geoSvg(i){
    const seed = i*7919 + 31;
    const rc = RNG(seed);
    /* the clip shape — the drawn lid, so the iris is cut off by it */
    const clipD = smooth(
      lidArc(rc, true, 1.0, 0).concat(lidArc(rc, false, 1.0, 0).reverse()), true);
    const r1 = RNG(seed+101), r2 = RNG(seed+257), r3 = RNG(seed+409);
    const up1 = smooth(lidArc(r1, true,  1.6, .035));
    const lo1 = smooth(lidArc(r1, false, 1.6, .035));
    const up2 = smooth(lidArc(r2, true,  2.4, .045));
    const lo2 = smooth(lidArc(r2, false, 2.4, .045));
    const irisD  = smooth(roughRing(r3, 60, 35, 18.5, 1.7), true);
    const pupilD = smooth(roughRing(r3, 60, 35, 7.6,  0.9), true);
    return '<div class="ball">'+
      '<svg viewBox="0 0 120 70" preserveAspectRatio="xMidYMid meet">'+
        '<defs>'+
          /* low-frequency wobble = the hand; high-frequency = ragged ink edge */
          '<filter id="ink'+i+'" x="-30%" y="-45%" width="160%" height="190%">'+
            '<feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="'+(seed%97)+'" result="w"/>'+
            '<feDisplacementMap in="SourceGraphic" in2="w" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="d"/>'+
            '<feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="'+((seed*3)%89)+'" result="g"/>'+
            '<feDisplacementMap in="d" in2="g" scale="0.9" xChannelSelector="R" yChannelSelector="G"/>'+
          '</filter>'+
          '<clipPath id="cp'+i+'"><path d="'+clipD+'"/></clipPath>'+
        '</defs>'+
        /* no filter on this group — it moves every frame, and the jitter is
           already baked into the paths, so the ink stays cheap */
        '<g clip-path="url(#cp'+i+')"><g class="g-look">'+
          '<path class="g-iris" d="'+irisD+'"/>'+
          '<path class="g-pupil" d="'+pupilD+'"/>'+
        '</g></g>'+
        '<g filter="url(#ink'+i+')">'+
          '<path class="g-stroke a" d="'+up1+'"/><path class="g-stroke a" d="'+lo1+'"/>'+
          '<path class="g-stroke b" d="'+up2+'"/><path class="g-stroke b" d="'+lo2+'"/>'+
        '</g>'+
      '</svg></div>';
  }

  const eyes = SPECS.map((spec,i)=>{
    const el = document.createElement('div');
    el.className = 'eye' + (spec.prime?' prime':'');
    el.style.setProperty('--s', spec.s);
    el.innerHTML = GEO
      ? geoSvg(i)
      : '<div class="ball">'+
          '<div class="iris"><div class="pupil"></div></div>'+
          '<div class="glint"></div>'+
          '<div class="lid top"></div><div class="lid bot"></div>'+
        '</div>';
    stage.appendChild(el);
    return {
      spec, el,
      ball: el.querySelector('.ball'),
      iris: el.querySelector(GEO ? '.g-look' : '.iris'),
      lidT: el.querySelector('.lid.top'),
      lidB: el.querySelector('.lid.bot'),
      px:0, py:0, vx:0, vy:0,            // pupil offset + velocity
      cx:0, cy:0, size:0,                 // laid-out centre + size
      tx:0, ty:0, scale:1,                // travel transform
      fx:0, fy:0, seed: Math.random()*6.283,   // idle float
      nextBlink: 900 + Math.random()*3200,
      blinkT: -1
    };
  });

  /* ---------- layout ---------- */
  function layout(){
    const W = innerWidth, H = innerHeight;
    eyes.forEach(e=>{
      e.size = e.el.offsetWidth;
      e.cx = e.spec.x * W;
      e.cy = e.spec.y * H;
    });
  }

  /* ---------- pointer ---------- */
  let mx = innerWidth/2, my = innerHeight*0.42;
  let lastMx = mx, lastMy = my, velX = 0, velY = 0;
  let moved = 0, lastMove = performance.now(), hasPointer = false;

  addEventListener('pointermove', e=>{
    const dx = e.clientX - mx, dy = e.clientY - my;
    moved += Math.hypot(dx,dy);
    mx = e.clientX; my = e.clientY;
    lastMove = performance.now();
    hasPointer = true;
    if (moved > 40) hint.classList.add('gone');
    cursorEl.style.transform = `translate(${mx}px,${my}px)`;
  }, {passive:true});

  /* touch devices: no hover, so the eyes read the copy instead of following you */
  const fine = matchMedia('(pointer:fine)').matches;
  if (!fine) hint.remove();

  /* ---------- idle behaviour: the eyes read the text ---------- */
  let scanT = 0;
  function idleTarget(now){
    scanT += 0.0055;
    const r = copy.getBoundingClientRect();
    const shown = lines.filter(l=> l.classList.contains('in'));
    const pool = shown.length ? shown : lines;
    const li = Math.floor(((Math.sin(scanT*0.42)+1)/2) * pool.length * 0.999);
    const lb = pool[Math.min(li, pool.length-1)].getBoundingClientRect();
    const t = (Math.sin(scanT*2.1) + 1)/2;      // sweep left→right, like reading
    return { x: lb.left + t*lb.width, y: lb.top + lb.height*0.55 };
  }

  /* ---------- main loop ---------- */
  let phase = 'load';   // load → converge → drop → done
  let cssOwned = false;
  let last = performance.now();

  function frame(now){
    const dt = Math.min(34, now - last); last = now;

    velX = (mx - lastMx); velY = (my - lastMy);
    lastMx = mx; lastMy = my;

    const idle = (now - lastMove) > 2500 || !hasPointer || !fine;
    const aim  = idle ? idleTarget(now) : { x: mx, y: my };
    const speed = Math.hypot(velX, velY);

    for (const e of eyes){
      /* --- pupil --- */
      if (phase === 'load' || phase === 'converge'){
        const lead = idle ? 0 : e.spec.lead * 6;
        const ax = aim.x + velX*lead, ay = aim.y + velY*lead;

        let dx = ax - (e.cx + e.tx), dy = ay - (e.cy + e.ty);
        let ang = Math.atan2(dy, dx) + e.spec.bias;
        const dist = Math.hypot(dx, dy);
        const maxTravel = e.size * 0.145 * e.spec.gain;
        const r = Math.min(1, dist/340) * maxTravel;

        const gx = Math.cos(ang)*r, gy = Math.sin(ang)*r;

        /* spring with overshoot — fast moves saccade past and correct */
        const stiff = e.spec.stiff * (1 + Math.min(1.6, speed/26));
        e.vx += (gx - e.px) * stiff;
        e.vy += (gy - e.py) * stiff;
        e.vx *= 0.74; e.vy *= 0.74;
        e.px += e.vx; e.py += e.vy;
      } else if (phase === 'drop'){
        /* looking down at where it's about to land */
        const t = e.size*0.145;
        e.px += (0 - e.px)*0.2;
        e.py += (t - e.py)*0.2;
      }
      if (GEO){
        /* svg user units: the 120-wide viewBox is fitted to the eye's width */
        const u = 120 / (e.size || 1);
        e.iris.style.transform =
          `translate(${(e.px*u*0.85).toFixed(2)}px, ${(e.py*u*0.85).toFixed(2)}px)`;
      } else {
        e.iris.style.transform =
          `translate(calc(-50% + ${e.px.toFixed(2)}px), calc(-50% + ${e.py.toFixed(2)}px))`;
      }

      /* --- blink --- (only while loading; the choreography drives lids after that) */
      if (phase === 'load'){
      e.nextBlink -= dt;
      if (e.blinkT >= 0){
        e.blinkT += dt;
        const d = 150;
        const k = e.blinkT < d/2 ? (e.blinkT/(d/2)) : 1-((e.blinkT-d/2)/(d/2));
        setLid(e, Math.max(0, Math.min(1, k)));
        if (e.blinkT > d){ e.blinkT = -1; setLid(e, 0); }
      } else if (e.nextBlink <= 0){
        e.blinkT = 0;
        e.nextBlink = 2200 + Math.random()*4200;
        /* bigger eye, lower and louder flutter */
        if (window.__snd) window.__snd.blink((e.size - 34) / 96);
      }
      }

      /* during load the rAF loop owns the eye transform.
         once choreography starts, CSS transitions own it instead. */
      if (!cssOwned){
        const amp = e.size * 0.055;
        e.fx = Math.sin(now/2600 + e.seed) * amp;
        e.fy = Math.cos(now/3300 + e.seed*1.7) * amp;
        place(e);
      }
    }
    requestAnimationFrame(frame);
  }

  /* k = 0 open, 1 shut. the render eye drops lids; the geometric eye
     collapses the almond to a line, which is the same gesture in flat form. */
  function setLid(e, k){
    if (GEO){
      e.ball.style.transform = `scaleY(${Math.max(0.012, 1 - k)})`;
    } else {
      e.lidT.style.transform = `scaleY(${k})`;
      e.lidB.style.transform = `scaleY(${k})`;
    }
  }
  function lidTransition(e, css){
    if (GEO) e.ball.style.transition = css;
    else { e.lidT.style.transition = css; e.lidB.style.transition = css; }
  }

  function place(e){
    e.el.style.transform =
      `translate(${(e.cx - e.size/2 + e.tx + e.fx).toFixed(2)}px, ${(e.cy - e.size/2 + e.ty + e.fy).toFixed(2)}px) scale(${e.scale})`;
  }

  /* ---------- choreography ---------- */
  const sleep = ms => new Promise(r=>setTimeout(r, ms));

  /* ---------- typing ----------
     The real text ships in the HTML, so it is there for search engines and
     for anyone without JS. We lift it out, leave a hidden copy for screen
     readers, and type the visible one back in. */
  const caret = document.createElement('i');
  caret.className = 'caret';
  caret.setAttribute('aria-hidden','true');

  function prepType(line){
    const tw = line.querySelector('.tw');
    if (!tw) return null;
    const full = tw.textContent;
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = full;
    line.insertBefore(sr, tw);
    tw.setAttribute('aria-hidden','true');
    tw.textContent = '';
    return { tw, full };
  }
  const typed = lines.map(prepType);

  async function typeLine(ix){
    const store = typed[ix];
    if (!store) return;
    const line = lines[ix];
    line.classList.add('typing','in');
    store.tw.parentNode.insertBefore(caret, store.tw.nextSibling);
    for (let i=0; i<store.full.length; i++){
      if (skipped) return;
      const ch = store.full[i];
      store.tw.textContent += ch;
      if (window.__snd) window.__snd.key(ch === ' ' ? 1.4 : 1);
      /* an uneven hand: a beat after a space, a longer one after a stop */
      let d = 40 + Math.random()*38;
      if (ch === ' ') d += 34;
      if (ch === '.' && i < store.full.length-1) d += 210;
      await sleep(d);
    }
  }
  function fillInstantly(){
    typed.forEach((st,ix)=>{
      if (!st) return;
      st.tw.textContent = st.full;
      lines[ix].classList.add('typing','in');
    });
    caret.remove();
  }


  async function intro(){
    layout();
    /* while the eyes are still disagreeing with each other, only the
       opening statement. "but" is held back for the moment they agree. */
    setTimeout(async ()=>{
      await typeLine(0);
      if (!skipped) head.classList.add('in');   /* he shows up once it's said */
    }, 850);

    /* the trigger: real time, real attention, hard ceiling */
    const t0 = performance.now();
    await new Promise(res=>{
      const check = ()=>{
        const elapsed = performance.now() - t0;
        const looked  = moved > 260;
        if ((elapsed > 3400 && looked) || elapsed > 4800) return res();
        requestAnimationFrame(check);
      };
      check();
    });
    if (skipped) return;
    await converge();
  }

  async function converge(){
    phase = 'converge';
    cssOwned = true;
    hint.classList.add('gone');
    /* the turn lands exactly as they stop disagreeing */
    setTimeout(()=> typeLine(1), 500);

    const prime = eyes[0];
    const target = { x: innerWidth/2, y: innerHeight*0.235 };
    const commonSize = prime.size;

    /* 1. every eye locks onto the same point and travels there.
          their disagreement (bias/gain/lag) dissolves as they go. */
    eyes.forEach((e,i)=>{
      e.el.style.transition =
        `transform .86s cubic-bezier(.5,.02,.2,1) ${i*42}ms`;
      e.tx = target.x - e.cx;
      e.ty = target.y - e.cy;
      e.scale = commonSize / e.size;
      e.spec.bias = 0; e.spec.gain = 1; e.spec.stiff = 0.16; e.spec.lead = 0;
      e.fx = 0; e.fy = 0;
      place(e);
    });
    await sleep(1200);
    if (skipped) return;

    /* 2. they all shut at once — the blink hides the merge */
    if (window.__snd) window.__snd.blink(1, true);   /* all seven, as one */
    eyes.forEach(e=>{
      e.blinkT = -1;
      lidTransition(e, 'transform .13s ease-in');
      setLid(e, 1);
    });
    await sleep(150);
    if (skipped) return;

    /* 3. the others are gone. one eye opens. */
    eyes.slice(1).forEach(e=> e.el.style.display='none');
    lidTransition(prime, 'transform .2s cubic-bezier(.3,.9,.3,1)');
    setLid(prime, 0);
    if (window.__snd) window.__snd.blink(0.85, false);   /* the one that opens */
    await sleep(430);
    if (skipped) return;

    await drop(prime);
  }

  async function drop(prime){
    phase = 'drop';
    prime.el.style.zIndex = 40;   /* only now does it come in front of the type */
    reveal.classList.add('armed');
    const r  = reveal.getBoundingClientRect();
    /* it lands at the START of the line — the wipe then travels out of the impact */
    const landX = r.left + Math.min(34, r.width*0.06);
    const landY = r.top + r.height*0.5;

    /* anticipation — it gathers itself before it falls */
    prime.el.style.transition = 'transform .2s cubic-bezier(.35,0,.6,1)';
    prime.ty -= 14;
    prime.scale *= 0.94;
    place(prime);
    await sleep(215);
    if (skipped) return;

    /* the fall */
    const fallMs = 280;
    prime.el.style.transition = `transform ${fallMs}ms cubic-bezier(.62,0,.88,.35)`;
    prime.tx = landX - prime.cx;
    prime.ty = landY - prime.cy;
    prime.scale *= 0.72;
    place(prime);
    await sleep(fallMs);
    if (skipped) return;

    /* impact */
    copy.classList.add('jolt');
    if (window.__snd) window.__snd.impact();
    ring.style.left = landX + 'px';
    ring.style.top  = landY + 'px';
    ring.classList.remove('go'); void ring.offsetWidth; ring.classList.add('go');

    /* the eye doesn't fade out — its pigment lands on the word */
    prime.el.style.transition = 'transform .38s cubic-bezier(.3,.9,.3,1), opacity .38s ease, filter .38s ease';
    prime.el.style.filter = 'blur(10px)';
    prime.el.style.opacity = '0';
    prime.scale *= 1.9;
    place(prime);

    await sleep(180);
    if (skipped) return;
    caret.remove();
    reveal.classList.add('lit');
    reveal.classList.add('wipe');
    await sleep(1750);          /* the wipe now takes its time */

    frozen = true;
    reveal.classList.add('instant');
    phase = 'done';
    document.body.classList.add('scrollable');
    if (fine){ cursorEl.classList.add('on'); document.body.style.cursor='none'; }
  }

  /* ---------- escape hatches ---------- */
  let skipped = false;
  function skipToEnd(){
    if (skipped || phase === 'done') return;
    skipped = true; phase = 'done'; frozen = true;
    document.body.classList.add('scrollable');
    eyes.forEach(e=>{ e.el.style.transition='opacity .25s ease'; e.el.style.opacity='0'; });
    setTimeout(()=> eyes.forEach(e=> e.el.style.display='none'), 260);
    fillInstantly();
    lines.forEach(l=> l.classList.add('in'));
    head.classList.add('in');
    reveal.classList.add('instant','armed','lit','wipe');
    hint.classList.add('gone');
    if (fine){ cursorEl.classList.add('on'); document.body.style.cursor='none'; }
  }
  /* A trackpad emits inertial wheel events for a while after any gesture,
     including the click that just reloaded the page — which used to skip
     the intro before a single eye had been drawn. So: a short grace period
     (longer when the visitor explicitly asked to watch a mode), and a real
     scroll has to accumulate before it counts as intent. */
  const OPENED = performance.now();
  const WATCH  = store.get('introWatch') === '1';
  store.set('introWatch', '0');
  const GRACE  = WATCH ? 2800 : 900;
  let wheelAcc = 0;
  function userSkip(){
    if (performance.now() - OPENED < GRACE) return;
    skipToEnd();
  }
  addEventListener('wheel', e=>{
    wheelAcc += Math.abs(e.deltaY || 0);
    if (wheelAcc > 55) userSkip();
  }, {passive:true});
  addEventListener('touchmove', userSkip, {passive:true});
  addEventListener('keydown', e=>{ if(e.key==='Escape'||e.key===' ') skipToEnd(); });
  /* the first click is what lets the browser start the ambience — don't
     spend it on skipping the intro. every click after that skips. */
  head.addEventListener('click', e=> e.stopPropagation());
  let firstClick = true;
  stage.addEventListener('click', ()=>{
    if (firstClick){ firstClick = false; return; }
    userSkip();
  });

  addEventListener('resize', ()=>{ if(phase==='load') layout(); });

  document.getElementById('replay').addEventListener('click', e=>{
    e.stopPropagation();
    store.set('introWatch', '1');
    location.reload();
  });

  layout();
  requestAnimationFrame(frame);
  intro();
})();
