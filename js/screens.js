/* =========================================================
   screens.js – képernyők
   ========================================================= */
(function (global) {
  'use strict';
  var S = global.SZ.state, F = global.SZ.facts, FX = global.SZ.fx;
  var $ = function (id) { return document.getElementById(id); };

  function tcolor(t) { return 'var(--t' + t + ')'; }
  function starStr(n) { return '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n); }

  /* ---------------- Matricagyűjtemény ---------------- */
  var STICKERS = [
    { id: 'rakéta',   e: '🚀', n: 'Rakéta',        need: { k: 'coins', v: 20 } },
    { id: 'csillag',  e: '⭐', n: 'Csillag',        need: { k: 'coins', v: 50 } },
    { id: 'egyszarvú',e: '🦄', n: 'Egyszarvú',      need: { k: 'level', v: 3 } },
    { id: 'fagyi',    e: '🍦', n: 'Fagyi',          need: { k: 'coins', v: 90 } },
    { id: 'dínó',     e: '🦖', n: 'Dínó',           need: { k: 'streak', v: 3 } },
    { id: 'foci',     e: '⚽', n: 'Focilabda',      need: { k: 'coins', v: 140 } },
    { id: 'robot',    e: '🤖', n: 'Robot',          need: { k: 'level', v: 6 } },
    { id: 'pizza',    e: '🍕', n: 'Pizza',          need: { k: 'answers', v: 150 } },
    { id: 'delfin',   e: '🐬', n: 'Delfin',         need: { k: 'coins', v: 200 } },
    { id: 'villám',   e: '⚡', n: 'Villám',         need: { k: 'flash', v: 15 } },
    { id: 'korona',   e: '👑', n: 'Korona',         need: { k: 'exams', v: 3 } },
    { id: 'sárkány',  e: '🐉', n: 'Sárkány',        need: { k: 'streak', v: 7 } },
    { id: 'medál',    e: '🏅', n: 'Érem',           need: { k: 'exams', v: 5 } },
    { id: 'ufo',      e: '🛸', n: 'UFO',            need: { k: 'level', v: 10 } },
    { id: 'gitár',    e: '🎸', n: 'Gitár',          need: { k: 'answers', v: 400 } },
    { id: 'tigris',   e: '🐯', n: 'Tigris',         need: { k: 'mastered', v: 30 } },
    { id: 'hajó',     e: '⛵', n: 'Vitorlás',       need: { k: 'mastered', v: 55 } },
    { id: 'kupa',     e: '🏆', n: 'Kupa',           need: { k: 'exams', v: 10 } },
    { id: 'bálna',    e: '🐳', n: 'Bálna',          need: { k: 'flash', v: 30 } },
    { id: 'gyémánt',  e: '💎', n: 'Gyémánt',        need: { k: 'mastered', v: 100 } }
  ];

  function metric(k) {
    var st = S.stats;
    switch (k) {
      case 'coins': return st.coins;
      case 'level': return st.level;
      case 'streak': return st.streak;
      case 'answers': return st.answered;
      case 'flash': return st.bestFlash;
      case 'exams': return Object.keys(S.data.tables).filter(function (t) { return S.data.tables[t].exam; }).length;
      case 'mastered': {
        var c = 0;
        for (var a = 1; a <= 10; a++) for (var b = a; b <= 10; b++) if (F.mastery(a, b) >= 5) c++;
        return c;
      }
    }
    return 0;
  }

  function checkStickers() {
    var got = [];
    STICKERS.forEach(function (s) {
      if (S.data.stickers.indexOf(s.id) === -1 && metric(s.need.k) >= s.need.v) {
        S.data.stickers.push(s.id);
        got.push(s);
      }
    });
    if (got.length) S.saveNow();
    return got;
  }

  function needText(n) {
    var map = { coins: 'érme', level: '. szint', streak: 'napos sorozat', answers: 'válasz',
                flash: 'találat villámkörben', exams: 'letett mestervizsga', mastered: 'megtanult művelet' };
    if (n.k === 'level') return n.v + map[n.k];
    return n.v + ' ' + map[n.k];
  }

  /* ---------------- Kezdőképernyő ---------------- */
  function greet() {
    var hrs = new Date().getHours();
    if (hrs < 10) return 'Jó reggelt!';
    if (hrs < 18) return 'Szia!';
    return 'Jó estét!';
  }

  var home = {
    title: 'Szorzó Manó',
    back: false,
    html: function () {
      var st = S.stats;
      var goal = S.settings.dailyGoal;
      var done = Math.min(goal, st.todayCount);
      var pct = goal ? done / goal : 0;
      var circ = 2 * Math.PI * 30;
      var sug = F.suggestTable();
      var ov = F.overall();
      var lvNeed = S.xpForLevel(st.level);

      return '' +
      '<div class="stack fade-in">' +
        '<div class="hero">' +
          FX.mascot(pct >= 1 ? 'win' : 'idle') +
          '<div><h1>' + greet() + '</h1>' +
          '<p>' + (pct >= 1
            ? 'Megvan a mai cél! Bármennyit gyakorolhatsz még. 🎉'
            : 'Gyakoroljunk egy kicsit? Napi 5 perc is sokat számít!') + '</p></div>' +
        '</div>' +

        '<div class="card">' +
          '<div class="goal-ring">' +
            '<svg class="ring" viewBox="0 0 72 72" aria-hidden="true">' +
              '<defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">' +
              '<stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#ff6ba9"/></linearGradient></defs>' +
              '<circle class="bgc" cx="36" cy="36" r="30"/>' +
              '<circle class="fgc" cx="36" cy="36" r="30" transform="rotate(-90 36 36)" ' +
                'stroke-dasharray="' + circ + '" stroke-dashoffset="' + (circ * (1 - pct)) + '"/>' +
            '</svg>' +
            '<div style="flex:1">' +
              '<h3>Mai cél: ' + done + ' / ' + goal + ' feladat</h3>' +
              '<p class="small muted" style="margin:4px 0 8px">🔥 ' + st.streak + ' napos sorozat &nbsp;·&nbsp; ⭐ ' + st.level + '. szint</p>' +
              '<div class="bar"><i style="width:' + Math.round(st.xp / lvNeed * 100) + '%"></i></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<button class="btn btn-primary btn-lg btn-block" id="quickBtn" type="button">' +
          '▶️ Gyakorlás indul – ' + sug + '-es tábla' +
        '</button>' +

        '<div class="mode-grid">' +
          modeBtn('learnBtn', '🔍', 'Felfedező', 'Nézd meg, hogyan épül fel egy tábla') +
          modeBtn('practiceBtn', '🎯', 'Gyakorlás', 'Okos feladatsor – oda visz, ahol nehéz') +
          modeBtn('flashBtn', '⚡', 'Villámkör', '60 másodperc, hány jó válasz fér bele?') +
          modeBtn('examBtn', '🏆', 'Mestervizsga', 'Tedd le a vizsgát egy táblából!') +
          modeBtn('weakBtn', '🩹', 'Gyenge pontok', 'A legnehezebb 10 művelet gyakorlása') +
          modeBtn('mapBtn', '🗺️', 'Szorzó-térkép', 'Melyik művelet megy már jól?') +
          modeBtn('stickerBtn', '🎁', 'Matricák', S.data.stickers.length + ' / ' + STICKERS.length + ' összegyűjtve') +
          modeBtn('setBtn', '⚙️', 'Beállítások', 'Hang, napi cél, szülői nézet') +
        '</div>' +

        '<div class="card card-soft">' +
          '<h3>Összes haladás: ' + ov + '%</h3>' +
          '<div class="bar" style="margin-top:8px"><i style="width:' + ov + '%"></i></div>' +
          '<p class="small muted" style="margin:10px 0 0">' +
            'Eddig ' + S.stats.answered + ' feladatot oldottál meg, ebből ' + S.stats.correct + ' lett jó.' +
          '</p>' +
        '</div>' +
      '</div>';
    },
    mount: function () {
      var go = global.SZ.ui.go;
      $('quickBtn').addEventListener('click', function () {
        global.SZ.quiz.start({ mode: 'practice', tables: [F.suggestTable()], title: 'Gyakorlás' });
      });
      $('learnBtn').addEventListener('click', function () { go('tables', { for: 'learn' }); });
      $('practiceBtn').addEventListener('click', function () { go('tables', { for: 'practice' }); });
      $('flashBtn').addEventListener('click', function () { go('tables', { for: 'flash' }); });
      $('examBtn').addEventListener('click', function () { go('tables', { for: 'exam' }); });
      $('weakBtn').addEventListener('click', function () {
        var w = F.weakFacts(10);
        if (!w.length) { FX.toast('Még nincs gyenge pont – gyakorolj egy kicsit! 🙂'); return; }
        global.SZ.quiz.start({ mode: 'practice', weak: w, count: 10, title: 'Gyenge pontok', tables: w.map(function (x) { return x.a; }) });
      });
      $('mapBtn').addEventListener('click', function () { go('map'); });
      $('stickerBtn').addEventListener('click', function () { go('stickers'); });
      $('setBtn').addEventListener('click', function () { go('settings'); });
    }
  };

  function modeBtn(id, emoji, title, sub) {
    return '<button class="mode" id="' + id + '" type="button">' +
      '<span class="emoji">' + emoji + '</span>' +
      '<span><strong>' + title + '</strong><span>' + sub + '</span></span></button>';
  }

  /* ---------------- Táblaválasztó ---------------- */
  var LEAD = {
    learn: 'Melyik táblát nézzük meg?',
    practice: 'Melyik táblát gyakoroljuk?',
    flash: 'Melyik táblából legyen a villámkör?',
    exam: 'Melyik táblából vizsgázol?'
  };

  var tables = {
    title: 'Táblaválasztás',
    back: true,
    html: function (p) {
      var mode = p.for;
      var html = '<div class="stack fade-in"><h2>' + (LEAD[mode] || 'Válassz táblát') + '</h2>';
      if (mode !== 'learn') {
        html += '<button class="btn btn-primary btn-block" id="mixBtn" type="button">🎲 Vegyes – minden tábla</button>';
      }
      html += '<div class="table-grid">';
      F.TABLE_ORDER.slice().sort(function (a, b) { return a - b; }).forEach(function (t) {
        var pr = F.tableProgress(t);
        var st = F.tableState(t);
        html += '<button class="tbtn" type="button" data-t="' + t + '" ' +
          'style="background:linear-gradient(135deg,' + tcolor(t) + ',color-mix(in srgb,' + tcolor(t) + ' 62%, #ffffff))">' +
          '<span>' + t + '</span>' +
          '<small>' + F.TABLE_NICK[t] + '</small>' +
          '<span class="stars">' + starStr(st.stars) + ' ' + pr.pct + '%</span>' +
          '</button>';
      });
      html += '</div>';
      if (mode === 'exam') {
        html += '<div class="card card-soft small muted">A mestervizsgán 12 feladat jön egy táblából, ' +
          'tippelős válaszok nélkül. Legfeljebb 1 hiba fér bele – akkor jár a 3. csillag és 20 érme. 🏆</div>';
      }
      html += '</div>';
      return html;
    },
    mount: function (p) {
      var mode = p.for;
      var mix = $('mixBtn');
      if (mix) mix.addEventListener('click', function () { launch(mode, [1,2,3,4,5,6,7,8,9,10]); });
      Array.prototype.forEach.call(document.querySelectorAll('.tbtn'), function (b) {
        b.addEventListener('click', function () {
          var t = parseInt(b.dataset.t, 10);
          if (mode === 'learn') global.SZ.ui.go('learn', { t: t, i: 1 });
          else launch(mode, [t]);
        });
      });
    }
  };

  function launch(mode, list) {
    if (mode === 'flash') {
      global.SZ.quiz.start({ mode: 'flash', tables: list, seconds: 60, title: 'Villámkör' });
    } else if (mode === 'exam') {
      global.SZ.quiz.start({ mode: 'exam', tables: list, count: 12, examTable: list.length === 1 ? list[0] : null, title: 'Mestervizsga' });
    } else {
      global.SZ.quiz.start({ mode: 'practice', tables: list, title: 'Gyakorlás' });
    }
  }

  /* ---------------- Felfedező (tanulás) ---------------- */
  var TRICK = {
    1: 'Az 1-es tábla tükör: amit beteszel, ugyanaz jön ki.',
    2: 'A 2-es tábla duplázás. Mindig páros szám lesz a vége.',
    3: 'A 3-as tábla: duplázd, majd add hozzá még egyszer a számot.',
    4: 'A 4-es tábla dupla duplázás: 6 → 12 → 24.',
    5: 'Az 5-ös tábla a 10-es tábla fele. A vége mindig 0 vagy 5.',
    6: 'A 6-os tábla: az 5-ös tábla + még egy adag. (6×7 = 35 + 7)',
    7: 'A 7-es a legnehezebb – bontsd: 5-ös tábla + 2-es tábla. (7×8 = 40 + 16)',
    8: 'A 8-as tábla három duplázás: 3 → 6 → 12 → 24.',
    9: 'A 9-es varázslat: 10-szeres mínusz a szám. A számjegyek összege mindig 9!',
    10: 'A 10-es tábla: csak írj egy nullát a szám végére.'
  };

  var learn = {
    title: 'Felfedező',
    back: true,
    html: function (p) {
      var t = p.t, i = p.i, prod = t * i;
      var dots = '';
      for (var r = 0; r < t; r++) {
        for (var c = 0; c < i; c++) {
          dots += '<i class="dot" style="animation-delay:' + ((r * i + c) * 22) + 'ms"></i>';
        }
      }
      var add = [];
      for (var k = 0; k < i; k++) add.push(t);
      var addStr;
      if (i === 1) addStr = 'Egyszer ' + t + ', az bizony ' + t + '.';
      else if (i > 6) addStr = t + ' + ' + t + ' + … + ' + t + ' (' + i + '-szer) = ' + prod;
      else addStr = add.join(' + ') + ' = ' + prod;

      var skip = '';
      for (var s = 1; s <= 10; s++) {
        skip += '<span class="' + (s === i ? 'now' : '') + '">' + (t * s) + '</span>';
      }

      var dotSize = (i > 7 || t > 7) ? 14 : 20;

      return '' +
      '<div class="stack fade-in">' +
        '<div class="row" style="justify-content:space-between">' +
          '<h2>' + t + '-es tábla</h2>' +
          '<span class="pill">' + i + ' / 10</span>' +
        '</div>' +

        '<div class="question">' +
          '<div class="q-text">' + t + ' × ' + i + ' = ' + prod + '</div>' +
          '<div class="q-hint">' + addStr + '</div>' +
        '</div>' +

        '<div class="card">' +
          '<h3 class="center">' + t + ' sor, soronként ' + i + ' pötty</h3>' +
          '<div class="array-grid" style="grid-template-columns:repeat(' + i + ', ' + dotSize + 'px)">' + dots + '</div>' +
          '<p class="small muted center" style="margin:10px 0 0">' +
            (t === i ? 'Ez négyzetszám – szép szabályos! ' : '') +
            i + ' × ' + t + ' ugyanennyi: ' + prod + '. Egy tanulás, két feladat! 🔁' +
          '</p>' +
        '</div>' +

        '<div class="card card-soft">' +
          '<h3>Számolj ' + t + '-esével</h3>' +
          '<div class="skipline" style="margin-top:8px">' + skip + '</div>' +
        '</div>' +

        '<div class="card card-soft">' +
          '<h3>💡 Trükk</h3>' +
          '<p class="small" style="margin:6px 0 0">' + TRICK[t] + '</p>' +
          '<p class="small muted" style="margin:6px 0 0">' + F.hint(t, i) + '</p>' +
        '</div>' +

        '<div class="row">' +
          '<button class="btn btn-ghost" id="prevBtn" type="button" ' + (i <= 1 ? 'disabled' : '') + '>‹ Előző</button>' +
          '<button class="btn btn-primary" style="flex:1" id="nextStep" type="button">' +
            (i >= 10 ? 'Kész – gyakorlom! 🎯' : 'Következő ›') + '</button>' +
        '</div>' +
        '<button class="btn btn-ghost btn-block" id="practiceNow" type="button">🎯 Inkább gyakorlok a ' + t + '-es táblából</button>' +
      '</div>';
    },
    mount: function (p) {
      FX.play('tap');
      $('prevBtn').addEventListener('click', function () { global.SZ.ui.go('learn', { t: p.t, i: Math.max(1, p.i - 1) }); });
      $('nextStep').addEventListener('click', function () {
        if (p.i >= 10) global.SZ.quiz.start({ mode: 'practice', tables: [p.t], title: 'Gyakorlás' });
        else global.SZ.ui.go('learn', { t: p.t, i: p.i + 1 });
      });
      $('practiceNow').addEventListener('click', function () {
        global.SZ.quiz.start({ mode: 'practice', tables: [p.t], title: 'Gyakorlás' });
      });
    }
  };

  /* ---------------- Eredmény ---------------- */
  var result = {
    title: 'Eredmény',
    back: false,
    html: function (r) {
      var stars = '';
      for (var i = 0; i < 3; i++) {
        stars += '<span style="animation-delay:' + (i * 180) + 'ms">' + (i < r.stars ? '⭐' : '☆') + '</span>';
      }
      var head = r.mode === 'exam'
        ? (r.examPassed ? 'Letetted a vizsgát! 🏆' : 'Majdnem! Próbáld újra 💪')
        : (r.pct >= 80 ? 'Nagyszerű kör! 🎉' : (r.pct >= 50 ? 'Szép munka! 👍' : 'Jó gyakorlás volt! 🌱'));

      var mistakes = '';
      if (r.mistakes.length) {
        mistakes = '<div class="card card-soft"><h3>Ezekre figyelj legközelebb</h3><div class="row" style="margin-top:8px">';
        var seen = {};
        r.mistakes.forEach(function (m) {
          var k = F.key(m.a, m.b);
          if (seen[k]) return;
          seen[k] = 1;
          mistakes += '<span class="pill">' + m.a + '×' + m.b + ' = ' + (m.a * m.b) + '</span>';
        });
        mistakes += '</div><p class="small muted" style="margin:10px 0 0">Ezek hamarosan visszajönnek – így rögzülnek igazán.</p></div>';
      }

      var examNote = '';
      if (r.mode === 'exam' && r.examTable) {
        if (r.examPassed) {
          var stt = F.tableState(r.examTable), pr = F.tableProgress(r.examTable);
          examNote = '<div class="card card-soft"><h3>🏅 ' + r.examTable + '-es tábla: vizsga letéve!</h3>' +
            '<p class="small muted" style="margin:6px 0 0">' +
            (stt.stars >= 3
              ? 'Megvan mind a 3 csillag – ez a tábla kész! 🎉'
              : 'A 3. csillaghoz még egy kis gyakorlás kell: a tábla most ' + pr.pct + '%-on áll (92% kell hozzá).') +
            '</p><p class="small muted" style="margin:6px 0 0">🪙 +20 érme a vizsgáért.</p></div>';
        } else {
          examNote = '<div class="card card-soft"><h3>Kis híja volt!</h3>' +
            '<p class="small muted" style="margin:6px 0 0">A vizsgához legfeljebb 1 hiba fér bele. ' +
            'Gyakorolj még egy kört a ' + r.examTable + '-es táblából, aztán vágj bele újra! 💪</p></div>';
        }
      }

      var newSt = '';
      if (r.newStickers && r.newStickers.length) {
        newSt = '<div class="card" style="background:linear-gradient(135deg,#fff3c4,#ffe0f0)"><h3>🎁 Új matrica!</h3><div class="row" style="margin-top:8px">' +
          r.newStickers.map(function (s) { return '<span style="font-size:2.2rem">' + s.e + '</span>'; }).join('') +
          '</div></div>';
      }

      return '' +
      '<div class="stack fade-in center">' +
        '<div style="display:grid;place-items:center">' + FX.mascot(r.stars >= 2 ? 'win' : 'happy', 'mascot-lg') + '</div>' +
        '<h1>' + head + '</h1>' +
        '<div class="result-stars">' + stars + '</div>' +
        '<div class="card"><div class="stat-grid">' +
          '<div><div class="v">' + r.correct + '/' + r.total + '</div><div class="k">Jó válasz</div></div>' +
          '<div><div class="v">' + r.pct + '%</div><div class="k">Pontosság</div></div>' +
          '<div><div class="v">' + r.best + '</div><div class="k">Leghosszabb sorozat</div></div>' +
        '</div>' +
        (r.coins ? '<p class="small muted" style="margin:12px 0 0">🪙 +' + r.coins + ' bónusz érme</p>' : '') +
        '</div>' +
        examNote + newSt + mistakes +
        '<button class="btn btn-primary btn-lg btn-block" id="againBtn" type="button">🔁 Még egy kör!</button>' +
        '<button class="btn btn-ghost btn-block" id="homeBtn" type="button">🏠 Vissza a főoldalra</button>' +
      '</div>';
    },
    mount: function (r) {
      $('againBtn').addEventListener('click', function () {
        if (r.mode === 'flash') global.SZ.quiz.start({ mode: 'flash', tables: r.tables, seconds: 60, title: 'Villámkör' });
        else if (r.mode === 'exam') global.SZ.quiz.start({ mode: 'exam', tables: r.tables, count: 12, examTable: r.examTable, title: 'Mestervizsga' });
        else global.SZ.quiz.start({ mode: 'practice', tables: r.tables, title: 'Gyakorlás' });
      });
      $('homeBtn').addEventListener('click', function () { global.SZ.ui.go('home'); });
    }
  };

  /* ---------------- Térkép ---------------- */
  var map = {
    title: 'Szorzó-térkép',
    back: true,
    html: function () {
      var html = '<div class="stack fade-in">' +
        '<h2>Szorzó-térkép</h2>' +
        '<p class="small muted">Minden négyzet egy művelet. Minél zöldebb, annál biztosabban megy. Koppints rá!</p>' +
        '<div class="card map-wrap"><table class="map"><tr><th></th>';
      for (var c = 1; c <= 10; c++) html += '<th>' + c + '</th>';
      html += '</tr>';
      for (var r = 1; r <= 10; r++) {
        html += '<tr><th>' + r + '</th>';
        for (var c2 = 1; c2 <= 10; c2++) {
          var m = F.mastery(r, c2);
          html += '<td><button class="cell lvl' + m + '" type="button" data-a="' + r + '" data-b="' + c2 + '" ' +
            'aria-label="' + r + ' szor ' + c2 + '">' + (r * c2) + '</button></td>';
        }
        html += '</tr>';
      }
      html += '</table></div>' +
        '<div class="legend">' +
          '<span><i style="background:var(--line)"></i>Még nem próbáltuk</span>' +
          '<span><i style="background:#ffb4b4"></i>Kezdő</span>' +
          '<span><i style="background:#ffe97f"></i>Halad</span>' +
          '<span><i style="background:#a8e6a1"></i>Jó</span>' +
          '<span><i style="background:linear-gradient(135deg,#22b573,#3ddc97)"></i>Mesterfok</span>' +
        '</div>' +
        '<div id="cellInfo"></div>' +
      '</div>';
      return html;
    },
    mount: function () {
      Array.prototype.forEach.call(document.querySelectorAll('.cell'), function (b) {
        b.addEventListener('click', function () {
          var a = parseInt(b.dataset.a, 10), bb = parseInt(b.dataset.b, 10);
          var f = F.get(a, bb), at = F.avgTime(f);
          var m = F.mastery(a, bb);
          var labels = ['Még nem gyakoroltuk', 'Kezdő', 'Ismerkedünk', 'Halad', 'Majdnem kész', 'Mesterfok ⭐'];
          FX.play('tap');
          $('cellInfo').innerHTML = '<div class="card fade-in">' +
            '<h3>' + a + ' × ' + bb + ' = ' + (a * bb) + '</h3>' +
            '<p class="small muted" style="margin:6px 0">' + labels[m] + ' · ' + f.ok + ' jó / ' + f.bad + ' hiba' +
            (at ? ' · átlag ' + (at / 1000).toFixed(1) + ' mp' : '') + '</p>' +
            '<p class="small">💡 ' + F.hint(a, bb) + '</p>' +
            '<button class="btn btn-primary btn-block" id="cellPractice" type="button" style="margin-top:10px">🎯 Gyakorlom a ' + a + '-es táblát</button>' +
            '</div>';
          $('cellPractice').addEventListener('click', function () {
            global.SZ.quiz.start({ mode: 'practice', tables: [a], title: 'Gyakorlás' });
          });
        });
      });
    }
  };

  /* ---------------- Matricák ---------------- */
  var stickers = {
    title: 'Matricák',
    back: true,
    html: function () {
      var have = S.data.stickers;
      var html = '<div class="stack fade-in"><h2>Matricagyűjtemény</h2>' +
        '<p class="small muted">' + have.length + ' / ' + STICKERS.length + ' megvan. 🪙 ' + S.stats.coins + ' érméd van.</p>' +
        '<div class="card"><div class="sticker-grid">';
      STICKERS.forEach(function (s) {
        var got = have.indexOf(s.id) !== -1;
        html += '<div class="sticker ' + (got ? 'got' : 'locked') + '" title="' + s.n + (got ? '' : ' – ' + needText(s.need)) + '">' +
          (got ? s.e : '🔒') + '</div>';
      });
      html += '</div></div>';
      var nextOne = STICKERS.filter(function (s) { return have.indexOf(s.id) === -1; })[0];
      if (nextOne) {
        html += '<div class="card card-soft"><h3>Következő: ' + nextOne.n + ' ' + nextOne.e + '</h3>' +
          '<p class="small muted" style="margin:6px 0 0">Feltétel: ' + needText(nextOne.need) + ' (most: ' + metric(nextOne.need.k) + ')</p></div>';
      } else {
        html += '<div class="card card-soft center"><h3>Minden matrica megvan! 🎉</h3></div>';
      }
      html += '</div>';
      return html;
    },
    mount: function () {}
  };

  /* ---------------- Beállítások + szülői nézet ---------------- */
  var settings = {
    title: 'Beállítások',
    back: true,
    html: function () {
      var s = S.settings, st = S.stats;
      var acc = st.answered ? Math.round(st.correct / st.answered * 100) : 0;
      var hist = st.history.slice(-7);
      var histHtml = hist.length
        ? hist.map(function (d) { return '<span class="pill">' + d.d.slice(5) + ': ' + d.c + '/' + d.a + '</span>'; }).join(' ')
        : '<span class="small muted">Még nincs korábbi nap.</span>';

      var weak = F.weakFacts(6).map(function (w) {
        return '<span class="pill">' + w.a + '×' + w.b + '</span>';
      }).join(' ') || '<span class="small muted">Nincs kiugró gyenge pont. 🎉</span>';

      return '' +
      '<div class="stack fade-in">' +
        '<div class="card">' +
          '<h2>Beállítások</h2>' +
          row('Hang', 'setSound', s.sound) +
          row('Rezgés', 'setHaptic', s.haptics) +
          row('Tippek hiba után', 'setHints', s.showHints) +
          row('Automatikus továbblépés', 'setAuto', s.autoAdvance) +
          '<div class="set-row"><span>Feladat / kör</span>' +
            '<select id="setPer" class="btn" style="min-height:44px;padding:8px 12px">' +
              [5, 10, 15, 20].map(function (n) { return '<option value="' + n + '"' + (s.perRound === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') +
            '</select></div>' +
          '<div class="set-row"><span>Napi cél</span>' +
            '<select id="setGoal" class="btn" style="min-height:44px;padding:8px 12px">' +
              [10, 20, 30, 50, 80].map(function (n) { return '<option value="' + n + '"' + (s.dailyGoal === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') +
            '</select></div>' +
        '</div>' +

        '<div class="card">' +
          '<h2>👨‍👩‍👧 Szülői nézet</h2>' +
          '<div class="stat-grid" style="margin-top:12px">' +
            '<div><div class="v">' + st.answered + '</div><div class="k">Összes feladat</div></div>' +
            '<div><div class="v">' + acc + '%</div><div class="k">Pontosság</div></div>' +
            '<div><div class="v">' + F.overall() + '%</div><div class="k">Tudás</div></div>' +
          '</div>' +
          '<h3 style="margin-top:16px">Utolsó napok</h3>' +
          '<div class="row" style="margin-top:8px">' + histHtml + '</div>' +
          '<h3 style="margin-top:16px">Most ezek nehezek</h3>' +
          '<div class="row" style="margin-top:8px">' + weak + '</div>' +
          '<p class="small muted" style="margin:14px 0 0">' +
            'Az adatok csak ezen az eszközön tárolódnak, semmi nem kerül internetre. ' +
            'Napi 5–10 perc, rendszeresen többet ér, mint hetente egy hosszú ülés.' +
          '</p>' +
        '</div>' +

        '<button class="btn btn-ghost btn-block" id="resetBtn" type="button">🗑️ Minden adat törlése</button>' +
        '<p class="small muted center">Szorzó Manó · offline is működik · v1.0</p>' +
      '</div>';
    },
    mount: function () {
      function bind(id, key) {
        $(id).addEventListener('change', function (e) {
          S.settings[key] = e.target.checked;
          S.saveNow();
          FX.play('tap');
        });
      }
      bind('setSound', 'sound');
      bind('setHaptic', 'haptics');
      bind('setHints', 'showHints');
      bind('setAuto', 'autoAdvance');
      $('setPer').addEventListener('change', function (e) { S.settings.perRound = parseInt(e.target.value, 10); S.saveNow(); });
      $('setGoal').addEventListener('change', function (e) { S.settings.dailyGoal = parseInt(e.target.value, 10); S.saveNow(); });
      $('resetBtn').addEventListener('click', function () {
        if (global.confirm('Biztosan törlöd az összes haladást? Ez nem vonható vissza.')) {
          S.reset();
          FX.toast('Minden adat törölve.');
          global.SZ.ui.go('home');
        }
      });
    }
  };

  function row(label, id, checked) {
    return '<div class="set-row"><span>' + label + '</span>' +
      '<label class="switch"><input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + '><i></i></label></div>';
  }

  global.SZ.screens = {
    home: home, tables: tables, learn: learn, result: result,
    map: map, stickers: stickers, settings: settings,
    checkStickers: checkStickers, STICKERS: STICKERS
  };
})(window);
