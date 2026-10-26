// Daily job (run by GitHub Actions): points the installed app's home-screen icon at
// today's month or holiday icon. Uses the icon chosen in the app's Settings when the
// Google Sheet is connected (APP_URL / APP_KEY secrets), otherwise the default.
// Writes PNGs into appicon/ and updates manifest.webmanifest only when something changed.
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { Resvg } from '@resvg/resvg-js';

const ROOT = process.env.SITE_DIR || '.';
const read = f => fs.readFileSync(`${ROOT}/${f}`, 'utf8');

// Load the app's own date/holiday logic and icon data so this always matches the app.
const ctx = { console, Date, Math, JSON };
vm.createContext(ctx);
vm.runInContext(read('recurrence.js').replace(/^var Rec\b/m, 'globalThis.Rec'), ctx);
vm.runInContext(read('icons-core.js').replace(/^const SOLID_CORE=/m, 'globalThis.SOLID_CORE=').replace(/^const STARTER_ICONS=/m, 'globalThis.STARTER_ICONS='), ctx);
vm.runInContext(read('themes.js').replace(/^const MONTHS =/m, 'globalThis.MONTHS =').replace(/^const HOLIDAYS =/m, 'globalThis.HOLIDAYS =') + '\nglobalThis.holidayFor = holidayFor;', ctx);

// Today in the app's time zone
const tz = process.env.APP_TZ || 'America/New_York';
const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(x => [x.type, x.value]));
const today = process.env.APP_DATE || `${p.year}-${p.month}-${p.day}`;
const holiday = ctx.holidayFor(today);
const month = ctx.MONTHS[+today.slice(5, 7) - 1];
const key = holiday || month.key;
let vb, path, source = 'default';
const def = process.env.ICON_ID || (holiday ? ctx.HOLIDAYS[holiday].icon : month.icon);
[, vb, path] = ctx.SOLID_CORE[def] || ctx.SOLID_CORE['fa:circle'];

// Icon picked in Settings (stored in the Google Sheet)
if (process.env.APP_URL && process.env.APP_KEY) {
  try {
    const url = process.env.APP_URL + (process.env.APP_URL.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(process.env.APP_KEY);
    const st = await (await fetch(url, { redirect: 'follow' })).json();
    if (!st.ok) throw new Error('the Google Sheet rejected the request (' + (st.error || 'unknown') + '); check the APP_KEY secret');
    const pick = st.ok && st.state.meta && st.state.meta.pageIcons && st.state.meta.pageIcons.value && st.state.meta.pageIcons.value[key];
    if (pick && pick.data && pick.data.includes('|')) { const k = pick.data.indexOf('|'); vb = pick.data.slice(0, k); path = pick.data.slice(k + 1); source = 'settings'; }
    if (st.state.meta && st.state.meta.holidays && st.state.meta.holidays.value === false && holiday) {
      // holidays turned off in Settings: use the month icon instead
      const mp = st.state.meta.pageIcons && st.state.meta.pageIcons.value && st.state.meta.pageIcons.value[month.key];
      if (mp && mp.data) { const k = mp.data.indexOf('|'); vb = mp.data.slice(0, k); path = mp.data.slice(k + 1); source = 'settings'; }
      else { [, vb, path] = ctx.SOLID_CORE[month.icon]; source = 'default'; }
    }
  } catch (e) { console.log('Could not read Settings from the Google Sheet, using the default icon:', e.message); }
}

const hash = crypto.createHash('sha1').update('fit2:' + vb + path).digest('hex').slice(0, 8);
const name = `${key}-${hash}`;
console.log(`Date ${today} -> ${key} (${source} icon) -> ${name}`);

// Size each icon by its real shape: measure the drawn pixel farthest from the shape's
// center, then scale so that pixel sits `reach` x size from the middle. Launchers crop
// maskable icons to a circle as small as 66.7% of the image (radius .333), so .30 keeps
// every icon fully visible while making it as large as possible.
const [vx, vy, vw, vh] = vb.split(/[ ,]+/).map(Number);
const svgAt = (size, s, cx, cy, { bg, fg }) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
  (bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : '') +
  `<path transform="translate(${size / 2 - cx * s} ${size / 2 - cy * s}) scale(${s})" d="${path}" fill="${fg}"/></svg>`;
let measured;
function measure() {
  if (measured) return measured;
  const N = 400, s0 = N * .5 / Math.max(vw, vh), cx0 = vx + vw / 2, cy0 = vy + vh / 2;
  const img = new Resvg(svgAt(N, s0, cx0, cy0, { fg: '#fff' })).render(), px = img.pixels, W = img.width;
  let x0 = N, y0 = N, x1 = -1, y1 = -1;
  for (let y = 0; y < N; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return measured = { s0, cx: cx0, cy: cy0, r: N * .25, N };
  const mx = (x0 + x1 + 1) / 2, my = (y0 + y1 + 1) / 2;
  let r = 1;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (px[(y * W + x) * 4 + 3] > 40) {
    const d = Math.hypot(Math.max(Math.abs(x + .5 - mx), 0) + .5, Math.abs(y + .5 - my) + .5); if (d > r) r = d; }
  // pixel center (mx,my) back to path units
  return measured = { s0, cx: cx0 + (mx - N / 2) / s0, cy: cy0 + (my - N / 2) / s0, r, N };
}
const render = (size, v) => {
  const m = measure(), s = m.s0 * (v.reach * m.N / m.r) * size / m.N;
  return new Resvg(svgAt(size, s, m.cx, m.cy, v)).render().asPng();
};
// Light glyph on pure black, filling the shape (no separate monochrome layer, so launchers
// like Nothing's don't draw a second inner circle around it).
const variants = {
  any: { bg: '#000000', fg: '#f4f4f4', reach: .34 },
  maskable: { bg: '#000000', fg: '#f4f4f4', reach: .30 }
};
if (process.env.STATIC_OUT) { // build the fallback icons that ship with the app
  for (const size of [192, 512]) {
    fs.writeFileSync(`${ROOT}/icon-${size}.png`, render(size, variants.any));
    fs.writeFileSync(`${ROOT}/icon-maskable-v2-${size}.png`, render(size, variants.maskable));
  }
  console.log('Static icons written.'); process.exit(0);
}
fs.mkdirSync(`${ROOT}/appicon`, { recursive: true });
const want = new Set(), icons = [];
for (const [purpose, v] of Object.entries(variants)) for (const size of [192, 512]) {
  const file = `appicon/${name}-${purpose}-${size}.png`; want.add(file);
  if (!fs.existsSync(`${ROOT}/${file}`)) fs.writeFileSync(`${ROOT}/${file}`, render(size, v));
  icons.push({ src: file, sizes: `${size}x${size}`, type: 'image/png', purpose });
}
for (const f of fs.readdirSync(`${ROOT}/appicon`)) if (!want.has('appicon/' + f)) fs.unlinkSync(`${ROOT}/appicon/${f}`);

const man = JSON.parse(read('manifest.webmanifest'));
if (JSON.stringify(man.icons) !== JSON.stringify(icons)) {
  man.icons = icons;
  fs.writeFileSync(`${ROOT}/manifest.webmanifest`, JSON.stringify(man, null, 2) + '\n');
  console.log('Manifest updated.');
} else console.log('Already up to date.');
