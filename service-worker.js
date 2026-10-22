const CACHE = 'sportik-v7';
const ASSETS = ['./', 'index.html', 'app.js', 'styles.css', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'awake.mp4', 'fitbit.js', 'drive.js', 'auth.js'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== 'sportik-fonts').map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  // Шрифти Google: з кешу, оновлюємо у фоні; якщо недоступні — застосунок працює з системним шрифтом.
  if (FONT_HOSTS.includes(u.hostname)) {
    e.respondWith(caches.open('sportik-fonts').then(c => c.match(e.request).then(hit => {
      const net = fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })).catch(() => fetch(e.request)));
    return;
  }
  if (u.origin !== location.origin) return; // Google sign-in / Health API — напряму, без кешу
  // Network-first (so updates arrive), fall back to cache when offline.
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone();
    caches.open(CACHE).then(c => c.put(e.request, copy));
    return r;
  }).catch(() => caches.match(e.request, {ignoreSearch: true}).then(r => r || caches.match('index.html'))));
});
