/* =========================================================
   fx.js – hang, konfetti, rezgés, kabala, dicséretek
   ========================================================= */
(function (global) {
  'use strict';
  var S = global.SZ.state;
  var ctx = null;

  function ac() {
    if (!S.settings.sound) return null;
    try {
      if (!ctx) ctx = new (global.AudioContext || global.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }

  function tone(freq, start, dur, type, vol) {
    var c = ac(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime + start);
    g.gain.setValueAtTime(0.0001, c.currentTime + start);
    g.gain.exponentialRampToValueAtTime(vol || 0.16, c.currentTime + start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + start);
    o.stop(c.currentTime + start + dur + 0.02);
  }

  var SOUND = {
    good: function () { tone(660, 0, .12, 'triangle'); tone(880, .08, .18, 'triangle'); },
    great: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, i * .07, .22, 'triangle', .14); }); },
    bad: function () { tone(220, 0, .18, 'sine', .12); tone(165, .1, .24, 'sine', .1); },
    tap: function () { tone(520, 0, .05, 'square', .05); },
    level: function () { [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone(f, i * .09, .3, 'triangle', .13); }); },
    tick: function () { tone(880, 0, .04, 'square', .04); },
    win: function () { [659, 784, 1046, 784, 1046, 1318].forEach(function (f, i) { tone(f, i * .11, .32, 'triangle', .13); }); }
  };

  function play(name) { if (SOUND[name]) SOUND[name](); }

  function buzz(pattern) {
    if (!S.settings.haptics) return;
    try { if (global.navigator.vibrate) global.navigator.vibrate(pattern); } catch (e) {}
  }

  /* ---------- Konfetti ---------- */
  var COLORS = ['#7c5cff', '#ff6ba9', '#ffd166', '#37d5c6', '#8ac926', '#ff7b54', '#4cc9f0'];

  function confetti(count) {
    var layer = document.getElementById('fxLayer');
    if (!layer) return;
    if (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var n = count || 40;
    for (var i = 0; i < n; i++) {
      (function (i) {
        var el = document.createElement('i');
        el.className = 'confetti';
        var x = 10 + Math.random() * 80;
        var c = COLORS[Math.floor(Math.random() * COLORS.length)];
        el.style.left = x + 'vw';
        el.style.top = '-20px';
        el.style.background = c;
        el.style.borderRadius = Math.random() < .35 ? '50%' : '3px';
        layer.appendChild(el);
        var dur = 1400 + Math.random() * 1200;
        var dx = (Math.random() - .5) * 180;
        var rot = (Math.random() - .5) * 900;
        if (el.animate) {
          var anim = el.animate([
            { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
            { transform: 'translate(' + dx + 'px, 105vh) rotate(' + rot + 'deg)', opacity: .9 }
          ], { duration: dur, easing: 'cubic-bezier(.2,.6,.4,1)', delay: Math.random() * 350 });
          anim.onfinish = function () { el.remove(); };
        } else {
          global.setTimeout(function () { el.remove(); }, dur);
        }
      })(i);
    }
  }

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function toast(msg, ms) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, ms || 2200);
  }

  /* ---------- Lebegő pont ("+3") ---------- */
  function floatText(txt) {
    var el = document.createElement('div');
    el.className = 'combo';
    el.textContent = txt;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 1000);
  }

  /* ---------- Kabala (SVG) ----------
     mood: idle | happy | sad | think | win  */
  function mascot(mood, cls) {
    var eyes, mouth, extra = '';
    switch (mood) {
      case 'happy':
        eyes = '<path d="M34 44 q6 -8 12 0" stroke="#2b2150" stroke-width="4" fill="none" stroke-linecap="round"/>' +
               '<path d="M54 44 q6 -8 12 0" stroke="#2b2150" stroke-width="4" fill="none" stroke-linecap="round"/>';
        mouth = '<path d="M38 58 q12 14 24 0" stroke="#2b2150" stroke-width="4" fill="#ff6ba9" stroke-linecap="round"/>';
        break;
      case 'sad':
        eyes = '<circle cx="40" cy="45" r="4.5" fill="#2b2150"/><circle cx="60" cy="45" r="4.5" fill="#2b2150"/>' +
               '<path d="M33 37 q7 -4 13 -1" stroke="#2b2150" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
               '<path d="M67 37 q-7 -4 -13 -1" stroke="#2b2150" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
        mouth = '<path d="M39 62 q11 -9 22 0" stroke="#2b2150" stroke-width="4" fill="none" stroke-linecap="round"/>';
        break;
      case 'think':
        eyes = '<circle cx="40" cy="45" r="4.5" fill="#2b2150"/><circle cx="60" cy="45" r="4.5" fill="#2b2150"/>';
        mouth = '<path d="M42 60 h14" stroke="#2b2150" stroke-width="4" stroke-linecap="round"/>';
        extra = '<circle cx="80" cy="24" r="5" fill="#fff" opacity=".9"/><circle cx="89" cy="15" r="3" fill="#fff" opacity=".7"/>';
        break;
      case 'win':
        eyes = '<path d="M34 44 q6 -9 12 0" stroke="#2b2150" stroke-width="4" fill="none" stroke-linecap="round"/>' +
               '<path d="M54 44 q6 -9 12 0" stroke="#2b2150" stroke-width="4" fill="none" stroke-linecap="round"/>';
        mouth = '<path d="M36 56 q14 18 28 0 z" fill="#2b2150"/><path d="M42 64 q8 7 14 0" fill="#ff6ba9"/>';
        extra = '<path d="M50 4 l4 9 10 1 -7 7 2 10 -9 -5 -9 5 2 -10 -7 -7 10 -1 z" fill="#ffd166"/>';
        break;
      default:
        eyes = '<circle cx="40" cy="45" r="5" fill="#2b2150"/><circle cx="60" cy="45" r="5" fill="#2b2150"/>' +
               '<circle cx="42" cy="43" r="1.8" fill="#fff"/><circle cx="62" cy="43" r="1.8" fill="#fff"/>';
        mouth = '<path d="M40 58 q10 10 20 0" stroke="#2b2150" stroke-width="4" fill="none" stroke-linecap="round"/>';
    }
    var stateCls = mood === 'happy' || mood === 'win' ? ' is-happy' : (mood === 'sad' ? ' is-sad' : '');
    return '' +
      '<svg class="mascot ' + (cls || '') + stateCls + '" viewBox="0 0 100 100" role="img" aria-label="Szorzó Manó">' +
      '<defs><linearGradient id="mg" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#ff6ba9"/></linearGradient></defs>' +
      '<g class="m-body">' +
      extra +
      '<path d="M22 30 l-8 -14 16 4 z" fill="#37d5c6"/><path d="M78 30 l8 -14 -16 4 z" fill="#37d5c6"/>' +
      '<rect x="18" y="22" width="64" height="62" rx="26" fill="url(#mg)"/>' +
      '<rect x="27" y="33" width="46" height="36" rx="18" fill="#fff"/>' +
      eyes + mouth +
      '<circle cx="28" cy="60" r="5" fill="#ff9ec4" opacity=".75"/>' +
      '<circle cx="72" cy="60" r="5" fill="#ff9ec4" opacity=".75"/>' +
      '</g></svg>';
  }

  /* ---------- Dicséretek (magyar, kedves, változatos) ---------- */
  var PRAISE = ['Szuper! 🎉', 'Ez az! 💪', 'Nagyon ügyes! ⭐', 'Fantasztikus! ✨', 'Pontosan! 🎯',
                'Óriási! 🚀', 'Zseniális! 🧠', 'Ez ment! 👏', 'Tökéletes! 💎', 'Bombabiztos! 💥'];
  var COMBO = ['2 egymás után! 🔥', 'Sorozat! 🔥🔥', 'Lángolsz! 🔥🔥🔥', 'Megállíthatatlan! ⚡', 'Hihetetlen! 🌈'];
  var GENTLE = ['Semmi baj, nézzük meg együtt!', 'Ez nehéz volt – most már tudod!', 'Jó próbálkozás! Így megy:',
                'Majdnem! Egy trükk hozzá:', 'Sebaj, a hibából tanulunk a legtöbbet!'];

  function praise(streak) {
    if (streak >= 3) return COMBO[Math.min(COMBO.length - 1, streak - 3)];
    return PRAISE[Math.floor(Math.random() * PRAISE.length)];
  }
  function gentle() { return GENTLE[Math.floor(Math.random() * GENTLE.length)]; }

  global.SZ.fx = {
    play: play, buzz: buzz, confetti: confetti, toast: toast,
    floatText: floatText, mascot: mascot, praise: praise, gentle: gentle
  };
})(window);
