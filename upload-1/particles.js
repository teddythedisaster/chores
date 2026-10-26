/* Subtle seasonal particles drifting over the page: leaves (fall), petals
   (spring), snow (winter), fireflies (summer), plus a few holiday variants.
   Sparse on purpose; pauses when the app is hidden and respects the
   system "reduce motion" setting. */
const Particles = (() => {
  let cv, cx, parts = [], kind = null, colors = [], raf = 0, last = 0, W = 0, H = 0, dpr = 1, enabled = true;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  const KINDS = {
    leaves: { n: 10, make: () => ({ size: rnd(7, 12), vy: rnd(16, 32), sway: rnd(18, 40), spin: rnd(-1.2, 1.2), flut: rnd(1.5, 3), a: rnd(.55, .85) }) },
    petals: { n: 12, make: () => ({ size: rnd(4.5, 7.5), vy: rnd(10, 22), vx: rnd(6, 16), sway: rnd(20, 45), spin: rnd(-1.5, 1.5), flut: rnd(2, 4), a: rnd(.55, .9) }) },
    snow:   { n: 18, make: () => ({ size: rnd(1.2, 3.2), vy: rnd(14, 34), sway: rnd(6, 18), a: rnd(.35, .85) }) },
    motes:  { n: 12, make: () => ({ size: rnd(1.4, 2.6), vy: -rnd(4, 10), sway: rnd(12, 30), a: rnd(.3, .8), tw: rnd(1, 2.5) }) },
    hearts: { n: 10, make: () => ({ size: rnd(5, 9), vy: -rnd(8, 16), sway: rnd(14, 30), spin: rnd(-.4, .4), a: rnd(.45, .8) }) }
  };

  function spawn(p, initial) {
    const k = KINDS[kind];
    Object.assign(p, k.make(), { x: rnd(0, W), t: rnd(0, 100), rot: rnd(0, 6.28), color: pick(colors) });
    p.y = initial ? rnd(0, H) : (p.vy < 0 ? H + 10 : -12);
    return p;
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const k = KINDS[kind]; if (!k) return;
    const target = Math.round(clampN(k.n * Math.sqrt(W * H / (412 * 900)), k.n * .7, k.n * 1.6));
    while (parts.length < target) parts.push(spawn({}, true));
    parts.length = target;
  }
  const clampN = (x, a, b) => Math.max(a, Math.min(b, x));

  function draw(p) {
    const x = p.x + Math.sin(p.t * .7) * p.sway;
    cx.save(); cx.translate(x, p.y); cx.globalAlpha = p.a;
    cx.fillStyle = p.color;
    if (kind === 'snow') { cx.beginPath(); cx.arc(0, 0, p.size, 0, 6.283); cx.fill(); }
    else if (kind === 'motes') {
      const tw = .5 + .5 * Math.sin(p.t * p.tw);
      cx.globalAlpha = p.a * tw; cx.shadowColor = p.color; cx.shadowBlur = 8;
      cx.beginPath(); cx.arc(0, 0, p.size, 0, 6.283); cx.fill();
    } else {
      cx.rotate(p.rot); const fl = Math.cos(p.t * (p.flut || 1)); cx.scale((fl < 0 ? -1 : 1) * Math.max(.2, Math.abs(fl)), 1);
      const s = p.size; cx.beginPath();
      if (kind === 'leaves') {
        cx.moveTo(0, -s); cx.quadraticCurveTo(s * .9, -s * .2, 0, s); cx.quadraticCurveTo(-s * .9, -s * .2, 0, -s); cx.fill();
        cx.strokeStyle = 'rgba(0,0,0,.25)'; cx.lineWidth = .7; cx.beginPath(); cx.moveTo(0, -s * .8); cx.lineTo(0, s * 1.15); cx.stroke();
      } else if (kind === 'petals') {
        cx.moveTo(0, s); cx.bezierCurveTo(s * .9, s * .4, s * .7, -s * .8, s * .15, -s * .7);
        cx.lineTo(0, -s * .45); cx.lineTo(-s * .15, -s * .7);
        cx.bezierCurveTo(-s * .7, -s * .8, -s * .9, s * .4, 0, s); cx.fill();
      } else if (kind === 'hearts') {
        cx.moveTo(0, s * .35); cx.bezierCurveTo(-s, -s * .3, -s * .45, -s, 0, -s * .45);
        cx.bezierCurveTo(s * .45, -s, s, -s * .3, 0, s * .35); cx.fill();
      }
    }
    cx.restore();
  }

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (ts - (last || ts)) / 1000); last = ts;
    cx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.t += dt; p.y += p.vy * dt; p.x += (p.vx || 0) * dt; if (p.spin) p.rot += p.spin * dt;
      if (p.y > H + 20 || p.y < -20 || p.x > W + 60) spawn(p, false);
      draw(p);
    }
  }

  function stop() { cancelAnimationFrame(raf); raf = 0; last = 0; if (cx) cx.clearRect(0, 0, W, H); }
  function start() {
    if (!kind || !enabled || raf || document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    raf = requestAnimationFrame(frame);
  }

  function set(newKind, newColors, on = true) {
    enabled = on;
    if (!cv) {
      cv = document.createElement('canvas'); cv.id = 'particles'; cv.setAttribute('aria-hidden', 'true');
      document.body.appendChild(cv); cx = cv.getContext('2d');
      addEventListener('resize', resize);
      document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
    }
    const changed = newKind !== kind || JSON.stringify(newColors) !== JSON.stringify(colors);
    kind = newKind; colors = newColors;
    if (changed) { parts = []; resize(); }
    if (!enabled) { stop(); return; }
    start();
  }
  return { set };
})();
