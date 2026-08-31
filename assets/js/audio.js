/* Audio engine — synthesised in the browser; no media files, no network. */

/* ============================================================
   Audio — everything is synthesised, no files, no network.
   * ambience : brown noise under a slow-swelling low-pass +
                two detuned sub drones. Reads as deep water.
   * move     : the soft XMB-style tick for moving between things
   * select   : its heavier sibling, for committing to one
   * impact   : the muffled note the eye makes when it lands
   ============================================================ */
window.__snd = (function(){
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return { ensure(){}, move(){}, select(){}, pick(){}, mw(){}, impact(){}, blink(){}, key(){},
                    setMuted(){}, muted:()=>true, running:()=>false,
                    nodes:()=>({}) };

  let ctx=null, master=null, ambience=null, started=false;
  let muted = (function(){ try{ return sessionStorage.getItem('muted')==='1'; }catch(e){ return false; } })();

  function build(){
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
  }

  /* --- noise, brown-ish. `brown` sets how much of the top end is rolled off
         by the integrator: higher = darker, closer to a rumble. --- */
  function noiseBuffer(secs, brown){
    const len = ctx.sampleRate*secs|0;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0, peak = 0;
    for (let i=0;i<len;i++){
      const w = Math.random()*2 - 1;
      last = (last + brown*w) / (1 + brown);
      d[i] = last;
      const a = Math.abs(last); if (a > peak) peak = a;
    }
    const norm = peak > 0 ? 0.9/peak : 1;
    for (let i=0;i<len;i++) d[i] *= norm;
    /* taper both ends so the loop seam is inaudible */
    const fade = ctx.sampleRate*0.5|0;
    for (let i=0;i<fade;i++){ const k = i/fade; d[i] *= k; d[len-1-i] *= k; }
    return buf;
  }

  function buildAmbience(){
    const out = ctx.createGain();
    out.gain.value = 0.0001;

    /* nothing in here goes anywhere near the presence range. broadband
       noise up around 1kHz is what read as harsh, so it's gone. */
    const smooth = ctx.createBiquadFilter();
    smooth.type='lowpass'; smooth.frequency.value = 1500; smooth.Q.value = 0.3;
    smooth.connect(master);
    out.connect(smooth);

    /* --- the pad. perfect intervals only — root, fifth, octave and up —
           so it has no emotional pull in either direction. each voice is
           two oscillators a few cents apart, which gives a beat slow
           enough to read as breathing rather than as wobble. --- */
    const VOICES = [
      /*  f      level   drift   depth  detune  */
      [ 55.00,  0.100,  0.0110, 0.030,  0.055 ],
      [ 82.50,  0.062,  0.0083, 0.022,  0.048 ],
      [110.00,  0.050,  0.0141, 0.017,  0.040 ],
      [165.00,  0.028,  0.0102, 0.010,  0.032 ],
      [220.00,  0.017,  0.0173, 0.006,  0.026 ]
    ];
    VOICES.forEach(([f, lvl, rate, depth, det], i)=>{
      const g = ctx.createGain(); g.gain.value = lvl;
      [f - det, f + det].forEach(ff=>{
        const o = ctx.createOscillator(); o.type='sine'; o.frequency.value = ff;
        o.connect(g); o.start();
      });
      const m = ctx.createOscillator(); m.frequency.value = rate;
      const ma = ctx.createGain(); ma.gain.value = depth;
      m.connect(ma); ma.connect(g.gain); m.start();
      if (ctx.createStereoPanner){
        const pan = ctx.createStereoPanner();
        pan.pan.value = (i % 2 ? 1 : -1) * (0.14 + i*0.05);
        g.connect(pan); pan.connect(out);
      } else g.connect(out);
    });

    /* --- a dark floor underneath. rolled off at 200Hz, so there is no
           hiss anywhere in it — it reads as air in a large room. --- */
    (function(){
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(11, 0.26); src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type='lowpass'; lp.frequency.value = 200; lp.Q.value = 0.4;
      const g = ctx.createGain(); g.gain.value = 0.10;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.009;
      const la  = ctx.createGain(); la.gain.value = 0.030;
      lfo.connect(la); la.connect(g.gain);
      src.connect(lp); lp.connect(g); g.connect(out);
      src.start(); lfo.start();
    })();

    /* --- a thought, every twenty seconds or so. same intervals as the pad,
           slow attack, long decay, never twice in the same place. --- */
    const NOTES = [110, 165, 220, 275, 330];
    function thought(){
      const t = ctx.currentTime;
      const f = NOTES[(Math.random()*NOTES.length)|0];
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.030, t + 0.45);   /* no attack edge */
      g.gain.exponentialRampToValueAtTime(0.0001, t + 5.5);
      const lp = ctx.createBiquadFilter();
      lp.type='lowpass'; lp.frequency.value = 700; lp.Q.value = 0.4;
      [[f, 1], [f*2, 0.22]].forEach(([ff, lv])=>{
        const o = ctx.createOscillator(); o.type='sine'; o.frequency.value = ff;
        const og = ctx.createGain(); og.gain.value = lv;
        o.connect(og); og.connect(lp); o.start(t); o.stop(t + 6);
      });
      lp.connect(g);
      if (ctx.createStereoPanner){
        const pan = ctx.createStereoPanner();
        pan.pan.value = Math.random()*0.8 - 0.4;
        g.connect(pan); pan.connect(out);
      } else g.connect(out);
    }
    (function schedule(){
      setTimeout(()=>{ if (!muted && ctx.state === 'running') thought(); schedule(); },
                 15000 + Math.random()*14000);
    })();

    /* --- and it sits well under everything. this is a room tone, not a
           soundtrack: you should notice it only when it stops. --- */
    const t0 = ctx.currentTime;
    out.gain.setValueAtTime(0.0001, t0);
    out.gain.exponentialRampToValueAtTime(0.05, t0 + 4);
    out.gain.exponentialRampToValueAtTime(0.17, t0 + 20);
    ambience = out;
  }

  function ensure(){
    if (!ctx) build();
    if (ctx.state === 'suspended') ctx.resume();
    /* The continuous background bed — the brown-noise "deep water" floor,
       the drone pad and the periodic thought notes — is intentionally off.
       Only the interactive sounds (key, chime, select, blink, mw) play now;
       they connect straight to master and don't need the ambience. */
    if (!started && ctx.state === 'running'){ started = true; }
    return ctx.state === 'running';
  }

  /* --- a struck tone, not a click. no noise transient at all — that was
         the plasticky part — and the attack is slow enough (12ms) that
         there is no snap on the front of it. the second partial sits just
         off a harmonic, at 2.76x, which is roughly where a struck bar
         lands; that is what makes it read as wood or glass rather than as
         a beep. --- */
  function chime(f, peak, dur, pan){
    if (!ctx || ctx.state !== 'running' || muted) return;
    const t = ctx.currentTime;

    /* the tone darkens as it decays, the way a real struck thing does */
    const lp = ctx.createBiquadFilter();
    lp.type='lowpass'; lp.Q.value = 0.5;
    lp.frequency.setValueAtTime(3000, t);
    lp.frequency.exponentialRampToValueAtTime(1100, t + dur*0.85);

    const bus = ctx.createGain(); bus.gain.value = 1;
    lp.connect(bus);
    if (ctx.createStereoPanner && pan){
      const p = ctx.createStereoPanner(); p.pan.value = pan;
      bus.connect(p); p.connect(master);
    } else bus.connect(master);

    [[1, 1, dur], [2.76, 0.15, dur*0.5], [5.40, 0.04, dur*0.26]].forEach(([mult, lv, dd])=>{
      const o = ctx.createOscillator(); o.type='sine';
      o.frequency.value = f*mult;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak*lv, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dd);
      o.connect(g); g.connect(lp);
      o.start(t); o.stop(t + dd + 0.08);
    });
    setTimeout(()=> bus.disconnect(), (dur + 0.4)*1000);
  }


  /* --- a keystroke, on the low-travel scissor keyboard rather than the
         mechanical one this used to be. ---
         The difference between the two is almost entirely travel. A tall
         key has time to make two separate events — a tick as the cap
         breaks, then a knock a few milliseconds later as it bottoms out —
         and a boom in the low end from the air moving under it. A 1mm key
         has neither: contact and bottom-out are the same instant, the
         whole event is over in about 25ms, and there is essentially
         nothing below 300Hz because there is nothing down there to move.

         So: one very tight burst up at 3.2kHz for the crack of the
         mechanism, a companion at 1.3kHz for the plastic of the cap, and a
         short mid tap instead of a bass thump. Lowpassed at 9k so it stays
         crisp without turning into a hiss.

         `strength` still runs 0.55 (the fast supporting lines) to 1.4 (a
         space bar, which is wider, hollower and duller than every other
         key on the board). --- */
  function key(strength){
    if (!ctx || ctx.state !== 'running' || muted) return;
    const t = ctx.currentTime;
    const S = strength || 1;
    const wide = S > 1;                       /* the space bar */

    const lp = ctx.createBiquadFilter();
    lp.type='lowpass'; lp.frequency.value = wide ? 6200 : 9000; lp.Q.value = 0.4;
    const hp = ctx.createBiquadFilter();
    hp.type='highpass'; hp.frequency.value = 300; hp.Q.value = 0.5;
    lp.connect(hp); hp.connect(master);

    /* the crack of the mechanism and the plastic of the cap, together */
    [[3200, 0.024, 0.011], [1300, 0.020, 0.016]].forEach(([f, lv, dur], k)=>{
      const n = ctx.sampleRate*dur|0;
      const nb = ctx.createBuffer(1, n, ctx.sampleRate);
      const nd = nb.getChannelData(0);
      for (let i=0;i<n;i++) nd[i] = (Math.random()*2-1) * Math.pow(1 - i/n, 6);
      const ns = ctx.createBufferSource(); ns.buffer = nb;
      const bp = ctx.createBiquadFilter();
      bp.type='bandpass';
      /* the variance is per-key, not per-partial, so one keystroke stays
         one object rather than two things that happened at once */
      bp.frequency.value = f * (wide ? 0.74 : 1) * (0.94 + Math.random()*0.12);
      bp.Q.value = k ? 1.1 : 0.8;
      const ng = ctx.createGain();
      ng.gain.value = lv * Math.min(S, 1.15) * (0.9 + Math.random()*0.2);
      ns.connect(bp); bp.connect(ng); ng.connect(lp);
      ns.start(t);
    });

    /* the tap of the cap reaching the deck — mid, not low, and quiet */
    const o = ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime((wide ? 340 : 470) + Math.random()*40, t);
    o.frequency.exponentialRampToValueAtTime(wide ? 210 : 300, t + 0.022);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.010 * Math.min(S, 1.2), t + 0.002);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.026);
    o.connect(og); og.connect(lp);
    o.start(t); o.stop(t + 0.05);

    setTimeout(()=> lp.disconnect(), 300);
  }

  /* --- hover: a tactile blip, not a note. ---
         The version this replaces was two sine partials a perfect fifth
         apart, which is a chord — a small one, but a chord, and a chord
         has an opinion. Play it forty times in a minute while somebody
         reads the nav and the opinion becomes a nag.

         What's wanted instead is the sound of a surface being touched.
         The body of it is filtered noise rather than oscillators, so
         there is no pitch to get tired of; the band sits at 4.2kHz, which
         is airy without being a hiss and clears the drones by two octaves.
         Under it, one sine at 2.9kHz — deliberately not in key with
         anything, so it reads as an edge on the transient rather than as a
         note — and a 4ms sliver up at 7kHz for the very front of the
         attack. Attack 2ms, body gone by 40ms, a breath of air out to
         110ms so it lands softly instead of being cut off.

         Every parameter is fixed. No detune, no velocity, no stepping:
         the tenth one has to sound exactly like the first, or the nav
         starts performing. --- */
  function tick(){
    if (!ctx || ctx.state !== 'running' || muted) return;
    const t = ctx.currentTime;

    /* highpass keeps it weightless, so it never competes with the pad */
    const hp = ctx.createBiquadFilter();
    hp.type='highpass'; hp.frequency.value = 1400; hp.Q.value = 0.5;
    const out = ctx.createGain(); out.gain.value = 1;
    hp.connect(out); out.connect(master);

    /* the body: 110ms of noise through a narrow band, shaped so almost
       all of its energy is in the first few milliseconds and the rest is
       a decay you feel rather than hear */
    const n = ctx.sampleRate*0.11|0;
    const nb = ctx.createBuffer(1, n, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i=0;i<n;i++) nd[i] = (Math.random()*2-1) * Math.pow(1 - i/n, 16);
    const ns = ctx.createBufferSource(); ns.buffer = nb;
    const bp = ctx.createBiquadFilter();
    bp.type='bandpass'; bp.frequency.value = 4200; bp.Q.value = 2.4;
    const ng = ctx.createGain(); ng.gain.value = 0.048;
    ns.connect(bp); bp.connect(ng); ng.connect(hp);
    ns.start(t);

    /* the edge: one short sine, off the key on purpose */
    const o = ctx.createOscillator(); o.type='sine';
    o.frequency.value = 2900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.014, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.038);
    o.connect(g); g.connect(hp);
    o.start(t); o.stop(t + 0.07);

    /* 4ms of air right at the front, which is what makes it read as a
       fingertip on glass rather than as a beep */
    const n2 = ctx.sampleRate*0.004|0;
    const nb2 = ctx.createBuffer(1, n2, ctx.sampleRate);
    const nd2 = nb2.getChannelData(0);
    for (let i=0;i<n2;i++) nd2[i] = (Math.random()*2-1) * Math.pow(1 - i/n2, 4);
    const ns2 = ctx.createBufferSource(); ns2.buffer = nb2;
    const bp2 = ctx.createBiquadFilter();
    bp2.type='bandpass'; bp2.frequency.value = 7000; bp2.Q.value = 0.9;
    const ng2 = ctx.createGain(); ng2.gain.value = 0.011;
    ns2.connect(bp2); bp2.connect(ng2); ng2.connect(hp);
    ns2.start(t);

    setTimeout(()=> out.disconnect(), 500);
  }

  /* --- commit: the same family, one octave down and with a fast pitch
         snap, E6 to A5, which is the interval the drones already sit on.
         140ms, no tail. --- */
  function blip(){
    if (!ctx || ctx.state !== 'running' || muted) return;
    const t = ctx.currentTime;

    const hp = ctx.createBiquadFilter();
    hp.type='highpass'; hp.frequency.value = 420; hp.Q.value = 0.5;
    const lp = ctx.createBiquadFilter();
    lp.type='lowpass'; lp.Q.value = 0.4;
    lp.frequency.setValueAtTime(7200, t);
    lp.frequency.exponentialRampToValueAtTime(2600, t + 0.14);
    hp.connect(lp); lp.connect(master);

    /* the snap: E6 -> A5 in 22ms, then a clean decay */
    const o = ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(1318.5, t);
    o.frequency.exponentialRampToValueAtTime(880, t + 0.022);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.055, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g); g.connect(hp);
    o.start(t); o.stop(t + 0.22);

    /* a quiet partial two octaves up gives it the glassy top end */
    const o2 = ctx.createOscillator(); o2.type='sine';
    o2.frequency.setValueAtTime(2637, t);
    o2.frequency.exponentialRampToValueAtTime(1760, t + 0.022);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.exponentialRampToValueAtTime(0.016, t + 0.003);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o2.connect(g2); g2.connect(hp);
    o2.start(t); o2.stop(t + 0.14);

    /* 6ms transient so the attack has an edge to it */
    const n = ctx.sampleRate*0.006|0;
    const nb = ctx.createBuffer(1, n, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i=0;i<n;i++) nd[i] = (Math.random()*2-1) * Math.pow(1 - i/n, 4);
    const ns = ctx.createBufferSource(); ns.buffer = nb;
    const bp = ctx.createBiquadFilter();
    bp.type='bandpass'; bp.frequency.value = 3800; bp.Q.value = 0.8;
    const ng = ctx.createGain(); ng.gain.value = 0.020;
    ns.connect(bp); bp.connect(ng); ng.connect(hp);
    ns.start(t);

    setTimeout(()=> lp.disconnect(), 500);
  }
  /* --- the work list: the detent on a picker wheel. ---
         This used to play a pentatonic note per project, which turned the
         list into a xylophone — charming for two passes and grating on the
         tenth. A picker doesn't play a tune. Every stop sounds the same,
         because the sound is the wheel catching, not the value it landed
         on: a soft, pitchless knock, more felt than heard, and gone in
         about 50ms.

         The construction is a single narrow-band burst rather than an
         oscillator, so there is no note in it at all. The band sits at
         2kHz — high enough to read as glass rather than wood, low enough
         that it doesn't sting — with a hair of low end underneath for the
         body of the click. The 8ms lowpass sweep on the front is what
         makes it a detent instead of a tick: the wheel arrives, then
         settles.

         `i` is still accepted so the caller doesn't have to care, and
         still ignored: every item in the list gets exactly the same
         sound. --- */
  function pick(i){
    if (!ctx || ctx.state !== 'running' || muted) return;
    const t = ctx.currentTime;

    const out = ctx.createGain(); out.gain.value = 1; out.connect(master);
    /* the settle: bright at the instant of contact, closing immediately */
    const lp = ctx.createBiquadFilter();
    lp.type='lowpass'; lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(5200, t);
    lp.frequency.exponentialRampToValueAtTime(1500, t + 0.045);
    lp.connect(out);

    /* the knock itself: 45ms of noise through a narrow band, shaped so it
       is loudest on the first sample and effectively silent by the end */
    const n = ctx.sampleRate*0.045|0;
    const nb = ctx.createBuffer(1, n, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i2=0;i2<n;i2++) nd[i2] = (Math.random()*2-1) * Math.pow(1 - i2/n, 7);
    const ns = ctx.createBufferSource(); ns.buffer = nb;
    const bp = ctx.createBiquadFilter();
    bp.type='bandpass';
    /* a whisker of variance so a fast sweep across the list doesn't phase
       into one flat buzz — far too small to be heard as a pitch change */
    bp.frequency.value = 2000 * (1 + (Math.random()-0.5)*0.05);
    bp.Q.value = 1.35;
    const ng = ctx.createGain(); ng.gain.value = 0.052;
    ns.connect(bp); bp.connect(ng); ng.connect(lp);
    ns.start(t);

    /* and just enough weight under it to feel like contact rather than air */
    const o = ctx.createOscillator(); o.type='sine';
    o.frequency.setValueAtTime(560, t);
    o.frequency.exponentialRampToValueAtTime(330, t + 0.035);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.013, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.042);
    o.connect(g); g.connect(lp);
    o.start(t); o.stop(t + 0.07);

    setTimeout(()=> out.disconnect(), 400);
  }

  /* --- the meanwhile rail: one voice per interest, so the four icons are
         distinguishable with your eyes shut. All short, all dry, all
         sitting in the same register as the rest of the UI. --- */
  function noise(dur, shape){
    const n = ctx.sampleRate*dur|0;
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i=0;i<n;i++) d[i] = (Math.random()*2-1) * shape(i/n);
    const s = ctx.createBufferSource(); s.buffer = b; return s;
  }
  function mw(kind){
    if (!ctx || ctx.state !== 'running' || muted) return;
    const t = ctx.currentTime;
    const out = ctx.createGain(); out.gain.value = 1; out.connect(master);
    const tone = (type,f0,f1,peak,dur,delay)=>{
      const o = ctx.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(f0, t+delay);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t+delay+dur*0.6);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t+delay);
      g.gain.exponentialRampToValueAtTime(peak, t+delay+0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t+delay+dur);
      o.connect(g); g.connect(out);
      o.start(t+delay); o.stop(t+delay+dur+0.05);
    };

    if (kind === 'cook'){
      /* knife on steel: two high partials, a hair apart, very dry */
      tone('sine', 2960, 2960, 0.030, 0.09, 0);
      tone('sine', 4440, 4440, 0.012, 0.055, 0);
      const ns = noise(0.02, x=>Math.pow(1-x, 6));
      const bp = ctx.createBiquadFilter(); bp.type='bandpass';
      bp.frequency.value = 6400; bp.Q.value = 1.4;
      const g = ctx.createGain(); g.gain.value = 0.016;
      ns.connect(bp); bp.connect(g); g.connect(out); ns.start(t);

    } else if (kind === 'art'){
      /* a brush stroke: filtered air sweeping up and away */
      const ns = noise(0.34, x=>Math.sin(Math.PI*Math.min(1,x*1.25))*Math.pow(1-x,1.2));
      const bp = ctx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value = 0.9;
      bp.frequency.setValueAtTime(900, t);
      bp.frequency.exponentialRampToValueAtTime(4200, t + 0.26);
      const g = ctx.createGain(); g.gain.value = 0.05;
      ns.connect(bp); bp.connect(g); g.connect(out); ns.start(t);
      tone('sine', 1174, 1568, 0.010, 0.20, 0.02);

    } else if (kind === 'pod'){
      /* two clipped square beeps — a mic opening */
      tone('square', 880, 880, 0.016, 0.045, 0);
      tone('square', 1318.5, 1318.5, 0.014, 0.055, 0.075);
      const lp = ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value = 3400;
      out.connect(lp);

    } else {
      /* racket on ball: a short thock with the pitch falling out of it */
      tone('triangle', 420, 150, 0.055, 0.11, 0);
      const ns = noise(0.045, x=>Math.pow(1-x, 3));
      const bp = ctx.createBiquadFilter(); bp.type='bandpass';
      bp.frequency.value = 1500; bp.Q.value = 0.7;
      const g = ctx.createGain(); g.gain.value = 0.05;
      ns.connect(bp); bp.connect(g); g.connect(out); ns.start(t);
    }
    setTimeout(()=> out.disconnect(), 900);
  }

  const move   = tick;
  const select = blip;


  /* --- the blink. a small papery flutter: noise under a two-lobe envelope
         (lids closing, then opening), pitched down and up in level with the
         size of the eye. tiny eyes are barely a breath; the big one is
         audible. --- */
  let lastBlink = -1;
  function blink(scale, strong){
    if (!ctx || ctx.state !== 'running' || muted) return;
    const t = ctx.currentTime;
    if (!strong && t - lastBlink < 0.105) return;   /* seven eyes; don't stack */
    lastBlink = t;
    scale = Math.max(0, Math.min(1, scale));

    const dur = 0.055 + scale*0.055;
    const n = ctx.sampleRate*dur|0;
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i=0;i<n;i++){
      const k = i/n;
      const env = Math.sin(Math.PI*k);            /* shut, then open */
      d[i] = (Math.random()*2 - 1) * env * env;
    }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type='bandpass'; bp.frequency.value = 2700 - scale*1250; bp.Q.value = 0.85;
    const lp = ctx.createBiquadFilter();
    lp.type='lowpass'; lp.frequency.value = 5200;
    const g = ctx.createGain();
    g.gain.value = (0.009 + scale*0.034) * (strong ? 3.2 : 1);
    src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(master);
    src.start(t);

    /* the big shared blink gets a little body under it */
    if (strong){
      const o = ctx.createOscillator(); o.type='sine'; o.frequency.value = 132;
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.055, t + 0.012);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      o.connect(og); og.connect(master);
      o.start(t); o.stop(t + 0.4);
    }
  }

  /* the landing: a low, damped note rather than a click */
  function impact(){
    if (!ctx || ctx.state !== 'running' || muted) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    const lp = ctx.createBiquadFilter(); lp.type='lowpass';
    lp.frequency.setValueAtTime(1400, t);
    lp.frequency.exponentialRampToValueAtTime(260, t + 0.8);
    [146.8, 220, 293.7].forEach((f,i)=>{
      const o = ctx.createOscillator(); o.type='sine'; o.frequency.value=f;
      const og = ctx.createGain(); og.gain.value = [1,0.42,0.2][i];
      o.connect(og); og.connect(lp); o.start(t); o.stop(t + 1.3);
    });
    lp.connect(g); g.connect(master);
  }

  function setMuted(m){
    muted = m;
    try{ sessionStorage.setItem('muted', m ? '1' : '0'); }catch(e){}
    if (master && ctx){
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.25);
    }
    if (!m) ensure();
  }

  return { ensure, move, select, pick, mw, impact, blink, key, setMuted,
           muted:()=>muted, running:()=>!!ctx && ctx.state === 'running',
           /* handy when wiring this into the real site */
           nodes:()=>({ ctx, master, ambience }) };
})();
