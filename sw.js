// Service worker: leidžia įdiegti svetainę kaip programėlę ir naudotis ja be ryšio.
// Pirmiausia tinklas (naujausios akcijos ir dizainas), be ryšio – paskutinė išsaugota kopija (taip pat data.json).
// Keliai santykiniai: svetainė gali būti ne domeno šaknyje (pvz. vardas.github.io/akcijos/).
const CACHE = 'akcijos-v2';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'data.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.includes('/api/') || url.pathname.includes('/pdf/')) return;  // vietinis serveris
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })
        .then(r => r || (e.request.mode === 'navigate' ? caches.match('./') : undefined))
        .then(r => r || Response.error()))
  );
});
