/* restyle.js — interaction for the restyle. Presentation only: it moves,
   reveals and points at what is already on the page, and never writes copy.
   No libraries: one small spring, the platform's own scrolling. */
(function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var doc = document, body = doc.body;

  /* ---------------------------------------------------------------
     Spring: stiffness 300, damping 28, mass 1 (about 1.3% overshoot).
     It keeps its own position and velocity, so a new target picks up
     from wherever it is and however fast it is moving — interruptible
     by construction. Under reduced motion it simply arrives.
     --------------------------------------------------------------- */
  function Spring(x, onUpdate) {
    this.x = x; this.v = 0; this.target = x;
    this.onUpdate = onUpdate; this.raf = 0; this.last = 0;
    this.tick = this.tick.bind(this);
  }
  Spring.prototype.to = function (target, velocity) {
    this.target = target;
    if (typeof velocity === 'number') this.v = velocity;
    if (reduce) { this.x = target; this.v = 0; this.onUpdate(this.x); return; }
    if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
  };
  Spring.prototype.jump = function (x) { this.stop(); this.x = this.target = x; this.v = 0; this.onUpdate(x); };
  Spring.prototype.stop = function () { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; };
  Spring.prototype.tick = function (now) {
    var dt = Math.min(0.064, (now - this.last) / 1000); this.last = now;
    var steps = Math.max(1, Math.ceil(dt / 0.004)), h = dt / steps;
    for (var i = 0; i < steps; i++) {
      var a = -300 * (this.x - this.target) - 28 * this.v;   // mass 1
      this.v += a * h; this.x += this.v * h;
    }
    if (Math.abs(this.v) < 0.02 && Math.abs(this.x - this.target) < 0.05) {
      this.x = this.target; this.v = 0; this.onUpdate(this.x); this.raf = 0; return;
    }
    this.onUpdate(this.x);
    this.raf = requestAnimationFrame(this.tick);
  };

  /* ---------------------------------------------------------------
     Theme toggle (the homepage button; its old handler lived in the
     intro script, which is gone).
     --------------------------------------------------------------- */
  var themeBtn = doc.getElementById('themeBtn');
  if (themeBtn && window.__setTheme) {
    themeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var cur = doc.documentElement.getAttribute('data-theme');
      window.__setTheme(cur === 'dark' ? 'light' : 'dark');
    });
  }

  /* ---------------------------------------------------------------
     The little photo in the hero: play with it and it answers. Each
     go (hover, tap, Enter/Space) shakes it for 1.2s and says the next
     line; the third time it offers the way to the about page.
     --------------------------------------------------------------- */
  (function () {
    var head = doc.querySelector('#hero .head');
    if (!head) return;
    var say = doc.createElement('span');
    say.className = 'r-me';
    say.setAttribute('aria-live', 'polite');
    head.insertAdjacentElement('afterend', say);
    var lines = ['yeah that’s me', 'yeah, that’s still me ;)'];
    var count = 0, busy = false, fadeT = 0;
    var play = function () {
      if (busy) return;
      busy = true;
      if (!reduce) {
        var k = [], i;
        for (i = 0; i <= 24; i++) {
          var f = 1 - i / 24, a = (i % 2 ? 1 : -1) * 9 * f, y = (i % 3 - 1) * 1.2 * f;
          k.push({ transform: 'translate(' + (a / 6).toFixed(2) + 'px,' + y.toFixed(2) + 'px) rotate(' + a.toFixed(1) + 'deg)' });
        }
        k[k.length - 1] = { transform: 'none' };
        head.animate(k, { duration: 1200, easing: 'linear' });
      }
      clearTimeout(fadeT);
      /* on a phone the photo sits near the right edge: let the note wrap
         into whatever room is left beside it instead of running off screen */
      var room = innerWidth - head.getBoundingClientRect().right - 22;
      say.classList.toggle('r-me-tight', room < 200);
      say.style.maxWidth = room < 200 ? Math.max(70, room) + 'px' : '';
      if (count < 2) {
        say.textContent = lines[count];
        say.classList.add('on'); say.classList.remove('keep');
        fadeT = setTimeout(function () { say.classList.remove('on'); }, 3200);
      } else {
        say.innerHTML = '<a href="about/">about</a>';
        say.classList.add('on', 'keep');
      }
      count++;
      setTimeout(function () { busy = false; }, 1200);
    };
    head.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') play(); });
    head.addEventListener('click', function (e) { e.stopPropagation(); play(); });
    head.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); } });
  })();

  /* ---------------------------------------------------------------
     The eye intro: the geometric eye from the original hero, drawn as
     line work, a small cluster of them scattered over the hero text.
     They ink themselves in, look about (at the cursor, if it moves),
     blink, close, and the text arrives where they were. ~3.5s, once
     per visit; any click, key or scroll skips it.
     --------------------------------------------------------------- */
  (function eyeIntro() {
    var root = doc.documentElement;
    var hero = doc.getElementById('hero'), copy = doc.getElementById('copy');
    if (!root.classList.contains('r-intro') || !hero || !copy) return;
    try { sessionStorage.setItem('rIntro', '1'); } catch (_) {}

    var RNG = function (s) { var x = (s * 2654435761) >>> 0 || 7; return function () { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; };
    var smooth = function (pts, close) {
      var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
      for (var i = 1; i < pts.length - 1; i++) {
        var mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
        d += ' Q' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1);
      }
      var l = pts[pts.length - 1];
      d += ' L' + l[0].toFixed(1) + ' ' + l[1].toFixed(1);
      return close ? d + ' Z' : d;
    };
    var lidArc = function (rand, up, jit, over) {
      var x0 = 12, x1 = 108, cy = 35, hh = 24, cxp = 60, cyp = cy + (up ? -2 * hh : 2 * hh), pts = [], N = 10;
      for (var i = 0; i <= N; i++) {
        var t = -over + (i / N) * (1 + 2 * over), mt = 1 - t;
        pts.push([mt * mt * x0 + 2 * mt * t * cxp + t * t * x1 + (rand() - .5) * jit,
                  mt * mt * cy + 2 * mt * t * cyp + t * t * cy + (rand() - .5) * jit]);
      }
      return pts;
    };
    var ring = function (rand, r, jit) {
      var pts = [], N = 16;
      for (var i = 0; i <= N; i++) { var a = (i / N) * 6.28318, rr = r + (rand() - .5) * jit; pts.push([60 + Math.cos(a) * rr, 35 + Math.sin(a) * rr]); }
      return pts;
    };
    var eyeSvg = function (i) {
      var seed = i * 7919 + 31, rc = RNG(seed), r1 = RNG(seed + 101), r2 = RNG(seed + 257), r3 = RNG(seed + 409);
      var clip = smooth(lidArc(rc, true, 1, 0).concat(lidArc(rc, false, 1, 0).reverse()), true);
      return '<svg viewBox="0 0 120 70" aria-hidden="true"><defs>' +
        '<filter id="rink' + i + '" x="-30%" y="-45%" width="160%" height="190%">' +
          '<feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="' + (seed % 97) + '" result="w"/>' +
          '<feDisplacementMap in="SourceGraphic" in2="w" scale="2.6" xChannelSelector="R" yChannelSelector="G"/>' +
        '</filter><clipPath id="rcp' + i + '"><path d="' + clip + '"/></clipPath></defs>' +
        '<g clip-path="url(#rcp' + i + ')"><g class="r-look">' +
          '<path class="r-iris" pathLength="1" d="' + smooth(ring(r3, 18.5, 1.7), true) + '"/>' +
          '<path class="r-pupil" d="' + smooth(ring(r3, 7.6, .9), true) + '"/>' +
        '</g></g>' +
        '<g filter="url(#rink' + i + ')">' +
          '<path class="r-lid a" pathLength="1" d="' + smooth(lidArc(r1, true, 1.6, .035)) + '"/>' +
          '<path class="r-lid a" pathLength="1" d="' + smooth(lidArc(r1, false, 1.6, .035)) + '"/>' +
          '<path class="r-lid b" pathLength="1" d="' + smooth(lidArc(r2, true, 2.4, .045)) + '"/>' +
          '<path class="r-lid b" pathLength="1" d="' + smooth(lidArc(r2, false, 2.4, .045)) + '"/>' +
        '</g></svg>';
    };

    /* sprinkle them across the first fold, at random */
    var layer = doc.createElement('div');
    layer.className = 'r-eyes';
    layer.setAttribute('aria-hidden', 'true');
    body.appendChild(layer);
    var small = innerWidth < 640, W = innerWidth, H = innerHeight;
    var cr = copy.getBoundingClientRect();
    var gx = cr.left + Math.min(cr.width, 560) / 2, gy = cr.top + cr.height * .42;   // where they gather
    var n = small ? 11 : 17, rand = RNG(Math.floor(Math.random() * 1e6)), eyes = [];
    var mk = function (k, x, y, w) {
      var el = doc.createElement('div');
      el.className = 'r-eye';
      el.style.cssText = 'left:' + (x - w / 2).toFixed(1) + 'px;top:' + (y - w * .29).toFixed(1) + 'px;width:' + w + 'px';
      el.innerHTML = eyeSvg(k);
      layer.appendChild(el);
      return { el: el, look: el.querySelector('.r-look'), cx: x, cy: y, lx: 0, ly: 0 };
    };
    for (var k = 0; k < n; k++) {
      var w = Math.round((small ? 16 : 18) + rand() * (small ? 12 : 18));
      var x = 24 + rand() * (W - 48), y = 84 + rand() * (H - 130);
      var e = mk(k, x, y, w);
      e.d = Math.round(rand() * 520);
      eyes.push(e);
    }
    /* the one they become */
    var one = mk(99, gx, gy, small ? 40 : 48);
    one.el.style.opacity = '0';

    var draw = function (e, d0, dur) {
      e.el.querySelectorAll('.r-lid').forEach(function (p, j) {
        p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: dur, delay: d0 + j * 50, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'both' });
      });
      e.el.querySelector('.r-iris').animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: dur * .8, delay: d0 + dur * .5, easing: 'ease-out', fill: 'both' });
      e.el.querySelector('.r-pupil').animate([{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)' }],
        { duration: 240, delay: d0 + dur * .9, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'both' });
    };
    /* 1. ink in, scattered (0 - ~1.1s) */
    eyes.forEach(function (e) { draw(e, e.d, 460); });

    /* look: at the cursor if it moves, otherwise at where they will meet */
    var mx = null, my = null, live = true;
    var onMove = function (ev) { mx = ev.clientX; my = ev.clientY; };
    addEventListener('pointermove', onMove, { passive: true });
    var look = function () {
      if (!live) return;
      eyes.concat([one]).forEach(function (e) {
        var px = mx !== null ? mx : gx, py = my !== null ? my : gy;
        var dx = px - e.cx, dy = py - e.cy, a = Math.atan2(dy, dx), m = Math.min(1, Math.hypot(dx, dy) / 200);
        var tx = Math.cos(a) * 11 * m, ty = Math.sin(a) * 5 * m;
        e.lx += (tx - e.lx) * .14; e.ly += (ty - e.ly) * .14;
        e.look.setAttribute('transform', 'translate(' + e.lx.toFixed(2) + ' ' + e.ly.toFixed(2) + ')');
      });
      requestAnimationFrame(look);
    };
    requestAnimationFrame(look);

    /* 2. gather: they drift in and fold into one tiny eye (~1.2 - 2.1s) */
    var GATHER = 1200;
    eyes.forEach(function (e, i) {
      var dx = gx - e.cx, dy = gy - e.cy;
      e.el.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(' + (dx * .85).toFixed(1) + 'px,' + (dy * .85).toFixed(1) + 'px) scale(.8)', opacity: 1, offset: .75 },
        { transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(.3)', opacity: 0 }
      ], { duration: 820, delay: GATHER + (i % 6) * 22, easing: 'cubic-bezier(.55,0,.25,1)', fill: 'forwards' });
    });
    one.el.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }],
      { duration: 360, delay: GATHER + 640, easing: 'cubic-bezier(.2,.9,.3,1.1)', fill: 'forwards' });
    draw(one, GATHER + 600, 320);

    /* 3. it blinks once (~2.35s) */
    one.el.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.06)', offset: .45 }, { transform: 'scaleY(1)' }],
      { duration: 240, delay: GATHER + 1150, easing: 'ease-in-out', composite: 'replace' });

    /* 4. and infuses itself into the words: the eye opens out and dissolves
       while the hero is revealed from that point outward (~2.7 - 3.5s) */
    var done = false;
    var finish = function (fast) {
      if (done) return; done = true;
      live = false;
      var dur = fast ? 220 : 760;
      one.el.animate([{ transform: 'scale(1)', opacity: 1, filter: 'blur(0)' }, { transform: 'scale(7)', opacity: 0, filter: 'blur(6px)' }],
        { duration: dur, easing: 'cubic-bezier(.3,.6,.2,1)', fill: 'forwards' });
      if (fast) eyes.forEach(function (e) { e.el.style.opacity = '0'; });
      var r = copy.getBoundingClientRect(), ox = gx - r.left, oy = gy - r.top;
      var far = Math.hypot(Math.max(ox, r.width - ox), Math.max(oy, r.height - oy)) + 40;
      copy.animate([{ clipPath: 'circle(0px at ' + ox + 'px ' + oy + 'px)' }, { clipPath: 'circle(' + far + 'px at ' + ox + 'px ' + oy + 'px)' }],
        { duration: fast ? 260 : 900, easing: 'cubic-bezier(.3,.6,.2,1)' });
      root.classList.remove('r-intro');
      setTimeout(function () { layer.remove(); removeEventListener('pointermove', onMove); }, dur + 100);
      ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (t) { removeEventListener(t, skip, true); });
    };
    var skip = function () { finish(true); };
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (t) { addEventListener(t, skip, { capture: true, passive: true }); });
    setTimeout(function () { finish(false); }, GATHER + 1500);
  })();

  /* ---------------------------------------------------------------
     Nav: mark the page you are on, and give the pinned bar its backing
     once the page has moved under it.
     --------------------------------------------------------------- */
  var navEl = doc.querySelector('body > nav');
  if (navEl) {
    var path = location.pathname;
    Array.prototype.forEach.call(navEl.querySelectorAll('.links a'), function (a) {
      var h = a.getAttribute('href') || '';
      var here = (h.indexOf('about') > -1 && /\/about\/?/.test(path)) ||
                 (h.indexOf('#work') > -1 && /\/(nirvana|nirvana-mudra|galls|optivento|unsmoke)\//.test(path));
      if (here) a.setAttribute('aria-current', 'page');
    });
    var stick = function () { navEl.classList.toggle('r-stuck', scrollY > 8); };
    addEventListener('scroll', stick, { passive: true });
    stick();
  }

  /* ---------------------------------------------------------------
     The clock pill: centred while the homepage's first fold is in view,
     tucked to the bottom left once you scroll past it (and on every other
     page).
     --------------------------------------------------------------- */
  if (doc.getElementById('hero')) {
    var clockMid = function () {
      doc.documentElement.classList.toggle('r-clock-mid', scrollY < innerHeight * .45);
    };
    addEventListener('scroll', clockMid, { passive: true });
    addEventListener('resize', clockMid);
    clockMid();
  }

  /* ---------------------------------------------------------------
     Section headings: wrap each heading's own text in a span so CSS can
     seat the divider rule beside it with flexbox. The words, their order
     and the heading element are untouched.
     --------------------------------------------------------------- */
  Array.prototype.forEach.call(doc.querySelectorAll(
    '.cst .cst-h2, .cst .cst-figures h2, .cst .abv-do .abv-h, .cst .abv-timeline .abv-h, .cst .ab-h2, .cst .cst-off h2, #work .proj-label'
  ), function (h) {
    if (h.classList.contains('sr-only') || h.querySelector('.r-h2t')) return;
    var sp = doc.createElement('span');
    sp.className = 'r-h2t';
    while (h.firstChild) sp.appendChild(h.firstChild);
    h.appendChild(sp);
    h.classList.add('r-h2');
  });

  /* ---------------------------------------------------------------
     The project strip, after hanif.rest: one endless row that drifts
     left on its own (~26px/s at 1024px wide), all but stops under the
     cursor, can be thrown with a spring, and bleeds into both edges
     through a WebGL warp. Nothing is cloned: the five existing plates
     and their existing titles are moved with transforms and wrap round
     when they leave the frame. Without JS the CSS keeps a plain
     horizontally scrolling row.
     --------------------------------------------------------------- */
  var work = doc.getElementById('work');
  var rail = work && work.querySelector('.proj-frame');
  var dragged = false;
  if (rail) {
    work.classList.add('r-rail');
    var label = rail.querySelector('.proj-label');
    rail.setAttribute('tabindex', '0');
    rail.setAttribute('role', 'region');
    if (label) rail.setAttribute('aria-label', label.textContent.trim());

    var plates = Array.prototype.slice.call(rail.querySelectorAll('.proj-plate'));
    var titles = Array.prototype.slice.call(rail.querySelectorAll('.proj-list > li'));
    var n = plates.length;
    var VW, P, W, FH, L, E, R, off0;
    var offset = 0, vel = 0, acc = 0, mode = 'auto', target = 0;
    var hovering = false, focused = false, visible = true;
    var mod = function (a, b) { return ((a % b) + b) % b; };

    var measure = function () {
      VW = doc.documentElement.clientWidth;
      var small = VW <= 640;
      P = small ? VW * 0.62 : VW / 4;
      W = small ? P - 16 : Math.max(200, Math.min(P - 24, 600));
      FH = W * 0.85676;                             // the inspo's card proportion
      L = n * P;
      E = small ? 32 : Math.max(96, Math.min(VW * 0.13, 220));
      R = small ? 24 : 64;
      off0 = VW / 2 + P / 2;                          // the first project starts centred
      work.style.setProperty('--rw', W + 'px');
      work.style.setProperty('--rfh', FH + 'px');
      work.style.setProperty('--redge', E + 'px');
      work.style.setProperty('--rramp', R + 'px');
    };
    /* keep the strip inside the first fold with air under it: the space
       above the cards is whatever is left once the hero, the cards and a
       bottom margin are accounted for (within sensible limits) */
    var heroEl = doc.getElementById('hero');
    var fitFold = function () {
      if (!heroEl) return;
      var heroBottom = heroEl.getBoundingClientRect().bottom + scrollY;
      /* aim the cards' centre at ~56% of the fold, but never closer than
         40px to the hero or 32px to the bottom edge */
      /* the cards sit a little below the middle of the fold. Above them:
         room for the project-name pill (it rides 12px over a card), so it
         never meets the hero text. Below: room for the floating clock. */
      var small = innerWidth <= 640;
      var target = innerHeight * (small ? .64 : .6) - FH / 2 - heroBottom;
      var maxPad = innerHeight - (small ? 64 : 76) - FH - heroBottom;
      var pad = Math.max(small ? 64 : 84, Math.min(target, maxPad));
      work.style.setProperty('padding-top', pad.toFixed(0) + 'px', 'important');
      if (bleed) bleed.rebuild();
    };
    var autoSpeed = function () { return reduce ? 0 : -Math.max(26, Math.min(58, 37 * VW / 1024)); };   // ~52px/s at 1440
    var aligned = function (o) { return off0 + Math.round((o - off0) / P) * P; };

    var render = function () {
      for (var i = 0; i < n; i++) {
        var x = mod(i * P + offset, L) - P + (P - W) / 2;
        var t = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
        plates[i].style.transform = t;
        titles[i].style.transform = t;
      }
      if (bleed) bleed.draw(offset);
    };

    /* one spring, stiffness 300 / damping 28 / mass 1, stepped by hand */
    var spring = function (x, v, to, dt) {
      var steps = Math.max(1, Math.ceil(dt / 0.004)), h = dt / steps;
      for (var i = 0; i < steps; i++) { var a = -300 * (x - to) - 28 * v; v += a * h; x += v * h; }
      return [x, v];
    };

    var last = performance.now();
    var frame = function (now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (visible && !doc.hidden) {
        if (mode === 'auto') {
          var want = focused ? 0 : hovering ? autoSpeed() * 0.6 : autoSpeed();   // hover slows it, never stops it
          var r = spring(vel, acc, want, dt); vel = r[0]; acc = r[1];   // the speed itself eases on a spring
          offset += vel * dt;
        } else if (mode === 'settle') {
          var r2 = spring(offset, vel, target, dt); offset = r2[0]; vel = r2[1];
          if (Math.abs(offset - target) < 0.1 && Math.abs(vel) < 2) { offset = target; vel = 0; acc = 0; mode = 'auto'; }
        }
        render();
      }
      requestAnimationFrame(frame);
    };
    var settleTo = function (o, v) {
      if (reduce) { offset = o; vel = 0; mode = 'auto'; render(); return; }
      target = o; if (typeof v === 'number') vel = v; mode = 'settle';
    };

    /* drag: mouse, pen and touch. touch-action:pan-y keeps vertical page
       scrolling with the browser; only sideways movement is ours. */
    var startX = 0, startY = 0, startOff = 0, samples = [], down = false, pid = null;
    rail.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      down = true; dragged = false; pid = e.pointerId;
      startX = e.clientX; startY = e.clientY; startOff = offset;
      samples = [{ t: e.timeStamp, x: e.clientX }];
    });
    rail.addEventListener('pointermove', function (e) {
      if (!down || e.pointerId !== pid) return;
      var dx = e.clientX - startX;
      if (!dragged) {
        if (Math.abs(dx) < 5 || Math.abs(dx) < Math.abs(e.clientY - startY)) return;
        dragged = true; mode = 'drag'; vel = 0;
        rail.classList.add('dragging');
        try { rail.setPointerCapture(e.pointerId); } catch (_) {}
        hidePill();
      }
      offset = startOff + dx;
      samples.push({ t: e.timeStamp, x: e.clientX });
      if (samples.length > 6) samples.shift();
    });
    var release = function (e) {
      if (!down) return;
      down = false;
      rail.classList.remove('dragging');
      if (!dragged) return;
      var a = samples[0], b = samples[samples.length - 1];
      var v = (b.x - a.x) / Math.max(1, b.t - a.t) * 1000;
      if (e.timeStamp - b.t > 90) v = 0;
      settleTo(aligned(offset + v * 0.3), v);
      setTimeout(function () { dragged = false; }, 0);
    };
    rail.addEventListener('pointerup', release);
    rail.addEventListener('pointercancel', release);
    rail.addEventListener('click', function (e) { if (dragged) { e.preventDefault(); e.stopPropagation(); } }, true);
    rail.addEventListener('dragstart', function (e) { e.preventDefault(); });

    /* sideways trackpad swipes move the strip; vertical wheel is never touched */
    rail.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      offset -= e.deltaX; mode = 'auto'; vel = 0; acc = 0;
    }, { passive: false });

    rail.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hovering = true; });
    rail.addEventListener('pointerleave', function () { hovering = false; });

    /* keyboard: arrows step one project; tabbing to a project brings it
       to the centre, and the strip holds still while focus is inside */
    rail.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var base = aligned(mode === 'settle' ? target : offset);
      settleTo(base + (e.key === 'ArrowRight' ? -P : P));
      e.preventDefault();
    });
    rail.addEventListener('focusin', function (e) {
      focused = true;
      var i = plates.indexOf(e.target.closest('.proj-plate'));
      if (i < 0) i = titles.indexOf(e.target.closest('.proj-list > li'));
      if (i < 0) return;
      var x = mod(i * P + offset, L) - P;
      settleTo(offset + (VW / 2 - (x + P / 2)));
    });
    rail.addEventListener('focusout', function (e) { if (!rail.contains(e.relatedTarget)) focused = false; });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(rail);
    }

    var bleed = null;
    measure();
    offset = off0;
    vel = autoSpeed();
    if (!reduce) bleed = makeBleed();
    fitFold();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(fitFold);
    render();
    addEventListener('resize', function () {
      var k = mod(offset - off0, L) / L;
      measure(); offset = off0 + k * L;
      fitFold();
      if (bleed) bleed.rebuild();
      render();
    });
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------------
     The bleed: a WebGL layer over the strip's two edges. The five
     frames are painted once into a looping texture; the shader samples
     it beyond the edges stretched taller and squeezed sideways, with a
     faint chromatic rim, so the strip seems to bend away round the
     sides. Decoration only: aria-hidden, no pointer events.
     --------------------------------------------------------------- */
  function makeBleed() {
    var cv = doc.createElement('canvas');
    cv.className = 'r-bleed';
    cv.setAttribute('aria-hidden', 'true');
    var gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return null;
    work.appendChild(cv);

    var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var fs = [
      'precision highp float;',
      'uniform sampler2D t;uniform vec2 res;uniform float dpr,off,L,P,FH,top,E,R;',
      'vec4 tap(float xs,float ys){float ty=(ys-top)/FH;if(ty<0.||ty>1.)return vec4(0.);',
      ' float tu=mod(xs+P-off,L)/L;return texture2D(t,vec2(tu,ty));}',
      'void main(){',
      ' float x=gl_FragCoord.x/dpr;float y=(res.y*dpr-gl_FragCoord.y)/dpr;float Wd=res.x;',
      ' float u;float side;',
      ' if(x<E){u=(E-x)/E;side=-1.;}else if(x>Wd-E){u=(x-(Wd-E))/E;side=1.;}else{discard;}',
      ' float C=.8*E;float d=E*u+C*u*u*u;',
      ' float xs=side>0.?(Wd-E)+d:E-d;',
      ' float yc=top+FH*.5;float s=1.+1.05*u*u;',
      ' vec4 g=tap(xs,yc+(y-yc)/s);',
      /* the rim: where the stretched card's top and bottom edges curve away,
         a soft cyan line, strongest toward the screen edge */
      ' float k=2.5;',
      ' float a1=tap(xs,yc+(y+k-yc)/s).a;float a2=tap(xs,yc+(y-k-yc)/s).a;',
      ' float rim=clamp(abs(a1-a2)*1.2,0.,1.)*smoothstep(.15,.85,u)*.75;',
      ' vec3 cy=vec3(.36,.86,.96);',
      ' float f=smoothstep(0.,R/E,u);',
      ' float A=max(g.a,rim*.85);',
      ' vec3 c=g.rgb*(1.-rim*.6)+cy*rim*.85;',
      ' gl_FragColor=vec4(c,A)*f;',
      '}'
    ].join('\n');
    var sh = function (type, src) { var o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; };
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { cv.remove(); return null; }
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ['res', 'dpr', 'off', 'L', 'P', 'FH', 'top', 'E', 'R'].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

    var paint = doc.createElement('canvas');
    var ctx = paint.getContext('2d');
    var dpr = 1, rowTop = 0, ready = false;

    var round = function (c, x, y, w, h, r) {
      c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    };
    var drawContain = function (c, img, x, y, w, h) {
      if (!img.naturalWidth) return;
      var cs = getComputedStyle(img), fit = cs.objectFit;
      if (fit !== 'cover' && fit !== 'contain') { c.drawImage(img, x, y, w, h); return; }
      var k = (fit === 'cover' ? Math.max : Math.min)(w / img.naturalWidth, h / img.naturalHeight);
      var dw = img.naturalWidth * k, dh = img.naturalHeight * k;
      var pos = cs.objectPosition.split(' ').map(function (v) { return parseFloat(v) / 100; });
      c.drawImage(img, x + (w - dw) * (isNaN(pos[0]) ? .5 : pos[0]), y + (h - dh) * (isNaN(pos[1]) ? .5 : pos[1]), dw, dh);
    };
    var cardFill = getComputedStyle(plates[0]).backgroundColor;

    function rebuild() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      var H = FH * 2.3;
      cv.style.width = VW + 'px'; cv.style.height = H + 'px';
      cv.width = Math.round(VW * dpr); cv.height = Math.round(H * dpr);
      rowTop = rail.offsetTop + plates[0].offsetTop;
      cv.style.top = (rowTop - FH * 0.65) + 'px';

      /* the loop texture: five cards, laid out exactly as the strip lays them out */
      var k = Math.min(1.5, 4096 / L);
      paint.width = Math.round(L * k); paint.height = Math.round(FH * k);
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.clearRect(0, 0, L, FH);
      plates.forEach(function (pl, i) {
        var x0 = i * P + (P - W) / 2, pr = pl.getBoundingClientRect();
        ctx.save();
        round(ctx, x0 + .5, .5, W - 1, FH - 1, 18);
        ctx.fillStyle = cardFill; ctx.fill();
        ctx.clip();
        Array.prototype.forEach.call(pl.querySelectorAll('img'), function (img) {
          if (parseFloat(getComputedStyle(img).opacity) < .5) return;
          var r = img.getBoundingClientRect();
          drawContain(ctx, img, x0 + (r.left - pr.left) * W / pr.width, (r.top - pr.top) * FH / pr.height,
            r.width * W / pr.width, r.height * FH / pr.height);
        });
        ctx.restore();
        round(ctx, x0 + .5, .5, W - 1, FH - 1, 18);
        ctx.strokeStyle = 'rgba(17,17,16,.1)'; ctx.lineWidth = 1; ctx.stroke();
      });
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, paint);
      gl.viewport(0, 0, cv.width, cv.height);
      ready = true;
    }
    function draw(off) {
      if (!ready) return;
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.res, VW, FH * 2.3);
      gl.uniform1f(U.dpr, dpr); gl.uniform1f(U.off, off); gl.uniform1f(U.L, L); gl.uniform1f(U.P, P);
      gl.uniform1f(U.FH, FH); gl.uniform1f(U.top, FH * 0.65); gl.uniform1f(U.E, E); gl.uniform1f(U.R, R);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    /* the plates load lazily: repaint the texture as each one arrives */
    Array.prototype.forEach.call(rail.querySelectorAll('.proj-plate img'), function (img) {
      img.loading = 'eager';
      if (!img.complete) img.addEventListener('load', function () { requestAnimationFrame(rebuild); });
    });
    requestAnimationFrame(rebuild);
    return { draw: draw, rebuild: rebuild };
  }

  /* ---------------------------------------------------------------
     Hover pill: follows the cursor over project frames and list items,
     carrying the item's own existing name. Fine pointers only.
     --------------------------------------------------------------- */
  var pill = null, px, py, pillOn = false;
  function hidePill() { if (pill && pillOn) { pill.classList.remove('on'); pill.nextSibling && pill.nextSibling.classList && pill.nextSibling.classList.remove('on'); doc.documentElement.classList.remove('r-bud-on'); pillOn = false; } }

  if (fine && !reduce) {
    var hoverCard = null;
    var nameFor = function (el) {
      hoverCard = null;
      var plate = el.closest('#work .proj-plate');
      if (plate) {
        if (plate.classList.contains('op') && !el.closest('.op-tap, .op-dev')) return '';
        var t = doc.querySelector('#work .proj[data-key="' + plate.dataset.key + '"]');
        hoverCard = plate;
        return t ? t.textContent.trim() : '';
      }
      var nf = el.closest('.nf-item a');
      if (nf) { var tt = nf.querySelector('.nf-title'); hoverCard = nf; return tt ? tt.textContent.trim() : ''; }
      return '';
    };
    pill = doc.createElement('div');
    pill.className = 'r-bud';
    pill.setAttribute('aria-hidden', 'true');
    pill.innerHTML = '<div class="r-bud-pill">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>' +
      '<span>View case study</span></div>';
    var budTitle = doc.createElement('div');
    budTitle.className = 'r-bud-title';
    budTitle.setAttribute('aria-hidden', 'true');
    body.appendChild(pill);
    body.appendChild(budTitle);
    var place = function () {
      pill.style.transform = 'translate3d(' + px.x.toFixed(1) + 'px,' + py.x.toFixed(1) + 'px,0)';
    };
    /* the name sits in its own pill, centred just above the card being
       hovered, and travels with the card as the strip moves */
    var seat = function () {
      if (!pillOn || !hoverCard) return;
      var r = hoverCard.getBoundingClientRect();
      budTitle.style.transform = 'translate3d(' + (r.left + r.width / 2).toFixed(1) + 'px,' + (r.top - 12).toFixed(1) + 'px,0) translate(-50%,-100%)';
      requestAnimationFrame(seat);
    };
    px = new Spring(0, place); py = new Spring(0, place);

    doc.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      var name = (rail && rail.classList.contains('dragging')) ? '' : nameFor(e.target);
      var x = e.clientX, y = e.clientY;            // the pill is the cursor
      if (!name) { hidePill(); return; }
      if (budTitle.textContent !== name) budTitle.textContent = name;
      if (!pillOn) { px.jump(x); py.jump(y); pill.classList.add('on'); budTitle.classList.add('on'); doc.documentElement.classList.add('r-bud-on'); pillOn = true; requestAnimationFrame(seat); return; }
      px.jump(x); py.jump(y);
    }, { passive: true });
    doc.addEventListener('pointerleave', hidePill);
    addEventListener('scroll', hidePill, { passive: true });
  }


  /* ---------- sideways scrollers: wrap the about chart, then fade whichever
     edge still has more to see, so a cut-off diagram reads as swipeable ---------- */
  Array.prototype.forEach.call(doc.querySelectorAll('img.abv-chart'), function (img) {
    if (img.parentElement.classList.contains('r-xscroll')) return;
    var w = doc.createElement('div'); w.className = 'r-xscroll';
    img.parentNode.insertBefore(w, img); w.appendChild(img);
  });
  var scrollers = Array.prototype.slice.call(doc.querySelectorAll('.cst-diagram, .r-xscroll'));
  var markScroll = function (el) {
    var ox = getComputedStyle(el).overflowX;
    var over = (ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 2;
    el.classList.toggle('r-scrolls', over);
    var atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    el.classList.toggle('r-end', over && atEnd);
    el.classList.toggle('r-mid', over && !atEnd && el.scrollLeft > 2);
  };
  scrollers.forEach(function (el) {
    el.addEventListener('scroll', function () { markScroll(el); }, { passive: true });
    markScroll(el);
  });
  addEventListener('resize', function () { scrollers.forEach(markScroll); });
  addEventListener('load', function () { scrollers.forEach(markScroll); });

  /* ---------------------------------------------------------------
     Section pill on the long case studies: shows the section you are
     in, using the page's own heading text, and opens into a contents
     list of those headings. It stays clear of body text and steps
     aside when you scroll back up.
     --------------------------------------------------------------- */
  var main = doc.querySelector('main.cst');
  if (main && !main.classList.contains('abv') && !main.classList.contains('nf')) {
    var textOf = function (h) { return (h.innerText || h.textContent).replace(/\s+/g, ' ').trim(); };
    var heads = Array.prototype.slice.call(main.querySelectorAll('h1, h2')).filter(function (h) {
      return !h.classList.contains('sr-only') && h.getClientRects().length && textOf(h);
    });
    /* group the headings into a few broad chapters per case study, so the
       key reads as an outline rather than every sub-topic. Each chapter
       points at the heading (by id, or by its text) where it begins. */
    var CHAPTERS = {
      'nirvana':       [['Overview','h1'], ['Problem','#prob-h'], ['Directions','~directions considered'],
                        ['Solution','#loop-h'], ['Testing','#test-h'], ['What\u2019s next','#next-h']],
      'nirvana-mudra': [['Overview','h1'], ['Problem','#prob-h'], ['The engine','#eng-h'],
                        ['Design decisions','#dec-h'], ['Outcome','#out-h']],
      'galls':         [['Overview','h1'], ['Impact','#out-h'], ['Problem','#ctx-h'],
                        ['Directions','#dir-h'], ['Solution','~grouped by decision']],
      'optivento':     [['Overview','h1'], ['Problem','#econ-h'], ['Research','#res-h'],
                        ['Solution','#dir-h'], ['Outcome','#proj-h']],
      'unsmoke':       [['Overview','h1'], ['Problem','#why-h'], ['Solution','#int-h'],
                        ['The system','#sys-h'], ['Outcome','#out-h'], ['Reflection','#lim-h']]
    };
    var slug = location.pathname.replace(/\/(index\.html)?$/, '').split('/').pop().replace(/\.html$/, '');
    var labels = heads.map(textOf);
    if (CHAPTERS[slug]) {
      var find = function (q) {
        if (q.charAt(0) === '~') {
          var t = q.slice(1);
          return Array.prototype.slice.call(main.querySelectorAll('h1, h2, h3')).filter(function (h) {
            return textOf(h).toLowerCase() === t;
          })[0];
        }
        var el = main.querySelector(q);
        /* a visually hidden heading: aim at the section it names */
        if (el && el.classList.contains('sr-only')) el = el.closest('section') || el.parentElement || el;
        return el;
      };
      var ch = CHAPTERS[slug].map(function (c) { return [c[0], find(c[1])]; }).filter(function (c) { return c[1]; });
      if (ch.length >= 3) {
        heads = ch.map(function (c) { return c[1]; });
        labels = ch.map(function (c) { return c[0]; });
      }
    }
    if (heads.length >= 3) {
      var toc = doc.createElement('div');
      toc.className = 'r-toc hide';
      var list = doc.createElement('ul');
      list.className = 'r-toc-list'; list.id = 'r-toc-list'; list.hidden = true;
      var btn = doc.createElement('button');
      btn.type = 'button'; btn.className = 'r-toc-btn';
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', 'r-toc-list');

      var items = heads.map(function (h) {
        var li = doc.createElement('li'), b = doc.createElement('button');
        b.type = 'button'; b.textContent = labels[heads.indexOf(h)];
        b.addEventListener('click', function () {
          close();
          h.style.scrollMarginTop = '96px';
          if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
          h.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
          h.focus({ preventScroll: true });
        });
        li.appendChild(b); list.appendChild(li);
        return b;
      });
      toc.appendChild(list); toc.appendChild(btn);
      body.appendChild(toc);

      var open = function () { list.hidden = false; btn.setAttribute('aria-expanded', 'true'); toc.classList.remove('hide'); };
      var close = function () { list.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
      btn.addEventListener('click', function () { list.hidden ? open() : close(); });
      doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !list.hidden) { close(); btn.focus(); } });
      doc.addEventListener('pointerdown', function (e) { if (!toc.contains(e.target)) close(); });

      var current = -1;
      /* the page key: the same headings, pinned in the left margin on wide
         screens, so you can see where you are and jump without scrolling */
      var key = doc.createElement('nav');
      key.className = 'r-key';
      key.setAttribute('aria-label', 'Sections');
      var keyList = doc.createElement('ol');
      var keyItems = heads.map(function (h, i) {
        var li = doc.createElement('li'), b = doc.createElement('button');
        b.type = 'button';
        b.innerHTML = '<span class="r-key-tick" aria-hidden="true"></span><span class="r-key-text"></span>';
        b.lastChild.textContent = items[i].textContent;
        b.addEventListener('click', function () { items[i].click(); });
        li.appendChild(b); keyList.appendChild(li);
        return b;
      });
      key.appendChild(keyList);
      body.appendChild(key);

      var paintCurrent = function () {
        var line = innerHeight * 0.35, idx = 0;
        heads.forEach(function (h, i) { if (h.getBoundingClientRect().top < line) idx = i; });
        if (idx !== current) {
          current = idx;
          btn.textContent = items[idx].textContent;
          items.forEach(function (b, i) { b.setAttribute('aria-current', i === idx ? 'true' : 'false'); });
          keyItems.forEach(function (b, i) { b.setAttribute('aria-current', i === idx ? 'true' : 'false'); });
        }
        /* how far through the page: drives the hairline beside the key */
        var max = doc.documentElement.scrollHeight - innerHeight;
        key.style.setProperty('--r-progress', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : '0');
      };
      /* is there body text under where the pill sits? */
      var TEXT = 'p, li, h1, h2, h3, h4, dt, dd, blockquote, figcaption, .cst-num, .cst-btn, .site-foot';
      var overText = function () {
        var r = btn.getBoundingClientRect();
        if (!r.width) { r = { left: innerWidth / 2 - 90, right: innerWidth / 2 + 90, top: innerHeight - 50, bottom: innerHeight - 16 }; }
        var xs = [r.left + 6, (r.left + r.right) / 2, r.right - 6], ys = [r.top + 2, r.bottom - 2];
        for (var i = 0; i < xs.length; i++) for (var j = 0; j < ys.length; j++) {
          var stack = doc.elementsFromPoint(xs[i], ys[j]);
          for (var k = 0; k < stack.length; k++) {
            var el = stack[k];
            if (toc.contains(el)) continue;
            if (el.closest && el.closest(TEXT) && !el.closest('.r-toc')) return true;
            break;                                          // only the topmost page element counts
          }
        }
        return false;
      };
      var lastY = scrollY, ticking = false;
      var paint = function () {
        ticking = false;
        var y = scrollY, up = y < lastY - 1;
        lastY = y;
        paintCurrent();
        if (!list.hidden) { if (up) close(); else return; }
        var hide = up || y < innerHeight * 0.6 || overText();
        if (toc.contains(doc.activeElement)) hide = false;
        toc.classList.toggle('hide', hide);
      };
      addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
      addEventListener('resize', paint);
      toc.addEventListener('focusin', function () { toc.classList.remove('hide'); });
      paint();
    }
  }
})();
