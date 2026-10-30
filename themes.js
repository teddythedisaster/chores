/* Themes. Colors normally come from the day's photo (see palette.js); the
   season palettes below are only a fallback when a month has no photos.
   MONTHS sets each month's default icon and drifting particles; icons can be
   changed in the app's Settings. */
const MONTHS = [
  { key: 'january',   label: 'January',   icon: 'fa:snowflake',      particles: 'snow',   colors: ['#ffffff', '#eef4fa', '#dfeaf5'] },
  { key: 'february',  label: 'February',  icon: 'fa:mountain-sun',   particles: 'snow',   colors: ['#ffffff', '#f3eefa', '#e6dff5'] },
  { key: 'march',     label: 'March',     icon: 'fa:seedling',       particles: 'petals', colors: ['#f4f7f0', '#e3eedc', '#d6e8c8', '#ffffff'] },
  { key: 'april',     label: 'April',     icon: 'ms:local_florist',  particles: 'petals', colors: ['#f7c6d5', '#f4b0c6', '#fde4ec', '#efa0bb'] },
  { key: 'may',       label: 'May',       icon: 'ms:filter_vintage', particles: 'petals', colors: ['#d9b8f0', '#f2e6ff', '#ffffff', '#f7c6d5'] },
  { key: 'june',      label: 'June',      icon: 'fa:sun',            particles: 'motes',  colors: ['#ffe58a', '#fff3b0', '#e8f59a'] },
  { key: 'july',      label: 'July',      icon: 'fa:umbrella-beach', particles: 'motes',  colors: ['#fff3b0', '#ffffff', '#bff3ec'] },
  { key: 'august',    label: 'August',    icon: 'ms:forest',         particles: 'motes',  colors: ['#ffe58a', '#fff3b0', '#e8f59a'] },
  { key: 'september', label: 'September', icon: 'ms:park',           particles: 'leaves', colors: ['#e8b33a', '#d9a02a', '#c9862a', '#a8b83a', '#f0c850'] },
  { key: 'october',   label: 'October',   icon: 'fa:leaf',           particles: 'leaves', colors: ['#e8892f', '#d9582b', '#f0b13c', '#c43d27', '#e9a03a'] },
  { key: 'november',  label: 'November',  icon: 'fa:mug-hot',        particles: 'leaves', colors: ['#a0522d', '#8b4513', '#c46a2a', '#6b3a1f', '#d08a3a'] },
  { key: 'december',  label: 'December',  icon: 'ms:fireplace',      particles: 'snow',   colors: ['#ffffff', '#eef4fa', '#dfeaf5'] }
];

const THEMES = {
  fall: {
    label: 'Fall', icon: 'fa:leaf', cats: ['#e8892f', '#d9b23a', '#c95a3c', '#8fae4a', '#b8783a', '#d97a9a', '#6f9fc0', '#a98bd0'],
    vars: { bg: '#191715', surface: '#211e1b', surface2: '#2a2622', border: '#37322c', text: '#ede6dc', muted: '#a0968a',
            accent: '#d97b2f', h1: '#5b3a24', h2: '#5a4a20', h3: '#3f4a2b', h4: '#4d2c2a' },
    status: { not_started: '#837a71', p25: '#d9772b', p50: '#d9b23a', p75: '#a6b83f', done: '#5f9e4f', not_needed: '#5b8fb8', missed: '#8a5f5a' }
  },
  winter: {
    label: 'Winter', icon: 'fa:snowflake', cats: ['#8cc0e8', '#a79be0', '#6fc6b8', '#e8a0b8', '#e6c75a', '#e0904a', '#9ccf7a', '#c7d3e0'],
    vars: { bg: '#12161b', surface: '#1a2028', surface2: '#212934', border: '#2c3642', text: '#e6edf3', muted: '#8b98a8',
            accent: '#8cc0e8', h1: '#24405a', h2: '#3b3355', h3: '#23474a', h4: '#2e3f55' },
    status: { not_started: '#7b8592', p25: '#e0904a', p50: '#e6c75a', p75: '#b3c95d', done: '#6fb38a', not_needed: '#6f9fd8', missed: '#8a5f5a' }
  },
  spring: {
    label: 'Spring', icon: 'fa:seedling', cats: ['#e88fb0', '#8fca72', '#e8c45a', '#9ab0f0', '#c49be6', '#f0a070', '#6fc4c0', '#d8e07a'],
    vars: { bg: '#171916', surface: '#1f221e', surface2: '#272b26', border: '#343a32', text: '#eef1ea', muted: '#9ba395',
            accent: '#e88fb0', h1: '#5a3346', h2: '#3d5232', h3: '#574a2c', h4: '#36405a' },
    status: { not_started: '#858a80', p25: '#ec9a5c', p50: '#ebcf68', p75: '#b5d36a', done: '#6dbb6a', not_needed: '#79a7e0', missed: '#8a5f5a' }
  },
  summer: {
    label: 'Summer', icon: 'fa:sun', cats: ['#f2b94b', '#4fc1b8', '#f0805a', '#7fc45a', '#5aa0e8', '#e87aa0', '#c89be0', '#e8d85a'],
    vars: { bg: '#121817', surface: '#19211f', surface2: '#202a28', border: '#2b3735', text: '#e9f2ef', muted: '#8fa39e',
            accent: '#f2b94b', h1: '#1f4a48', h2: '#5a4a1c', h3: '#22475a', h4: '#5a3324' },
    status: { not_started: '#7f8c89', p25: '#f08c3c', p50: '#f2c94c', p75: '#b8d04f', done: '#4fb37e', not_needed: '#4f9ad8', missed: '#8a5f5a' }
  }
};

const STATUSES = [
  { id: 'not_started', label: 'Not started' },
  { id: 'p25', label: '25%' },
  { id: 'p50', label: '50%' },
  { id: 'p75', label: '75%' },
  { id: 'done', label: 'Done' },
  { id: 'not_needed', label: 'Not needed' },
  { id: 'missed', label: 'Missed' }
];

const HOLIDAYS = {
  halloween:    { label: 'Halloween', icon: 'fa:ghost', accent: '#ef7f22' },
  thanksgiving: { label: 'Thanksgiving', icon: 'fa:wheat-awn', accent: '#d9952f' },
  winterfest:   { label: 'Christmas', icon: 'fa:gift', accent: '#e05a5a' },
  newyear:      { label: 'New Year', icon: 'fa:champagne-glasses', accent: '#e8c45a' },
  valentine:    { label: "Valentine's Day", icon: 'fa:heart', accent: '#ef6f93' },
  stpatrick:    { label: "St. Patrick's Day", icon: 'fa:clover', accent: '#5fbf6a' },
  easter:       { label: 'Easter', icon: 'fa:egg', accent: '#e8a8c8' },
  july4:        { label: 'Fourth of July', icon: 'fa:star', accent: '#e05656' }
};

function seasonFor(ds) {
  const m = +ds.slice(5, 7); // by calendar month, matching the photo folders
  if (m === 12 || m <= 2) return 'winter';
  if (m <= 5) return 'spring';
  if (m <= 8) return 'summer';
  return 'fall';
}

// Easter Sunday (Gregorian), as 'YYYY-MM-DD'
function easterDate(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return y + '-' + Rec.pad(month) + '-' + Rec.pad(day);
}

// Holiday windows (inclusive): each holiday shows from N days before through the day itself.
function holidayFor(ds) {
  const y = +ds.slice(0, 4), n = Rec.dayNum(ds);
  const within = (day, before) => { const d = Rec.dayNum(day); return n >= d - before && n <= d; };
  const nov1 = Rec.weekday(y + '-11-01');
  const thanksgiving = y + '-11-' + Rec.pad(1 + ((4 - nov1 + 7) % 7) + 21);
  if (within((y + 1) + '-01-01', 2) || within(y + '-01-01', 0)) return 'newyear';   // Dec 30 – Jan 1
  if (within(y + '-02-14', 2)) return 'valentine';                                   // Feb 12–14
  if (within(y + '-03-17', 2)) return 'stpatrick';                                   // Mar 15–17
  if (within(easterDate(y), 7)) return 'easter';                                     // week before + Easter
  if (within(y + '-07-04', 2)) return 'july4';                                       // Jul 2–4
  if (within(y + '-10-31', 7)) return 'halloween';                                   // Oct 24–31
  if (within(thanksgiving, 7)) return 'thanksgiving';                                // week before + Thanksgiving
  if (within(y + '-12-25', 14)) return 'winterfest';                                 // Dec 11–25
  return null;
}

/* ---------- banner photos ----------
   Photos live in banners/ and are listed in banners/banners.json by season
   or holiday. One is picked per day; colors are pulled from it. */
let BANNERS = null;
async function loadBanners() {
  try { const r = await fetch('banners/banners.json', { cache: 'no-cache' }); BANNERS = await r.json(); }
  catch (e) { BANNERS = BANNERS || {}; }
  try { localStorage.setItem('chores.banners', JSON.stringify(BANNERS)); } catch (e) {}
}
try { BANNERS = JSON.parse(localStorage.getItem('chores.banners')); } catch (e) {}

const MONTH_KEYS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const isPortraitScreen = () => typeof innerWidth !== 'undefined' && innerHeight > innerWidth * 1.1;
// Holiday photos first, then that month's, then the season's.
// Order: each list is shuffled; every photo shows once (one per day), then the
// list is reshuffled. The shuffle is seeded by the date, so every device shows
// the same photo without storing anything, and a photo never repeats two days
// in a row (including across reshuffles and holiday/month switches).
function seededShuffle(n, seed) {
  let a = seed >>> 0;
  const rnd = () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const p = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  return p;
}
function strSeed(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function cycleOrder(key, n, cycle) {
  const p = seededShuffle(n, strSeed(key + ':' + cycle));
  if (n > 1 && cycle > 0) { // don't start a cycle with the photo that ended the previous one
    const prev = seededShuffle(n, strSeed(key + ':' + (cycle - 1)));
    if (p[0] === prev[n - 1]) [p[0], p[1]] = [p[1], p[0]];
  }
  return p;
}
// Photos taken out of the rotation (Settings → Photos); set by app.js from the synced settings.
let HIDDEN_PHOTOS = [], CUSTOM_PHOTOS = {}; // photos you added (saved in your Google Drive)
const photoFile = e => typeof e === 'string' ? e : e.file;
const shownPhotos = k => [...((BANNERS || {})[k] || []), ...(CUSTOM_PHOTOS[k] || [])].filter(e => !HIDDEN_PHOTOS.includes(photoFile(e)));
function rawPick(ds, season, holiday, rotDs) {
  const month = MONTH_KEYS[+ds.slice(5, 7) - 1];
  const key = [holiday, month, season].find(k => k && shownPhotos(k).length);
  if (!key) return null;
  const list = shownPhotos(key).map(e => typeof e === 'string' ? { file: e } : e), n = list.length;
  // Cycles start on the 1st of the month, or on the first day of a holiday window.
  let anchor = rotDs.slice(0, 8) + '01', idx, seedKey;
  if (key === holiday && typeof holidayFor === 'function') {
    // holiday windows continue the same rotation year after year
    anchor = rotDs;
    for (let k = 0; k < 20 && holidayFor(Rec.addDays(anchor, -1)) === holiday; k++) anchor = Rec.addDays(anchor, -1);
    let len = 1; while (len < 20 && holidayFor(Rec.addDays(anchor, len)) === holiday) len++;
    idx = Math.max(0, +anchor.slice(0, 4) - 2026) * len + (Rec.dayNum(rotDs) - Rec.dayNum(anchor));
    seedKey = key;
  } else {
    idx = Rec.dayNum(rotDs) - Rec.dayNum(anchor);
    seedKey = key + '@' + anchor;
  }
  const cycle = Math.floor(idx / n), pos = idx % n;
  const order = cycleOrder(seedKey, n, cycle);
  return { list, order, pos, key, e: list[order[pos]] };
}
const samePhoto = (a, b) => !!(a && b && ((a.url || a.file) === (b.url || b.file) || (a.credit && a.credit === b.credit && a.w === b.w && a.h === b.h)));
function bannerFor(ds, season, holiday, rotDs = ds) {
  const r = rawPick(ds, season, holiday, rotDs);
  if (!r) return null;
  let e = r.e;
  // also avoid repeating yesterday's photo when switching lists (e.g. Halloween -> November)
  if (r.list.length > 1 && typeof holidayFor === 'function') {
    const y = Rec.addDays(rotDs, -1), yds = ds === rotDs ? y : ds;
    const prev = rawPick(yds, seasonFor(yds), ds === rotDs ? holidayFor(y) : holiday, y);
    if (prev && prev.key !== r.key && samePhoto(prev.e, e)) e = r.list[r.order[(r.pos + 1) % r.list.length]];
  }
  const url = /^https?:/.test(e.file) ? e.file : 'banners/' + e.file;
  return { url, file: e.file, focus: e.focus || 'center', phoneFocus: e.phoneFocus || e.focus || 'center', accent: e.accent || null,
           layout: e.layout || null, w: e.w, h: e.h, cl: e.cl || null, credit: e.credit || '' };
}

// Drifting particles: holidays override the month's setting.
const HOLIDAY_PARTICLES = {
  valentine: ['hearts', ['#ef6f93', '#f7a8c0', '#e04a6f']],
  winterfest: ['snow', ['#ffffff', '#eef4fa', '#dfeaf5']],
  easter: ['petals', ['#f7c6d5', '#fde4ec', '#fff2b8', '#d8ecc8']],
  newyear: ['motes', ['#ffd970', '#fff1c2', '#ffe9a0']],
  july4: ['motes', ['#ff7a7a', '#ffffff', '#8fb4ff']],
  halloween: ['leaves', ['#e8741f', '#c4521c', '#8a3a1c', '#f0a030', '#6a3a6a']],
  thanksgiving: ['leaves', ['#c4632a', '#e09a35', '#8a3a20', '#d9b23a']],
  stpatrick: ['petals', ['#5fbf6a', '#8fd88f', '#ffffff']]
};
function particlesFor(monthIdx, holiday) {
  if (holiday && HOLIDAY_PARTICLES[holiday]) return HOLIDAY_PARTICLES[holiday];
  const m = MONTHS[monthIdx]; return [m.particles, m.colors];
}

/* ---------- fallback banner illustrations (used until photos are added) ---------- */
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
