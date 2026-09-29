/* Szorzó Manó – service worker
   Alkalmazás-héj gyorsítótárazása, hogy net nélkül is menjen.
   FONTOS: a VERSION-t tartsd szinkronban a js/app.js APP_VERSION-jével –
   az alkalmazás ebből tudja megmondani, friss-e a gyorsítótár. */
var VERSION = '1.4.0';
var CACHE = 'szorzo-mano-' + VERSION;
var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css?v=1.4.0',
  './js/state.js?v=1.4.0',
  './js/facts.js?v=1.4.0',
  './js/fx.js?v=1.4.0',
  './js/quiz.js?v=1.4.0',
  './js/transfer.js?v=1.4.0',
  './js/screens.js?v=1.4.0',
  './js/app.js?v=1.4.0',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-64.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // cache: 'reload' – a böngésző HTTP-gyorsítótárát megkerülve, mindig a
      // szerverről töltjük le a fájlokat, különben a régi verzió rögzülhet.
      return Promise.all(ASSETS.map(function (url) {
        return fetch(new Request(url, { cache: 'reload' }))
          .then(function (res) { if (res && res.ok) return c.put(url, res); })
          .catch(function () { /* egy hiányzó fájl ne buktassa el a telepítést */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

/* Az oldal kérdezhet verziót, és kérheti az azonnali átállást */
self.addEventListener('message', function (e) {
  var msg = e.data || {};
  if (msg.type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (msg.type === 'GET_VERSION' && e.ports && e.ports[0]) {
    e.ports[0].postMessage({ version: VERSION });
  }
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return k === CACHE ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Navigációnál: előbb a háló (no-cache: mindig ellenőrizzük a szervernél,
    // különben a böngésző HTTP-gyorsítótára régi index.html-t adhat), és csak
    // offline esetén nyúlunk a tárolt példányhoz.
    e.respondWith(
      fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
        return res;
      }).catch(function () {
        return caches.match('./index.html').then(function (r) { return r || caches.match('./'); });
      })
    );
    return;
  }

  // Statikus fájlok: előbb a gyorsítótár, háttérben frissítés
  e.respondWith(
    caches.match(req, { ignoreVary: true }).then(function (cached) {
      var net = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || net;
    })
  );
});
