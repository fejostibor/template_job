/* =========================================================
   app.js – útvonalkezelés, fejléc, indítás, PWA
   ========================================================= */
(function (global) {
  'use strict';
  var S = global.SZ.state, F = global.SZ.facts, FX = global.SZ.fx;

  var APP_VERSION = '1.4.0';   // tartsd szinkronban az sw.js VERSION-jével

  var stack = [];          // [{name, params}]
  var current = null;
  var swReg = null;
  var reloading = false;
  var hadController = false;   // volt-e már aktív service worker az induláskor

  var TITLES = {
    home: 'Szorzó Manó', tables: 'Táblaválasztás', learn: 'Felfedező',
    result: 'Eredmény', map: 'Szorzó-térkép', charts: 'Szorzótáblák', stickers: 'Matricák',
    settings: 'Beállítások', transfer: 'Haladás átvitele', quiz: 'Feladatok'
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

  /* =========================================================
     Frissítéskezelés
     A telefonon a service worker gyorsítótárazza az appot, hogy offline is
     menjen – emiatt egy új verzió magától nem jelenne meg. Ezért: amint az
     új verzió letöltődött, azonnal átállunk rá (kvíz közben viszont nem
     szakítjuk félbe a kört, csak felkínáljuk egy sávban).
     ========================================================= */

  function quizRunning() { return !!(current && current.name === 'quiz'); }

  function showUpdateBar(worker) {
    if (document.getElementById('updateBar')) return;
    var bar = document.createElement('div');
    bar.id = 'updateBar';
    bar.className = 'update-bar';
    bar.innerHTML =
      '<span>✨ Új verzió érkezett</span>' +
      '<button type="button" id="updateNow">Frissítés</button>' +
      '<button type="button" id="updateLater" aria-label="Később">✕</button>';
    document.body.appendChild(bar);
    document.getElementById('updateNow').addEventListener('click', function () {
      applyUpdate(worker);
    });
    document.getElementById('updateLater').addEventListener('click', function () { bar.remove(); });
  }

  /* Biztosíték újratöltési hurok ellen: automatikusan legfeljebb 10 mp-enként
     egyszer töltünk újra; ha ennél sűrűbben jönne, inkább a sávot mutatjuk. */
  function allowAutoReload() {
    try {
      var last = parseInt(global.sessionStorage.getItem('sz-reloaded') || '0', 10) || 0;
      if (Date.now() - last < 10000) return false;
      global.sessionStorage.setItem('sz-reloaded', String(Date.now()));
    } catch (e) { /* privát mód: nincs tárolás, akkor is csak egyszer futunk le */ }
    return true;
  }

  function applyUpdate(worker) {
    reloading = true;
    try { global.sessionStorage.setItem('sz-reloaded', String(Date.now())); } catch (e) {}
    try { if (worker) worker.postMessage({ type: 'SKIP_WAITING' }); } catch (e) {}
    setTimeout(function () { global.location.reload(); }, 250);
  }

  /* Az aktív service worker verziószáma (a Beállítások mutatja) */
  function swVersion(cb) {
    var done = false;
    function finish(v) { if (!done) { done = true; cb(v); } }
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) { finish(null); return; }
    try {
      var ch = new MessageChannel();
      ch.port1.onmessage = function (e) { finish(e.data && e.data.version); };
      navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' }, [ch.port2]);
      setTimeout(function () { finish(undefined); }, 1200);
    } catch (e) { finish(undefined); }
  }

  /* Kézi frissítéskeresés a Beállításokból */
  function checkUpdate(cb) {
    if (!swReg) { cb('nosw'); return; }
    swReg.update().then(function () {
      if (swReg.installing) { cb('downloading'); return; }
      if (swReg.waiting) { cb('ready', swReg.waiting); return; }
      cb('current');
    }).catch(function () { cb('offline'); });
  }

  function initSW() {
    if (!('serviceWorker' in navigator) || global.SZ_NO_SW) return;

    // Az első telepítéskor is jön controllerchange, pedig ott nincs mit frissíteni:
    // az oldal már a friss fájlokkal töltődött be. Csak a KÉSŐBBI váltás számít.
    hadController = !!navigator.serviceWorker.controller;

    navigator.serviceWorker.register('sw.js').then(function (reg) {
      swReg = reg;
      if (reg.waiting && navigator.serviceWorker.controller) showUpdateBar(reg.waiting);
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdateBar(nw);
        });
      });
      // Félóránként és visszatéréskor megnézzük, jött-e új verzió
      setInterval(function () { reg.update().catch(function () {}); }, 30 * 60 * 1000);
      global.addEventListener('focus', function () { reg.update().catch(function () {}); });
    }).catch(function () {});

    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloading) return;
      if (!hadController) { hadController = true; return; }   // első telepítés
      if (quizRunning()) { showUpdateBar(null); return; }   // kör közben nem szakítjuk félbe
      if (!allowAutoReload()) { showUpdateBar(null); return; }
      reloading = true;
      global.location.reload();
    });
  }

  global.SZ.ui = { go: go, back: back, render: render, syncTop: syncTop,
                   version: APP_VERSION, swVersion: swVersion, checkUpdate: checkUpdate,
                   applyUpdate: applyUpdate };

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

    // A service worker csak a saját, gyökérből kiszolgált telepítésnél kell.
    if (document.readyState === 'complete') initSW();
    else global.addEventListener('load', initSW);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
