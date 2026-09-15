/* =========================================================
   facts.js – a tanulás motorja
   Kutatás-alapú elemek:
   - Retrieval practice: mindig előhívás, azonnali visszajelzéssel
   - Leitner-dobozos szakaszos ismétlés (spaced repetition)
   - Interleaving: keverjük a táblákat, ha már megy külön-külön
   - Kommutativitás: 3x7 és 7x3 ugyanaz a tény -> feleannyi tanulnivaló
   - Derived fact strategies: levezetési tippek hiba után
   - Fluencia = helyes ÉS gyors (mesterfok csak gyors válasszal)
   ========================================================= */
(function (global) {
  'use strict';

  var S = global.SZ.state;

  /* Tanulási sorrend: horgony-táblák előre (könnyű mintázat),
     a nehezek (7, 8) a végén. */
  var TABLE_ORDER = [2, 5, 10, 1, 4, 3, 6, 9, 8, 7];

  var TABLE_NICK = {
    1: 'Tükör', 2: 'Dupla', 3: 'Tripla', 4: 'Dupla-dupla', 5: 'Félkéz',
    6: 'Hatos banda', 7: 'Szerencse', 8: 'Rakéta', 9: 'Varázsló', 10: 'Nulla-trükk'
  };

  function key(a, b) {
    var lo = Math.min(a, b), hi = Math.max(a, b);
    return lo + 'x' + hi;
  }

  function get(a, b) {
    var k = key(a, b), f = S.data.facts[k];
    if (!f) { f = { box: 0, seen: 0, ok: 0, bad: 0, t: [], last: 0 }; S.data.facts[k] = f; }
    return f;
  }

  function avgTime(f) {
    if (!f.t.length) return null;
    var last = f.t.slice(-4);
    return last.reduce(function (s, v) { return s + v; }, 0) / last.length;
  }

  /* 0-5 skála: 0 = ismeretlen, 5 = mesterfok (biztos és gyors) */
  function mastery(a, b) {
    var f = get(a, b);
    if (!f.seen) return 0;
    var at = avgTime(f);
    var lvl = Math.min(4, f.box);
    if (f.box >= 4 && at !== null && at < 4000 && f.ok >= 4) lvl = 5;
    return lvl;
  }

  function isMastered(a, b) { return mastery(a, b) >= 5; }

  /* Válasz könyvelése + Leitner léptetés */
  function record(a, b, ok, ms) {
    var f = get(a, b);
    f.seen++;
    f.last = Date.now();
    if (ok) {
      f.ok++;
      f.box = Math.min(5, f.box + 1);
      f.t.push(Math.min(ms || 9999, 20000));
      if (f.t.length > 8) f.t = f.t.slice(-8);
    } else {
      f.bad++;
      f.box = Math.max(0, f.box - 2);   // hiba után visszaesik, hamar visszatér
    }
    S.countAnswer(ok);
    S.save();
    return f;
  }

  /* Súly a következő kérdés kiválasztásához.
     Nagyobb súly: ismeretlen, gyenge, régen látott tények. */
  function weight(a, b) {
    var f = get(a, b);
    var w = 1;
    if (!f.seen) {
      w = 9;                                   // új tény: prioritás
    } else {
      w = 1 + (5 - Math.min(5, f.box)) * 2.2;  // alacsony doboz -> gyakrabban
      var rate = f.bad / Math.max(1, f.seen);
      w += rate * 6;                           // sok hiba -> gyakrabban
      var days = (Date.now() - f.last) / 86400000;
      w += Math.min(4, days * 1.6);            // régen volt -> ismételjük
      var at = avgTime(f);
      if (at && at > 6000) w += 1.6;           // lassú = még nem automatikus
      if (mastery(a, b) >= 5) w *= 0.25;       // kész tény: ritkán, csak karbantartás
    }
    // "könnyű" tények amúgy is ritkábban kellenek
    if (a === 1 || b === 1 || a === 10 || b === 10) w *= 0.7;
    return Math.max(0.2, w);
  }

  function pool(tables) {
    var out = [];
    tables.forEach(function (t) {
      for (var i = 1; i <= 10; i++) out.push([t, i]);
    });
    return out;
  }

  /* Súlyozott véletlen húzás, az utoljára kérdezettek kizárásával */
  function pick(tables, recent) {
    var items = pool(tables);
    var avoid = {};
    (recent || []).slice(-4).forEach(function (p) { avoid[key(p[0], p[1])] = true; });
    var usable = items.filter(function (p) { return !avoid[key(p[0], p[1])]; });
    if (!usable.length) usable = items;
    var total = 0, ws = usable.map(function (p) { var w = weight(p[0], p[1]); total += w; return w; });
    var r = Math.random() * total;
    for (var i = 0; i < usable.length; i++) {
      r -= ws[i];
      if (r <= 0) return usable[i].slice();
    }
    return usable[usable.length - 1].slice();
  }

  /* ---------- Levezetési stratégiák (derived facts) ---------- */
  function hint(a, b) {
    var p = a * b;
    // A könnyebb oldalról magyarázunk
    var pairs = [[a, b], [b, a]];
    var best = null;
    pairs.forEach(function (pr) {
      var x = pr[0], m = pr[1], h = null;
      if (m === 1) h = { r: 10, t: 'Az 1-gyel szorzás semmit nem változtat: ' + x + ' marad ' + x + '.' };
      else if (m === 10) h = { r: 9, t: 'A 10-zel szorzáshoz csak egy nullát írsz a végére: ' + x + ' → ' + p + '.' };
      else if (m === 2) h = { r: 8, t: 'A 2-vel szorzás duplázás: ' + x + ' + ' + x + ' = ' + p + '.' };
      else if (m === 5) h = { r: 7, t: 'Az 5-tel szorzás a 10-szeres fele: ' + x + '×10 = ' + (x * 10) + ', annak fele ' + p + '.' };
      else if (m === 9) h = { r: 7, t: 'A 9-cel szorzás trükkje: ' + x + '×10 = ' + (x * 10) + ', abból vonj le ' + x + '-t → ' + p + '.' };
      else if (m === 4) h = { r: 6, t: 'A 4-gyel szorzás kétszeri duplázás: ' + x + ' → ' + (x * 2) + ' → ' + p + '.' };
      else if (m === 8) h = { r: 5, t: 'A 8-cal szorzás háromszori duplázás: ' + x + ' → ' + (x * 2) + ' → ' + (x * 4) + ' → ' + p + '.' };
      else if (m === 3) h = { r: 5, t: 'A 3-mal szorzás: ' + x + '×2 = ' + (x * 2) + ', plusz még egy ' + x + ' → ' + p + '.' };
      else if (m === 6) h = { r: 4, t: 'A 6-tal szorzás: ' + x + '×5 = ' + (x * 5) + ', plusz még egy ' + x + ' → ' + p + '.' };
      else if (m === 7) h = { r: 3, t: 'A 7-tel szorzás: ' + x + '×5 = ' + (x * 5) + ' meg ' + x + '×2 = ' + (x * 2) + ', együtt ' + p + '.' };
      if (h && (!best || h.r > best.r)) best = h;
    });
    if (a === b) {
      return { r: 11, t: 'Ez négyzetszám: ' + a + '×' + a + ' = ' + p + '. Ezeket érdemes fejből tudni!' }.t;
    }
    return best ? best.t : (a + '-t ' + b + '-szer adod össze: ' + p + '.');
  }

  /* Kommutativitás-emlékeztető */
  function commutePrompt(a, b) {
    if (a === b) return null;
    return b + '×' + a + ' ugyanennyi: ' + (a * b) + '. Egy tanulás, két feladat!';
  }

  /* ---------- Válaszlehetőségek ---------- */
  function distractors(a, b, n) {
    var p = a * b, set = {}, out = [];
    var cands = [
      p + a, p - a, p + b, p - b,
      (a + 1) * b, (a - 1) * b, a * (b + 1), a * (b - 1),
      p + 10, p - 10, p + 1, p - 1, p + 2, p - 2
    ];
    // enyhe keverés, hogy ne legyen mindig ugyanaz a minta
    cands.sort(function () { return Math.random() - 0.5; });
    set[p] = true;
    for (var i = 0; i < cands.length && out.length < (n || 3); i++) {
      var v = cands[i];
      if (v > 0 && v <= 130 && !set[v]) { set[v] = true; out.push(v); }
    }
    while (out.length < (n || 3)) {
      var r = Math.max(1, p + Math.floor(Math.random() * 17) - 8);
      if (!set[r]) { set[r] = true; out.push(r); }
    }
    return out;
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /* ---------- Kérdés összeállítása ----------
     Típusok:
       mc       – 4 válaszlehetőség (belépő szint)
       input    – beírós (valódi előhívás, nincs tippelés)
       missing  – hiányzó tényező: 4 × ? = 28 (osztás előkészítése)
       truefalse– igaz/hamis állítás (számérzék)
       div      – osztás: 28 : 4 = ? (csak ha már ül a tény)
  */
  function makeQuestion(tables, recent, opts) {
    opts = opts || {};
    var pair = opts.pair ? opts.pair.slice() : pick(tables, recent);
    var a = pair[0], b = pair[1];
    if (Math.random() < 0.5) { var t = a; a = b; b = t; }   // sorrend keverése
    var m = mastery(a, b);
    var types = [];

    if (opts.forceType) {
      types = [opts.forceType];
    } else if (opts.mode === 'flash') {
      types = m <= 1 ? ['mc', 'mc', 'input'] : ['mc', 'input', 'input'];
    } else if (opts.mode === 'exam') {
      types = ['input', 'input', 'missing', 'mc'];
      if (m >= 3) types.push('div');
    } else {
      if (m <= 1) types = ['mc', 'mc', 'mc', 'input', 'truefalse'];
      else if (m <= 3) types = ['mc', 'input', 'input', 'missing', 'truefalse'];
      else types = ['input', 'input', 'missing', 'div', 'mc'];
    }

    var type = types[Math.floor(Math.random() * types.length)];
    var p = a * b;
    var q = { a: a, b: b, type: type, product: p, key: key(a, b) };

    if (type === 'mc') {
      q.text = a + ' × ' + b + ' = ?';
      q.answer = p;
      q.options = shuffle(distractors(a, b, 3).concat([p]));
      q.label = 'Melyik a jó?';
    } else if (type === 'input') {
      q.text = a + ' × ' + b + ' = ?';
      q.answer = p;
      q.label = 'Írd be a választ';
    } else if (type === 'missing') {
      q.text = a + ' × <span class="q-blank">?</span> = ' + p;
      q.answer = b;
      q.label = 'Melyik szám hiányzik?';
      q.maxLen = 2;
    } else if (type === 'div') {
      q.text = p + ' : ' + a + ' = ?';
      q.answer = b;
      q.label = 'Osztás – a szorzótábla visszafelé';
      q.maxLen = 2;
    } else { // truefalse
      var wrongOn = Math.random() < 0.5;
      var shown = wrongOn ? distractors(a, b, 1)[0] : p;
      q.text = a + ' × ' + b + ' = ' + shown;
      q.answer = wrongOn ? 'hamis' : 'igaz';
      q.options = ['igaz', 'hamis'];
      q.label = 'Igaz vagy hamis?';
      q.shown = shown;
    }
    return q;
  }

  /* ---------- Tábla-szintű állapot ---------- */
  function tableState(t) {
    var st = S.data.tables[String(t)];
    if (!st) { st = { stars: 0, exam: false, bestMs: null }; S.data.tables[String(t)] = st; }
    return st;
  }

  function tableProgress(t) {
    var sum = 0, mastered = 0;
    for (var i = 1; i <= 10; i++) {
      var m = mastery(t, i);
      sum += m;
      if (m >= 5) mastered++;
    }
    return { pct: Math.round(sum / 50 * 100), mastered: mastered };
  }

  function refreshStars(t) {
    var pr = tableProgress(t), st = tableState(t);
    var s = 0;
    if (pr.pct >= 40) s = 1;
    if (pr.pct >= 70) s = 2;
    if (pr.pct >= 92 && st.exam) s = 3;
    if (s > st.stars) { st.stars = s; S.save(); return true; }
    st.stars = Math.max(st.stars, s);
    S.save();
    return false;
  }

  /* Melyik táblát ajánljuk most? */
  function suggestTable() {
    for (var i = 0; i < TABLE_ORDER.length; i++) {
      var t = TABLE_ORDER[i];
      if (tableProgress(t).pct < 70) return t;
    }
    return TABLE_ORDER[TABLE_ORDER.length - 1];
  }

  /* A 10 leggyengébb tény – a "Gyenge pontok" körhöz */
  function weakFacts(limit) {
    var all = [];
    for (var a = 1; a <= 10; a++) {
      for (var b = a; b <= 10; b++) {
        var f = get(a, b);
        if (!f.seen) continue;
        var score = f.bad * 2 + (5 - Math.min(5, f.box));
        if (score > 0) all.push({ a: a, b: b, score: score });
      }
    }
    all.sort(function (x, y) { return y.score - x.score; });
    return all.slice(0, limit || 10);
  }

  function overall() {
    var sum = 0;
    for (var a = 1; a <= 10; a++) for (var b = 1; b <= 10; b++) sum += mastery(a, b);
    return Math.round(sum / 500 * 100);
  }

  global.SZ.facts = {
    TABLE_ORDER: TABLE_ORDER, TABLE_NICK: TABLE_NICK,
    key: key, get: get, mastery: mastery, isMastered: isMastered,
    record: record, weight: weight, pick: pick, hint: hint, commutePrompt: commutePrompt,
    distractors: distractors, shuffle: shuffle, makeQuestion: makeQuestion,
    tableState: tableState, tableProgress: tableProgress, refreshStars: refreshStars,
    suggestTable: suggestTable, weakFacts: weakFacts, overall: overall, avgTime: avgTime
  };
})(window);
