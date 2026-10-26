/**
 * Chores app – Google Sheets backend.
 *
 * One-time setup (see SETUP.md):
 *   1. Paste this whole file into Extensions > Apps Script of a new Google Sheet.
 *   2. Choose "setup" in the function dropdown and press Run. Approve the permissions.
 *   3. Open "Execution log" and copy the SECRET KEY and NTFY TOPIC it prints.
 *   4. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone.
 *
 * Run "showSetupInfo" any time to print the key and topic again.
 */

var TZ = Session.getScriptTimeZone() || 'America/New_York';
var SHEETS = {
  Tasks: ['id', 'name', 'icon', 'category', 'start', 'time', 'repeat', 'interval', 'weekdays',
          'dayOfMonth', 'end', 'early', 'notify', 'notes', 'updatedAt', 'deleted', 'color', 'iconData', 'streak', 'streakGoal'],
  Statuses: ['taskId', 'date', 'status', 'updatedAt'],
  ListItems: ['id', 'listId', 'text', 'checked', 'sort', 'updatedAt', 'deleted'],
  Meta: ['key', 'value', 'updatedAt']
};
var BOOL_FIELDS = { early: 1, notify: 1, deleted: 1, checked: 1, streak: 1 };
var STATUS_LABELS = { not_started: 'Not started', p25: '25%', p50: '50%', p75: '75%', done: 'Done', not_needed: 'Not needed' };

/* Shared scheduling logic. The same functions are copied into backend/Code.gs
   (between the RECURRENCE markers) so phone reminders match the app exactly.
   Dates are plain 'YYYY-MM-DD' strings; math is done on whole-day numbers. */
var Rec = (function () {
  function dayNum(ds) {
    var p = ds.split('-');
    return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000);
  }
  function fromNum(n) {
    var d = new Date(n * 86400000);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function addDays(ds, k) { return fromNum(dayNum(ds) + k); }
  function weekday(ds) { return (dayNum(ds) + 4) % 7; } // 0 = Sunday
  function mondayNum(n) { return n - ((n + 4) % 7 + 6) % 7; }
  function daysInMonth(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); } // m is 1-12
  function parse(ds) { var p = ds.split('-'); return { y: +p[0], m: +p[1], d: +p[2] }; }
  function weekdaysOf(t) {
    var w = String(t.weekdays == null ? '' : t.weekdays).split(',').filter(function (x) { return x !== ''; }).map(Number);
    return w.length ? w : [weekday(t.start)];
  }

  function occursOn(t, ds) {
    if (!t || t.deleted || !t.start) return false;
    var n = dayNum(ds), s = dayNum(t.start);
    if (n < s) return false;
    if (t.end && n > dayNum(t.end)) return false;
    var iv = Math.max(1, parseInt(t.interval, 10) || 1);
    switch (t.repeat) {
      case 'daily': return (n - s) % iv === 0;
      case 'weekly':
        var wk = (mondayNum(n) - mondayNum(s)) / 7;
        return wk % iv === 0 && weekdaysOf(t).indexOf(weekday(ds)) !== -1;
      case 'monthly':
      case 'yearly':
        var a = parse(t.start), b = parse(ds);
        var months = (b.y - a.y) * 12 + (b.m - a.m);
        if (months % (t.repeat === 'yearly' ? 12 * iv : iv) !== 0) return false;
        var dom = t.repeat === 'monthly' ? (parseInt(t.dayOfMonth, 10) || a.d) : a.d;
        return b.d === Math.min(dom, daysInMonth(b.y, b.m));
      default: return n === s;
    }
  }

  // Most recent occurrence strictly before ds (looks back up to ~13 months).
  function prevOccurrence(t, ds) {
    var n = dayNum(ds), s = dayNum(t.start || ds);
    for (var k = n - 1; k >= Math.max(s, n - 400); k--) {
      var d = fromNum(k);
      if (occursOn(t, d)) return d;
    }
    return null;
  }

  return { dayNum: dayNum, fromNum: fromNum, addDays: addDays, weekday: weekday,
           occursOn: occursOn, prevOccurrence: prevOccurrence, pad: pad, weekdaysOf: weekdaysOf };
})();

/* ---------- setup ---------- */
function setup() {
  var ss = SpreadsheetApp.getActive();
  Object.keys(SHEETS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var hdr = SHEETS[name];
    sh.getRange(1, 1, 1, hdr.length).setValues([hdr]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('A:Z').setNumberFormat('@'); // keep dates/times as plain text
  });
  var def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);

  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SECRET')) props.setProperty('SECRET', randomString(32));
  if (!props.getProperty('NTFY_TOPIC')) props.setProperty('NTFY_TOPIC', 'chores-' + randomString(16).toLowerCase());

  ScriptApp.getProjectTriggers().forEach(function (tr) {
    if (tr.getHandlerFunction() === 'checkReminders') ScriptApp.deleteTrigger(tr);
  });
  ScriptApp.newTrigger('checkReminders').timeBased().everyMinutes(5).create();
  showSetupInfo();
}

function showSetupInfo() {
  var p = PropertiesService.getScriptProperties();
  Logger.log('SECRET KEY (paste into the app):  ' + p.getProperty('SECRET'));
  Logger.log('NTFY TOPIC (subscribe in the ntfy app):  ' + p.getProperty('NTFY_TOPIC'));
}

function randomString(n) {
  var c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', s = '';
  for (var i = 0; i < n; i++) s += c.charAt(Math.floor(Math.random() * c.length));
  return s;
}

/* ---------- web endpoints ---------- */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (!authorized(p.key)) return json({ ok: false, error: 'bad key' });
  return json({ ok: true, state: readState() });
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: 'bad json' }); }
  if (!authorized(body.key)) return json({ ok: false, error: 'bad key' });
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  var notes = [];
  try {
    var ops = body.ops || [];
    var tasks = [], statuses = [], items = [], metas = [];
    ops.forEach(function (op) {
      if (op.t === 'task') tasks.push(op.rec);
      else if (op.t === 'status') statuses.push(op);
      else if (op.t === 'item') items.push(op.rec);
      else if (op.t === 'meta') metas.push({ key: op.key, value: JSON.stringify(op.value), updatedAt: op.updatedAt });
      else if (op.t === 'testNotify') notes.push(sendNtfy('Test from your chores app', 'Notifications are working.', ['white_check_mark']));
    });
    if (tasks.length) upsert('Tasks', tasks, function (r) { return r.id; });
    if (statuses.length) upsert('Statuses', statuses.map(function (s) {
      return { taskId: s.taskId, date: s.date, status: s.status, updatedAt: s.updatedAt };
    }), function (r) { return r.taskId + '|' + r.date; });
    if (items.length) upsert('ListItems', items, function (r) { return r.id; });
    if (metas.length) upsert('Meta', metas, function (r) { return r.key; });
  } finally {
    lock.releaseLock();
  }
  return json({ ok: true, state: readState(), notes: notes });
}

function authorized(k) {
  var s = PropertiesService.getScriptProperties().getProperty('SECRET');
  return !!s && k === s;
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- sheet helpers ---------- */
function sheet(name) {
  var sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error('Run setup() first – missing sheet ' + name);
  return sh;
}

function readRows(name) {
  var sh = sheet(name), hdr = SHEETS[name];
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, hdr.length).getValues().map(function (row) {
    var o = {};
    hdr.forEach(function (h, i) {
      var v = row[i];
      if (v instanceof Date) v = Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
      if (BOOL_FIELDS[h]) v = v === true || v === 'TRUE' || v === 'true' || v === 1;
      o[h] = v;
    });
    return o;
  });
}

// Last-write-wins upsert keyed by keyFn, compared on updatedAt.
function upsert(name, recs, keyFn) {
  var sh = sheet(name), hdr = SHEETS[name];
  var rows = readRows(name), index = {}, existing = rows.length;
  rows.forEach(function (r, i) { index[keyFn(r)] = i; });
  var appended = [];
  recs.forEach(function (rec) {
    var k = keyFn(rec);
    var line = hdr.map(function (h) {
      var v = rec[h];
      if (v === undefined || v === null) return '';
      return BOOL_FIELDS[h] ? (v ? 'TRUE' : 'FALSE') : String(v);
    });
    if (k in index) {
      var i = index[k];
      if (Number(rows[i].updatedAt || 0) > Number(rec.updatedAt || 0)) return; // stored copy is newer
      if (i < existing) sh.getRange(i + 2, 1, 1, hdr.length).setValues([line]);
      else appended[i - existing] = line; // changed again within the same batch
      rows[i] = rec;
    } else {
      index[k] = rows.length;
      rows.push(rec);
      appended.push(line);
    }
  });
  if (appended.length) sh.getRange(sh.getLastRow() + 1, 1, appended.length, hdr.length).setValues(appended);
}

function readState() {
  var cutoff = Rec.addDays(todayStr(), -400);
  var meta = {};
  readRows('Meta').forEach(function (m) {
    try { meta[m.key] = { value: JSON.parse(m.value), updatedAt: Number(m.updatedAt) || 0 }; } catch (e) {}
  });
  return {
    tasks: readRows('Tasks').filter(function (t) { return !t.deleted; }).map(cleanTask),
    statuses: readRows('Statuses').filter(function (s) { return String(s.date) >= cutoff; })
      .map(function (s) { return { taskId: s.taskId, date: String(s.date), status: s.status, updatedAt: Number(s.updatedAt) || 0 }; }),
    items: readRows('ListItems').filter(function (i) { return !i.deleted; })
      .map(function (i) { i.sort = Number(i.sort) || 0; i.updatedAt = Number(i.updatedAt) || 0; return i; }),
    meta: meta,
    serverTime: Date.now()
  };
}

function cleanTask(t) {
  t.interval = Number(t.interval) || 1;
  t.updatedAt = Number(t.updatedAt) || 0;
  t.weekdays = String(t.weekdays);
  t.dayOfMonth = t.dayOfMonth === '' ? '' : Number(t.dayOfMonth);
  t.start = String(t.start);
  t.time = String(t.time);
  t.color = t.color === '' ? '' : String(t.color);
  return t;
}

function todayStr() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }

/* ---------- reminders via ntfy ---------- */
function checkReminders() {
  var now = new Date();
  var today = Utilities.formatDate(now, TZ, 'yyyy-MM-dd');
  var hm = Utilities.formatDate(now, TZ, 'HH:mm').split(':');
  var nowMin = +hm[0] * 60 + +hm[1];

  var props = PropertiesService.getScriptProperties();
  var sentKey = 'sent_' + today;
  var sent = JSON.parse(props.getProperty(sentKey) || '{}');

  var status = {};
  readRows('Statuses').forEach(function (s) { status[s.taskId + '|' + s.date] = s.status; });

  readRows('Tasks').forEach(function (t) {
    t = cleanTask(t);
    if (t.deleted || !t.notify || !t.time || !/^\d\d:\d\d$/.test(t.time)) return;
    if (!Rec.occursOn(t, today)) return;
    var st = status[t.id + '|' + today];
    if (st === 'done' || st === 'not_needed' || sent[t.id]) return;
    var p = t.time.split(':'), tMin = +p[0] * 60 + +p[1];
    if (nowMin >= tMin && nowMin - tMin < 90) {
      sendNtfy(t.name, 'Due ' + fmt12(t.time) + (t.category ? ' · ' + t.category : '') +
               (st && st !== 'not_started' ? ' · ' + STATUS_LABELS[st] : ''), ['bell']);
      sent[t.id] = 1;
    }
  });
  props.setProperty(sentKey, JSON.stringify(sent));
  // tidy old sent_* keys
  Object.keys(props.getProperties()).forEach(function (k) {
    if (k.indexOf('sent_') === 0 && k < 'sent_' + Rec.addDays(today, -3)) props.deleteProperty(k);
  });
}

function fmt12(t) {
  var p = t.split(':'), h = +p[0];
  return ((h + 11) % 12 + 1) + ':' + p[1] + (h < 12 ? ' AM' : ' PM');
}

function sendNtfy(title, message, tags) {
  var props = PropertiesService.getScriptProperties();
  var topic = props.getProperty('NTFY_TOPIC');
  if (!topic) return 'no topic';
  var appUrl = '';
  readRows('Meta').forEach(function (m) { if (m.key === 'appUrl') { try { appUrl = JSON.parse(m.value); } catch (e) {} } });
  var payload = { topic: topic, title: title, message: message, tags: tags || [], priority: 4 };
  if (appUrl) payload.click = appUrl;
  var res = UrlFetchApp.fetch('https://ntfy.sh/', {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true
  });
  return 'ntfy ' + res.getResponseCode();
}
