/* Seasonal themes: one fixed palette per season (status colors included) plus
   holiday accents. Edit the colors here to retune the look. */
const THEMES = {
  fall: {
    label: 'Fall', icon: 'leaf',
    vars: { bg: '#191715', surface: '#211e1b', surface2: '#2a2622', border: '#37322c', text: '#ede6dc', muted: '#a0968a',
            accent: '#d97b2f', h1: '#5b3a24', h2: '#5a4a20', h3: '#3f4a2b', h4: '#4d2c2a' },
    status: { not_started: '#837a71', p25: '#d9772b', p50: '#d9b23a', p75: '#a6b83f', done: '#5f9e4f', not_needed: '#5b8fb8' }
  },
  winter: {
    label: 'Winter', icon: 'snowflake',
    vars: { bg: '#12161b', surface: '#1a2028', surface2: '#212934', border: '#2c3642', text: '#e6edf3', muted: '#8b98a8',
            accent: '#8cc0e8', h1: '#24405a', h2: '#3b3355', h3: '#23474a', h4: '#2e3f55' },
    status: { not_started: '#7b8592', p25: '#e0904a', p50: '#e6c75a', p75: '#b3c95d', done: '#6fb38a', not_needed: '#6f9fd8' }
  },
  spring: {
    label: 'Spring', icon: 'flower-2',
    vars: { bg: '#171916', surface: '#1f221e', surface2: '#272b26', border: '#343a32', text: '#eef1ea', muted: '#9ba395',
            accent: '#e88fb0', h1: '#5a3346', h2: '#3d5232', h3: '#574a2c', h4: '#36405a' },
    status: { not_started: '#858a80', p25: '#ec9a5c', p50: '#ebcf68', p75: '#b5d36a', done: '#6dbb6a', not_needed: '#79a7e0' }
  },
  summer: {
    label: 'Summer', icon: 'sun',
    vars: { bg: '#121817', surface: '#19211f', surface2: '#202a28', border: '#2b3735', text: '#e9f2ef', muted: '#8fa39e',
            accent: '#f2b94b', h1: '#1f4a48', h2: '#5a4a1c', h3: '#22475a', h4: '#5a3324' },
    status: { not_started: '#7f8c89', p25: '#f08c3c', p50: '#f2c94c', p75: '#b8d04f', done: '#4fb37e', not_needed: '#4f9ad8' }
  }
};

const STATUSES = [
  { id: 'not_started', label: 'Not started' },
  { id: 'p25', label: '25%' },
  { id: 'p50', label: '50%' },
  { id: 'p75', label: '75%' },
  { id: 'done', label: 'Done' },
  { id: 'not_needed', label: 'Not needed' }
];

const HOLIDAYS = {
  halloween:    { label: 'Halloween', icon: 'pumpkin', accent: '#ef7f22' },
  thanksgiving: { label: 'Thanksgiving', icon: 'wheat', accent: '#d9952f' },
  winterfest:   { label: 'Winter holidays', icon: 'gift', accent: '#e05a5a' },
  newyear:      { label: 'New Year', icon: 'party-popper', accent: '#e8c45a' },
  valentine:    { label: "Valentine's Day", icon: 'heart', accent: '#ef6f93' },
  stpatrick:    { label: "St. Patrick's Day", icon: 'clover', accent: '#5fbf6a' },
  july4:        { label: 'Fourth of July', icon: 'sparkles', accent: '#e05656' }
};

function seasonFor(ds) {
  const md = ds.slice(5);
  if (md >= '12-21' || md < '03-20') return 'winter';
  if (md < '06-21') return 'spring';
  if (md < '09-22') return 'summer';
  return 'fall';
}

function holidayFor(ds) {
  const md = ds.slice(5), y = +ds.slice(0, 4);
  if (md >= '12-31' || md <= '01-02') return 'newyear';
  if (md >= '02-07' && md <= '02-14') return 'valentine';
  if (md >= '03-14' && md <= '03-17') return 'stpatrick';
  if (md >= '07-01' && md <= '07-05') return 'july4';
  if (md >= '10-15' && md <= '10-31') return 'halloween';
  if (md >= '12-10' && md <= '12-30') return 'winterfest';
  // Thanksgiving: Monday before the 4th Thursday of November through Sunday after
  const nov1 = Rec.weekday(y + '-11-01');
  const thu = 1 + ((4 - nov1 + 7) % 7) + 21;
  const tg = y + '-11-' + Rec.pad(thu);
  const n = Rec.dayNum(ds), t = Rec.dayNum(tg);
  if (n >= t - 3 && n <= t + 3) return 'thanksgiving';
  return null;
}

/* ---------- banner illustrations (SVG, generated) ---------- */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const W = 1200, H = 300;

function hills(r, y, amp, color, n = 6) {
  let d = `M0 ${H} L0 ${y}`;
  const step = W / n;
  let px = 0, py = y;
  for (let i = 1; i <= n; i++) {
    const x = i * step, ny = y + (r() - 0.5) * amp * 2;
    d += ` Q${px + step / 2} ${py - amp * (0.5 + r())} ${x} ${ny}`;
    px = x; py = ny;
  }
  return `<path d="${d} L${W} ${H} Z" fill="${color}"/>`;
}

function deciduous(r, x, base, h, trunk, leaves) {
  let s = `<path d="M${x - 4} ${base} L${x - 2} ${base - h} L${x + 2} ${base - h} L${x + 4} ${base} Z" fill="${trunk}"/>`;
  const cy = base - h, rad = h * 0.42;
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2, d = r() * rad * 0.8;
    s += `<circle cx="${(x + Math.cos(a) * d).toFixed(1)}" cy="${(cy + Math.sin(a) * d * 0.8).toFixed(1)}" r="${(rad * (0.45 + r() * 0.35)).toFixed(1)}" fill="${pick(r, leaves)}" opacity="${(0.85 + r() * 0.15).toFixed(2)}"/>`;
  }
  return s;
}

function pine(r, x, base, h, color, snow) {
  let s = `<rect x="${x - 3}" y="${base - h * 0.15}" width="6" height="${h * 0.15}" fill="#2a2320"/>`;
  for (let i = 0; i < 3; i++) {
    const top = base - h + i * h * 0.25, w = h * (0.22 + i * 0.1), bot = top + h * 0.45;
    s += `<path d="M${x} ${top} L${x + w} ${bot} L${x - w} ${bot} Z" fill="${color}"/>`;
    if (snow) s += `<path d="M${x} ${top} L${x + w * 0.45} ${top + h * 0.2} Q${x} ${top + h * 0.15} ${x - w * 0.45} ${top + h * 0.2} Z" fill="${snow}"/>`;
  }
  return s;
}

function scatter(r, n, fn) { let s = ''; for (let i = 0; i < n; i++) s += fn(r() * W, r() * H, i); return s; }

function bannerSVG(season, holiday, seed = 7) {
  const r = rng(seed * 997 + season.length * 31 + (holiday ? holiday.length : 0));
  let sky, body = '';
  if (season === 'fall') {
    sky = holiday === 'halloween' ? ['#2b1a3a', '#7a3a3f', '#e0782f'] : ['#f2c27b', '#e9964f', '#c4633a'];
    body += hills(r, 170, 25, holiday === 'halloween' ? '#3a2433' : '#b3563a', 5);
    body += hills(r, 205, 20, holiday === 'halloween' ? '#2a1a26' : '#8a3f2c', 6);
    const leaves = ['#e8892f', '#d9582b', '#f0b13c', '#c43d27', '#e9a03a', '#b8461f'];
    const xs = []; for (let x = 20; x < W; x += (holiday === 'halloween' ? 95 : 70) + r() * 60) xs.push(x);
    xs.forEach(x => { body += deciduous(r, x, 285 + r() * 10, 90 + r() * 75, holiday === 'halloween' ? '#1e1418' : '#3b2a22', holiday === 'halloween' ? ['#8a3a1c', '#6a2a18', '#a8501f', '#4a1f16'] : leaves); });
    body += hills(r, 268, 8, '#5a2f1f', 4);
    body += scatter(r, 26, (x, y) => `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="5" ry="2.6" fill="${pick(r, leaves)}" transform="rotate(${(r() * 180).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`);
  } else if (season === 'winter') {
    sky = ['#14213a', '#2c4469', '#6d8fb8'];
    body += `<circle cx="980" cy="70" r="30" fill="#f2f0e6" opacity=".9"/>`;
    body += scatter(r, 50, (x, y) => y < 160 ? `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(r() * 1.4 + .4).toFixed(1)}" fill="#fff" opacity="${(r() * .6 + .3).toFixed(2)}"/>` : '');
    body += hills(r, 190, 22, '#9fb6cf', 5);
    for (let x = 10; x < W; x += 40 + r() * 50) body += pine(r, x, 215 + r() * 10, 80 + r() * 50, '#1f3b45', '#dce8f2');
    body += hills(r, 250, 12, '#e4edf5', 5);
    for (let x = 30; x < W; x += 90 + r() * 90) body += pine(r, x, 300, 120 + r() * 60, '#183139', '#eef4f9');
    body += scatter(r, 70, (x, y) => `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(r() * 2 + 1).toFixed(1)}" fill="#fff" opacity=".8"/>`);
  } else if (season === 'spring') {
    sky = ['#a9d6ea', '#d7ebef', '#f6dfe6'];
    body += hills(r, 175, 25, '#9cc48a', 5);
    body += hills(r, 215, 18, '#79ad6a', 6);
    const blossoms = ['#f4b6c9', '#f7cfdc', '#ee9ab6', '#fde6ee', '#e888a8'];
    for (let x = 30; x < W; x += 110 + r() * 90) body += deciduous(r, x, 280 + r() * 10, 80 + r() * 60, '#5a4034', blossoms);
    body += hills(r, 270, 8, '#5e9a52', 4);
    body += scatter(r, 40, (x, y) => `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="3.5" ry="2" fill="${pick(r, blossoms)}" transform="rotate(${(r() * 180).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`);
  } else {
    sky = ['#4fb3d9', '#9fd8e6', '#f7e3a6'];
    body += `<circle cx="960" cy="80" r="44" fill="#ffe08a"/><circle cx="960" cy="80" r="64" fill="#ffe08a" opacity=".25"/>`;
    body += scatter(r, 5, (x, y) => { const cy = 40 + r() * 70; return `<g fill="#fff" opacity=".85"><ellipse cx="${x.toFixed(0)}" cy="${cy.toFixed(0)}" rx="48" ry="14"/><ellipse cx="${(x + 22).toFixed(0)}" cy="${(cy - 10).toFixed(0)}" rx="26" ry="14"/></g>`; });
    body += hills(r, 190, 22, '#8fc46a', 5);
    body += hills(r, 225, 16, '#d8c06a', 6);
    for (let x = 40; x < W; x += 140 + r() * 120) body += deciduous(r, x, 270, 90 + r() * 50, '#4a3a2a', ['#3f8a45', '#4f9d4a', '#2f7a40', '#5fae55']);
    body += hills(r, 268, 8, '#6aa548', 4);
    body += scatter(r, 30, (x, y) => y > 240 ? `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="2.4" fill="${pick(r, ['#fff', '#ffd84d', '#f28ab0'])}"/>` : '');
  }

  // holiday overlays
  let over = '';
  if (holiday === 'halloween') {
    over += `<circle cx="930" cy="80" r="42" fill="#f6dca0"/><circle cx="930" cy="80" r="62" fill="#f6dca0" opacity=".18"/>`;
    for (let i = 0; i < 7; i++) {
      const x = 700 + r() * 450, y = 30 + r() * 110, s = 0.6 + r() * 0.7;
      over += `<path transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${s.toFixed(2)})" d="M0 0 Q-8 -8 -18 -4 Q-12 0 -14 6 Q-8 2 -4 6 Q-2 2 0 4 Q2 2 4 6 Q8 2 14 6 Q12 0 18 -4 Q8 -8 0 0Z" fill="#1a1020"/>`;
    }
    [[120, 288], [190, 292], [520, 290], [860, 292], [1080, 288]].forEach(([x, y]) => {
      const s = 0.8 + r() * 0.6;
      over += `<g transform="translate(${x} ${y}) scale(${s.toFixed(2)})"><ellipse cx="0" cy="-12" rx="20" ry="14" fill="#e8741f"/><ellipse cx="-8" cy="-12" rx="9" ry="14" fill="#f08a2c"/><ellipse cx="8" cy="-12" rx="9" ry="14" fill="#d9651a"/><rect x="-2" y="-30" width="4" height="7" rx="1" fill="#4a5a2a"/></g>`;
    });
  } else if (holiday === 'thanksgiving') {
    over += scatter(r, 30, (x, y) => `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="6" ry="3" fill="${pick(r, ['#c4632a', '#e09a35', '#8a3a20'])}" transform="rotate(${(r() * 180).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})"/>`);
  } else if (holiday === 'winterfest') {
    for (let k = 0; k < 2; k++) {
      const y0 = 18 + k * 26, sag = 40;
      over += `<path d="M0 ${y0} Q300 ${y0 + sag} 600 ${y0} Q900 ${y0 + sag} 1200 ${y0}" stroke="#2a2a2a" stroke-width="2" fill="none"/>`;
      for (let x = 20; x < W; x += 34) {
        const seg = x < 600 ? x / 600 : (x - 600) / 600;
        const y = y0 + sag * 2 * seg * (1 - seg) + 6;
        const c = pick(r, ['#ff5a5a', '#ffd34d', '#5ad1ff', '#7dff8a', '#ff8ad8']);
        over += `<circle cx="${x}" cy="${y.toFixed(1)}" r="9" fill="${c}" opacity=".25"/><ellipse cx="${x}" cy="${y.toFixed(1)}" rx="3.5" ry="5" fill="${c}"/>`;
      }
    }
  } else if (holiday === 'newyear' || holiday === 'july4') {
    const cols = holiday === 'july4' ? ['#ff5a5a', '#ffffff', '#5a8dff'] : ['#ffd34d', '#ffffff', '#ff8ad8', '#7de0ff'];
    for (let i = 0; i < 6; i++) {
      const cx = 80 + r() * 1040, cy = 40 + r() * 90, c = pick(r, cols), R = 25 + r() * 25;
      for (let a = 0; a < 16; a++) {
        const t = a / 16 * Math.PI * 2;
        over += `<line x1="${(cx + Math.cos(t) * R * .3).toFixed(1)}" y1="${(cy + Math.sin(t) * R * .3).toFixed(1)}" x2="${(cx + Math.cos(t) * R).toFixed(1)}" y2="${(cy + Math.sin(t) * R).toFixed(1)}" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`;
      }
    }
  } else if (holiday === 'valentine') {
    over += scatter(r, 18, (x, y) => { const s = 0.5 + r(); return `<path transform="translate(${x.toFixed(0)} ${(y * .6).toFixed(0)}) scale(${s.toFixed(2)})" d="M0 6 C-12 -4 -6 -14 0 -7 C6 -14 12 -4 0 6Z" fill="${pick(r, ['#ef6f93', '#f7a8c0', '#e04a6f'])}" opacity=".9"/>`; });
  } else if (holiday === 'stpatrick') {
    over += scatter(r, 22, (x) => { const y = 255 + r() * 40, s = .6 + r() * .6; return `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${s.toFixed(2)})" fill="#3fae4f"><circle cx="0" cy="-6" r="5"/><circle cx="-5.5" cy="1" r="5"/><circle cx="5.5" cy="1" r="5"/><rect x="-1" y="2" width="2" height="9"/></g>`; });
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="sky-${season}-${holiday}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset=".55" stop-color="${sky[1]}"/><stop offset="1" stop-color="${sky[2]}"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#sky-${season}-${holiday})"/>${body}${over}</svg>`;
}
