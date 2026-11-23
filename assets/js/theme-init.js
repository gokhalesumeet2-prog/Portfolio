/* set the theme before first paint. */
(function(){
  /* one look only: the light ground. Any dark choice left over from
     before the toggle was removed is cleared. */
  try{ sessionStorage.removeItem('theme'); }catch(e){}
  document.documentElement.setAttribute('data-theme', 'light');
})();

/* the eye intro plays once per visit, on the homepage, unless the visitor
   prefers reduced motion or arrived asking for the work list. The hero is
   held until it finishes, with a failsafe so it can never stay hidden. */
(function(){
  try{
    var p = location.pathname;
    var home = p === '/' || /\/index\.html$/.test(p) || /\/$/.test(p) && !/\/(about|nirvana|nirvana-mudra|galls|optivento|unsmoke|case-studies)\/$/.test(p);
    if (!home || location.hash === '#work') return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (sessionStorage.getItem('rIntro') === '1') return;
    var root = document.documentElement;
    root.classList.add('r-intro');
    setTimeout(function(){ root.classList.remove('r-intro'); }, 6000);
  }catch(e){}
})();
