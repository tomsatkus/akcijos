// Service worker: leidžia įdiegti svetainę kaip programėlę ir naudotis ja be ryšio.
// Pirmiausia tinklas (naujausios akcijos ir dizainas), be ryšio – paskutinė išsaugota kopija (taip pat data.json).
// Silpnas ryšys (parduotuvėje): jei tinklas neatsako per NET_WAIT, rodoma išsaugota kopija, o tinklo atsakymas,
// kai ateina, įrašomas į talpyklą – kitą kartą atidarius bus naujausi duomenys.
// Keliai santykiniai: svetainė gali būti ne domeno šaknyje (pvz. vardas.github.io/akcijos/).
const CACHE = 'akcijos-v3';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'data.json'];
const NET_WAIT = 2000;   // ms; puslapis ir data.json laukiami paeiliui, tad iš viso ~4 s

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

const cached = req => caches.match(req, { ignoreSearch: true })
  .then(r => r || (req.mode === 'navigate' ? caches.match('./') : undefined));

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.includes('/api/') || url.pathname.includes('/pdf/')) return;  // vietinis serveris
  const net = fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  });
  e.waitUntil(net.catch(() => {}));   // tinklo atsakymas įrašomas, net jei jau parodyta kopija
  e.respondWith(new Promise(resolve => {
    let done = false;
    const give = r => { if (!done && r) { done = true; resolve(r); } };
    // per NET_WAIT neatsakius – išsaugota kopija (jei jos nėra, laukiama tinklo)
    const timer = setTimeout(() => cached(e.request).then(give), NET_WAIT);
    net.then(give, () => cached(e.request).then(r => give(r || Response.error())))
       .finally(() => clearTimeout(timer));
  }));
});
