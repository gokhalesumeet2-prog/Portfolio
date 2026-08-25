/* set the theme before first paint. dark is the design; light is a choice
   the visitor makes, not one the OS makes for them. */
(function(){
  var t;
  try{ t = sessionStorage.getItem('theme'); }catch(e){}
  document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : 'dark');
})();
