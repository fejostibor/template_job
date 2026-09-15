/* =========================================================
   app.js – útvonalkezelés, fejléc, indítás, PWA
   ========================================================= */
(function (global) {
  'use strict';
  var S = global.SZ.state, F = global.SZ.facts, FX = global.SZ.fx;

  var stack = [];          // [{name, params}]
  var current = null;

  var TITLES = {
    home: 'Szorzó Manó', tables: 'Táblaválasztás', learn: 'Felfedező',
    result: 'Eredmény', map: 'Szorzó-térkép', stickers: 'Matricák',
    settings: 'Beállítások', quiz: 'Feladatok'
  };

  function syncTop() {
    var st = S.stats;
    document.getElementById('chipLevel').textContent = '⭐ ' + st.level;
    document.getElementById('chipCoins').textContent = '🪙 ' + st.coins;
    document.getElementById('chipStreak').textContent = '🔥 ' + st.streak;
  }

  function setChrome(name, params) {
    var backBtn = document.getElementById('backBtn');
    var scr = global.SZ.screens[name];
    var showBack = name === 'quiz' ? true : !!(scr && scr.back);
    backBtn.hidden = !showBack;
    document.getElementById('topTitle').textContent =
      (name === 'quiz' && params && params.title) ? params.title : (TITLES[name] || 'Szorzó Manó');
    syncTop();
  }

  function render(html, name, params) {
    var app = document.getElementById('app');
    app.innerHTML = html;
    app.scrollTop = 0;
    global.scrollTo(0, 0);
    current = { name: name, params: params };
    setChrome(name, params);
  }

  function go(name, params, replace) {
    if (current && current.name === 'quiz' && name !== 'quiz') global.SZ.quiz.stop();
    params = params || {};
    var scr = global.SZ.screens[name];
    if (!scr) { name = 'home'; scr = global.SZ.screens.home; }

    if (!replace) {
      if (name === 'home') stack = [];
      else stack.push({ name: name, params: params });
    }
    render(scr.html(params), name, params);
    if (scr.mount) scr.mount(params);
    try { history.pushState({ n: name }, '', '#' + name); } catch (e) {}
  }

  function back() {
    if (current && current.name === 'quiz') {
      global.SZ.quiz.stop();
      go('home');
      return;
    }
    stack.pop();
    var prev = stack[stack.length - 1];
    if (prev) {
      var scr = global.SZ.screens[prev.name];
      render(scr.html(prev.params), prev.name, prev.params);
      if (scr.mount) scr.mount(prev.params);
    } else {
      go('home');
    }
  }

  global.SZ.ui = { go: go, back: back, render: render, syncTop: syncTop };

  /* ---------- Indítás ---------- */
  function boot() {
    S.load();
    global.SZ.screens.checkStickers();

    document.getElementById('backBtn').addEventListener('click', function () { FX.play('tap'); back(); });
    document.getElementById('topStats').addEventListener('click', function () { go('stickers'); });

    global.addEventListener('popstate', function () { back(); });

    // Első hangesemény feloldja a WebAudio-t iOS-en
    var unlock = function () { FX.play('tap'); document.removeEventListener('pointerdown', unlock); };
    document.addEventListener('pointerdown', unlock);

    // Nap váltása közben is maradjon friss az állapot
    global.addEventListener('focus', function () { S.rollDay(); syncTop(); });

    go('home');

    if ('serviceWorker' in navigator) {
      global.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () {});
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
