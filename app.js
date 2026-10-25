/* Chores dashboard – main app. Plain JS, no build step. */
'use strict';

/* ================= storage & state ================= */
const LS = {
  get(k, d) { try { const v = localStorage.getItem('chores.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('chores.' + k, JSON.stringify(v)); } catch (e) {} }
};

let S = LS.get('state', null) || { tasks: {}, statuses: {}, items: {}, meta: {} };
let outbox = LS.get('outbox', []);
let config = LS.get('config', { url: '', key: '' });
const ui = { filter: 'All', tab: LS.get('tab', 'overview'), view: LS.get('view', null), lastTab: null, calWeek: null, cats: [], calDay: null, listId: null, sync: 'local', syncMsg: '', today: todayStr() };

const FINISHED = { done: 1, not_needed: 1 };
// Extra search words for the icon picker (query word -> also search these).
const SYN = {
  meds: 'pill pills medication medicine prescription capsules', medicine: 'pill pills medication prescription', pill: 'pills medication capsules',
  laundry: 'laundry washing shirt socks detergent iron dry', clothes: 'shirt socks checkroom iron', wash: 'washing laundry soap sink',
  dishes: 'sink dishwasher utensils plate kitchen', dish: 'sink dishwasher utensils plate', cook: 'kitchen burner utensils blender chef skillet',
  clean: 'broom cleaning soap spray sparkles sponge mop vacuum', cleaning: 'broom soap spray sparkles mop vacuum', sweep: 'broom', mop: 'mop broom',
  vacuum: 'vacuum', dust: 'broom feather cleaning', trash: 'trash recycle dumpster delete garbage', garbage: 'trash recycle dumpster delete',
  plants: 'seedling plant potted leaf yard grass', plant: 'seedling potted leaf yard', water: 'droplet water faucet glass', garden: 'seedling yard grass tree leaf',
  bills: 'receipt money credit invoice payments', pay: 'money credit receipt payments wallet', rent: 'house money receipt key',
  groceries: 'cart basket grocery shopping carrot', shop: 'cart basket bag shopping store', shopping: 'cart basket bag store',
  exercise: 'dumbbell running fitness bicycle walking', gym: 'dumbbell fitness', walk: 'walking person dog', run: 'running',
  pet: 'paw dog cat pets fish bone', pets: 'paw dog cat fish bone', cat: 'cat paw', dog: 'dog paw bone',
  bathroom: 'toilet bath shower faucet', bed: 'bed sheets bedroom', sheets: 'bed', sleep: 'bed moon',
  car: 'car gas truck', mail: 'envelope mailbox mail', package: 'box package truck', call: 'phone', email: 'envelope mail',
  fridge: 'kitchen refrigerator', refrigerator: 'kitchen', oven: 'oven microwave stove fire burner', stove: 'burner oven', microwave: 'microwave',
  leaf: 'leaf eco spa park nature forest', flower: 'florist vintage spa seedling', flowers: 'florist vintage spa', snow: 'snowflake snowman ac_unit snowy cold',
  sun: 'sun sunny wb_sunny', rain: 'rain umbrella rainy', tree: 'tree forest park pine', coffee: 'mug coffee cafe', tea: 'mug tea cafe',
  fix: 'wrench hammer screwdriver tools', repair: 'wrench hammer screwdriver tools', teeth: 'tooth', floss: 'tooth', study: 'book graduation pen'
};

function save() { LS.set('state', S); LS.set('outbox', outbox); }

/* ================= dates ================= */
function todayStr() { const d = new Date(); return d.getFullYear() + '-' + Rec.pad(d.getMonth() + 1) + '-' + Rec.pad(d.getDate()); }
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function fmtShort(ds) { return MON[+ds.slice(5, 7) - 1] + ' ' + (+ds.slice(8)); }
function fmtDow(ds) { return DOW[Rec.weekday(ds)] + ' ' + (+ds.slice(8)); }
function fmtLong(ds) {
  const full = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return full[Rec.weekday(ds)] + ', ' + MONTH_FULL[+ds.slice(5, 7) - 1] + ' ' + (+ds.slice(8));
}
function fmt12(t) { if (!t) return ''; const [h, m] = t.split(':').map(Number); return ((h + 11) % 12 + 1) + ':' + Rec.pad(m) + (h < 12 ? ' AM' : ' PM'); }

/* ================= helpers ================= */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function icon(name, cls = '') {
  const body = ICONS[name] || ICONS['circle'];
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const metaVal = (k, d) => (S.meta[k] ? S.meta[k].value : d);
const statusOf = (id, ds) => (S.statuses[id + '|' + ds] || {}).status || 'not_started';
const statusLabel = id => (STATUSES.find(s => s.id === id) || STATUSES[0]).label;
function svgPath(vb, p, cls = '') { return `<svg class="sic ${cls}" viewBox="${vb}" fill="currentColor" aria-hidden="true"><path d="${p}"/></svg>`; }
function solid(id, cls = '') { const d = SOLID_CORE[id] || SOLID_CORE['fa:circle']; return svgPath(d[1], d[2], cls); }
function taskIcon(t) {
  if (t.iconData) { const i = t.iconData.indexOf('|'); return svgPath(t.iconData.slice(0, i), t.iconData.slice(i + 1)); }
  if (SOLID_CORE[t.icon]) return solid(t.icon);
  if (t.icon && ICONS[t.icon] && t.icon !== 'circle') return icon(t.icon);
  return solid('fa:circle', 'dotfallback');
}
function hashStr(x) { let h = 0; for (const c of String(x)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
function catSlot(t) {
  if (t.color !== '' && t.color != null && !isNaN(+t.color)) return +t.color;
  return t.category ? hashStr(t.category.toLowerCase()) % 8 : -1;
}
const iconColor = t => { const sl = catSlot(t); return sl < 0 ? 'var(--accent)' : `var(--cat${sl})`; };
function taskList() { return Object.values(S.tasks).filter(t => !t.deleted); }
function passesFilter(t) { return ui.filter === 'All' || (t.category || '') === ui.filter; }

/* ================= mutations (optimistic + queued) ================= */
function applyOp(op) {
  if (op.t === 'task') {
    const cur = S.tasks[op.rec.id];
    if (cur && (cur.updatedAt || 0) > op.rec.updatedAt) return;
    if (op.rec.deleted) delete S.tasks[op.rec.id]; else S.tasks[op.rec.id] = op.rec;
  } else if (op.t === 'status') {
    S.statuses[op.taskId + '|' + op.date] = { status: op.status, updatedAt: op.updatedAt };
  } else if (op.t === 'item') {
    if (op.rec.deleted) delete S.items[op.rec.id]; else S.items[op.rec.id] = op.rec;
  } else if (op.t === 'meta') {
    S.meta[op.key] = { value: op.value, updatedAt: op.updatedAt };
  }
}
function commit(op, rerender = true) {
  applyOp(op);
  outbox.push(op);
  save();
  if (rerender) render();
  scheduleFlush();
}
const setMeta = (key, value) => commit({ t: 'meta', key, value, updatedAt: Date.now() });

/* ================= sync with Apps Script ================= */
let flushTimer = null, inflight = false, retryMs = 4000;
function scheduleFlush(ms = 350) { clearTimeout(flushTimer); flushTimer = setTimeout(flush, ms); }
function setSync(s, msg = '') { ui.sync = s; ui.syncMsg = msg; const el = document.getElementById('sync'); if (el) el.outerHTML = syncBadge(); }

async function flush() {
  if (!config.url || !config.key) { setSync('local'); return; }
  if (inflight) { scheduleFlush(600); return; }
  if (!outbox.length) return pull();
  inflight = true; setSync('syncing');
  const batch = outbox.slice();
  try {
    const res = await fetch(config.url, { method: 'POST', body: JSON.stringify({ key: config.key, ops: batch }) });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'server error');
    outbox.splice(0, batch.length);
    loadServerState(data.state);
    retryMs = 4000; setSync('ok');
  } catch (e) {
    setSync(navigator.onLine ? 'error' : 'offline', String(e.message || e));
    scheduleFlush(retryMs); retryMs = Math.min(retryMs * 2, 60000);
  } finally { inflight = false; }
  if (outbox.length) scheduleFlush(200);
}

async function pull() {
  if (!config.url || !config.key) { setSync('local'); return; }
  if (outbox.length) return flush();
  if (inflight) return;
  inflight = true; setSync('syncing');
  try {
    const res = await fetch(config.url + (config.url.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(config.key));
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'server error');
    if (!outbox.length) loadServerState(data.state);
    setSync('ok');
  } catch (e) {
    setSync(navigator.onLine ? 'error' : 'offline', String(e.message || e));
  } finally { inflight = false; }
}

function loadServerState(st) {
  const next = { tasks: {}, statuses: {}, items: {}, meta: {} };
  (st.tasks || []).forEach(t => {
    t.early = !!t.early; t.notify = !!t.notify;
    next.tasks[t.id] = t;
  });
  (st.statuses || []).forEach(s => { next.statuses[s.taskId + '|' + s.date] = { status: s.status, updatedAt: s.updatedAt }; });
  (st.items || []).forEach(i => { i.checked = !!i.checked; next.items[i.id] = i; });
  next.meta = st.meta || {};
  if (!next.meta.lists) next.meta.lists = { value: [{ id: 'shopping', name: 'Shopping' }], updatedAt: 0 };
  const before = JSON.stringify(S);
  S = next;
  outbox.forEach(applyOp); // keep anything not yet confirmed
  save();
  if (JSON.stringify(S) !== before && !document.querySelector('.sheet input:focus, .sheet textarea:focus, .items input:focus')) render();
}

/* ================= derived lists ================= */
function todayItems(pred = passesFilter) {
  const today = ui.today, out = [];
  taskList().forEach(t => {
    if (!pred(t)) return;
    if (Rec.occursOn(t, today)) out.push({ t, date: today, overdue: false });
    else {
      const p = Rec.prevOccurrence(t, today);
      if (p && !FINISHED[statusOf(t.id, p)]) out.push({ t, date: p, overdue: true });
    }
  });
  const rank = it => it.overdue ? 0 : FINISHED[statusOf(it.t.id, it.date)] ? 2 : 1;
  return out.sort((a, b) => rank(a) - rank(b) || (a.overdue ? a.date.localeCompare(b.date) : 0) ||
    (a.t.time || '99').localeCompare(b.t.time || '99') || a.t.name.localeCompare(b.t.name));
}
function weekItems(pred = passesFilter, days = 7, earlyOnly = true) {
  const out = [];
  for (let k = 1; k <= days; k++) {
    const d = Rec.addDays(ui.today, k);
    taskList().forEach(t => { if ((t.early || !earlyOnly) && pred(t) && Rec.occursOn(t, d)) out.push({ t, date: d, overdue: false }); });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.t.time || '99').localeCompare(b.t.time || '99') || a.t.name.localeCompare(b.t.name));
}
function dayItems(ds) {
  return taskList().filter(t => passesFilter(t) && Rec.occursOn(t, ds)).map(t => ({ t, date: ds }))
    .sort((a, b) => (a.t.time || '99').localeCompare(b.t.time || '99') || a.t.name.localeCompare(b.t.name));
}

/* Streaks (opt-in per repeating task).
   Done +1 · 25/50/75% keeps it alive · Not needed pauses · today never breaks it.
   Grace days: every 6 Done in a row earns one (bank up to 3); a missed
   occurrence spends one instead of resetting the streak. */
let streakMemo = {};
function streakInfo(t) {
  if (!t || !t.streak || !t.repeat || t.repeat === 'none') return null;
  const key = t.id + '|' + ui.today;
  if (streakMemo[key]) return streakMemo[key];
  const from = Rec.addDays(ui.today, -399);
  let cur = 0, best = 0, graces = 0, since = 0;
  const hist = [];
  for (let n = Rec.dayNum(t.start > from ? t.start : from), end = Rec.dayNum(ui.today); n <= end; n++) {
    const ds = Rec.fromNum(n);
    if (!Rec.occursOn(t, ds)) continue;
    const st = statusOf(t.id, ds);
    let kind;
    if (st === 'done') { cur++; since++; kind = 'done'; if (since >= 6) { since = 0; if (graces < 3) { graces++; kind = 'earn'; } } }
    else if (st === 'not_needed') kind = 'pause';
    else if (ds === ui.today) kind = 'today';
    else if (st === 'p25' || st === 'p50' || st === 'p75') kind = 'partial';
    else if (graces > 0) { graces--; kind = 'grace'; }
    else { cur = 0; since = 0; kind = 'miss'; }
    if (cur > best) best = cur;
    hist.push({ date: ds, kind, status: st });
  }
  return (streakMemo[key] = { cur, best, graces, since, hist, goal: parseInt(t.streakGoal, 10) || 0 });
}
function streakOf(t) { const i = streakInfo(t); return i ? i.cur : 0; }
function graceDots(n) { return [0, 1, 2].map(i => `<span class="gd${i < n ? ' on' : ''}" title="Grace day">${solid('fa:shield-halved')}</span>`).join(''); }
function histDots(h) {
  return h.slice(-14).map(x => `<span class="hd hd-${x.kind}" title="${fmtShort(x.date)}: ${{ done: 'Done', earn: 'Done · earned a grace day', partial: 'Partly done', pause: 'Not needed (paused)', grace: 'Missed · grace day used', miss: 'Missed', today: 'Today' }[x.kind]}"></span>`).join('');
}
const pinned = () => (metaVal('pinnedStreaks', []) || []).filter(id => S.tasks[id] && S.tasks[id].streak);
function streaksHTML(pred = () => true, onlyIds = null) {
  let ts = taskList().filter(t => t.streak && t.repeat && t.repeat !== 'none' && pred(t));
  if (onlyIds) ts = onlyIds.map(id => ts.find(t => t.id === id)).filter(Boolean);
  if (!ts.length) return onlyIds ? `<div class="empty">Pin up to 5 streaks to see them here: open a task with <b>Track streak</b> on and turn on <b>Pin to Overview</b>.</div>`
    : `<div class="empty">No streaks here yet. Open a repeating task and turn on <b>Track streak</b>.</div>`;
  const pins = pinned();
  return `<div class="streaks">${ts.map(t => { const i = streakInfo(t); const pct = i.goal ? Math.min(100, Math.round(i.cur / i.goal * 100)) : 0;
    return `<button class="streak-card" data-act="edit-task" data-task="${t.id}">
      <span class="sc-top"><span class="ticon" style="--ic:${iconColor(t)}">${taskIcon(t)}</span>
        <span class="ntext"><span class="nm">${esc(t.name)}</span><span class="meta">${esc(repeatText(t))}</span></span>
        ${!onlyIds && pins.includes(t.id) ? `<span class="pinned" title="Pinned to Overview">${solid('fa:thumbtack')}</span>` : ''}
        <span class="sc-count${i.cur ? '' : ' zero'}">${solid('fa:fire-flame-curved')}${i.cur}</span></span>
      ${!i.goal && !onlyIds ? `<span class="sc-nogoal">No goal yet · tap to set one</span>` : ''}
      ${i.goal ? `<span class="sc-goal"><span class="bar"><span style="width:${pct}%"></span></span><span class="gl">${i.cur >= i.goal ? solid('fa:trophy') + ' Goal reached' : i.cur + ' / ' + i.goal}</span></span>` : ''}
      <span class="sc-bottom"><span class="hds">${histDots(i.hist)}</span><span class="gds">${graceDots(i.graces)}</span></span>
    </button>`; }).join('')}</div>
    ${onlyIds ? '' : `<div class="hint streak-key">${solid('fa:shield-halved', 'inline')} grace days: earn one for every 6 done in a row (up to 3); a missed day uses one instead of breaking the streak.</div>`}`;
}
function historyOf(t, count = 14) {
  const out = [];
  let d = Rec.occursOn(t, ui.today) ? ui.today : Rec.prevOccurrence(t, ui.today);
  while (d && out.length < count) { out.unshift({ date: d, status: statusOf(t.id, d) }); d = Rec.prevOccurrence(t, d); }
  return out;
}

/* ================= theme ================= */
const PAL = {}; // banner url -> color clusters
// Theme follows the date (month, plus holidays), or a month pinned in Settings.
function activeTheme() {
  const pref = metaVal('theme', 'auto');
  const mi = MONTH_KEYS.indexOf(pref);
  const tdate = mi >= 0 ? ui.today.slice(0, 5) + Rec.pad(mi + 1) + '-15' : ui.today;
  const monthIdx = +tdate.slice(5, 7) - 1;
  const season = seasonFor(tdate);
  const holiday = mi < 0 && metaVal('holidays', true) ? holidayFor(ui.today) : null;
  const banner = bannerFor(tdate, season, holiday, ui.today);
  return { season, holiday, banner, monthIdx };
}
// Page icon for the current month/holiday (changeable in Settings).
function pageIconHTML(cls = '') {
  const { holiday, monthIdx } = activeTheme();
  const key = holiday || MONTHS[monthIdx].key;
  const pick = (metaVal('pageIcons', {}) || {})[key];
  if (pick && pick.data) { const k = pick.data.indexOf('|'); return svgPath(pick.data.slice(0, k), pick.data.slice(k + 1), cls); }
  return solid(holiday ? HOLIDAYS[holiday].icon : MONTHS[monthIdx].icon, cls);
}
function themeTokens() {
  const { season, holiday, banner } = activeTheme();
  if (banner && banner.cl) return Palette.derive(banner.cl, { accent: banner.accent });
  if (banner) {
    let cl = PAL[banner.url];
    if (cl === undefined) { try { cl = JSON.parse(localStorage.getItem('chores.pal3:' + banner.url)); } catch (e) {} }
    if (cl && cl !== 'fail') { PAL[banner.url] = cl; return Palette.derive(cl.cl, { accent: banner.accent }); }
    if (cl === undefined || cl === null) {
      PAL[banner.url] = null;
      Palette.clustersFor(banner.url).then(c => { PAL[banner.url] = c; render(); }).catch(() => { PAL[banner.url] = 'fail'; });
    }
  }
  const th = THEMES[season];
  const vars = Object.assign({}, th.vars);
  if (holiday && !banner) vars.accent = HOLIDAYS[holiday].accent;
  return { vars, status: th.status, cats: th.cats };
}
// 'background' = photo fills the whole screen behind frosted panels; 'banner' = strip at the top.
function photoLayout(banner) {
  if (!banner) return 'banner';
  const pref = metaVal('photoLayout', 'auto');
  if (pref !== 'auto') return pref;
  if (banner.layout) return banner.layout;
  const info = banner.w ? banner : PAL[banner.url];
  if (!info || info === 'fail' || !info.w) return 'banner';
  const long = Math.max(info.w, info.h), short = Math.min(info.w, info.h);
  return long >= 1600 && short >= 900 && info.w / info.h <= 2.4 ? 'background' : 'banner';
}

function applyTheme() {
  const { holiday, monthIdx } = activeTheme();
  const tk = themeTokens(), root = document.documentElement.style;
  Object.entries(tk.vars).forEach(([k, v]) => root.setProperty('--' + k, v));
  Object.entries(tk.status).forEach(([k, v]) => root.setProperty('--st-' + k, v));
  tk.cats.forEach((c, i) => root.setProperty('--cat' + i, c));
  ui.cats = tk.cats;
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = tk.vars.bg;
  const [kind, colors] = particlesFor(monthIdx, holiday);
  Particles.set(kind, colors, LS.get('motion', true));
}

/* ================= rendering ================= */
function syncBadge() {
  const map = {
    local: ['cloud-off', 'Not connected – saved on this device only'],
    syncing: ['loader-circle', 'Syncing…'], ok: ['cloud', 'Synced'],
    offline: ['cloud-off', 'Offline – changes will sync later'], error: ['cloud-off', 'Sync problem: ' + ui.syncMsg]
  };
  const [ic, tip] = map[ui.sync] || map.local;
  const pending = outbox.length && config.url ? `<span class="pending">${outbox.length}</span>` : '';
  return `<button id="sync" class="iconbtn sync-${ui.sync}" data-act="sync" title="${esc(tip)}" aria-label="${esc(tip)}">${icon(ic, ui.sync === 'syncing' ? 'spin' : '')}${pending}</button>`;
}

function pill(st, attrs = '') {
  return `<button class="pill" style="--c:var(--st-${st})" ${attrs}><span class="dot"></span>${statusLabel(st)}</button>`;
}

function rowHTML(it, mode) {
  const { t, date } = it, st = statusOf(t.id, date), fin = FINISHED[st];
  let due = '';
  if (it.overdue) due = `<span class="od">${fmtShort(date)}</span>`;
  else if (mode === 'week') due = `<span>${fmtDow(date)}</span>${t.time ? `<span class="sub">${fmt12(t.time)}</span>` : ''}`;
  else due = t.time ? `<span>${fmt12(t.time)}</span>` : '<span class="sub">Today</span>';
  const streak = streakOf(t);
  const meta = [t.repeat && t.repeat !== 'none' ? `<span class="rep" title="Repeats">${icon('repeat')}</span>` : '',
    t.streak && streak >= 1 ? `<span class="streak">${icon('flame')}${streak}</span>` : ''].join('');
  return `<div class="row${fin ? ' fin' : ''}${it.overdue ? ' overdue' : ''}">
    ${pill(st, `data-act="status" data-task="${t.id}" data-date="${date}"`)}
    <button class="name" data-act="edit-task" data-task="${t.id}">
      <span class="ticon" style="--ic:${iconColor(t)}">${taskIcon(t)}</span>
      <span class="ntext"><span class="nm">${esc(t.name)}</span>${meta ? `<span class="meta">${meta}</span>` : ''}</span>
    </button>
    <span class="due">${due}</span>
  </div>`;
}

function tableHTML(items, mode, emptyMsg, view, tid) {
  const catAttr = view && view.cats && view.cats[0] ? ` data-cat="${esc(view.cats[0])}"` : '';
  tid = tid || ui.tab + '-' + mode;
  const showDone = !!(ui.showDone || {})[tid];
  const open = items.filter(it => !FINISHED[statusOf(it.t.id, it.date)]), fin = items.length - open.length;
  const shown = showDone ? items : open;
  return `<div class="table">
    <div class="thead"><span>${icon('loader-circle')}Status</span><span>${icon('list-todo')}Task name</span><span>${icon('calendar')}Due</span></div>
    ${shown.length ? shown.map(it => rowHTML(it, mode)).join('') : `<div class="empty">${fin ? 'All done here' : emptyMsg}</div>`}
    ${fin ? `<button class="showdone" data-act="toggle-done" data-tid="${tid}">${icon('check')}${fin} finished · ${showDone ? 'Hide' : 'Show'}</button>` : ''}
    <button class="newrow" data-act="new-task"${catAttr}${mode === 'week' ? ` data-date="${Rec.addDays(ui.today, 1)}"${view ? '' : ' data-early="1"'}` : ''}>${icon('plus')}New task</button>
  </div>`;
}

function pieHTML(items, label, single = false) {
  const counts = {}; STATUSES.forEach(s => counts[s.id] = 0);
  items.forEach(it => counts[statusOf(it.t.id, it.date)]++);
  const total = items.length, R = 52, C = 2 * Math.PI * R;
  let off = 0, arcs = '';
  if (total) STATUSES.forEach(s => {
    const n = counts[s.id]; if (!n) return;
    const len = n / total * C;
    const gap = Object.values(counts).filter(Boolean).length > 1 ? 1.5 : 0;
    arcs += `<circle r="${R}" cx="70" cy="70" fill="none" stroke="var(--st-${s.id})" stroke-width="20"
      stroke-dasharray="${Math.max(len - gap, 0.1)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)"><title>${s.label}: ${n}</title></circle>`;
    off += len;
  });
  else arcs = `<circle r="${R}" cx="70" cy="70" fill="none" stroke="var(--border)" stroke-width="20"/>`;
  const legend = STATUSES.filter(s => counts[s.id]).map(s =>
    `<li><span class="dot" style="background:var(--st-${s.id})"></span>${s.label}<b>${counts[s.id]}</b></li>`).join('');
  if (single) {
    const BAR = ['done', 'not_needed', 'p75', 'p50', 'p25', 'not_started'].map(id => STATUSES.find(s => s.id === id));
    const segs = BAR.filter(s => counts[s.id]).map(s => `<span style="flex:${counts[s.id]};background:var(--st-${s.id})" title="${s.label}: ${counts[s.id]}"></span>`).join('');
    const mini = BAR.filter(s => counts[s.id]).map(s => `<span><i style="background:var(--st-${s.id})"></i>${counts[s.id]} ${s.label.toLowerCase()}</span>`).join('');
    return `<div class="card chart big">
      <div class="card-label">${icon('chart-pie')}${label}<b class="cl-total">${total} ${total === 1 ? 'task' : 'tasks'}</b></div>
      <div class="chart-body"><svg viewBox="0 0 140 140" class="pie">${arcs}
        <text x="70" y="${total ? 77 : 75}" text-anchor="middle" class="pie-big">${total || '—'}</text>
        <text x="70" y="94" text-anchor="middle" class="pie-small">${total ? (total === 1 ? 'task' : 'tasks') : 'No tasks'}</text></svg></div>
      <div class="hbar-wrap"><div class="hbar">${segs || '<span style="flex:1;background:var(--border)"></span>'}</div><div class="hbar-legend">${mini || '<span>Nothing scheduled</span>'}</div></div>
    </div>`;
  }
  return `<div class="card chart">
    <div class="card-label">${icon('chart-pie')}${label}</div>
    <div class="chart-body">
      <svg viewBox="0 0 140 140" class="pie">${arcs}
        <text x="70" y="${total ? 77 : 75}" text-anchor="middle" class="pie-big">${total || '—'}</text>
        <text x="70" y="94" text-anchor="middle" class="pie-small">${total ? (total === 1 ? 'task' : 'tasks') : 'No tasks'}</text></svg>
      <ul class="legend">${legend || '<li class="muted">Nothing scheduled</li>'}</ul>
    </div></div>`;
}

const weekStart = ds => Rec.addDays(ds, -Rec.weekday(ds));
function calendarHTML() {
  const ws = ui.calWeek, we = Rec.addDays(ws, 6), cur = weekStart(ui.today);
  const range = ws.slice(5, 7) === we.slice(5, 7) ? `${fmtShort(ws)} – ${+we.slice(8)}` : `${fmtShort(ws)} – ${fmtShort(we)}`;
  let cells = '';
  for (let i = 0; i < 7; i++) {
    const ds = Rec.addDays(ws, i), items = dayItems(ds);
    // show every task; if a day is very full, hide the daily repeats so one-off tasks stand out
    const MAX = 12, isDaily = t => t.repeat === 'daily' && (+t.interval || 1) === 1;
    let shown = items, dailyHidden = 0;
    if (items.length > MAX) { shown = items.filter(it => !isDaily(it.t)); dailyHidden = items.length - shown.length; }
    shown = shown.slice().sort((a, b) => isDaily(a.t) - isDaily(b.t));
    const icons = shown.map(it => `<span class="mini${FINISHED[statusOf(it.t.id, ds)] ? ' fin' : ''}" style="color:${iconColor(it.t)}" title="${esc(it.t.name)}">${taskIcon(it.t)}</span>`).join('');
    const more = dailyHidden ? `<span class="more">+${dailyHidden} daily</span>` : '';
    cells += `<button class="wk-cell${ds === ui.today ? ' today' : ''}${ds === ui.calDay ? ' sel' : ''}${ds < ui.today ? ' past' : ''}" data-act="cal-day" data-date="${ds}">
      <span class="dow">${DOW[i]}</span><span class="num">${+ds.slice(8)}</span><span class="wk-icons">${icons}${more}</span></button>`;
  }
  const sel = dayItems(ui.calDay);
  return `<div class="cal">
    <div class="cal-head"><button class="iconbtn" data-act="cal-prev" aria-label="Previous week">${icon('chevron-left')}</button>
      <span>${range}</span>
      <button class="iconbtn" data-act="cal-next" aria-label="Next week">${icon('chevron-right')}</button>
      ${ws !== cur ? '<button class="chip small" data-act="cal-today">This week</button>' : ''}</div>
    <div class="wk-grid">${cells}</div>
    <div class="cal-day">
      <div class="cal-day-head"><b>${fmtLong(ui.calDay)}</b><button class="chip small" data-act="new-task" data-date="${ui.calDay}">${icon('plus')}Add</button></div>
      ${sel.length ? sel.map(it => rowHTML(it, 'day')).join('') : '<div class="empty">Nothing scheduled</div>'}
    </div></div>`;
}

// Lists: chips at the top show/hide each list (this device only); every visible list
// gets its own titled section on the page.
function listsHTML(inBlock = false, intro = '') {
  const lists = metaVal('lists', []);
  if (!lists.length) return `<div class="empty">No lists yet.<br><button class="chip" data-act="list-add">${icon('list-plus')}Create a list</button></div>`;
  const hidden = LS.get('listsHidden', []);
  const chips = `<div class="filters list-chips">${lists.map(l => { const on = !hidden.includes(l.id);
      return `<button class="chip${on ? ' on' : ''}" data-act="list-toggle" data-list="${l.id}" aria-pressed="${on}">${esc(l.name)}</button>`; }).join('')}
    <button class="chip add-list" data-act="list-add" aria-label="New list" title="New list">${icon('plus')}</button></div>`;
  const heads = ['h1', 'h2', 'h3', 'h4'];
  const sections = lists.map((l, k) => {
    if (hidden.includes(l.id)) return '';
    const items = Object.values(S.items).filter(i => i.listId === l.id).sort((a, b) => (a.checked - b.checked) || (a.sort - b.sort));
    // long lists tuck checked items away (tap to show them)
    const nChecked = items.filter(i => i.checked).length, long = items.length > 8;
    const showChecked = !long || !!(ui.showChecked || {})[l.id];
    const rows = items.filter(i => showChecked || !i.checked).map(i => `<div class="item${i.checked ? ' checked' : ''}">
        <button class="cb" data-act="item-toggle" data-item="${i.id}" aria-label="Toggle">${icon(i.checked ? 'square-check-big' : 'square')}</button>
        <input value="${esc(i.text)}" data-item-edit="${i.id}" aria-label="Item">
        <button class="iconbtn faint" data-act="item-del" data-item="${i.id}" aria-label="Delete">${icon('x')}</button></div>`).join('');
    const left = items.filter(i => !i.checked).length;
    return `<div class="${inBlock ? 'list-sec' : 'block'}"><h2 class="hblock ${heads[k % 4]} list-head">${esc(l.name)}<span class="lh-count">${left}</span>
        <button class="iconbtn" data-act="list-menu" data-list="${l.id}" aria-label="Rename or delete ${esc(l.name)}">${icon('ellipsis')}</button></h2>
      <div class="items">${rows}
        <div class="item new"><span class="cb">${icon('plus')}</span><input class="new-item" data-list="${l.id}" placeholder="Add item" enterkeyhint="done"></div></div>
      ${long && nChecked ? `<button class="showdone" data-act="toggle-checked" data-list="${l.id}">${icon('check')}${nChecked} checked · ${showChecked ? 'Hide' : 'Show'}</button>` : ''}
      ${items.some(i => i.checked) ? `<button class="chip small" data-act="items-clear" data-list="${l.id}">${icon('eraser')}Clear checked</button>` : ''}</div>`;
  }).join('');
  const allHidden = lists.every(l => hidden.includes(l.id));
  return `${inBlock ? chips : `<div class="block lists-top">${intro}${chips}</div>`}${allHidden ? '<div class="empty">All lists are hidden. Tap a list above to show it.</div>' : `<div class="${inBlock ? '' : 'grid2 lists-grid'}">${sections}</div>`}`;
}

/* ================= tabs ================= */
const TABS = [
  { id: 'overview', label: 'Overview', icon: 'fa:house' },
  { id: 'today', label: 'Today', icon: 'fa:calendar-day' },
  { id: 'week', label: 'Week', icon: 'fa:calendar-week' },
  { id: 'tags', label: 'Tags', icon: 'fa:tags' },
  { id: 'lists', label: 'Lists', icon: 'fa:list-check' }
];
const DEFAULT_VIEWS = [
  { id: 'plans', name: 'Plans', icon: 'fa:calendar-days', cats: ['Plans'] },
  { id: 'cleaning', name: 'Cleaning', icon: 'fa:broom', cats: ['Cleaning'] },
  { id: 'hygiene', name: 'Hygiene', icon: 'fa:pump-soap', cats: ['Hygiene'] },
  { id: 'pets', name: 'Cat & plants', icon: 'fa:paw', cats: ['Cat', 'Plants'] }
];
const views = () => metaVal('views', DEFAULT_VIEWS) || DEFAULT_VIEWS;
const isWide = () => innerWidth >= 760;
function viewIcon(v, cls = '') {
  if (v.iconData) { const k = v.iconData.indexOf('|'); return svgPath(v.iconData.slice(0, k), v.iconData.slice(k + 1), cls); }
  return solid(v.icon || 'fa:tags', cls);
}
function allCategories() {
  const set = new Map();
  const add = c => { c = (c || '').trim(); if (c && !set.has(c.toLowerCase())) set.set(c.toLowerCase(), c); };
  (metaVal('categories', []) || []).forEach(add); taskList().forEach(t => add(t.category)); views().forEach(v => (v.cats || []).forEach(add));
  return [...set.values()].sort((a, b) => a.localeCompare(b));
}
function comboListHTML(q) {
  q = (q || '').trim(); const ql = q.toLowerCase();
  const cats = allCategories(), hits = cats.filter(c => !ql || c.toLowerCase().includes(ql));
  const exact = cats.some(c => c.toLowerCase() === ql);
  return hits.map(c => `<button type="button" data-act="cat-pick" data-v="${esc(c)}">${esc(c)}</button>`).join('') +
    (q && !exact ? `<button type="button" class="new" data-act="cat-pick" data-v="${esc(q)}">${icon('plus')}Create “${esc(q)}”</button>` : '') +
    (!hits.length && !q ? '<div class="muted small">No categories yet. Type one to create it.</div>' : '');
}
const viewPred = v => t => (v.cats || []).some(c => c.trim().toLowerCase() === (t.category || '').trim().toLowerCase());

function navHTML(where) {
  return `<nav class="nav nav-${where}" aria-label="Pages">${TABS.map(t =>
    `<button class="${ui.tab === t.id ? 'on' : ''}" data-act="tab" data-tab="${t.id}" aria-label="${t.label}">${solid(t.icon)}<span>${t.label}</span></button>`).join('')}</nav>`;
}

function notesHTML() {
  const notes = Object.values(S.items).filter(i => i.listId === '__notes').sort((a, b) => (a.checked - b.checked) || (a.sort - b.sort));
  const rows = notes.map(i => `<div class="item${i.checked ? ' checked' : ''}">
      <button class="cb" data-act="item-toggle" data-item="${i.id}" aria-label="Toggle">${icon(i.checked ? 'square-check-big' : 'square')}</button>
      <input value="${esc(i.text)}" data-item-edit="${i.id}" aria-label="Note">
      <button class="iconbtn faint" data-act="note-to-task" data-item="${i.id}" title="Make it a task" aria-label="Make it a task">${icon('calendar-plus')}</button>
      <button class="iconbtn faint" data-act="item-del" data-item="${i.id}" aria-label="Delete">${icon('x')}</button></div>`).join('');
  return `<div class="items notes">${rows}
      <div class="item new"><span class="cb">${icon('plus')}</span><input id="new-note" placeholder="Jot down a quick task…" enterkeyhint="done"></div></div>
    ${notes.some(i => i.checked) ? `<button class="chip small" data-act="notes-clear">${icon('eraser')}Clear checked</button>` : ''}`;
}

function repeatText(t) {
  const iv = +t.interval || 1, every = n => iv > 1 ? `Every ${iv} ${n}s` : `Every ${n}`;
  switch (t.repeat) {
    case 'daily': return iv > 1 ? `Every ${iv} days` : 'Daily';
    case 'weekly': return every('week') + ' · ' + Rec.weekdaysOf(t).map(d => DOW[d]).join(', ');
    case 'monthly': return every('month');
    case 'yearly': return every('year');
    default: return 'Once · ' + fmtShort(t.start);
  }
}
function nextDue(t) {
  for (let k = 0; k < 400; k++) { const d = Rec.addDays(ui.today, k); if (Rec.occursOn(t, d)) return d; }
  return null;
}

function tagsHTML() {
  const vs = views();
  if (!vs.find(v => v.id === ui.view)) ui.view = (vs[0] || {}).id;
  const v = vs.find(x => x.id === ui.view);
  const chips = `<div class="filters view-chips">${vs.map(x => `<button class="chip${x.id === ui.view ? ' on' : ''}" data-act="view" data-view="${x.id}">${viewIcon(x)}${esc(x.name)}</button>`).join('')}
    <button class="chip" data-act="settings" data-sec="views" aria-label="Edit tags">${icon('pencil')}</button></div>`;
  if (!v) return chips + '<div class="empty">No tag views yet. Add some in Settings.</div>';
  const pred = viewPred(v);
  const tI = todayItems(pred), upcomingAll = weekItems(pred, 14, false);
  const seen = new Set(tI.map(it => it.t.id)), upcoming = upcomingAll.filter(it => !seen.has(it.t.id) && seen.add(it.t.id));
  const all = taskList().filter(pred).sort((a, b) => a.name.localeCompare(b.name));
  const allRows = all.map(t => { const nd = nextDue(t); return `<button class="lrow" data-act="edit-task" data-task="${t.id}">
      <span class="ticon" style="--ic:${iconColor(t)}">${taskIcon(t)}</span>
      <span class="ntext"><span class="nm">${esc(t.name)}</span><span class="meta">${esc(repeatText(t))}</span></span>
      <span class="due"><span class="sub">${nd ? (nd === ui.today ? 'Today' : fmtDow(nd)) : '—'}</span></span></button>`; }).join('');
  const catHint = (v.cats || []).join(', ');
  return `${chips}
    ${stickyPie([...tI, ...upcomingAll.filter(it => it.date <= Rec.addDays(ui.today, 7))], 'Next 7 days')}
    <section class="grid2">
      <div class="block"><h2 class="hblock h1">Today</h2>${tableHTML(tI, 'today', 'Nothing due today', v, 'tag-' + v.id + '-today')}</div>
      <div class="block"><h2 class="hblock h2">Coming up</h2><div class="hint">Next date for each task, up to 2 weeks out</div>${tableHTML(upcoming, 'week', 'Nothing in the next 2 weeks', v, 'tag-' + v.id + '-up')}</div>
    </section>
    <div class="block"><h2 class="hblock h3">All ${esc(v.name)} tasks</h2>
      <div class="hint">Tasks with the ${(v.cats || []).length > 1 ? 'categories' : 'category'} <b>${esc(catHint)}</b></div>
      <div class="table">${allRows || '<div class="empty">None yet. Give a task one of these categories to see it here.</div>'}</div></div>
    <div class="block"><h2 class="hblock h4">Streaks</h2>${streaksHTML(pred)}</div>
    <div class="cp-spacer"></div>`;
}

function stickyPie(items, label) {
  return `<section class="chart-sticky">${pieHTML(items, label, true)}</section>`;
}
function threeDayHTML() {
  const days = [[-1, 'Yesterday'], [0, 'Today'], [1, 'Tomorrow']];
  return `<div class="three">${days.map(([k, name]) => {
    const ds = Rec.addDays(ui.today, k), items = dayItems(ds);
    return `<div class="td-col${k === 0 ? ' now' : ''}"><div class="td-head"><b>${name}</b><span>${fmtDow(ds)}</span></div>
      ${items.length ? items.map(it => { const st = statusOf(it.t.id, ds);
        return `<button class="td-item${FINISHED[st] ? ' fin' : ''}" data-act="status" data-task="${it.t.id}" data-date="${ds}">
          <span class="dot" style="background:var(--st-${st})"></span><span class="td-name">${esc(it.t.name)}</span>${it.t.time ? `<span class="td-time">${fmt12(it.t.time).replace(':00', '').replace(' ', '')}</span>` : ''}</button>`; }).join('')
        : '<div class="td-empty">Nothing</div>'}
      <button class="td-add" data-act="new-task" data-date="${ds}" aria-label="Add a task on ${name}">${icon('plus')}</button></div>`; }).join('')}</div>`;
}
function pageBody() {
  const wide = isWide();
  switch (ui.tab) {
    case 'today': {
      const tI = todayItems();
      return `${stickyPie(tI, "Today's Progress")}
        <section class="grid2">
          <div class="block"><h2 class="hblock h1">Today’s To-do</h2>${tableHTML(tI, 'today', 'All clear for today')}</div>
          <div class="block"><h2 class="hblock h3">Yesterday · Today · Tomorrow</h2>${threeDayHTML()}</div>
        </section>
        <section class="grid2">
          <div class="block"><h2 class="hblock h4">Notes</h2><div class="hint">Small things to remember. Tap ${icon('calendar-plus', 'inline')} to make one a task.</div>${notesHTML()}</div>
          <div class="block"><h2 class="hblock h2">Streaks</h2>${streaksHTML()}</div>
        </section>
        <div class="cp-spacer"></div>`;
    }
    case 'week': {
      const wI = weekItems();
      return `${stickyPie(wI, "Week's Progress")}
        <section class="grid2">
          <div class="block"><h2 class="hblock h2">This Week’s To-do</h2><div class="hint">Next 7 days · only tasks that can be done early</div>${tableHTML(wI, 'week', 'Nothing to get ahead on')}</div>
          <div class="block"><h2 class="hblock h3">Calendar</h2>${calendarHTML()}</div>
        </section>
        <div class="cp-spacer"></div>`;
    }
    case 'tags': return tagsHTML();
    case 'lists': return listsHTML();
    default: {
      const tI = todayItems(), wI = weekItems();
      return `<section class="charts">${pieHTML(tI, "Today's Progress")}${pieHTML(wI, "Week's Progress")}</section>
        <section class="grid2">
          <div class="block"><h2 class="hblock h1">Today’s To-do</h2>${tableHTML(tI, 'today', 'All clear for today')}</div>
          <div class="block"><h2 class="hblock h2">This Week’s To-do</h2><div class="hint">Next 7 days · only tasks that can be done early</div>${tableHTML(wI, 'week', 'Nothing to get ahead on')}</div>
        </section>
        <section class="grid2">
          <div class="block"><h2 class="hblock h3">Pinned streaks</h2>${streaksHTML(() => true, pinned())}</div>
          ${wide ? `<div class="block">${listsHTML(true)}</div>` : ''}
        </section>`;
    }
  }
}

function render() {
  streakMemo = {};
  applyTheme();
  const { season, holiday, banner } = activeTheme();
  const y = window.scrollY;
  const layout = photoLayout(banner);
  document.body.classList.toggle('photo-bg', layout === 'background');
  let bg = document.getElementById('bgphoto');
  if (layout === 'background') {
    if (!bg) { bg = document.createElement('div'); bg.id = 'bgphoto'; bg.setAttribute('aria-hidden', 'true'); bg.innerHTML = '<img alt="">'; document.body.prepend(bg); }
    const img = bg.firstChild;
    if (img.getAttribute('src') !== banner.url) img.setAttribute('src', banner.url);
    img.style.setProperty('--fx', banner.focus); img.style.setProperty('--fxp', banner.phoneFocus);
  } else if (bg) bg.remove();
  const focus = banner ? `--fx:${esc(banner.focus)};--fxp:${esc(banner.phoneFocus)}` : '';
  const top = layout === 'background'
    ? '<div class="bg-spacer"></div>'
    : `<div class="banner">${banner ? `<img src="${esc(banner.url)}" alt="" style="${focus}">` : bannerSVG(season, holiday, +ui.today.slice(0, 4))}</div>`;
  const title = metaVal('title', 'Home Dashboard');
  const curView = views().find(v => v.id === ui.view) || views()[0];
  const tabTitle = { overview: title, today: 'Today', week: 'This Week', tags: curView ? curView.name : 'Tags', lists: 'Lists' }[ui.tab] || title;
  document.getElementById('app').innerHTML = `
  <header class="topbar">
    <span class="crumb">${pageIconHTML('accent')}<span>${esc(title)}</span></span>
    <span class="spacer"></span>
    ${syncBadge()}
    <button class="iconbtn" data-act="settings" aria-label="Settings">${icon('settings')}</button>
  </header>
  ${top}
  <main class="page tab-${ui.tab}">
    <div class="hero">
      <div class="page-icon">${pageIconHTML()}</div>
      <h1 class="title">${esc(tabTitle)}</h1>
      <div class="subtitle">${fmtLong(ui.today)}</div>
      ${navHTML('top')}
    </div>
    ${pageBody()}
    ${banner && banner.credit ? `<div class="credit">Photo: ${esc(banner.credit)} on Unsplash</div>` : ''}
  </main>
  <button class="fab" data-act="new-task" aria-label="New task">${icon('plus')}</button>
  ${navHTML('bottom')}`;
  if (ui.lastTab !== ui.tab) { ui.lastTab = ui.tab; window.scrollTo(0, 0); } else window.scrollTo(0, y);
  updateChartShrink();
}

function toast(html) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  const k = html.indexOf('</svg>') + 6; t.innerHTML = html.slice(0, k) + '<span>' + html.slice(k) + '</span>'; t.className = 'show';
  clearTimeout(t._h); t._h = setTimeout(() => { t.className = ''; }, 3800);
}

/* ================= overlays: status menu, editor, settings ================= */
const overlay = () => document.getElementById('overlay');
function closeOverlay() { overlay().innerHTML = ''; overlay().className = ''; ed = null; }

function openStatusMenu(btn) {
  const { task, date } = btn.dataset, cur = statusOf(task, date);
  const r = btn.getBoundingClientRect();
  overlay().className = 'on menu-mode';
  overlay().innerHTML = `<div class="scrim" data-act="close"></div>
    <div class="menu" style="left:${Math.min(r.left, innerWidth - 200)}px;top:${Math.min(r.bottom + 4, innerHeight - 280)}px">
      ${STATUSES.map(s => `<button class="menu-item${s.id === cur ? ' cur' : ''}" data-act="set-status" data-task="${task}" data-date="${date}" data-status="${s.id}">
        ${pill(s.id, 'tabindex="-1"')}${s.id === cur ? icon('check') : ''}</button>`).join('')}
    </div>`;
}

let ed = null; // task being edited
function openEditor(id, opts = {}) {
  const t = id ? S.tasks[id] : null;
  ed = t ? JSON.parse(JSON.stringify(t)) : {
    id: uid(), name: opts.name || '', icon: '', iconData: '', color: '', category: opts.cat || '', start: opts.date || ui.today, time: '',
    repeat: 'none', interval: 1, weekdays: '', dayOfMonth: '', end: '', early: !!opts.early, notify: false, notes: ''
  };
  ed._new = !t; ed._picker = false; ed._fromNote = opts.fromNote || null; ed._pin = !!t && pinned().includes(t.id);
  renderEditor();
  if (!t) setTimeout(() => { const n = document.querySelector('[data-field=name]'); n && n.focus(); }, 60);
}

function renderEditor() {
  const t = ed;
  const wds = Rec.weekdaysOf(Object.assign({}, t, { start: t.start || ui.today }));
  const unit = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }[t.repeat];
  const repeating = t.repeat && t.repeat !== 'none';
  let stats = '';
  if (!t._new && repeating) {
    const si = t.streak ? streakInfo(Object.assign({}, S.tasks[t.id] || t, { streak: true })) : null;
    const h = historyOf(t), done = h.filter(x => x.status === 'done').length;
    stats = si ? `<div class="field"><label>Streak</label>
        <div class="sc-line">${solid('fa:fire-flame-curved')}<b>${si.cur}</b> in a row <span class="gds">${graceDots(si.graces)}</span></div>
        <div class="hds big">${histDots(si.hist)}</div></div>`
      : `<div class="field"><label>History</label><div class="hist">
      ${h.map(x => `<span class="hdot" title="${fmtShort(x.date)}: ${statusLabel(x.status)}" style="background:var(--st-${x.status})"></span>`).join('')}</div>
      <div class="muted small">${done}/${h.length} of the last ${h.length} done</div></div>`;
  }
  const hueOrder = (ui.cats || []).map((c, i) => [Palette.rgb2hsl(...c.match(/\w\w/g).map(x => parseInt(x, 16)))[0], i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  overlay().className = 'on sheet-mode';
  overlay().innerHTML = `<div class="scrim" data-act="close"></div>
  <div class="sheet" role="dialog" aria-label="Task">
    <div class="sheet-head"><b>${t._new ? 'New task' : 'Edit task'}</b><span class="spacer"></span>
      <button class="iconbtn" data-act="close" aria-label="Close">${icon('x')}</button></div>
    <div class="sheet-body">
      <div class="namerow">
        <button class="iconpick" data-act="ed-picker" aria-label="Choose icon" style="--ic:${iconColor(t)}">${taskIcon(t)}</button>
        <input data-field="name" value="${esc(t.name)}" placeholder="Task name" enterkeyhint="done">
      </div>
      ${t._picker ? `<div class="picker"><input data-field="_q" value="${esc(t._q || '')}" placeholder="Search icons: laundry, meds, trash, cat…" autocomplete="off">
        <div class="picker-grid" style="--ic:${iconColor(t)}">${pickerGridHTML()}</div>
        <div class="muted small picker-note">${CATALOG ? CATALOG.length.toLocaleString() + ' icons · Font Awesome first, then Material' : 'Loading full icon set…'}</div></div>` : ''}
      <div class="field two">
        <div><label>${repeating ? 'Starts' : 'Due date'}</label><input type="date" data-field="start" value="${t.start}"></div>
        <div><label>Time (optional)</label><input type="time" data-field="time" value="${t.time || ''}"></div>
      </div>
      <div class="field"><label>Repeat</label>
        <div class="seg">${['none', 'daily', 'weekly', 'monthly', 'yearly'].map(r =>
          `<button class="${(t.repeat || 'none') === r ? 'on' : ''}" data-act="ed-repeat" data-v="${r}">${r === 'none' ? 'Once' : r[0].toUpperCase() + r.slice(1)}</button>`).join('')}</div>
      </div>
      ${repeating ? `<div class="field inline"><label>Every</label><input type="number" min="1" max="99" data-field="interval" value="${t.interval || 1}" class="num"><span>${unit}${(+t.interval || 1) > 1 ? 's' : ''}</span></div>` : ''}
      ${t.repeat === 'weekly' ? `<div class="field"><label>On</label><div class="wds">${[1, 2, 3, 4, 5, 6, 0].map(d =>
        `<button class="${wds.includes(d) ? 'on' : ''}" data-act="ed-wd" data-v="${d}">${DOW[d][0]}${DOW[d][1]}</button>`).join('')}</div></div>` : ''}
      ${t.repeat === 'monthly' ? `<div class="field inline"><label>Day of month</label><input type="number" min="1" max="31" data-field="dayOfMonth" class="num" value="${t.dayOfMonth || +t.start.slice(8)}"></div>` : ''}
      ${repeating ? `<div class="field inline"><label>Ends (optional)</label><input type="date" data-field="end" value="${t.end || ''}"></div>` : ''}
      <div class="field"><label>Category</label><div class="combo">
        <input data-field="category" id="cat-input" value="${esc(t.category || '')}" placeholder="Choose or type a new one" autocomplete="off">
        ${t.category ? `<button type="button" class="iconbtn faint combo-clear" data-act="cat-pick" data-v="" aria-label="Clear category">${icon('x')}</button>` : ''}
        <div class="combo-list" id="cat-list" hidden></div></div></div>
      <label class="toggle"><input type="checkbox" data-field="early" ${t.early ? 'checked' : ''}><span class="sw"></span>
        <span><b>Can be done early</b><span class="muted small">Shows in This Week’s To-do ahead of its due day</span></span></label>
      <label class="toggle"><input type="checkbox" data-field="notify" ${t.notify ? 'checked' : ''}><span class="sw"></span>
        <span><b>Phone reminder</b><span class="muted small">Push via ntfy at the task’s time${t.time ? '' : ' (set a time first)'}</span></span></label>
      ${repeating ? `<label class="toggle"><input type="checkbox" data-field="streak" ${t.streak ? 'checked' : ''}><span class="sw"></span>
        <span><b>Track streak</b><span class="muted small">Shows in Streaks on Today and its tag page</span></span></label>
      ${t.streak ? `<label class="toggle"><input type="checkbox" data-field="_pin" ${t._pin ? 'checked' : ''}${!t._pin && pinned().filter(id => id !== t.id).length >= 5 ? ' disabled' : ''}><span class="sw"></span>
        <span><b>Pin to Overview</b><span class="muted small">${!t._pin && pinned().filter(id => id !== t.id).length >= 5 ? '5 streaks are already pinned. Unpin one first.' : 'Up to 5 streaks show at the bottom of Overview'}</span></span></label>` : ''}
      ${t.streak ? `<div class="field inline"><label>Streak goal (optional)</label><input type="number" min="1" max="999" data-field="streakGoal" class="num" value="${esc(t.streakGoal || '')}" placeholder="e.g. 30"><span class="muted">in a row</span></div>` : ''}` : ''}
      <div class="field"><label>Icon color</label><div class="swatches">
        <button class="sw-auto${t.color === '' || t.color == null ? ' on' : ''}" data-act="ed-color" data-v="">Auto</button>
        ${hueOrder.map(i => `<button class="swatch${String(t.color) === String(i) ? ' on' : ''}" style="background:var(--cat${i})" data-act="ed-color" data-v="${i}" aria-label="Color ${i + 1}"></button>`).join('')}
      </div></div>
      <div class="field"><label>Notes</label><textarea data-field="notes" rows="2">${esc(t.notes || '')}</textarea></div>
      ${stats}
    </div>
    <div class="sheet-foot">
      ${t._new ? '' : `<button class="btn danger" data-act="ed-delete">${icon('trash-2')}Delete</button>`}
      <span class="spacer"></span>
      <button class="btn" data-act="close">Cancel</button>
      <button class="btn primary" data-act="ed-save">Save</button>
    </div>
  </div>`;
}

let CATALOG = null, catalogLoading = null;
function loadCatalog() {
  if (!catalogLoading) catalogLoading = fetch('icon-catalog.json').then(r => r.json()).then(list => {
    CATALOG = list.map(([id, label, vb, p, kw]) => ({ id, label, vb, p, tok: (kw + ' ' + label).toLowerCase().split(/[\s_-]+/).filter(Boolean) }));
    refreshPicker();
  }).catch(() => { catalogLoading = null; });
  return catalogLoading;
}
function searchIcons(q) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length || !CATALOG) return null;
  const groups = words.map(w => [[w, 1], ...((SYN[w] || '').split(' ').filter(Boolean).map(x => [x, .7]))]);
  const res = [];
  for (const ic of CATALOG) {
    let total = 0, ok = true;
    for (const g of groups) {
      let best = 0;
      for (const [term, wt] of g) for (const tk of ic.tok) {
        const sc = tk === term ? 10 : tk.startsWith(term) ? 6 : (term.length > 3 && tk.includes(term)) ? 3 : 0;
        if (sc * wt > best) best = sc * wt;
      }
      if (!best) { ok = false; break; }
      total += best;
    }
    if (ok) res.push([total + (ic.id.startsWith('fa:') ? 2.5 : 0) - ic.tok.length * .05, ic]);
  }
  return res.sort((a, b) => b[0] - a[0]).slice(0, 160).map(x => x[1]);
}
function pickerGridHTML() {
  const q = (ed && ed._q || '').trim();
  const found = q ? searchIcons(q) : null;
  const cell = (id, label, vb, p) => `<button class="${ed && ed.icon === id ? 'on' : ''}" data-act="ed-icon" data-icon="${id}" title="${esc(label)}">${svgPath(vb, p)}</button>`;
  if (found) return found.length ? found.map(ic => cell(ic.id, ic.label, ic.vb, ic.p)).join('') : '<div class="muted small">No matches. Try a simpler word.</div>';
  if (q && !CATALOG) return '<div class="muted small">Loading icons…</div>';
  return STARTER_ICONS.filter(id => SOLID_CORE[id]).map(id => cell(id, SOLID_CORE[id][0], SOLID_CORE[id][1], SOLID_CORE[id][2])).join('');
}
function refreshPicker() {
  const g = document.querySelector('.picker-grid'); if (g) g.innerHTML = pickerGridHTML();
  const n = document.querySelector('.picker-note'); if (n && CATALOG) n.textContent = CATALOG.length.toLocaleString() + ' icons · Font Awesome first, then Material';
}

// Icon picker used from Settings (month/holiday icons and tag views).
let pk = null;
const PAGE_SUGGEST = 'fa:snowflake fa:snowman fa:mitten fa:mountain-sun fa:person-skiing ms:ac_unit ms:severe_cold fa:heart fa:seedling fa:spa ms:local_florist ms:filter_vintage ms:eco ms:psychiatry fa:feather fa:dove fa:kiwi-bird fa:frog fa:bug fa:cloud-rain fa:umbrella fa:cloud-sun fa:sun ms:wb_sunny fa:umbrella-beach fa:water fa:sailboat fa:fish fa:ice-cream ms:icecream ms:surfing ms:pool fa:campground fa:person-hiking ms:forest ms:park fa:tree ms:yard ms:grass fa:leaf fa:apple-whole fa:wheat-awn fa:wind fa:mug-hot ms:local_cafe fa:fire ms:fireplace ms:cottage fa:moon ms:bedtime fa:star fa:ghost fa:gift fa:candy-cane fa:sleigh fa:holly-berry fa:champagne-glasses fa:clover fa:egg fa:house fa:calendar-days fa:broom fa:pump-soap fa:paw fa:cat fa:seedling fa:soap fa:tooth fa:bath fa:cart-shopping fa:people-group fa:utensils'.split(' ');
function openIconSheet(title, onPick) {
  pk = { title, onPick, q: '' };
  loadCatalog().then(() => { if (pk) refreshIconSheet(); });
  overlay().className = 'on sheet-mode';
  overlay().innerHTML = `<div class="scrim" data-act="pk-cancel"></div>
  <div class="sheet" role="dialog" aria-label="${esc(title)}">
    <div class="sheet-head"><b>${esc(title)}</b><span class="spacer"></span><button class="iconbtn" data-act="pk-cancel" aria-label="Back">${icon('x')}</button></div>
    <div class="sheet-body"><input id="pk-q" placeholder="Search icons: snow, flower, leaf, sun…" autocomplete="off">
      <div class="picker-grid big" id="pk-grid">${iconSheetGrid()}</div>
      <div class="btnrow"><button class="btn" data-act="pk-reset">Use default</button></div></div></div>`;
}
function iconSheetGrid() {
  const found = pk && pk.q ? searchIcons(pk.q) : null;
  const cell = (id, label, vb, p) => `<button data-act="pk-pick" data-icon="${id}" title="${esc(label)}">${svgPath(vb, p)}</button>`;
  if (found) return found.length ? found.map(ic => cell(ic.id, ic.label, ic.vb, ic.p)).join('') : '<div class="muted small">No matches. Try a simpler word.</div>';
  const byId = CATALOG ? Object.fromEntries(CATALOG.map(c => [c.id, c])) : {};
  return PAGE_SUGGEST.map(id => SOLID_CORE[id] ? cell(id, SOLID_CORE[id][0], SOLID_CORE[id][1], SOLID_CORE[id][2]) : byId[id] ? cell(id, byId[id].label, byId[id].vb, byId[id].p) : '').join('');
}
function refreshIconSheet() { const g = document.getElementById('pk-grid'); if (g) g.innerHTML = iconSheetGrid(); }
function iconDataFor(id) {
  if (SOLID_CORE[id]) return SOLID_CORE[id][1] + '|' + SOLID_CORE[id][2];
  const c = (CATALOG || []).find(x => x.id === id); return c ? c.vb + '|' + c.p : '';
}

function saveEditor() {
  const t = Object.assign({}, ed);
  t.name = (t.name || '').trim();
  if (!t.name) { const n = document.querySelector('[data-field=name]'); n && n.focus(); return; }
  if (t.repeat === 'weekly' && !String(t.weekdays)) t.weekdays = String(Rec.weekday(t.start));
  if (t.repeat !== 'weekly') t.weekdays = '';
  if (t.repeat !== 'monthly') t.dayOfMonth = '';
  if (t.repeat === 'none') { t.interval = 1; t.end = ''; }
  t.interval = Math.max(1, parseInt(t.interval, 10) || 1);
  t.category = (t.category || '').trim();
  const fromNote = t._fromNote, wantPin = !!t._pin;
  delete t._new; delete t._picker; delete t._q; delete t._fromNote; delete t._pin;
  t.color = t.color === '' || t.color == null ? '' : String(t.color);
  t.streak = !!t.streak && t.repeat !== 'none';
  t.streakGoal = t.streak && parseInt(t.streakGoal, 10) > 0 ? String(parseInt(t.streakGoal, 10)) : '';
  t.updatedAt = Date.now(); t.deleted = false;
  closeOverlay();
  if (fromNote && S.items[fromNote]) commit({ t: 'item', rec: Object.assign({}, S.items[fromNote], { deleted: true, updatedAt: Date.now() }) }, false);
  commit({ t: 'task', rec: t });
  const pins = pinned().filter(id => id !== t.id);
  if (wantPin && t.streak && pins.length < 5) pins.push(t.id);
  if (JSON.stringify(pins) !== JSON.stringify(metaVal('pinnedStreaks', []) || [])) setMeta('pinnedStreaks', pins);
}

// Rename (or with '' delete) a category everywhere: tasks, tag views, saved list.
function renameCategory(from, to) {
  const lf = from.toLowerCase(), now = Date.now();
  taskList().filter(t => (t.category || '').toLowerCase() === lf)
    .forEach(t => commit({ t: 'task', rec: Object.assign({}, t, { category: to, updatedAt: now }) }, false));
  const vs = views().map(v => Object.assign({}, v, { cats: [...new Set((v.cats || []).map(c => c.toLowerCase() === lf ? to : c).filter(Boolean))] }));
  if (JSON.stringify(vs) !== JSON.stringify(views())) setMeta('views', vs);
  let list = (metaVal('categories', []) || []).filter(c => c.toLowerCase() !== lf);
  if (to && !list.some(c => c.toLowerCase() === to.toLowerCase())) list.push(to);
  setMeta('categories', list);
}

function openSettings(section) {
  const pref = metaVal('theme', 'auto');
  if (section) setTimeout(() => { const el = document.getElementById('sec-' + section); el && el.scrollIntoView({ block: 'start' }); }, 30);
  const link = config.url ? location.origin + location.pathname + '#connect=' + btoa(JSON.stringify(config)) : '';
  overlay().className = 'on sheet-mode';
  overlay().innerHTML = `<div class="scrim" data-act="close"></div>
  <div class="sheet" role="dialog" aria-label="Settings">
    <div class="sheet-head"><b>Settings</b><span class="spacer"></span><button class="iconbtn" data-act="close" aria-label="Close">${icon('x')}</button></div>
    <div class="sheet-body">
      <div class="field"><label>Dashboard title</label><input id="set-title" value="${esc(metaVal('title', 'Home Dashboard'))}"></div>
      <div class="field"><label>Theme</label><select id="set-theme">
        <option value="auto"${MONTH_KEYS.includes(pref) ? '' : ' selected'}>Auto: follows the date (with holidays)</option>
        ${MONTHS.map(m => `<option value="${m.key}"${pref === m.key ? ' selected' : ''}>${m.label}</option>`).join('')}</select>
        <span class="muted small">Pick a month to preview or keep its photos and colors.</span></div>
      <div class="field" id="sec-views"><label>Tag views</label>
        <span class="muted small">Each view on the Tags page shows tasks with any of its categories (comma-separated).</span>
        <span class="muted small">Drag ${solid('fa:grip-vertical', 'inline')} to reorder.</span>
        <div id="view-rows">${views().map((v, i) => `<div class="view-row" data-i="${i}">
          <span class="grip" aria-label="Drag to reorder">${solid('fa:grip-vertical')}</span>
          <button class="iconpick small" data-act="pick-view-icon" data-i="${i}" aria-label="Icon">${viewIcon(v)}</button>
          <input data-view-name="${i}" value="${esc(v.name)}" placeholder="Name">
          <input data-view-cats="${i}" value="${esc((v.cats || []).join(', '))}" placeholder="Categories">
          <button class="iconbtn faint" data-act="view-del" data-i="${i}" aria-label="Remove">${icon('x')}</button></div>`).join('')}</div>
        <div class="btnrow"><button class="btn" data-act="view-add">${icon('plus')}Add view</button></div></div>
      <div class="field" id="sec-cats"><label>Categories</label>
        <span class="muted small">Rename by editing; ${icon('x', 'inline')} removes a category from every task that uses it.</span>
        ${allCategories().map(c => { const n = taskList().filter(t => (t.category || '').toLowerCase() === c.toLowerCase()).length;
          return `<div class="cat-row"><input data-cat-rename="${esc(c)}" value="${esc(c)}"><span class="muted small">${n} task${n === 1 ? '' : 's'}</span>
            <button class="iconbtn faint" data-act="cat-del" data-v="${esc(c)}" aria-label="Delete ${esc(c)}">${icon('x')}</button></div>`; }).join('') || '<div class="muted small">No categories yet.</div>'}
        <div class="cat-row"><input id="cat-new" placeholder="New category" enterkeyhint="done"><span></span><button class="iconbtn faint" data-act="cat-add" aria-label="Add">${icon('plus')}</button></div></div>
      <div class="field"><label>Photo layout</label><div class="seg">${[['auto', 'Auto'], ['banner', 'Banner'], ['background', 'Full background']].map(([k, l]) =>
        `<button class="${metaVal('photoLayout', 'auto') === k ? 'on' : ''}" data-act="set-layout" data-v="${k}">${l}</button>`).join('')}</div>
        <span class="muted small">Auto uses large photos as the full background and wide strips as a banner.</span></div>
      <label class="toggle"><input type="checkbox" id="set-holidays" ${metaVal('holidays', true) ? 'checked' : ''}><span class="sw"></span>
        <span><b>Holidays</b><span class="muted small">Holiday photos, icons and particles on their dates</span></span></label>
      <label class="toggle"><input type="checkbox" id="set-motion" ${LS.get('motion', true) ? 'checked' : ''}><span class="sw"></span>
        <span><b>Falling particles</b><span class="muted small">Leaves, petals, snow and sparkles drifting down the page (this device only).</span></span></label>
      <h3>Google Sheet sync</h3>
      <div class="field"><label>Web app URL</label><input id="set-url" value="${esc(config.url)}" placeholder="https://script.google.com/macros/s/…/exec"></div>
      <div class="field"><label>Secret key</label><input id="set-key" value="${esc(config.key)}" placeholder="from the Apps Script log"></div>
      <div class="btnrow"><button class="btn primary" data-act="st-connect">${config.url ? 'Reconnect' : 'Connect'}</button>
        ${config.url ? `<button class="btn" data-act="st-disconnect">Disconnect</button>` : ''}</div>
      <div id="st-msg" class="muted small">${config.url ? 'Status: ' + esc(ui.sync) + (ui.syncMsg ? ' – ' + esc(ui.syncMsg) : '') : 'Not connected. Tasks are saved on this device only.'}</div>
      ${link ? `<div class="field"><label>Link for your other device</label><div class="muted small">Open this link once on your phone or laptop to connect it automatically. Keep it private, since it contains your key.</div>
        <div class="btnrow"><button class="btn" data-act="st-copy" data-link="${esc(link)}">${icon('copy')}Copy link</button>
        <button class="btn" data-act="st-test">${icon('bell-ring')}Send test notification</button></div></div>` : ''}
      <div class="field" id="sec-icons"><label>Month &amp; holiday icons</label><span class="muted small">Tap one to choose a different icon.</span><div class="icon-tiles">
        ${[...MONTHS.map(m => [m.key, m.label.slice(0, 3), m.icon]), ...Object.entries(HOLIDAYS).map(([k, h]) => [k, h.label.replace("'s Day", '').replace('Fourth of July', 'July 4'), h.icon])].map(([k, l, def]) => {
          const pick = (metaVal('pageIcons', {}) || {})[k];
          const ic = pick && pick.data ? svgPath(pick.data.split('|')[0], pick.data.slice(pick.data.indexOf('|') + 1)) : solid(def);
          return `<button class="icon-tile" data-act="pick-page-icon" data-key="${k}" title="Change icon">${ic}<span>${esc(l)}</span></button>`; }).join('')}
      </div></div>
      <h3>Data</h3>
      <div class="btnrow"><button class="btn" data-act="sync">${icon('refresh-cw')}Sync now</button><button class="btn" data-act="st-export">${icon('download')}Export backup</button></div>
      <div class="muted small">Icons: Font Awesome Free (CC BY 4.0) and Material Symbols (Apache 2.0).</div>
    </div>
  </div>`;
}

async function connect(url, key) {
  url = url.trim(); key = key.trim();
  const msg = document.getElementById('st-msg');
  if (msg) msg.textContent = 'Connecting…';
  try {
    const res = await fetch(url + (url.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(key));
    const data = await res.json();
    if (!data.ok) throw new Error(data.error === 'bad key' ? 'The secret key does not match.' : data.error);
    const wasLocal = !config.url;
    config = { url, key }; LS.set('config', config);
    if (wasLocal) { // upload anything created before connecting
      Object.values(S.tasks).forEach(rec => outbox.push({ t: 'task', rec }));
      Object.entries(S.statuses).forEach(([k, v]) => { const [taskId, date] = k.split('|'); outbox.push({ t: 'status', taskId, date, status: v.status, updatedAt: v.updatedAt }); });
      Object.values(S.items).forEach(rec => outbox.push({ t: 'item', rec }));
      Object.entries(S.meta).forEach(([key, v]) => outbox.push({ t: 'meta', key, value: v.value, updatedAt: v.updatedAt }));
      if (!outbox.length) loadServerState(data.state);
    }
    outbox.push({ t: 'meta', key: 'appUrl', value: location.origin + location.pathname, updatedAt: now() });
    save(); await flush();
    if (msg) msg.textContent = 'Connected ✓';
    render(); if (overlay().innerHTML) openSettings();
    return true;
  } catch (e) {
    if (msg) msg.textContent = 'Could not connect: ' + (e.message || e) + '. Check the URL ends in /exec and the deployment is set to “Anyone”.';
    return false;
  }
}
function now() { return Date.now(); }

/* ================= events ================= */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const a = el.dataset.act, d = el.dataset;
  switch (a) {
    case 'close': closeOverlay(); break;
    case 'status': openStatusMenu(el); break;
    case 'set-status': {
      closeOverlay();
      const tk = S.tasks[d.task], before = streakInfo(tk);
      commit({ t: 'status', taskId: d.task, date: d.date, status: d.status, updatedAt: Date.now() });
      streakMemo = {};
      const after = streakInfo(tk);
      if (after && after.goal && before && before.cur < after.goal && after.cur >= after.goal) toast(`${solid('fa:trophy')}Goal reached! <b>${esc(tk.name)}</b>: ${after.goal} in a row`);
      else if (after && before && after.graces > before.graces) toast(`${solid('fa:shield-halved')}<b>${esc(tk.name)}</b>: earned a grace day (${after.graces}/3)`);
      break;
    }
    case 'edit-task': openEditor(d.task); break;
    case 'new-task': openEditor(null, { date: d.date, early: d.early === '1', cat: d.cat || (ui.tab === 'tags' && (views().find(v => v.id === ui.view) || {}).cats ? views().find(v => v.id === ui.view).cats[0] : '') }); break;
    case 'tab': ui.tab = d.tab; LS.set('tab', d.tab); render(); break;
    case 'view': ui.view = d.view; LS.set('view', d.view); render(); break;
    case 'note-to-task': { const n = S.items[d.item]; if (n) openEditor(null, { name: n.text, fromNote: n.id }); break; }
    case 'notes-clear':
      Object.values(S.items).filter(i => i.listId === '__notes' && i.checked)
        .forEach(i => commit({ t: 'item', rec: Object.assign({}, i, { deleted: true, updatedAt: Date.now() }) }, false));
      render(); break;
    case 'pick-page-icon': {
      const key = d.key, label = (MONTHS.find(m => m.key === key) || {}).label || (HOLIDAYS[key] || {}).label;
      openIconSheet('Icon for ' + label, id => {
        const m = Object.assign({}, metaVal('pageIcons', {}) || {});
        if (id) m[key] = { id, data: iconDataFor(id) }; else delete m[key];
        setMeta('pageIcons', m); openSettings('icons');
      });
      pk.back = 'icons'; break;
    }
    case 'pick-view-icon': {
      const i = +d.i;
      openIconSheet('Icon for ' + (views()[i] || {}).name, id => {
        const vs = views().map(v => Object.assign({}, v));
        if (id) { vs[i].icon = id; vs[i].iconData = SOLID_CORE[id] ? '' : iconDataFor(id); } else { vs[i].icon = 'fa:tags'; vs[i].iconData = ''; }
        setMeta('views', vs); openSettings('views');
      });
      pk.back = 'views'; break;
    }
    case 'pk-pick': if (pk) { const f = pk.onPick; pk = null; f(d.icon); } break;
    case 'pk-reset': if (pk) { const f = pk.onPick; pk = null; f(null); } break;
    case 'pk-cancel': { const back = pk && pk.back; pk = null; openSettings(back); break; }
    case 'view-add': {
      const vs = views().map(v => Object.assign({}, v));
      vs.push({ id: uid(), name: 'New view', icon: 'fa:tags', cats: [] });
      setMeta('views', vs); openSettings('views'); break;
    }
    case 'cat-add': {
      const inp = document.getElementById('cat-new'), v = inp && inp.value.trim();
      if (v && !allCategories().some(c => c.toLowerCase() === v.toLowerCase())) setMeta('categories', [...(metaVal('categories', []) || []), v]);
      openSettings('cats'); break;
    }
    case 'cat-del': {
      const c = d.v, lc = c.toLowerCase(), used = taskList().filter(t => (t.category || '').toLowerCase() === lc);
      if (!confirm(`Delete the category “${c}”?${used.length ? ` ${used.length} task${used.length === 1 ? '' : 's'} will have no category.` : ''}`)) break;
      renameCategory(c, ''); openSettings('cats'); break;
    }
    case 'view-move': {
      const vs = views().map(v => Object.assign({}, v)), i = +d.i, j = i + +d.dir;
      if (j < 0 || j >= vs.length) break;
      [vs[i], vs[j]] = [vs[j], vs[i]];
      setMeta('views', vs); openSettings('views'); break;
    }
    case 'view-del': {
      const vs = views().filter((_, i) => i !== +d.i);
      if (!confirm('Remove this view? Tasks are not affected.')) break;
      setMeta('views', vs); openSettings('views'); break;
    }
    case 'filter': ui.filter = d.cat; render(); break;
    case 'cal-day': ui.calDay = d.date; render(); break;
    case 'cal-prev': case 'cal-next':
      ui.calWeek = Rec.addDays(ui.calWeek, a === 'cal-next' ? 7 : -7);
      ui.calDay = weekStart(ui.today) === ui.calWeek ? ui.today : ui.calWeek; render(); break;
    case 'cal-today': ui.calWeek = weekStart(ui.today); ui.calDay = ui.today; render(); break;
    case 'toggle-checked': ui.showChecked = ui.showChecked || {}; ui.showChecked[d.list] = !ui.showChecked[d.list]; render(); break;
    case 'list-toggle': {
      const h = LS.get('listsHidden', []);
      LS.set('listsHidden', h.includes(d.list) ? h.filter(x => x !== d.list) : [...h, d.list]); render(); break;
    }
    case 'list-add': {
      const name = prompt('New list name'); if (!name || !name.trim()) break;
      const id = uid();
      setMeta('lists', [...metaVal('lists', []), { id, name: name.trim() }]); break;
    }
    case 'list-menu': {
      const lists = metaVal('lists', []), cur = lists.find(l => l.id === d.list); if (!cur) break;
      const name = prompt(`Rename “${cur.name}” (leave empty to delete the list)`, cur.name);
      if (name === null) break;
      if (!name.trim()) {
        if (!confirm(`Delete the list “${cur.name}” and its items?`)) break;
        Object.values(S.items).filter(i => i.listId === cur.id).forEach(i => commit({ t: 'item', rec: Object.assign({}, i, { deleted: true, updatedAt: Date.now() }) }, false));
        setMeta('lists', lists.filter(l => l.id !== cur.id));
      } else setMeta('lists', lists.map(l => l.id === cur.id ? { id: l.id, name: name.trim() } : l));
      break;
    }
    case 'item-toggle': { const i = S.items[d.item]; commit({ t: 'item', rec: Object.assign({}, i, { checked: !i.checked, updatedAt: Date.now() }) }); break; }
    case 'item-del': { const i = S.items[d.item]; commit({ t: 'item', rec: Object.assign({}, i, { deleted: true, updatedAt: Date.now() }) }); break; }
    case 'items-clear':
      Object.values(S.items).filter(i => i.listId === d.list && i.checked)
        .forEach(i => commit({ t: 'item', rec: Object.assign({}, i, { deleted: true, updatedAt: Date.now() }) }, false));
      render(); break;
    case 'settings': openSettings(d.sec); break;
    case 'toggle-done': ui.showDone = ui.showDone || {}; ui.showDone[d.tid] = !ui.showDone[d.tid]; render(); break;
    case 'toggle-particles': LS.set('motion', !LS.get('motion', true)); render(); break;
    case 'sync': flush(); break;
    case 'ed-picker': ed._picker = !ed._picker; renderEditor(); if (ed._picker) { loadCatalog(); const q = document.querySelector('[data-field=_q]'); q && q.focus(); } break;
    case 'ed-icon': {
      const c = SOLID_CORE[d.icon] ? { vb: SOLID_CORE[d.icon][1], p: SOLID_CORE[d.icon][2] } : (CATALOG || []).find(x => x.id === d.icon);
      if (c) { ed.icon = d.icon; ed.iconData = c.vb + '|' + c.p; }
      ed._picker = false; renderEditor(); break;
    }
    case 'ed-color': ed.color = d.v; renderEditor(); break;
    case 'ed-repeat': ed.repeat = d.v; if (d.v === 'weekly' && !String(ed.weekdays)) ed.weekdays = String(Rec.weekday(ed.start)); renderEditor(); break;
    case 'ed-wd': {
      let w = Rec.weekdaysOf(ed); const v = +d.v;
      w = w.includes(v) ? w.filter(x => x !== v) : [...w, v];
      if (!w.length) break;
      ed.weekdays = w.sort().join(','); renderEditor(); break;
    }
    case 'ed-save': saveEditor(); break;
    case 'cat-pick': {
      if (!ed) break;
      ed.category = d.v; const inp = document.getElementById('cat-input'); if (inp) inp.value = d.v;
      const l = document.getElementById('cat-list'); if (l) l.hidden = true;
      if (iconColor) { const ip = document.querySelector('.iconpick'); if (ip) ip.style.setProperty('--ic', iconColor(ed)); }
      if (d.v && !allCategories().some(c => c.toLowerCase() === d.v.toLowerCase())) setMeta('categories', [...(metaVal('categories', []) || []), d.v]);
      break;
    }
    case 'ed-delete':
      if (!confirm(`Delete “${ed.name}”${ed.repeat !== 'none' ? ' and all its future repeats' : ''}?`)) break;
      { const rec = Object.assign({}, S.tasks[ed.id], { deleted: true, updatedAt: Date.now() }); closeOverlay(); commit({ t: 'task', rec }); }
      break;
    case 'set-layout': setMeta('photoLayout', d.v); openSettings(); break;
    case 'st-connect': connect(document.getElementById('set-url').value, document.getElementById('set-key').value); break;
    case 'st-disconnect':
      if (!confirm('Disconnect this device? Your tasks stay in the Google Sheet.')) break;
      config = { url: '', key: '' }; LS.set('config', config); outbox = []; save(); setSync('local'); openSettings(); break;
    case 'st-copy':
      (navigator.clipboard ? navigator.clipboard.writeText(d.link) : Promise.reject()).then(
        () => { el.innerHTML = icon('check') + 'Copied'; }, () => prompt('Copy this link:', d.link)); break;
    case 'st-test': commit({ t: 'testNotify' }, false); el.innerHTML = icon('check') + 'Sent – check ntfy'; break;
    case 'st-export': {
      const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
      const a2 = document.createElement('a'); a2.href = URL.createObjectURL(blob); a2.download = `chores-backup-${ui.today}.json`; a2.click();
      break;
    }
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'pk-q' && pk) { pk.q = e.target.value.trim(); clearTimeout(ui.pkT); ui.pkT = setTimeout(refreshIconSheet, 120); return; }
  const f = e.target.dataset.field;
  if (f && ed) {
    ed[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (f === '_q') { clearTimeout(ui.qT); ui.qT = setTimeout(refreshPicker, 120); }
    if (f === 'category') { const ip = document.querySelector('.iconpick'); if (ip) ip.style.setProperty('--ic', iconColor(ed));
      const l = document.getElementById('cat-list'); if (l) { l.innerHTML = comboListHTML(e.target.value); l.hidden = false; } }
    if (f === 'streak') renderEditor();
    if (f === 'interval') { const s = e.target.nextElementSibling; if (s) s.textContent = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }[ed.repeat] + ((+ed.interval || 1) > 1 ? 's' : ''); }
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'set-title' && t.value.trim()) setMeta('title', t.value.trim());
  if (t.id === 'set-holidays') setMeta('holidays', t.checked);
  if (t.id === 'set-theme') setMeta('theme', t.value);
  if (t.dataset.catRename !== undefined) {
    const from = t.dataset.catRename, to = t.value.trim();
    if (to && to !== from) { renameCategory(from, to); openSettings('cats'); } else t.value = from;
  }
  if (t.dataset.viewName !== undefined || t.dataset.viewCats !== undefined) {
    const vs = views().map(v => Object.assign({}, v));
    if (t.dataset.viewName !== undefined) vs[+t.dataset.viewName].name = t.value.trim() || 'Untitled';
    else vs[+t.dataset.viewCats].cats = t.value.split(',').map(x => x.trim()).filter(Boolean);
    setMeta('views', vs);
  }
  if (t.id === 'set-motion') { LS.set('motion', t.checked); applyTheme(); }
  if (t.dataset.itemEdit) {
    const i = S.items[t.dataset.itemEdit];
    if (!t.value.trim()) commit({ t: 'item', rec: Object.assign({}, i, { deleted: true, updatedAt: Date.now() }) });
    else if (t.value !== i.text) commit({ t: 'item', rec: Object.assign({}, i, { text: t.value.trim(), updatedAt: Date.now() }) }, false);
  }
});
document.addEventListener('focusin', e => {
  if (e.target.id === 'cat-input') { const l = document.getElementById('cat-list'); if (l) { l.innerHTML = comboListHTML(e.target.value); l.hidden = false; } }
});
document.addEventListener('focusout', e => {
  if (e.target.id === 'cat-input') setTimeout(() => { const l = document.getElementById('cat-list'); if (l && !l.contains(document.activeElement)) l.hidden = true; }, 180);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && overlay().innerHTML) closeOverlay();
  if (e.key === 'Enter' && e.target.classList.contains('new-item') && e.target.value.trim()) {
    const lid = e.target.dataset.list;
    const sorts = Object.values(S.items).filter(i => i.listId === lid).map(i => i.sort);
    commit({ t: 'item', rec: { id: uid(), listId: lid, text: e.target.value.trim(), checked: false,
      sort: (sorts.length ? Math.max(...sorts) : 0) + 1, updatedAt: Date.now(), deleted: false } });
    const n = document.querySelector(`.new-item[data-list="${lid}"]`); n && n.focus();
  }
  if (e.key === 'Enter' && e.target.id === 'new-note' && e.target.value.trim()) {
    const sorts = Object.values(S.items).filter(i => i.listId === '__notes').map(i => i.sort);
    commit({ t: 'item', rec: { id: uid(), listId: '__notes', text: e.target.value.trim(), checked: false,
      sort: (sorts.length ? Math.max(...sorts) : 0) + 1, updatedAt: Date.now(), deleted: false } });
    const n = document.getElementById('new-note'); n && n.focus();
  }
  if (e.key === 'Enter' && e.target.id === 'cat-new') { e.preventDefault(); document.querySelector('[data-act=cat-add]').click(); }
  if (e.key === 'Enter' && e.target.id === 'cat-input') { e.preventDefault(); const v = e.target.value.trim(); const hit = allCategories().find(c => c.toLowerCase() === v.toLowerCase());
    const b = document.createElement('button'); b.dataset.act = 'cat-pick'; b.dataset.v = hit || v; document.body.appendChild(b); b.click(); b.remove(); }
  if (e.key === 'Enter' && e.target.dataset.field === 'name') saveEditor();
  if (e.key === 'Enter' && e.target.dataset.itemEdit) e.target.blur();
});

/* refresh when coming back to the app, at midnight, and periodically */
function tick() {
  const t = todayStr();
  if (t !== ui.today) { ui.today = t; ui.calDay = t; ui.calWeek = weekStart(t); render(); }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) { tick(); pull(); } });
window.addEventListener('focus', () => { tick(); pull(); });
window.addEventListener('online', () => flush());
let wasWide = isWide();
window.addEventListener('resize', () => { const w = isWide(); if (w !== wasWide) { wasWide = w; render(); } });

/* drag to reorder tag views in Settings */
let drag = null;
document.addEventListener('pointerdown', e => {
  const g = e.target.closest('.grip'); if (!g) return;
  const row = g.closest('.view-row'), box = document.getElementById('view-rows');
  drag = { row, box, y0: e.clientY }; row.classList.add('dragging'); g.setPointerCapture(e.pointerId); e.preventDefault();
});
document.addEventListener('pointermove', e => {
  if (!drag) return;
  const rows = [...drag.box.children].filter(r => r !== drag.row);
  const after = rows.find(r => { const b = r.getBoundingClientRect(); return e.clientY < b.top + b.height / 2; });
  if (after) drag.box.insertBefore(drag.row, after); else drag.box.appendChild(drag.row);
});
const endDrag = () => {
  if (!drag) return;
  const order = [...drag.box.children].map(r => +r.dataset.i), vs = views();
  drag.row.classList.remove('dragging'); drag = null;
  if (order.some((v, i) => v !== i)) { setMeta('views', order.map(i => vs[i])); openSettings('views'); }
};
document.addEventListener('pointerup', endDrag); document.addEventListener('pointercancel', endDrag);

/* sticky chart shrinks as you scroll (0 = big, 1 = compact with legend) */
function updateChartShrink() {
  const el = document.querySelector('.chart-sticky'), hero = document.querySelector('.hero');
  if (!el || !hero) return;
  const start = hero.getBoundingClientRect().bottom + scrollY - 54; // scroll position where the chart reaches the top
  const cp = Math.max(0, Math.min(1, (scrollY - start + 40) / 200));
  document.documentElement.style.setProperty('--cp', cp.toFixed(3));
}
let cpRaf = 0;
window.addEventListener('scroll', () => { if (!cpRaf) cpRaf = requestAnimationFrame(() => { cpRaf = 0; updateChartShrink(); }); }, { passive: true });

/* swipe left/right between tabs on touch screens */
let sw0 = null;
document.addEventListener('touchstart', e => {
  if (overlay().innerHTML || e.touches.length !== 1 || e.target.closest('.filters, .tabs, .wk-grid, input, textarea, .nav')) { sw0 = null; return; }
  sw0 = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
}, { passive: true });
document.addEventListener('touchend', e => {
  if (!sw0) return;
  const dx = e.changedTouches[0].clientX - sw0.x, dy = e.changedTouches[0].clientY - sw0.y;
  if (Math.abs(dx) > 80 && Math.abs(dy) < 50 && Date.now() - sw0.t < 600) {
    const i = TABS.findIndex(t => t.id === ui.tab), n = i + (dx < 0 ? 1 : -1);
    if (n >= 0 && n < TABS.length) { ui.tab = TABS[n].id; LS.set('tab', ui.tab); render(); }
  }
  sw0 = null;
}, { passive: true });
setInterval(() => { tick(); if (!document.hidden) pull(); }, 45000);

/* ================= boot ================= */
(function boot() {
  const m = location.hash.match(/connect=([^&]+)/);
  if (m) {
    try { const c = JSON.parse(atob(decodeURIComponent(m[1]))); history.replaceState(null, '', location.pathname); connect(c.url, c.key); } catch (e) {}
  }
  ui.calWeek = weekStart(ui.today); ui.calDay = ui.today;
  if (!S.meta.lists) S.meta.lists = { value: [{ id: 'shopping', name: 'Shopping' }], updatedAt: 0 };
  ui.sync = config.url ? 'syncing' : 'local';
  render();
  loadBanners().then(render);
  if (config.url) flush();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
