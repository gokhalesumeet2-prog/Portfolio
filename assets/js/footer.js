/* The sign-off — the copy-to-clipboard address, the work link, and the
   one-time arrival of the fold. */

(function(){
  const ft = document.querySelector('.ft');
  if (!ft) return;

  /* ---------- the address ----------
     navigator.clipboard is the good path, but it is only handed out on a
     secure origin — which a file:// preview is not — and it can still be
     refused. So the old textarea trick stays as the fallback, and if both
     fail the button says nothing rather than claiming a copy that did not
     happen: the address is written out in the label either way, so there is
     always something to select by hand. */
  function copy(text){
    if (navigator.clipboard && isSecureContext){
      return navigator.clipboard.writeText(text);
    }
    return new Promise((ok, no)=>{
      const ta = document.createElement('textarea');
      ta.value = text;
      /* off-screen rather than hidden: a display:none field has no selection */
      ta.setAttribute('readonly','');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      let done = false;
      try{ done = document.execCommand('copy'); }catch(e){}
      ta.remove();
      done ? ok() : no();
    });
  }

  const btn  = ft.querySelector('.ft-copy');
  const live = ft.querySelector('[role="status"]');
  if (btn){
    let clear = 0;
    btn.addEventListener('click', ()=>{
      copy(btn.dataset.copy).then(()=>{
        btn.classList.add('said');
        if (live) live.textContent = 'email address copied';
        clearTimeout(clear);
        clear = setTimeout(()=>{
          btn.classList.remove('said');
          if (live) live.textContent = '';
        }, 2200);
      }).catch(()=>{
        /* Nothing was copied, so say so instead of flashing "copied". The
           address is still on the screen to be selected. */
        if (live) live.textContent = 'copy blocked — select the address instead';
      });
    });
  }

  /* ---------- work ----------
     Same handling as the nav link: the page starts with its scroll locked
     for the intro, so releasing it is part of going anywhere. */
  const work = document.getElementById('work');
  const wl   = ft.querySelector('.ft-work');
  if (work && wl){
    wl.setAttribute('href','#work');
    wl.addEventListener('click', e=>{
      e.preventDefault();
      document.body.classList.add('scrollable');
      work.scrollIntoView({behavior:'smooth', block:'start'});
    });
  }

  /* ---------- arrival ---------- */
  function show(){ ft.classList.add('in'); }
  if ('IntersectionObserver' in window){
    new IntersectionObserver((es,obs)=>{
      es.forEach(e=>{ if (e.intersectionRatio > 0.2){ show(); obs.disconnect(); } });
    }, {threshold:[0,0.2,1]}).observe(ft);
  } else show();
})();
