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
const def = holiday ? ctx.HOLIDAYS[holiday].icon : month.icon;
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

const hash = crypto.createHash('sha1').update(vb + path).digest('hex').slice(0, 8);
const name = `${key}-${hash}`;
console.log(`Date ${today} -> ${key} (${source} icon) -> ${name}`);

const svg = (size, { bg, fg, glyph, round }) => {
  const [x, y, w, h] = vb.split(/[ ,]+/).map(Number), g = size * glyph, s = g / Math.max(w, h);
  const tx = (size - w * s) / 2 - x * s, ty = (size - h * s) / 2 - y * s;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    (bg ? `<rect width="${size}" height="${size}" rx="${round ? size * .22 : 0}" fill="${bg}"/>` : '') +
    `<path transform="translate(${tx} ${ty}) scale(${s})" d="${path}" fill="${fg}"/></svg>`;
};
const variants = {
  any: { bg: '#111111', fg: '#f2f2f2', glyph: .5, round: true },
  maskable: { bg: '#111111', fg: '#f2f2f2', glyph: .42 },
  monochrome: { bg: null, fg: '#ffffff', glyph: .42 }
};
fs.mkdirSync(`${ROOT}/appicon`, { recursive: true });
const want = new Set(), icons = [];
for (const [purpose, v] of Object.entries(variants)) for (const size of [192, 512]) {
  const file = `appicon/${name}-${purpose}-${size}.png`; want.add(file);
  if (!fs.existsSync(`${ROOT}/${file}`)) fs.writeFileSync(`${ROOT}/${file}`, new Resvg(svg(size, v)).render().asPng());
  icons.push({ src: file, sizes: `${size}x${size}`, type: 'image/png', purpose });
}
for (const f of fs.readdirSync(`${ROOT}/appicon`)) if (!want.has('appicon/' + f)) fs.unlinkSync(`${ROOT}/appicon/${f}`);

const man = JSON.parse(read('manifest.webmanifest'));
if (JSON.stringify(man.icons) !== JSON.stringify(icons)) {
  man.icons = icons;
  fs.writeFileSync(`${ROOT}/manifest.webmanifest`, JSON.stringify(man, null, 2) + '\n');
  console.log('Manifest updated.');
} else console.log('Already up to date.');
