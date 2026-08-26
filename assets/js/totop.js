/* The small arrow in the bottom-left corner: back to the start of the page. */

(function(){
  const btn = document.querySelector('.totop');
  if (!btn) return;
  const calm = matchMedia('(prefers-reduced-motion: reduce)');

  /* It appears once there is something to go back up to, and not before.
     On the homepage that also keeps it out of the intro, where the body is
     not scrollable yet and the corner belongs to the clock alone. */
  let ticking = false;
  function paint(){
    ticking = false;
    btn.classList.toggle('in', scrollY > innerHeight * 0.75);
  }
  function queue(){
    if (!ticking){ ticking = true; requestAnimationFrame(paint); }
  }
  addEventListener('scroll', queue, {passive:true});
  addEventListener('resize', queue);
  paint();

  btn.addEventListener('click', ()=>{
    scrollTo({top:0, behavior: calm.matches ? 'auto' : 'smooth'});
    /* Sending someone to the top of the page should also send the keyboard
       there, otherwise the next Tab carries on from halfway down. */
    const first = document.querySelector('nav .mark');
    if (first) first.focus({preventScroll:true});
  });
})();
