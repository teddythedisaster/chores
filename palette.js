/* Builds a full color theme from a banner photo.
   Runs in the browser: the photo is shrunk, its main colors are found
   (k-means), then backgrounds, accent, heading blocks, 8 category colors and
   status colors are derived from them. Results are cached per image. */
const Palette = (() => {
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hex(h, s, l) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 1); l = clamp(l, 0, 1);
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
  }
  const hueDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

  function kmeans(px, k = 8, iters = 12) {
    const n = px.length / 3;
    const order = [...Array(n).keys()].sort((a, b) => (px[a * 3] + px[a * 3 + 1] + px[a * 3 + 2]) - (px[b * 3] + px[b * 3 + 1] + px[b * 3 + 2]));
    let C = [...Array(k)].map((_, i) => { const j = order[Math.floor((i + .5) / k * n)] * 3; return [px[j], px[j + 1], px[j + 2]]; });
    const asg = new Int16Array(n);
    for (let it = 0; it < iters; it++) {
      const sum = C.map(() => [0, 0, 0, 0]);
      for (let i = 0; i < n; i++) {
        let best = 0, bd = 1e9;
        for (let c = 0; c < k; c++) {
          const dr = px[i * 3] - C[c][0], dg = px[i * 3 + 1] - C[c][1], db = px[i * 3 + 2] - C[c][2];
          const d = dr * dr * .3 + dg * dg * .59 + db * db * .11;
          if (d < bd) { bd = d; best = c; }
        }
        asg[i] = best; const s = sum[best]; s[0] += px[i * 3]; s[1] += px[i * 3 + 1]; s[2] += px[i * 3 + 2]; s[3]++;
      }
      C = C.map((c, i) => sum[i][3] ? [sum[i][0] / sum[i][3], sum[i][1] / sum[i][3], sum[i][2] / sum[i][3]] : c);
    }
    const counts = new Array(k).fill(0); asg.forEach(a => counts[a]++);
    return C.map((c, i) => { const [h, s, l] = rgb2hsl(...c); return { h, s, l, share: counts[i] / n }; })
      .filter(c => c.share > 0).sort((a, b) => b.share - a.share);
  }

  function loadImage(url) {
    return new Promise((res, rej) => {
      const img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = () => res(img); img.onerror = rej; img.src = url;
    });
  }

  async function clustersFor(url) {
    const key = 'chores.pal3:' + url;
    try { const c = localStorage.getItem(key); if (c) return JSON.parse(c); } catch (e) {}
    const img = await loadImage(url);
    const w = 140, h = Math.max(20, Math.round(w * img.naturalHeight / img.naturalWidth));
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0, w, h);
    const d = cx.getImageData(0, 0, w, h).data, px = [];
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) px.push(d[i], d[i + 1], d[i + 2]);
    const cl = { cl: kmeans(px, 9), w: img.naturalWidth, h: img.naturalHeight };
    try { localStorage.setItem(key, JSON.stringify(cl)); } catch (e) {}
    return cl;
  }

  // Turn color clusters into the app's theme tokens.
  function derive(cl, opts = {}) {
    const colorful = cl.filter(c => c.s > .14 && c.l > .12 && c.l < .9);
    let x = 0, y = 0, wsum = 0, ssum = 0;
    colorful.forEach(c => { const w = c.share * c.s; x += Math.cos(c.h * Math.PI / 180) * w; y += Math.sin(c.h * Math.PI / 180) * w; wsum += w; ssum += c.s * c.share; });
    const Hvivid = wsum ? (Math.atan2(y, x) * 180 / Math.PI + 360) % 360 : 30;
    // overall color cast of the photo: weighted by how much of the photo each color covers,
    // including muted colors (so a gray-blue snowy scene reads as blue, not as its few warm bits)
    let x2 = 0, y2 = 0, w2 = 0;
    cl.filter(c => c.s > .04 && c.l > .08 && c.l < .94).forEach(c => { const w = c.share * (c.s + .08); x2 += Math.cos(c.h * Math.PI / 180) * w; y2 += Math.sin(c.h * Math.PI / 180) * w; w2 += w; });
    const H = w2 ? (Math.atan2(y2, x2) * 180 / Math.PI + 360) % 360 : Hvivid;
    const share = colorful.reduce((a, c) => a + c.share, 0) || 1;
    const baseSat = clamp(ssum / share, .1, .8);

    // vivid candidates, best first
    const vivid = cl.filter(c => c.s > .18 && c.l > .18 && c.l < .85)
      .map(c => Object.assign({ score: c.s * Math.sqrt(c.share) * (1 - Math.abs(c.l - .5)) }, c))
      .sort((a, b) => b.score - a.score);
    let acc = vivid[0] || { h: H, s: .6 };
    let accent = opts.accent || hex(acc.h, clamp(acc.s, .55, .85), .6);
    if (opts.accent) { const m = opts.accent.match(/\w\w/g).map(v => parseInt(v, 16)); acc = { h: rgb2hsl(...m)[0], s: .6 }; }

    const hues = [];
    vivid.forEach(c => { if (hues.every(h => hueDist(h.h, c.h) > 28)) hues.push(c); });
    const rot = [0, 30, -30, 60, -60, 180, 150, -150, 100, -100];
    const catHues = hues.map(c => c.h);
    for (let i = 0; catHues.length < 8 && i < rot.length; i++) {
      const h = (acc.h + rot[i] + 360) % 360;
      if (catHues.every(x => hueDist(x, h) > 22)) catHues.push(h);
    }
    while (catHues.length < 8) catHues.push((acc.h + catHues.length * 45) % 360);
    const fromImage = hues.length;
    const catS = clamp(.36 + baseSat * .3, .42, .62);
    const cats = catHues.slice(0, 8).map((h, i) => hex(h, i < fromImage ? clamp((hues[i].s + catS) / 2, .38, .7) : catS * .72, i % 2 ? .67 : .62));

    // heading blocks: the photo's biggest color areas, darkened (muted photos give muted headings)
    const big = [];
    cl.filter(c => c.l > .08 && c.l < .95).sort((a, b) => b.share - a.share)
      .forEach(c => { if (big.every(b => hueDist(b.h, c.h) > 18 || Math.abs(b.s - c.s) > .25)) big.push(c); });
    // always include the photo's standout color (e.g. purple crocuses in a gray landscape)
    if (hues[0] && big.slice(0, 2).every(b => hueDist(b.h, hues[0].h) > 25)) big.splice(1, 0, hues[0]);
    hues.forEach(c => { if (big.length < 4 && big.every(b => hueDist(b.h, c.h) > 18)) big.push(c); });
    const head = [0, 1, 2, 3].map(i => {
      const c = big[i] || hues[i] || { h: (acc.h + [0, 40, -40, 80][i] + 360) % 360, s: .4 };
      return hex(c.h, clamp(c.s * .9, .2, .5), .26);
    });

    // Status colors keep their meaning (gray → orange → yellow → yellow-green → green, blue for
    // Not needed) but borrow real colors from the photo: each one snaps toward the nearest photo
    // color in its hue family and takes on that color's saturation, so the tags look sampled from it.
    const pool = cl.filter(c => c.s > .1 && c.l > .12 && c.l < .9);
    const sS = clamp(.38 + baseSat * .3, .44, .62);
    const sample = (t, reach) => {
      let best = null;
      pool.forEach(c => { const d = hueDist(c.h, t); if (d < reach && (!best || d - c.share * 40 < hueDist(best.h, t) - best.share * 40)) best = c; });
      if (!best) { let d = H - t; if (d > 180) d -= 360; if (d < -180) d += 360; return { h: t + Math.max(-22, Math.min(22, d * .35)), s: sS * .8 }; }
      let d = best.h - t; if (d > 180) d -= 360; if (d < -180) d += 360;
      return { h: t + d * .75, s: clamp(best.s * .9, .3, .7) };
    };
    const P = { p25: sample(24, 40), p50: sample(47, 30), p75: sample(76, 34), done: sample(128, 60), nn: sample(212, 70) };
    // keep the progress steps in order and apart (orange < yellow < yellow-green < green)
    const seq = ['p25', 'p50', 'p75', 'done'], gaps = [0, 14, 14, 26];
    seq.forEach((k, n) => { if (n && P[k].h < P[seq[n - 1]].h + gaps[n]) P[k].h = P[seq[n - 1]].h + gaps[n]; });
    const status = {
      not_started: hex(H, clamp(baseSat * .12, .03, .07), .52),
      p25: hex(P.p25.h, P.p25.s, .58), p50: hex(P.p50.h, P.p50.s, .6), p75: hex(P.p75.h, P.p75.s * .9, .55),
      done: hex(P.done.h, P.done.s * .85, .5), not_needed: hex(P.nn.h, P.nn.s * .8, .6)
    };
    const bgS = clamp(baseSat * .45, .08, .26);
    return {
      vars: {
        bg: hex(H, bgS, .085), surface: hex(H, bgS, .115), surface2: hex(H, bgS, .15), border: hex(H, bgS * .9, .21),
        text: hex(H, .14, .92), muted: hex(H, .12, .65), accent, h1: head[0], h2: head[1], h3: head[2], h4: head[3]
      },
      status, cats
    };
  }

  return { clustersFor, derive, hex, rgb2hsl };
})();
