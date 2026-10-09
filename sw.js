const CACHE = 'sarenti-v1';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'codec.js', 'vendor/qrcode.js', 'manifest.webmanifest',
  'img/logo.png', 'img/icon-192.png', 'img/icon-512.png', 'img/icon-180.png',
  'fonts/cormorant-garamond-latin-500-normal.woff2', 'fonts/cormorant-garamond-latin-600-normal.woff2', 'fonts/cormorant-garamond-latin-700-normal.woff2',
  'fonts/jost-latin-400-normal.woff2', 'fonts/jost-latin-500-normal.woff2', 'fonts/jost-latin-600-normal.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
