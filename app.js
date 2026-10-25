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
const ui = { filter: 'All', calMonth: null, calDay: null, listId: null, sync: 'local', syncMsg: '', today: todayStr() };

const FINISHED = { done: 1, not_needed: 1 };
const PICKER_EXCLUDE = new Set(['chevron-left', 'chevron-right', 'chevron-down', 'cloud-off', 'ellipsis', 'ellipsis-vertical',
  'copy', 'link', 'x', 'plus', 'minus', 'loader-circle', 'circle-dashed', 'square', 'eraser', 'download', 'filter', 'search', 'sliders-horizontal']);
const ICON_ALIASES = {
  meds: 'pill pill-bottle tablets syringe', medicine: 'pill pill-bottle', laundry: 'washing-machine shirt', clothes: 'shirt',
  dishes: 'utensils cooking-pot', cook: 'cooking-pot chef-hat utensils', food: 'utensils salad soup', clean: 'spray-can sparkles brush',
  vacuum: 'wind', sweep: 'brush', mop: 'droplets', plants: 'sprout flower leaf flower-2', water: 'droplet droplets glass-water',
  garbage: 'trash trash-2 recycle', bills: 'receipt credit-card banknote wallet', money: 'banknote coins piggy-bank wallet',
  groceries: 'shopping-cart shopping-basket carrot apple', exercise: 'dumbbell bike footprints activity', gym: 'dumbbell',
  pet: 'dog cat paw-print fish-symbol', walk: 'footprints dog', sleep: 'bed moon', car: 'car car-front fuel', yard: 'shovel trees leaf',
  mail: 'mail mailbox package', bathroom: 'bath shower-head toilet', kitchen: 'refrigerator microwave cooking-pot', fix: 'wrench hammer drill'
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
function todayItems() {
  const today = ui.today, out = [];
  taskList().forEach(t => {
    if (!passesFilter(t)) return;
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
function weekItems() {
  const out = [];
  for (let k = 1; k <= 7; k++) {
    const d = Rec.addDays(ui.today, k);
    taskList().forEach(t => { if (t.early && passesFilter(t) && Rec.occursOn(t, d)) out.push({ t, date: d, overdue: false }); });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.t.time || '99').localeCompare(b.t.time || '99') || a.t.name.localeCompare(b.t.name));
}
function dayItems(ds) {
  return taskList().filter(t => passesFilter(t) && Rec.occursOn(t, ds)).map(t => ({ t, date: ds }))
    .sort((a, b) => (a.t.time || '99').localeCompare(b.t.time || '99') || a.t.name.localeCompare(b.t.name));
}

function streakOf(t) {
  if (!t.repeat || t.repeat === 'none') return 0;
  let d = Rec.occursOn(t, ui.today) ? ui.today : Rec.prevOccurrence(t, ui.today), n = 0, guard = 0;
  while (d && guard++ < 366) {
    const st = statusOf(t.id, d);
    if (st === 'done') n++;
    else if (st !== 'not_needed' && d !== ui.today) break;
    d = Rec.prevOccurrence(t, d);
  }
  return n;
}
function historyOf(t, count = 14) {
  const out = [];
  let d = Rec.occursOn(t, ui.today) ? ui.today : Rec.prevOccurrence(t, ui.today);
  while (d && out.length < count) { out.unshift({ date: d, status: statusOf(t.id, d) }); d = Rec.prevOccurrence(t, d); }
  return out;
}

/* ================= theme ================= */
function activeTheme() {
  const pref = metaVal('theme', 'auto');
  const season = pref !== 'auto' && THEMES[pref] ? pref : seasonFor(ui.today);
  const holiday = metaVal('holidays', true) ? holidayFor(ui.today) : null;
  return { season, holiday };
}
function applyTheme() {
  const { season, holiday } = activeTheme();
  const th = THEMES[season], root = document.documentElement.style;
  Object.entries(th.vars).forEach(([k, v]) => root.setProperty('--' + k, v));
  Object.entries(th.status).forEach(([k, v]) => root.setProperty('--st-' + k, v));
  if (holiday) root.setProperty('--accent', HOLIDAYS[holiday].accent);
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = th.vars.bg;
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
  if (it.overdue) due = `<span class="od">Overdue</span><span class="sub">${fmtShort(date)}</span>`;
  else if (mode === 'week') due = `<span>${fmtDow(date)}</span>${t.time ? `<span class="sub">${fmt12(t.time)}</span>` : ''}`;
  else due = t.time ? `<span>${fmt12(t.time)}</span>` : '<span class="sub">Today</span>';
  const streak = streakOf(t);
  const meta = [t.category ? `<span class="cat">${esc(t.category)}</span>` : '',
    t.repeat && t.repeat !== 'none' ? `<span class="rep" title="Repeats">${icon('repeat')}</span>` : '',
    streak >= 2 ? `<span class="streak">${icon('flame')}${streak}</span>` : ''].join('');
  return `<div class="row${fin ? ' fin' : ''}${it.overdue ? ' overdue' : ''}">
    ${pill(st, `data-act="status" data-task="${t.id}" data-date="${date}"`)}
    <button class="name" data-act="edit-task" data-task="${t.id}">
      <span class="ticon">${icon(t.icon || 'circle')}</span>
      <span class="ntext"><span class="nm">${esc(t.name)}</span>${meta ? `<span class="meta">${meta}</span>` : ''}</span>
    </button>
    <span class="due">${due}</span>
  </div>`;
}

function tableHTML(items, mode, emptyMsg) {
  return `<div class="table">
    <div class="thead"><span>${icon('loader-circle')}Status</span><span>${icon('list-todo')}Task name</span><span>${icon('calendar')}Due</span></div>
    ${items.length ? items.map(it => rowHTML(it, mode)).join('') : `<div class="empty">${emptyMsg}</div>`}
    <button class="newrow" data-act="new-task"${mode === 'week' ? ` data-date="${Rec.addDays(ui.today, 1)}" data-early="1"` : ''}>${icon('plus')}New task</button>
  </div>`;
}

function pieHTML(items, label) {
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
  const done = counts.done + counts.not_needed;
  const legend = STATUSES.filter(s => counts[s.id]).map(s =>
    `<li><span class="dot" style="background:var(--st-${s.id})"></span>${s.label}<b>${counts[s.id]}</b></li>`).join('');
  return `<div class="card chart">
    <div class="card-label">${icon('chart-pie')}${label}</div>
    <div class="chart-body">
      <svg viewBox="0 0 140 140" class="pie">${arcs}
        <text x="70" y="66" text-anchor="middle" class="pie-big">${total ? done + '/' + total : '—'}</text>
        <text x="70" y="86" text-anchor="middle" class="pie-small">${total ? 'finished' : 'No tasks'}</text></svg>
      <ul class="legend">${legend || '<li class="muted">Nothing scheduled</li>'}</ul>
    </div></div>`;
}

function calendarHTML() {
  const [y, m] = ui.calMonth.split('-').map(Number);
  const first = `${y}-${Rec.pad(m)}-01`, startDow = Rec.weekday(first);
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  let cells = DOW.map(d => `<div class="cal-dow">${d[0]}</div>`).join('');
  for (let i = 0; i < startDow; i++) cells += '<div class="cal-cell blank"></div>';
  for (let d = 1; d <= dim; d++) {
    const ds = `${y}-${Rec.pad(m)}-${Rec.pad(d)}`, items = dayItems(ds);
    const icons = items.slice(0, 3).map(it => `<span style="color:var(--st-${statusOf(it.t.id, ds)})">${icon(it.t.icon || 'circle')}</span>`).join('');
    const more = items.length > 3 ? `<span class="more">+${items.length - 3}</span>` : '';
    cells += `<button class="cal-cell${ds === ui.today ? ' today' : ''}${ds === ui.calDay ? ' sel' : ''}" data-act="cal-day" data-date="${ds}">
      <span class="num">${d}</span><span class="cal-icons">${icons}${more}</span></button>`;
  }
  const sel = dayItems(ui.calDay);
  return `<div class="cal">
    <div class="cal-head"><button class="iconbtn" data-act="cal-prev" aria-label="Previous month">${icon('chevron-left')}</button>
      <span>${MONTH_FULL[m - 1]} ${y}</span>
      <button class="iconbtn" data-act="cal-next" aria-label="Next month">${icon('chevron-right')}</button>
      <button class="chip small" data-act="cal-today">Today</button></div>
    <div class="cal-grid">${cells}</div>
    <div class="cal-day">
      <div class="cal-day-head"><b>${fmtLong(ui.calDay)}</b><button class="chip small" data-act="new-task" data-date="${ui.calDay}">${icon('plus')}Add</button></div>
      ${sel.length ? sel.map(it => rowHTML(it, 'day')).join('') : '<div class="empty">Nothing scheduled</div>'}
    </div></div>`;
}

function listsHTML() {
  const lists = metaVal('lists', []);
  if (!lists.length) return `<div class="empty">No lists yet.<br><button class="chip" data-act="list-add">${icon('list-plus')}Create a list</button></div>`;
  if (!lists.find(l => l.id === ui.listId)) ui.listId = lists[0].id;
  const items = Object.values(S.items).filter(i => i.listId === ui.listId)
    .sort((a, b) => (a.checked - b.checked) || (a.sort - b.sort));
  const tabs = lists.map(l => `<button class="tab${l.id === ui.listId ? ' on' : ''}" data-act="list-tab" data-list="${l.id}">${esc(l.name)}</button>`).join('');
  const rows = items.map(i => `<div class="item${i.checked ? ' checked' : ''}">
      <button class="cb" data-act="item-toggle" data-item="${i.id}" aria-label="Toggle">${icon(i.checked ? 'square-check-big' : 'square')}</button>
      <input value="${esc(i.text)}" data-item-edit="${i.id}" aria-label="Item">
      <button class="iconbtn faint" data-act="item-del" data-item="${i.id}" aria-label="Delete">${icon('x')}</button></div>`).join('');
  return `<div class="tabs">${tabs}<button class="tab add" data-act="list-add" aria-label="New list">${icon('plus')}</button>
      <button class="tab add" data-act="list-menu" aria-label="List options">${icon('ellipsis')}</button></div>
    <div class="items">${rows}
      <div class="item new"><span class="cb">${icon('plus')}</span><input id="new-item" placeholder="Add item" enterkeyhint="done"></div></div>
    ${items.some(i => i.checked) ? `<button class="chip small" data-act="items-clear">${icon('eraser')}Clear checked</button>` : ''}`;
}

function render() {
  applyTheme();
  const { season, holiday } = activeTheme();
  const tItems = todayItems(), wItems = weekItems();
  const cats = [...new Set(taskList().map(t => t.category).filter(Boolean))].sort();
  if (ui.filter !== 'All' && !cats.includes(ui.filter)) ui.filter = 'All';
  const pageIcon = holiday ? HOLIDAYS[holiday].icon : THEMES[season].icon;
  const y = window.scrollY;
  document.getElementById('app').innerHTML = `
  <header class="topbar">
    <span class="crumb">${icon(pageIcon, 'accent')}<span>${esc(metaVal('title', 'Home Dashboard'))}</span></span>
    <span class="spacer"></span>${syncBadge()}
    <button class="iconbtn" data-act="settings" aria-label="Settings">${icon('settings')}</button>
  </header>
  <div class="banner">${bannerSVG(season, holiday, +ui.today.slice(0, 4))}</div>
  <main class="page">
    <div class="page-icon">${icon(pageIcon)}</div>
    <h1 class="title">${esc(metaVal('title', 'Home Dashboard'))}</h1>
    <div class="subtitle">${fmtLong(ui.today)}${holiday ? ' · ' + HOLIDAYS[holiday].label : ' · ' + THEMES[season].label}</div>
    ${cats.length ? `<div class="filters">${['All', ...cats].map(c => `<button class="chip${ui.filter === c ? ' on' : ''}" data-act="filter" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
    <section class="charts">${pieHTML(tItems, "Today's Progress")}${pieHTML(wItems, "Week's Progress")}</section>
    <section class="grid2">
      <div class="block"><h2 class="hblock h1">Today’s To-do</h2>${tableHTML(tItems, 'today', 'All clear for today')}</div>
      <div class="block"><h2 class="hblock h2">This Week’s To-do</h2><div class="hint">Next 7 days · only tasks that can be done early</div>${tableHTML(wItems, 'week', 'Nothing to get ahead on')}</div>
    </section>
    <section class="grid2">
      <div class="block"><h2 class="hblock h3">Calendar</h2>${calendarHTML()}</div>
      <div class="block"><h2 class="hblock h4">Lists</h2>${listsHTML()}</div>
    </section>
  </main>
  <button class="fab" data-act="new-task" aria-label="New task">${icon('plus')}</button>`;
  window.scrollTo(0, y);
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
    id: uid(), name: '', icon: 'circle', category: ui.filter !== 'All' ? ui.filter : '', start: opts.date || ui.today, time: '',
    repeat: 'none', interval: 1, weekdays: '', dayOfMonth: '', end: '', early: !!opts.early, notify: false, notes: ''
  };
  ed._new = !t; ed._picker = false;
  renderEditor();
  if (!t) setTimeout(() => { const n = document.querySelector('[data-field=name]'); n && n.focus(); }, 60);
}

function renderEditor() {
  const t = ed, cats = [...new Set(taskList().map(x => x.category).filter(Boolean))];
  const wds = Rec.weekdaysOf(Object.assign({}, t, { start: t.start || ui.today }));
  const unit = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }[t.repeat];
  const repeating = t.repeat && t.repeat !== 'none';
  let stats = '';
  if (!t._new && repeating) {
    const h = historyOf(t), done = h.filter(x => x.status === 'done').length;
    stats = `<div class="field"><label>History</label><div class="hist">
      ${h.map(x => `<span class="hdot" title="${fmtShort(x.date)}: ${statusLabel(x.status)}" style="background:var(--st-${x.status})"></span>`).join('')}</div>
      <div class="muted small">${icon('flame')} Streak ${streakOf(t)} · ${done}/${h.length} of the last ${h.length} done</div></div>`;
  }
  const q = (t._q || '').toLowerCase();
  const pickerNames = Object.keys(ICONS).filter(n => !PICKER_EXCLUDE.has(n)).filter(n => !q || n.includes(q) ||
    Object.entries(ICON_ALIASES).some(([k, v]) => k.startsWith(q) && v.split(' ').includes(n)));
  overlay().className = 'on sheet-mode';
  overlay().innerHTML = `<div class="scrim" data-act="close"></div>
  <div class="sheet" role="dialog" aria-label="Task">
    <div class="sheet-head"><b>${t._new ? 'New task' : 'Edit task'}</b><span class="spacer"></span>
      <button class="iconbtn" data-act="close" aria-label="Close">${icon('x')}</button></div>
    <div class="sheet-body">
      <div class="namerow">
        <button class="iconpick" data-act="ed-picker" aria-label="Choose icon">${icon(t.icon || 'circle')}</button>
        <input data-field="name" value="${esc(t.name)}" placeholder="Task name" enterkeyhint="done">
      </div>
      ${t._picker ? `<div class="picker"><input data-field="_q" value="${esc(t._q || '')}" placeholder="Search icons (e.g. meds, laundry, trash)">
        <div class="picker-grid">${pickerNames.map(n => `<button class="${n === t.icon ? 'on' : ''}" data-act="ed-icon" data-icon="${n}" title="${n}">${icon(n)}</button>`).join('')}</div></div>` : ''}
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
      <div class="field"><label>Category</label><input data-field="category" list="cats" value="${esc(t.category || '')}" placeholder="e.g. Kitchen, Pets, Errands">
        <datalist id="cats">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
      <label class="toggle"><input type="checkbox" data-field="early" ${t.early ? 'checked' : ''}><span class="sw"></span>
        <span><b>Can be done early</b><span class="muted small">Shows in This Week’s To-do ahead of its due day</span></span></label>
      <label class="toggle"><input type="checkbox" data-field="notify" ${t.notify ? 'checked' : ''}><span class="sw"></span>
        <span><b>Phone reminder</b><span class="muted small">Push via ntfy at the task’s time${t.time ? '' : ' (set a time first)'}</span></span></label>
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
  delete t._new; delete t._picker; delete t._q;
  t.updatedAt = Date.now(); t.deleted = false;
  closeOverlay();
  commit({ t: 'task', rec: t });
}

function openSettings() {
  const pref = metaVal('theme', 'auto');
  const link = config.url ? location.origin + location.pathname + '#connect=' + btoa(JSON.stringify(config)) : '';
  overlay().className = 'on sheet-mode';
  overlay().innerHTML = `<div class="scrim" data-act="close"></div>
  <div class="sheet" role="dialog" aria-label="Settings">
    <div class="sheet-head"><b>Settings</b><span class="spacer"></span><button class="iconbtn" data-act="close" aria-label="Close">${icon('x')}</button></div>
    <div class="sheet-body">
      <div class="field"><label>Dashboard title</label><input id="set-title" value="${esc(metaVal('title', 'Home Dashboard'))}"></div>
      <div class="field"><label>Theme</label><div class="seg">${['auto', 'fall', 'winter', 'spring', 'summer'].map(k =>
        `<button class="${pref === k ? 'on' : ''}" data-act="set-theme" data-v="${k}">${k === 'auto' ? 'Auto' : THEMES[k].label}</button>`).join('')}</div></div>
      <label class="toggle"><input type="checkbox" id="set-holidays" ${metaVal('holidays', true) ? 'checked' : ''}><span class="sw"></span>
        <span><b>Holiday accents</b><span class="muted small">Halloween, Thanksgiving, winter holidays, and more</span></span></label>
      <h3>Google Sheet sync</h3>
      <div class="field"><label>Web app URL</label><input id="set-url" value="${esc(config.url)}" placeholder="https://script.google.com/macros/s/…/exec"></div>
      <div class="field"><label>Secret key</label><input id="set-key" value="${esc(config.key)}" placeholder="from the Apps Script log"></div>
      <div class="btnrow"><button class="btn primary" data-act="st-connect">${config.url ? 'Reconnect' : 'Connect'}</button>
        ${config.url ? `<button class="btn" data-act="st-disconnect">Disconnect</button>` : ''}</div>
      <div id="st-msg" class="muted small">${config.url ? 'Status: ' + esc(ui.sync) + (ui.syncMsg ? ' – ' + esc(ui.syncMsg) : '') : 'Not connected. Tasks are saved on this device only.'}</div>
      ${link ? `<div class="field"><label>Link for your other device</label><div class="muted small">Open this link once on your phone or laptop to connect it automatically. Keep it private, since it contains your key.</div>
        <div class="btnrow"><button class="btn" data-act="st-copy" data-link="${esc(link)}">${icon('copy')}Copy link</button>
        <button class="btn" data-act="st-test">${icon('bell-ring')}Send test notification</button></div></div>` : ''}
      <h3>Data</h3>
      <div class="btnrow"><button class="btn" data-act="sync">${icon('refresh-cw')}Sync now</button><button class="btn" data-act="st-export">${icon('download')}Export backup</button></div>
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
    case 'set-status':
      closeOverlay();
      commit({ t: 'status', taskId: d.task, date: d.date, status: d.status, updatedAt: Date.now() });
      break;
    case 'edit-task': openEditor(d.task); break;
    case 'new-task': openEditor(null, { date: d.date, early: d.early === '1' }); break;
    case 'filter': ui.filter = d.cat; render(); break;
    case 'cal-day': ui.calDay = d.date; render(); break;
    case 'cal-prev': case 'cal-next': {
      let [y, m] = ui.calMonth.split('-').map(Number); m += a === 'cal-next' ? 1 : -1;
      if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
      ui.calMonth = `${y}-${Rec.pad(m)}`; render(); break;
    }
    case 'cal-today': ui.calMonth = ui.today.slice(0, 7); ui.calDay = ui.today; render(); break;
    case 'list-tab': ui.listId = d.list; render(); break;
    case 'list-add': {
      const name = prompt('New list name'); if (!name || !name.trim()) break;
      const id = uid(); ui.listId = id;
      setMeta('lists', [...metaVal('lists', []), { id, name: name.trim() }]); break;
    }
    case 'list-menu': {
      const lists = metaVal('lists', []), cur = lists.find(l => l.id === ui.listId); if (!cur) break;
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
      Object.values(S.items).filter(i => i.listId === ui.listId && i.checked)
        .forEach(i => commit({ t: 'item', rec: Object.assign({}, i, { deleted: true, updatedAt: Date.now() }) }, false));
      render(); break;
    case 'settings': openSettings(); break;
    case 'sync': flush(); break;
    case 'ed-picker': ed._picker = !ed._picker; renderEditor(); break;
    case 'ed-icon': ed.icon = d.icon; ed._picker = false; renderEditor(); break;
    case 'ed-repeat': ed.repeat = d.v; if (d.v === 'weekly' && !String(ed.weekdays)) ed.weekdays = String(Rec.weekday(ed.start)); renderEditor(); break;
    case 'ed-wd': {
      let w = Rec.weekdaysOf(ed); const v = +d.v;
      w = w.includes(v) ? w.filter(x => x !== v) : [...w, v];
      if (!w.length) break;
      ed.weekdays = w.sort().join(','); renderEditor(); break;
    }
    case 'ed-save': saveEditor(); break;
    case 'ed-delete':
      if (!confirm(`Delete “${ed.name}”${ed.repeat !== 'none' ? ' and all its future repeats' : ''}?`)) break;
      { const rec = Object.assign({}, S.tasks[ed.id], { deleted: true, updatedAt: Date.now() }); closeOverlay(); commit({ t: 'task', rec }); }
      break;
    case 'set-theme': setMeta('theme', d.v); openSettings(); break;
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
  const f = e.target.dataset.field;
  if (f && ed) {
    ed[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (f === '_q') { const pos = e.target.selectionStart; renderEditor(); const q = document.querySelector('[data-field=_q]'); q.focus(); q.setSelectionRange(pos, pos); }
    if (f === 'interval') { const s = e.target.nextElementSibling; if (s) s.textContent = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }[ed.repeat] + ((+ed.interval || 1) > 1 ? 's' : ''); }
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'set-title' && t.value.trim()) setMeta('title', t.value.trim());
  if (t.id === 'set-holidays') setMeta('holidays', t.checked);
  if (t.dataset.itemEdit) {
    const i = S.items[t.dataset.itemEdit];
    if (!t.value.trim()) commit({ t: 'item', rec: Object.assign({}, i, { deleted: true, updatedAt: Date.now() }) });
    else if (t.value !== i.text) commit({ t: 'item', rec: Object.assign({}, i, { text: t.value.trim(), updatedAt: Date.now() }) }, false);
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && overlay().innerHTML) closeOverlay();
  if (e.key === 'Enter' && e.target.id === 'new-item' && e.target.value.trim()) {
    const sorts = Object.values(S.items).filter(i => i.listId === ui.listId).map(i => i.sort);
    commit({ t: 'item', rec: { id: uid(), listId: ui.listId, text: e.target.value.trim(), checked: false,
      sort: (sorts.length ? Math.max(...sorts) : 0) + 1, updatedAt: Date.now(), deleted: false } });
    const n = document.getElementById('new-item'); n && n.focus();
  }
  if (e.key === 'Enter' && e.target.dataset.field === 'name') saveEditor();
  if (e.key === 'Enter' && e.target.dataset.itemEdit) e.target.blur();
});

/* refresh when coming back to the app, at midnight, and periodically */
function tick() {
  const t = todayStr();
  if (t !== ui.today) { ui.today = t; ui.calDay = t; ui.calMonth = t.slice(0, 7); render(); }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) { tick(); pull(); } });
window.addEventListener('focus', () => { tick(); pull(); });
window.addEventListener('online', () => flush());
setInterval(() => { tick(); if (!document.hidden) pull(); }, 45000);

/* ================= boot ================= */
(function boot() {
  const m = location.hash.match(/connect=([^&]+)/);
  if (m) {
    try { const c = JSON.parse(atob(decodeURIComponent(m[1]))); history.replaceState(null, '', location.pathname); connect(c.url, c.key); } catch (e) {}
  }
  ui.calMonth = ui.today.slice(0, 7); ui.calDay = ui.today;
  if (!S.meta.lists) S.meta.lists = { value: [{ id: 'shopping', name: 'Shopping' }], updatedAt: 0 };
  ui.sync = config.url ? 'syncing' : 'local';
  render();
  if (config.url) flush();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
