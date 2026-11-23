/* The broken clock in the Meanwhile fold.
   A 24-hour dial (midnight at the top, one point every two hours) labelled
   with what I am usually doing at that hour. It runs as a time-lapse of a
   day, starting from the time in New York: the hands sweep steadily and the
   dial bends and reforms in one continuous wave. Point at a word and the
   dial pulls itself together while the hands swing to a time inside that
   word's hours, the hour hand on the word itself; move off and the day
   carries on from there. */
(function () {
  'use strict';
  var cv = document.querySelector('.mw-clock');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* one label per two hours, starting at midnight */
  var SLOTS = ['art', 'rest', 'rest', 'cooking', 'art', 'art',
               'art', 'art', 'tennis', 'yoga', 'cooking', 'art'];
  var RED = '#F21B07', CREAM = '#FCF4DF', INK = '#171717';
  var HOURS_PER_SEC = 1 / 2.5;          // a day every minute: brisk, readable
  var WAVE = (Math.PI * 2) / 9;         // the dial's bend goes round every 9s

  var S = 0, dpr = 1, C = { x: 0, y: 0 }, R = 0, floorY = 0, fs = 12;
  var labels = [];                      // where each word sits, for hovering

  var nyHours = function () {
    var p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false })
      .formatToParts(new Date());
    var g = function (t) { var x = p.find(function (q) { return q.type === t; }); return x ? +x.value : 0; };
    return (g('hour') % 24) + g('minute') / 60 + g('second') / 3600;
  };

  var day = nyHours();                  // the clock's own time, in hours
  var dayV = 0;                         // its velocity while it is being steered
  var target = null;                    // a time to swing to, while a word is hovered
  var hoverSlot = -1;
  var amp = reduce ? 0 : 1, ampV = 0;   // how broken the dial is (0 whole, 1 fully bent)
  var theta = 0;
  var inside = false;                   // the pointer is over the clock

  var size = function () {
    var r = cv.getBoundingClientRect();
    if (!r.width) return false;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    S = r.width;
    cv.width = Math.round(S * dpr); cv.height = Math.round(S * dpr);
    C = { x: S / 2, y: S * .5 }; R = S * .43; floorY = S * .95;
    fs = Math.max(10, S * .05);
    return true;
  };
  var home = function (i) {
    var a = (i / 12) * Math.PI * 2 - Math.PI / 2 + Math.PI / 12;
    return { x: C.x + Math.cos(a) * R, y: C.y + Math.sin(a) * R, a: a };
  };
  /* where each point comes to rest on the floor: spread across it in the
     order the wave reaches them */
  var floorAt = function (i) { return { x: S * (.07 + .86 * (((i + 3) % 12) / 11)), y: floorY }; };

  var hull = function (P) {
    P = P.slice().sort(function (a, b) { return a.x - b.x || a.y - b.y; });
    var cross = function (o, a, b) { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); };
    var lo = [], up = [], i;
    for (i = 0; i < P.length; i++) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], P[i]) <= 0) lo.pop(); lo.push(P[i]); }
    for (i = P.length - 1; i >= 0; i--) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], P[i]) <= 0) up.pop(); up.push(P[i]); }
    up.pop(); lo.pop(); return lo.concat(up);
  };
  var arrow = function (a, len, w) {
    var x = C.x + Math.cos(a) * len, y = C.y + Math.sin(a) * len, hl = S * .028;
    ctx.beginPath(); ctx.moveTo(C.x, C.y); ctx.lineTo(x, y); ctx.lineWidth = w; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(a - .38) * hl, y - Math.sin(a - .38) * hl);
    ctx.lineTo(x - Math.cos(a + .38) * hl, y - Math.sin(a + .38) * hl);
    ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
    return { x: x, y: y };
  };
  var ease = function (x) { return x * x * (3 - 2 * x); };

  var draw = function () {
    var hA = (day / 24) * Math.PI * 2 - Math.PI / 2;
    var mA = ((day % 1)) * Math.PI * 2 - Math.PI / 2;
    var slotNow = Math.floor((((day % 24) + 24) % 24) / 2);

    /* each point's share of the bend: a wave travelling round the dial */
    var pts = [];
    for (var i = 0; i < 12; i++) {
      var h = home(i), f = floorAt(i);
      var w = .5 - .5 * Math.cos(theta - i * (Math.PI * 2 / 12));
      var b = amp * ease(Math.max(0, (w - .35) / .65));
      pts.push({ x: h.x + (f.x - h.x) * b, y: h.y + (f.y - h.y) * b, a: h.a, b: b });
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = RED; ctx.fillRect(0, 0, S, S);
    var tipH = { x: C.x + Math.cos(hA) * R * .62, y: C.y + Math.sin(hA) * R * .62 };
    var tipM = { x: C.x + Math.cos(mA) * R * .98, y: C.y + Math.sin(mA) * R * .98 };
    var H = hull(pts.concat([tipH, tipM, C]));
    ctx.beginPath(); H.forEach(function (p, k) { k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.closePath();
    ctx.fillStyle = CREAM; ctx.fill();

    ctx.font = '500 ' + fs + 'px "Helvetica Neue",Helvetica,Arial,Arimo,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    labels = [];
    pts.forEach(function (p, k) {
      var a = Math.atan2(p.y - C.y, p.x - C.x), inset = fs * 1.4 * (1 - p.b);
      var lx = p.x - Math.cos(a) * inset, ly = p.y - Math.sin(a) * inset - fs * .7 * p.b;
      var rot = (p.a + Math.PI / 2) * (1 - p.b);
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(rot);
      ctx.fillStyle = (k === slotNow || k === hoverSlot) ? INK : 'rgba(23,23,23,.55)';
      ctx.fillText(SLOTS[k], 0, 0);
      ctx.restore();
      labels.push({ x: lx, y: ly, w: ctx.measureText(SLOTS[k]).width, k: k });
    });
    arrow(hA, R * .62, Math.max(1.5, S * .006));
    arrow(mA, R * .98, Math.max(1.2, S * .0045));
    ctx.beginPath(); ctx.arc(C.x, C.y, Math.max(2.5, S * .011), 0, Math.PI * 2); ctx.fillStyle = RED; ctx.fill();
  };

  var last = performance.now(), running = true, ready = false;
  var step = function (now) {
    if (!ready) { ready = size(); if (!ready) { requestAnimationFrame(step); return; } }
    var dt = Math.min(.05, (now - last) / 1000); last = now;

    if (target !== null) {
      /* steered: spring the day to the chosen time the short way round */
      var d = target - day; d -= Math.round(d / 24) * 24;
      var acc = 60 * d - 12 * dayV;
      dayV += acc * dt; day += dayV * dt;
    } else if (!reduce) {
      /* free: the day runs on at a steady pace, easing back up to speed */
      dayV += (HOURS_PER_SEC - dayV) * Math.min(1, dt * 3);
      day += dayV * dt;
    } else {
      day = nyHours(); dayV = 0;
    }
    day = ((day % 24) + 24) % 24;

    /* the dial is whole while you are reading it, bent while it runs */
    var want = (inside || target !== null || reduce) ? 0 : 1;
    ampV += (-120 * (amp - want) - 20 * ampV) * dt; amp += ampV * dt;
    amp = Math.max(0, Math.min(1.02, amp));
    if (!reduce) theta += WAVE * dt * ((inside || target !== null) ? .25 : 1);

    draw();
    if (running) requestAnimationFrame(step);
  };

  /* point at a word: the hands go to a time inside that word's hours */
  var hit = function (ev) {
    var r = cv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
    var best = -1, bd = 1e9;
    labels.forEach(function (l) {
      var dx = Math.max(0, Math.abs(x - l.x) - l.w / 2), dy = Math.abs(y - l.y), d = Math.hypot(dx, dy);
      if (d < fs * 1.1 && d < bd) { bd = d; best = l.k; }
    });
    return best;
  };
  var pick = function (k) {
    if (k === hoverSlot) return;
    hoverSlot = k;
    if (k < 0) return;
    target = k * 2 + 1;                             // on the hour, the hand right on the word
    if (reduce) day = target;
  };
  cv.addEventListener('pointermove', function (ev) { var k = hit(ev); if (k >= 0) pick(k); else if (target === null) hoverSlot = -1; });
  cv.addEventListener('pointerenter', function () { inside = true; });
  cv.addEventListener('pointerleave', function () { inside = false; target = null; hoverSlot = -1; });
  cv.addEventListener('pointerdown', function (ev) { var k = hit(ev); if (k >= 0) { hoverSlot = -1; pick(k); } });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      var vis = en[0].isIntersecting;
      if (vis && !running) { running = true; last = performance.now(); requestAnimationFrame(step); }
      running = vis;
    }).observe(cv);
  }
  addEventListener('resize', function () { ready = size(); });
  requestAnimationFrame(step);
})();
