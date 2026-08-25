/* Meanwhile — the four interests rail: hand-drawn sharpie rings, the
   panel swap, the girl's entrance and the typed line. */

(function(){
  const section = document.getElementById('meanwhile');
  if (!section) return;
  const tabs   = [...section.querySelectorAll('.mw-tab')];
  const panels = [...section.querySelectorAll('.mw-panel')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- the sharpie ring ----------
     A circle nobody drew twice the same way: each ring gets its own seed,
     so its own wobble, its own overshoot, and a second lighter pass that
     doesn't quite retrace the first. */
  const rnd = s => { let x = (s*1103515245 + 12345) >>> 0;
                     return () => ((x = (x*1103515245 + 12345) >>> 0) / 4294967296); };

  function ringPath(r, wob, turn, start, rx, ry){
    const pts = [];
    const N = 34;
    for (let i=0;i<=N;i++){
      const t = i/N;
      const a = start + t*turn;
      const k = 1 + (Math.sin(a*2.3 + wob*7) * 0.035 + Math.sin(a*3.7 + wob*13) * 0.022) * (1 + wob*0.4);
      pts.push([50 + Math.cos(a)*rx*r*k, 50 + Math.sin(a)*ry*r*k]);
    }
    /* catmull-rom through the points, so the line is a stroke not a polygon */
    let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
    for (let i=0;i<pts.length-1;i++){
      const p0 = pts[i-1] || pts[i], p1 = pts[i], p2 = pts[i+1], p3 = pts[i+2] || p2;
      d += ` C${(p1[0]+(p2[0]-p0[0])/6).toFixed(2)},${(p1[1]+(p2[1]-p0[1])/6).toFixed(2)}`
        +  ` ${(p2[0]-(p3[0]-p1[0])/6).toFixed(2)},${(p2[1]-(p3[1]-p1[1])/6).toFixed(2)}`
        +  ` ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
    }
    return d;
  }

  tabs.forEach((tab,i)=>{
    const R = rnd(i*7919 + 17);
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('class','mw-ring');
    svg.setAttribute('viewBox','0 0 100 100');
    svg.setAttribute('aria-hidden','true');
    /* the main loop overshoots past where it started, the way a real one does */
    const rx = 0.92 + R()*0.10, ry = 0.86 + R()*0.10;
    const a  = ringPath(41, R(), Math.PI*2.14, -1.9 + R()*0.7, rx, ry);
    const b  = ringPath(38 + R()*3, R(), Math.PI*1.5, -0.6 + R()*1.4, rx*1.04, ry*1.06);
    for (const [d,cls] of [[a,''],[b,'b']]){
      const p = document.createElementNS('http://www.w3.org/2000/svg','path');
      p.setAttribute('d', d); if (cls) p.setAttribute('class', cls);
      svg.appendChild(p);
    }
    tab.appendChild(svg);
    /* dash length has to be measured once the path is in the document */
    requestAnimationFrame(()=>{
      svg.querySelectorAll('path').forEach(p=>{
        const len = p.getTotalLength();
        p.style.setProperty('--len', len.toFixed(1));
      });
    });
  });

  /* ---------- panels ---------- */
  const girl = section.querySelector('.mw-girl');
  function raiseGirl(on){
    if (!girl) return;
    if (!on){ girl.classList.remove('up'); return; }
    if (reduce){ girl.classList.add('up'); return; }
    requestAnimationFrame(()=> requestAnimationFrame(()=> girl.classList.add('up')));
  }

  /* held = the one you clicked. Until you click something, hovering the
     rail previews a panel and leaving it returns to the girl. Once you
     hold one, the screen stays on it — hovering the others still rings
     and sounds, but nothing moves until you pick again. */
  let held = null;

  function paint(key){
    const panel = panels.find(p=> p.dataset.key === key) || panels[0];
    if (!panel.classList.contains('on')){
      panels.forEach(p=> p.classList.toggle('on', p === panel));
      section.style.setProperty('--mwbg', panel.dataset.bg);
      section.dataset.chrome = panel.dataset.chrome;
      document.dispatchEvent(new CustomEvent('mw:chrome'));
      raiseGirl(key === 'intro');
    }
    /* the ring only sticks on the one being held; a hover ring is CSS */
    tabs.forEach(t=>{
      const sel = !!held && t.dataset.key === held;
      t.classList.toggle('sel', sel);
      t.setAttribute('aria-selected', sel ? 'true' : 'false');
    });
  }

  function preview(key, sound){
    if (sound && window.__snd) window.__snd.mw(key);
    if (held) { paint(held); return; }        /* held: ring and sound only */
    paint(key);
  }

  function hold(key){
    held = (held === key) ? null : key;
    section.classList.toggle('picked', !!held);
    paint(held || 'intro');
    if (window.__snd) window.__snd.select();
  }

  tabs.forEach(tab=>{
    tab.addEventListener('pointerenter', ev=>{
      if (ev.pointerType === 'touch') return;
      preview(tab.dataset.key, true);
    });
    tab.addEventListener('focus', ()=> preview(tab.dataset.key, false));
    tab.addEventListener('click', ev=>{ ev.preventDefault(); hold(tab.dataset.key); });
  });
  /* left / right walk the rail, the way a tablist should */
  tabs.forEach((tab,i)=>{
    tab.addEventListener('keydown', ev=>{
      const d = ev.key === 'ArrowDown' || ev.key === 'ArrowRight' ? 1
              : ev.key === 'ArrowUp'   || ev.key === 'ArrowLeft'  ? -1 : 0;
      if (!d) return;
      ev.preventDefault();
      tabs[(i + d + tabs.length) % tabs.length].focus();
    });
  });

  /* leaving the rail entirely returns to the girl */
  const rail = section.querySelector('.mw-rail');
  if (rail) rail.addEventListener('pointerleave', ev=>{
    if (ev.pointerType === 'touch') return;
    if (!held) paint('intro');
  });

  /* ---------- the typed line ----------
     Same keyboard the hero uses, so the two folds sound like one site. */
  const sub  = section.querySelector('.mw-sub');
  const type = section.querySelector('.mw-type');
  function typeLine(){
    if (!type) return;
    const text = type.dataset.text || '';
    if (reduce){
      type.textContent = text; sub.classList.add('done');
      const hint = section.querySelector('.mw-hint'); if (hint) hint.classList.add('in');
      return;
    }
    let i = 0;
    (function step(){
      type.textContent = text.slice(0, ++i);
      const ch = text[i-1];
      if (ch && ch !== ' ' && window.__snd) window.__snd.key(ch === '.' ? 1.3 : 1);
      if (i < text.length) setTimeout(step, 34 + Math.random()*46 + (ch === ' ' ? 30 : 0));
      else setTimeout(()=>{ sub.classList.add('done');
        const hint = section.querySelector('.mw-hint'); if (hint) hint.classList.add('in'); }, 900);
    })();
  }

  /* ---------- run it when the fold arrives ---------- */
  let played = false;
  function enter(){
    if (played) return;
    played = true;
    raiseGirl(true);
    setTimeout(typeLine, 520);
  }
  if ('IntersectionObserver' in window){
    new IntersectionObserver((es,obs)=>{
      es.forEach(e=>{ if (e.intersectionRatio > 0.45){ enter(); obs.disconnect(); } });
    }, {threshold:[0,0.45,1]}).observe(section);
  } else enter();
})();
