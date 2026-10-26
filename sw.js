/* Offline support. App files are fetched fresh from the network first (so
   updates you push to GitHub show up on the next open), falling back to the
   cached copy when offline or slow. */
const CACHE = 'chores-v17';
const PHOTOS = 'chores-photos-v1';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'recurrence.js', 'themes.js', 'icons.js', 'icons-core.js', 'palette.js', 'particles.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-v2-192.png', 'icon-maskable-v2-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== PHOTOS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.origin === location.origin && url.pathname.includes('/banners/') && /\.(jpe?g|png|webp)$/i.test(url.pathname)) {
    // photos never change once uploaded: serve from cache, fetch once
    e.respondWith(caches.open(PHOTOS).then(async c => {
      const hit = await c.match(req); if (hit) return hit;
      const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res;
    }));
  } else if (url.origin === location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const net = fetch(req, { cache: 'no-cache' }).then(res => { if (res.ok) cache.put(req, res.clone()); return res; });
      const timeout = new Promise(r => setTimeout(r, 3000));
      try {
        const res = await Promise.race([net, timeout]);
        if (res) return res;
      } catch (err) { /* offline */ }
      const hit = await cache.match(req, { ignoreSearch: true });
      return hit || net;
    })());
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res;
    }));
  }
});
