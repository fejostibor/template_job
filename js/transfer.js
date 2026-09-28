/* =========================================================
   transfer.js – haladás átvitele másik eszközre
   Két út:
     1) Fájl  – .json mentés / betöltés (AirDrop, e-mail, felhő)
     2) Kód   – rövid, másolható szöveg (mindenhol működik)
   A beállítások szándékosan nem utaznak: azok eszközfüggők.
   ========================================================= */
(function (global) {
  'use strict';
  var S = global.SZ.state;

  var MAGIC = 'SZM1';
  var EPOCH = Date.UTC(2020, 0, 1);

  /* A tények rögzített sorrendje (55 db, a ≤ b – a felcserélhetőség miatt) */
  var PAIRS = (function () {
    var out = [];
    for (var a = 1; a <= 10; a++) for (var b = a; b <= 10; b++) out.push(a + 'x' + b);
    return out;
  })();

  function b36(n, w) {
    n = Math.round(n) || 0;
    if (n < 0) n = 0;
    var max = Math.pow(36, w) - 1;
    if (n > max) n = max;
    var s = n.toString(36);
    while (s.length < w) s = '0' + s;
    return s;
  }
  function un36(s) { var n = parseInt(s, 36); return isNaN(n) ? 0 : n; }

  function dayNum(iso) {
    if (!iso) return 0;
    var t = Date.parse(iso + 'T00:00:00Z');
    if (isNaN(t)) return 0;
    return Math.max(0, Math.round((t - EPOCH) / 86400000));
  }
  function dayIso(n) {
    if (!n) return null;
    var d = new Date(EPOCH + n * 86400000);
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  }

  function avgOf(arr) {
    if (!arr || !arr.length) return 0;
    var last = arr.slice(-4);
    return last.reduce(function (s, v) { return s + v; }, 0) / last.length;
  }

  function stickerList() {
    return (global.SZ.screens && global.SZ.screens.STICKERS) ? global.SZ.screens.STICKERS : [];
  }

  function checksum(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 1296;
    return b36(h, 2);
  }

  /* ---------- Teljes mentés (fájlhoz) ---------- */
  function snapshot() {
    var d = S.data;
    return {
      app: 'szorzo-mano',
      version: 1,
      exportedAt: new Date().toISOString(),
      stats: d.stats,
      facts: d.facts,
      tables: d.tables,
      stickers: d.stickers
    };
  }

  /* ---------- Rövid kód ---------- */
  function encode() {
    var d = S.data, st = d.stats;
    var body = '';
    body += b36(st.level, 2) + b36(st.xp, 3) + b36(st.coins, 4) + b36(st.streak, 2) +
            b36(st.answered, 4) + b36(st.correct, 4) + b36(st.bestFlash, 2) + b36(st.bestCombo, 2);
    body += b36(dayNum(st.lastDay), 4);

    for (var i = 1; i <= 10; i++) {
      var ts = d.tables[String(i)] || {};
      body += String(Math.min(3, ts.stars || 0)) + (ts.exam ? '1' : '0');
    }

    PAIRS.forEach(function (k) {
      var f = d.facts[k];
      if (!f || !(f.ok || f.bad)) { body += '0000000'; return; }
      body += String(Math.min(5, f.box || 0)) + b36(f.ok || 0, 2) + b36(f.bad || 0, 2) +
              b36(avgOf(f.t) / 100, 2);
    });

    var mask = 0, list = stickerList();
    list.forEach(function (s, idx) {
      if (idx < 30 && d.stickers.indexOf(s.id) !== -1) mask += Math.pow(2, idx);
    });
    body += b36(mask, 6);

    return MAGIC + body + checksum(body);
  }

  var EXPECTED = 4 + 23 + 4 + 20 + PAIRS.length * 7 + 6 + 2;

  function decode(code) {
    code = String(code || '').replace(/[\s​-]/g, '');
    if (code.slice(0, 4) !== MAGIC) throw new Error('Ez nem Szorzó Manó kód.');
    if (code.length !== EXPECTED) throw new Error('A kód hiányos vagy elgépelt (' + code.length + ' karakter ' + EXPECTED + ' helyett).');
    var body = code.slice(4, -2);
    if (checksum(body) !== code.slice(-2)) throw new Error('A kód sérült – másold ki újra, teljes egészében.');

    var p = 0;
    function take(n) { var s = body.substr(p, n); p += n; return s; }

    var stats = {
      level: Math.max(1, un36(take(2))),
      xp: un36(take(3)),
      coins: un36(take(4)),
      streak: un36(take(2)),
      answered: un36(take(4)),
      correct: un36(take(4)),
      bestFlash: un36(take(2)),
      bestCombo: un36(take(2))
    };
    stats.lastDay = dayIso(un36(take(4)));

    var tables = {};
    for (var i = 1; i <= 10; i++) {
      var stars = parseInt(take(1), 10) || 0;
      var exam = take(1) === '1';
      tables[String(i)] = { stars: stars, exam: exam, bestMs: null };
    }

    var facts = {}, now = Date.now();
    PAIRS.forEach(function (k) {
      var chunk = take(7);
      var box = parseInt(chunk.charAt(0), 10) || 0;
      var ok = un36(chunk.substr(1, 2));
      var bad = un36(chunk.substr(3, 2));
      var at = un36(chunk.substr(5, 2)) * 100;
      if (!ok && !bad) return;
      facts[k] = { box: box, seen: ok + bad, ok: ok, bad: bad, t: at ? [at] : [], last: now - 86400000 };
    });

    var mask = un36(take(6)), stickers = [];
    stickerList().forEach(function (s, idx) {
      if (idx < 30 && (mask & Math.pow(2, idx))) stickers.push(s.id);
    });

    return { app: 'szorzo-mano', version: 1, stats: stats, tables: tables, facts: facts, stickers: stickers };
  }

  /* ---------- Beolvasott mentés ellenőrzése ---------- */
  function normalize(obj) {
    if (!obj || typeof obj !== 'object' || obj.app !== 'szorzo-mano') {
      throw new Error('Ez nem Szorzó Manó mentés.');
    }
    return {
      stats: obj.stats || {},
      facts: obj.facts || {},
      tables: obj.tables || {},
      stickers: Array.isArray(obj.stickers) ? obj.stickers : []
    };
  }

  /* ---------- Összefésülés: mindkét eszközből a jobbik ---------- */
  function mergeInto(incoming) {
    var cur = S.data;
    var stats = {}, ks = ['xp', 'level', 'coins', 'streak', 'answered', 'correct', 'bestFlash', 'bestCombo'];
    ks.forEach(function (k) { stats[k] = Math.max(cur.stats[k] || 0, incoming.stats[k] || 0); });
    stats.lastDay = (incoming.stats.lastDay && (!cur.stats.lastDay || incoming.stats.lastDay > cur.stats.lastDay))
      ? incoming.stats.lastDay : cur.stats.lastDay;
    stats.history = cur.stats.history;
    stats.todayDay = cur.stats.todayDay;
    stats.todayCount = cur.stats.todayCount;
    stats.todayCorrect = cur.stats.todayCorrect;

    var facts = {};
    Object.keys(cur.facts).concat(Object.keys(incoming.facts)).forEach(function (k) {
      var a = cur.facts[k], b = incoming.facts[k];
      if (!a) { facts[k] = b; return; }
      if (!b) { facts[k] = a; return; }
      var ta = avgOf(a.t), tb = avgOf(b.t);
      var best = (ta && tb) ? Math.min(ta, tb) : (ta || tb);
      facts[k] = {
        box: Math.max(a.box || 0, b.box || 0),
        ok: Math.max(a.ok || 0, b.ok || 0),
        bad: Math.max(a.bad || 0, b.bad || 0),
        seen: Math.max(a.seen || 0, b.seen || 0),
        t: best ? [best] : [],
        last: Math.max(a.last || 0, b.last || 0)
      };
    });

    var tables = {};
    for (var i = 1; i <= 10; i++) {
      var k2 = String(i), a2 = cur.tables[k2] || {}, b2 = incoming.tables[k2] || {};
      tables[k2] = { stars: Math.max(a2.stars || 0, b2.stars || 0), exam: !!(a2.exam || b2.exam), bestMs: a2.bestMs || b2.bestMs || null };
    }

    var stickers = cur.stickers.slice();
    incoming.stickers.forEach(function (id) { if (stickers.indexOf(id) === -1) stickers.push(id); });

    return { stats: stats, facts: facts, tables: tables, stickers: stickers };
  }

  /* ---------- Alkalmazás ---------- */
  function apply(incoming, mode) {
    var data = normalize(incoming);
    var next = (mode === 'merge') ? mergeInto(data) : data;
    if (mode !== 'merge') {
      // felülírásnál a mai számláló induljon nulláról ezen az eszközön
      next.stats = JSON.parse(JSON.stringify(next.stats || {}));
      next.stats.history = [];
      next.stats.todayDay = null;
      next.stats.todayCount = 0;
      next.stats.todayCorrect = 0;
    }
    next.settings = S.settings;      // a helyi beállítások maradnak
    S.applyImport(next);
    return summary(next);
  }

  function summary(d) {
    var mastered = 0, seen = 0;
    Object.keys(d.facts || {}).forEach(function (k) {
      var f = d.facts[k];
      if (f && (f.ok || f.bad)) seen++;
      if (f && f.box >= 4 && avgOf(f.t) && avgOf(f.t) < 4000 && f.ok >= 4) mastered++;
    });
    return {
      answered: (d.stats && d.stats.answered) || 0,
      level: (d.stats && d.stats.level) || 1,
      seen: seen, mastered: mastered,
      stickers: (d.stickers || []).length
    };
  }

  /* ---------- Fájl ---------- */
  function fileName() {
    var d = new Date();
    return 'szorzo-mano-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '.json';
  }

  function saveFile() {
    var json = JSON.stringify(snapshot(), null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fileName();
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
  }

  function readFile(file, cb) {
    var r = new FileReader();
    r.onload = function () {
      try { cb(null, JSON.parse(String(r.result))); }
      catch (e) { cb(new Error('A fájl nem olvasható – biztosan a mentett .json fájl?')); }
    };
    r.onerror = function () { cb(new Error('A fájlt nem sikerült megnyitni.')); };
    r.readAsText(file);
  }

  /* ---------- Vágólap ---------- */
  function copy(text, cb) {
    if (global.navigator.clipboard && global.navigator.clipboard.writeText) {
      global.navigator.clipboard.writeText(text).then(function () { cb(true); }, function () { cb(false); });
      return;
    }
    cb(false);
  }

  global.SZ.transfer = {
    encode: encode, decode: decode, apply: apply, snapshot: snapshot,
    saveFile: saveFile, readFile: readFile, copy: copy, summary: summary,
    codeLength: EXPECTED
  };
})(window);
