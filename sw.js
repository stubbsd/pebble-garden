// Offline cache: everything the game needs, cache-first. Bump VERSION on release.
var VERSION = 'pebble-garden-v6';
var FILES = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'src/engine.js', 'src/levels.js', 'src/audio.js', 'src/animals.js', 'src/game.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (r) { return r || fetch(e.request).catch(function () { return caches.match('index.html'); }); }));
});
