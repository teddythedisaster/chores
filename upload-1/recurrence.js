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
if (typeof module !== 'undefined') module.exports = Rec;
