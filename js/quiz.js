/* =========================================================
   quiz.js – a kérdés-motor (gyakorlás, villámkör, vizsga)
   ========================================================= */
(function (global) {
  'use strict';
  var S = global.SZ.state, F = global.SZ.facts, FX = global.SZ.fx;

  var Q = null;          // aktuális menet
  var keyHandler = null;

  function h(s) { return s; }

  function el(id) { return document.getElementById(id); }

  function start(opts) {
    Q = {
      mode: opts.mode || 'practice',
      tables: opts.tables && opts.tables.length ? opts.tables : [1,2,3,4,5,6,7,8,9,10],
      total: opts.count || S.settings.perRound,
      idx: 0,
      correct: 0,
      streak: 0,
      best: 0,
      mistakes: [],
      recent: [],
      repair: [],
      started: Date.now(),
      qStart: 0,
      answered: false,
      input: '',
      current: null,
      timeLeft: opts.seconds || 0,
      seconds: opts.seconds || 0,
      timer: null,
      title: opts.title || 'Gyakorlás',
      weak: opts.weak || null,
      examTable: opts.examTable || null
    };
    S.registerPlay();
    global.SZ.ui.render(shell(), 'quiz', { title: Q.title });
    next();
    if (Q.mode === 'flash') startTimer();
    bindKeys();
  }

  function stop() {
    if (Q && Q.timer) { clearInterval(Q.timer); Q.timer = null; }
    unbindKeys();
    Q = null;
  }

  function shell() {
    return '' +
      '<div class="stack fade-in">' +
        '<div class="quiz-head">' +
          '<span class="pill" id="qCount">1 / ' + Q.total + '</span>' +
          '<div class="bar" id="qBarWrap"><i id="qBar" style="width:0%"></i></div>' +
          '<span class="pill" id="qScore">0 ✔</span>' +
        '</div>' +
        (Q.mode === 'flash' ? '<div class="timer-bar"><i id="qTimer" style="width:100%"></i></div>' : '') +
        '<div id="qCard"></div>' +
        '<div id="qAnswer"></div>' +
        '<div id="qFeed"></div>' +
      '</div>';
  }

  function startTimer() {
    var tick = function () {
      Q.timeLeft -= 0.1;
      if (Q.timeLeft <= 0) { Q.timeLeft = 0; finish(); return; }
      var bar = el('qTimer');
      if (bar) bar.style.width = (Q.timeLeft / Q.seconds * 100) + '%';
      var c = el('qCount');
      if (c) c.textContent = Math.ceil(Q.timeLeft) + ' mp';
    };
    Q.timer = setInterval(tick, 100);
  }

  function nextQuestion() {
    // 1) Javító ismétlés: a most elrontott tény hamar visszatér, más kérdéstípusban
    if (Q.repair.length && Math.random() < 0.6) {
      var r = Q.repair.shift();
      return F.makeQuestion(Q.tables, Q.recent, {
        mode: Q.mode, pair: [r.a, r.b],
        forceType: r.type === 'mc' ? 'input' : 'mc'
      });
    }
    // 2) Gyenge pontok köre: pontosan a kijelölt műveletek
    if (Q.weak && Q.weak.length) {
      var w = Q.weak[Q.idx % Q.weak.length];
      return F.makeQuestion(Q.tables, Q.recent, { mode: Q.mode, pair: [w.a, w.b] });
    }
    // 3) Szokásos: súlyozott választás (Leitner + hibaarány + utolsó találkozás)
    return F.makeQuestion(Q.tables, Q.recent, { mode: Q.mode, examTable: Q.examTable });
  }

  function next() {
    if (Q.mode !== 'flash' && Q.idx >= Q.total) { finish(); return; }
    Q.current = nextQuestion();
    Q.recent.push([Q.current.a, Q.current.b]);
    Q.answered = false;
    Q.input = '';
    Q.qStart = Date.now();
    renderQuestion();
  }

  function renderQuestion() {
    var q = Q.current;
    var moodSvg = FX.mascot('think', 'mascot-sm');
    el('qCard').innerHTML =
      '<div class="question fade-in">' +
        '<div class="q-type">' + q.label + '</div>' +
        '<div class="q-text">' + q.text + '</div>' +
      '</div>';

    if (Q.mode !== 'flash') {
      el('qCount').textContent = (Q.idx + 1) + ' / ' + Q.total;
      el('qBar').style.width = (Q.idx / Q.total * 100) + '%';
    } else {
      var w = el('qBarWrap'); if (w) w.style.display = 'none';
    }
    el('qScore').textContent = Q.correct + ' ✔';
    el('qFeed').innerHTML = '';

    if (q.options) renderOptions(q);
    else renderKeypad(q);
  }

  function renderOptions(q) {
    var isTF = q.type === 'truefalse';
    var html = '<div class="opts">';
    q.options.forEach(function (o, i) {
      var lbl = isTF ? (o === 'igaz' ? '✅ Igaz' : '❌ Hamis') : o;
      html += '<button class="opt" type="button" data-val="' + o + '" data-i="' + i + '">' + lbl + '</button>';
    });
    html += '</div>';
    el('qAnswer').innerHTML = html;
    Array.prototype.forEach.call(el('qAnswer').querySelectorAll('.opt'), function (b) {
      b.addEventListener('click', function () {
        if (Q.answered) return;
        check(isTF ? b.dataset.val : parseInt(b.dataset.val, 10), b);
      });
    });
  }

  function renderKeypad(q) {
    var keys = [1,2,3,4,5,6,7,8,9];
    var html = '<div class="stack">' +
      '<div class="answer-box" id="qBox">?</div>' +
      '<div class="keypad">';
    keys.forEach(function (k) { html += '<button class="key" type="button" data-k="' + k + '">' + k + '</button>'; });
    html += '<button class="key key-del" type="button" data-k="del">⌫</button>';
    html += '<button class="key" type="button" data-k="0">0</button>';
    html += '<button class="key key-ok" type="button" data-k="ok">OK</button>';
    html += '</div></div>';
    el('qAnswer').innerHTML = html;
    Array.prototype.forEach.call(el('qAnswer').querySelectorAll('.key'), function (b) {
      b.addEventListener('click', function () { press(b.dataset.k); });
    });
  }

  function press(k) {
    if (!Q || Q.answered) return;
    var box = el('qBox');
    if (k === 'del') {
      Q.input = Q.input.slice(0, -1);
      FX.play('tap');
    } else if (k === 'ok') {
      if (!Q.input.length) return;
      check(parseInt(Q.input, 10));
      return;
    } else {
      var max = Q.current.maxLen || 3;
      if (Q.input.length >= max) return;
      if (Q.input === '' && k === '0') return;
      Q.input += k;
      FX.play('tap');
    }
    if (box) {
      box.textContent = Q.input || '?';
      box.className = 'answer-box' + (Q.input ? ' filled' : '');
    }
    // teljes hosszúságnál automatikus ellenőrzés nincs – a gyerek dönt (OK gomb)
  }

  function bindKeys() {
    keyHandler = function (e) {
      if (!Q) return;
      if (e.key >= '0' && e.key <= '9') press(e.key);
      else if (e.key === 'Backspace') press('del');
      else if (e.key === 'Enter') {
        if (Q.answered) { var b = el('nextBtn'); if (b) b.click(); }
        else press('ok');
      }
    };
    document.addEventListener('keydown', keyHandler);
  }
  function unbindKeys() {
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    keyHandler = null;
  }

  function check(val, btnEl) {
    if (Q.answered) return;
    Q.answered = true;
    var q = Q.current;
    var ms = Date.now() - Q.qStart;
    var ok = String(val) === String(q.answer);

    // A "tény" mindig az a×b, akkor is, ha hiányzó tényezőt vagy osztást kérdeztünk
    F.record(q.a, q.b, ok, ms);

    if (ok) {
      Q.correct++;
      Q.streak++;
      Q.best = Math.max(Q.best, Q.streak);
      FX.play(Q.streak >= 3 ? 'great' : 'good');
      FX.buzz(20);
      var gain = 10 + Math.min(10, Q.streak * 2);
      if (ms < 3000) gain += 4;
      var lv = S.addXp(gain);
      S.addCoins(1 + (Q.streak >= 5 ? 1 : 0));
      if (Q.streak >= 3) FX.floatText(Q.streak + '× 🔥');
      if (lv > 0) { FX.play('level'); FX.confetti(60); FX.toast('Új szint: ' + S.stats.level + '! 🎉'); }
    } else {
      Q.streak = 0;
      Q.mistakes.push({ a: q.a, b: q.b, type: q.type, given: val });
      Q.repair.push({ a: q.a, b: q.b, type: q.type });
      FX.play('bad');
      FX.buzz([30, 40, 30]);
    }

    markAnswer(ok, val, btnEl);
    showFeedback(ok, q);
    global.SZ.ui.syncTop();
  }

  function markAnswer(ok, val, btnEl) {
    var q = Q.current;
    if (q.options) {
      Array.prototype.forEach.call(document.querySelectorAll('#qAnswer .opt'), function (b) {
        var v = b.dataset.val;
        if (String(v) === String(q.answer)) b.classList.add('correct');
        else if (b === btnEl) b.classList.add('wrong');
        else b.classList.add('dim');
      });
    } else {
      var box = el('qBox');
      if (box) {
        box.textContent = (val === undefined || val === null || val === '') ? '?' : val;
        box.className = 'answer-box ' + (ok ? 'correct' : 'wrong');
      }
      Array.prototype.forEach.call(document.querySelectorAll('#qAnswer .key'), function (b) { b.disabled = true; });
    }
  }

  function showFeedback(ok, q) {
    var msg, tip = '';
    if (ok) {
      msg = FX.praise(Q.streak);
      var cp = F.commutePrompt(q.a, q.b);
      if (cp && Math.random() < 0.25) tip = '<div class="tip">💡 ' + cp + '</div>';
    } else {
      msg = FX.gentle();
      var right = (q.type === 'truefalse')
        ? (q.a + ' × ' + q.b + ' = ' + q.product + ', ezért a válasz: ' + q.answer.toUpperCase())
        : (q.type === 'div' ? (q.product + ' : ' + q.a + ' = ' + q.b) : (q.a + ' × ' + q.b + ' = ' + q.product));
      tip = '<div class="tip"><b>' + right + '</b></div>';
      if (S.settings.showHints) tip += '<div class="tip">💡 ' + F.hint(q.a, q.b) + '</div>';
    }

    var auto = ok && S.settings.autoAdvance && Q.mode !== 'exam';
    var btn = auto ? '' : '<button class="btn ' + (ok ? 'btn-primary' : '') + ' btn-block" id="nextBtn" type="button">' +
      (ok ? 'Tovább →' : 'Értem, mehet tovább →') + '</button>';

    el('qFeed').innerHTML =
      '<div class="feedback ' + (ok ? 'good' : 'bad') + '">' +
        '<div class="row" style="gap:10px;flex-wrap:nowrap;align-items:center">' +
          FX.mascot(ok ? 'happy' : 'sad', 'mascot-sm') +
          '<strong>' + msg + '</strong>' +
        '</div>' + tip + btn +
      '</div>';

    if (auto) {
      setTimeout(advance, 620);
    } else {
      var nb = el('nextBtn');
      if (nb) nb.addEventListener('click', advance);
    }
  }

  function advance() {
    if (!Q) return;
    Q.idx++;
    next();
  }

  function finish() {
    if (!Q) return;
    if (Q.timer) { clearInterval(Q.timer); Q.timer = null; }
    unbindKeys();

    var totalAnswered = Q.mode === 'flash' ? Q.idx : Q.total;
    var pct = totalAnswered ? Math.round(Q.correct / Math.max(1, totalAnswered) * 100) : 0;
    var secs = Math.round((Date.now() - Q.started) / 1000);

    var stars = pct >= 95 ? 3 : (pct >= 80 ? 2 : (pct >= 55 ? 1 : 0));
    var bonusCoins = stars * 5;
    if (bonusCoins) S.addCoins(bonusCoins);
    if (Q.best > S.stats.bestCombo) S.stats.bestCombo = Q.best;

    var examPassed = false;
    if (Q.mode === 'exam' && Q.examTable) {
      examPassed = Q.mistakes.length <= 1 && Q.correct >= Q.total - 1;
      if (examPassed) {
        var st = F.tableState(Q.examTable);
        st.exam = true;
        S.addCoins(20);
        F.refreshStars(Q.examTable);
      }
    }
    if (Q.mode === 'flash' && Q.correct > S.stats.bestFlash) S.stats.bestFlash = Q.correct;
    Q.tables.forEach(function (t) { F.refreshStars(t); });
    S.saveNow();

    var newStickers = global.SZ.screens.checkStickers();

    if (stars >= 2) { FX.play('win'); FX.confetti(90); }
    else FX.play('good');

    var summary = {
      mode: Q.mode, correct: Q.correct, total: totalAnswered, pct: pct, stars: stars,
      secs: secs, best: Q.best, mistakes: Q.mistakes.slice(), coins: bonusCoins,
      examTable: Q.examTable, examPassed: examPassed, tables: Q.tables.slice(),
      newStickers: newStickers
    };
    Q = null;
    global.SZ.ui.go('result', summary);
  }

  global.SZ.quiz = { start: start, stop: stop };
})(window);
