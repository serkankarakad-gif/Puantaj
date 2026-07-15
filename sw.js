/* Puantaj Defterim — service worker (çevrimdışı kabuk) */
const KASA = "puantaj-v20";
const DOSYALAR = ["./", "./index.html", "./manifest.webmanifest"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(KASA).then(c => c.addAll(DOSYALAR)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(adlar => Promise.all(adlar.filter(a => a !== KASA).map(a => caches.delete(a))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const istek = e.request;
  if (istek.method !== "GET") return;
  const ayniKok = new URL(istek.url).origin === self.location.origin;
  if (!ayniKok) return; /* Firebase/API istekleri SW'ye takılmasın */

  /* Sayfa: önce ağ, olmazsa önbellek (çevrimdışı açılış) */
  if (istek.mode === "navigate") {
    e.respondWith(
      fetch(istek)
        .then(y => {
          const kopya = y.clone();
          caches.open(KASA).then(c => c.put("./index.html", kopya));
          return y;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }
  /* Diğer aynı-kök dosyalar: önce önbellek, yoksa ağ */
  e.respondWith(
    caches.match(istek).then(c => c || fetch(istek).then(y => {
      const kopya = y.clone();
      caches.open(KASA).then(k => k.put(istek, kopya));
      return y;
    }))
  );
});
