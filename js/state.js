/* =========================================================
   state.js – mentés, profil, pontok, sorozat
   Minden adat helyben marad (localStorage), semmi nem megy ki.
   ========================================================= */
(function (global) {
  'use strict';

  var KEY = 'szorzo-mano:v1';

  var DEFAULTS = {
    version: 1,
    settings: {
      sound: true,
      haptics: true,
      perRound: 10,          // kérdés / kör
      dailyGoal: 30,         // napi cél (válasz)
      showHints: true,       // stratégiai tippek hibánál
      autoAdvance: true      // jó válasz után magától tovább
    },
    stats: {
      xp: 0, level: 1, coins: 0,
      streak: 0, lastDay: null,
      answered: 0, correct: 0,
      bestFlash: 0, bestCombo: 0,
      todayDay: null, todayCount: 0, todayCorrect: 0,
      history: []            // [{d:'2026-09-15', a:30, c:26}]
    },
    facts: {},               // "3x7": {box,seen,ok,bad,t:[ms,...],last}
    tables: {},              // "7": {stars:0, exam:false, bestMs:null}
    stickers: [],
    seenIntro: false
  };

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function merge(base, extra) {
    var out = clone(base);
    if (!extra || typeof extra !== 'object') return out;
    Object.keys(extra).forEach(function (k) {
      if (extra[k] && typeof extra[k] === 'object' && !Array.isArray(extra[k]) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
        out[k] = merge(out[k], extra[k]);
      } else if (extra[k] !== undefined) {
        out[k] = extra[k];
      }
    });
    return out;
  }

  var data = clone(DEFAULTS);
  var saveTimer = null;

  function load() {
    try {
      var raw = global.localStorage.getItem(KEY);
      if (raw) data = merge(DEFAULTS, JSON.parse(raw));
    } catch (e) {
      data = clone(DEFAULTS);
    }
    rollDay();
    return data;
  }

  function save() {
    if (saveTimer) return;
    saveTimer = global.setTimeout(function () {
      saveTimer = null;
      try { global.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* tele a tár */ }
    }, 120);
  }

  function saveNow() {
    if (saveTimer) { global.clearTimeout(saveTimer); saveTimer = null; }
    try { global.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  /* Napváltás: napi számláló nullázása, sorozat karbantartása. */
  function rollDay() {
    var t = today();
    var s = data.stats;
    if (s.todayDay !== t) {
      if (s.todayDay && s.todayCount > 0) {
        s.history.push({ d: s.todayDay, a: s.todayCount, c: s.todayCorrect });
        if (s.history.length > 120) s.history = s.history.slice(-120);
      }
      s.todayDay = t;
      s.todayCount = 0;
      s.todayCorrect = 0;
    }
    // sorozat megszakad, ha kihagytunk egy teljes napot
    if (s.lastDay) {
      var diff = dayDiff(s.lastDay, t);
      if (diff > 1) s.streak = 0;
    }
    save();
  }

  function dayDiff(a, b) {
    var pa = new Date(a + 'T00:00:00'), pb = new Date(b + 'T00:00:00');
    return Math.round((pb - pa) / 86400000);
  }

  /* Játék közbeni könyvelés */
  function registerPlay() {
    var t = today(), s = data.stats;
    rollDay();
    if (s.lastDay !== t) {
      var d = s.lastDay ? dayDiff(s.lastDay, t) : 99;
      s.streak = (d === 1) ? s.streak + 1 : 1;
      s.lastDay = t;
    }
    save();
  }

  function xpForLevel(lv) { return 60 + (lv - 1) * 40; }   // 60, 100, 140, ...

  function addXp(n) {
    var s = data.stats, up = 0;
    s.xp += n;
    while (s.xp >= xpForLevel(s.level)) {
      s.xp -= xpForLevel(s.level);
      s.level++;
      up++;
    }
    save();
    return up;
  }

  function addCoins(n) { data.stats.coins += n; save(); return data.stats.coins; }

  function countAnswer(ok) {
    var s = data.stats;
    rollDay();
    s.answered++; s.todayCount++;
    if (ok) { s.correct++; s.todayCorrect++; }
    save();
  }

  function reset() {
    data = clone(DEFAULTS);
    saveNow();
  }

  global.SZ = global.SZ || {};
  global.SZ.state = {
    get data() { return data; },
    get settings() { return data.settings; },
    get stats() { return data.stats; },
    load: load, save: save, saveNow: saveNow, reset: reset,
    today: today, dayDiff: dayDiff, rollDay: rollDay,
    registerPlay: registerPlay,
    addXp: addXp, addCoins: addCoins, countAnswer: countAnswer,
    xpForLevel: xpForLevel
  };
})(window);
