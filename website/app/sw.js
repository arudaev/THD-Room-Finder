const CACHE = 'thd-v1';
const SHELL = [
  '/app/',
  '/app/index.html',
  '/app/manifest.json',
  '/app/api.js',
  '/app/logic.js',
  '/app/app.js',
  '/app/icons/icon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Only handle requests within this SW's scope
  if (!e.request.url.startsWith(self.registration.scope)) return;
  // Pass API calls through (browser HTTP cache + localStorage handle caching)
  if (new URL(e.request.url).pathname.startsWith('/api/')) return;

  e.respondWith(
    caches.match(e.request).then(cached => cached ?? fetch(e.request))
  );
});
