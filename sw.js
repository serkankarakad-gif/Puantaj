/* Puantaj Defterim — service worker (çevrimdışı kabuk) */
const KASA = "puantaj-0.0.3.7";
/* ÇEKİRDEK: uygulamanın açılması için ŞART olan dosyalar. addAll atomiktir —
   biri bile inmezse kurulum tamamen başarısız olur, bu yüzden burada sadece
   gerçekten zorunlu olanlar var. */
const DOSYALAR = ["./", "./index.html", "./manifest.webmanifest", "./style.css", "./app.js", "./firebase-config.js", "./sabitler.js", "./pin-arka-fotograf.jpg"];
/* EK: sadece PDF üretilirken gereken ~1,05 MB'lık fontlar. 0.0.2.3'te çekirdekten
   ayrıldılar çünkü:
     1) addAll atomik olduğu için, zayıf şantiye internetinde bu 1 MB'ın yarıda
        kalması TÜM çevrimdışı kurulumu düşürüyordu (uygulama hiç çevrimdışı
        çalışmaz hale geliyordu, sebebi de görünmüyordu),
     2) kurulumu gereksiz yere uzatıyorlardı.
   Artık kurulum çekirdek inince tamamlanıyor; fontlar arka planda, başarısız
   olsa bile kurulumu etkilemeden önbelleğe alınıyor. İnmezlerse PDF yine
   üretilir (app.js "helvetica" yedeğine düşer). */
const EK_DOSYALAR = ["./font-liberationsans-regular.js", "./font-liberationsans-bold.js"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(KASA).then(c =>
      c.addAll(DOSYALAR).then(() => {
        /* Bilerek waitUntil zincirine BAĞLANMIYOR: arka planda ilsin, kurulumu bekletmesin */
        EK_DOSYALAR.forEach(u => c.add(u).catch(() => {}));
      })
    )
    /* skipWaiting() BİLEREK ÇAĞRILMIYOR (0.0.3.0).
       Eskiden kurulum biter bitmez `skipWaiting()` çağrılıyor, activate'te de
       `clients.claim()` yapılıyordu. Bu, yeni sürüm yayınlandığı anda çalışan
       sayfayı yeni service worker'ın devralması demek — kullanıcı tam puantaj
       veya masraf formu doldururken sayfa yenilenip GİRDİĞİ VERİ KAYBOLABİLİYORDU.
       Ayrıca sayfa v1 kodunu çalıştırırken worker v2 olabildiği için sürüm
       çarpıklığı (version skew) riski vardı.
       Artık yeni sürüm "waiting" durumunda bekliyor; app.js kullanıcıya
       "Yeni sürüm hazır — Yenile" bildirimi gösteriyor ve kullanıcı onaylayınca
       aşağıdaki SKIP_WAITING mesajı geliyor. Karar kullanıcıda. */
  );
});

/* Kullanıcı "Yenile"ye bastığında app.js bu mesajı gönderir. */
self.addEventListener("message", e => {
  if (e.data && e.data.tip === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(adlar => Promise.all(adlar.filter(a => a !== KASA && a !== "puantaj-duyuru").map(a => caches.delete(a))))
      .then(() => self.clients.claim())   /* skipWaiting sadece kullanıcı onayıyla tetiklendiği için burada güvenli */
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


/* ---------- 🔔 Bildirim: arka planda göster ---------- */
const IKON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAIAAADdvvtQAAADJElEQVR4nO3dy20UURBAURs5B1gQFmESBqGwIAvYIUsWP9/Br6rnnL2tfjW3q8cayfP4/sPHB3itd6cvgN0ERCIgEgGRCIhEQCQCIhEQiYBIBEQiIBIBkQiIREAkAiIREImASAREIiASAZEIiERAJAIiERCJgEgERCIgEgGRCIhEQCRPpy/gvG+fv776Zz98uvd/jmMDkQiIREAkAiIREImASAREIiASAZEIiERAJI93+1UH5SOwl+72Q7H7Cui20fzKXcV0FwG9TTcv3UNJFw/oVDrPXTujawY0oZuXLlnS1QKamc5zF8voUn/Gz6/nYclF/r2LbKCNr8o1VtH6gDam89z2jHY/wrbX87D/CIsD2j76n1YfZOUjbPXEf2Pj42zfBrpqPQ87j7ZsA70c8R/v2rOvyisub9ce2rSBNt6gr7DrmGsC2jXWaNFhdwS0aKC3suXICwLaMsqbW3Hw6QGtGOL/M//4owOaP743MHwIcwMaPri3NHkUQwOaPLIjxg5kaEBsMTGgsXfbWTPHMi6gmWMaYuBwZgU0cEDTTBvRrIBYZ1BA0+6tsUYNalBAbDQloFF31XxzxjUioDnjWGTI0EYExF7nAxpyJ200YXTnA2I1AZEcDmjCEl7t+ABtIJKTAR2/e67h7BhtIBIBkRwLyPPrhg4O0wYiERCJgEjOBOQN0M2dGqkNRCIgEgGRCIjkQEDeQf8nRwZrA5EIiERAJAIiebrVL/LWeIJ/ehVu8h/NbxbQKcPDHX55nUcYiYBIBEQiIBIBkQiIREAkAiIREImASAREsuxbm5nGBiIREImASAREIiASAZEIiERAJAIiERCJgEgERCIgEgGRCIhEQCQCIhEQiYBIBEQiIBIBkQiIREAkAiIREImASAREIiASAZEIiERAJAIiERCJgEgERCIgEgGRCIhEQCQCIhEQiYBIBEQiIBIBkQiIREAkAiIREImASAREIiASAZE8fv9y+hLYzAYiERCJgEgERCIgEgGRCIhEQCQCIhEQiYBIBEQiIBIBkQiIREAkAiIREImASAREIiASAZEIiERAJAIiERDJD17Trqk1D/6oAAAAAElFTkSuQmCC";
self.addEventListener("push", e => {
  let v = {};
  try{ v = e.data ? e.data.json() : {}; }catch(err){}
  const n = v.notification || (v.data && v.data.notification) || v.data || {};
  const baslik = n.title || "Puantaj Defterim 👷";
  const secenek = {
    body: n.body || "Yeni bir duyurun var, aç bak!",
    icon: n.icon || IKON,
    badge: IKON,
    data: { url: (n.click_action || (v.fcmOptions && v.fcmOptions.link) || "./") }
  };
  secenek.vibrate = [80, 40, 80];
  secenek.tag = n.tag || ("duyuru-" + Date.now());
  if(n.image) secenek.image = n.image;
  e.waitUntil((async ()=>{
    /* Kutuya yaz: uygulama kapalıyken gelen duyuru kaybolmasın */
    try{
      const kasa = await caches.open("puantaj-duyuru");
      const c = await kasa.match("/kutu");
      let liste = [];
      try{ if(c) liste = await c.json(); }catch(err){}
      liste.push({ b: baslik, m: secenek.body, z: Date.now() });
      if(liste.length > 30) liste = liste.slice(-30);
      await kasa.put("/kutu", new Response(JSON.stringify(liste), {headers:{"content-type":"application/json"}}));
    }catch(err){}
    await self.registration.showNotification(baslik, secenek);
  })());
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const hedef = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(liste => {
      for(const c of liste){ if("focus" in c) return c.focus(); }
      return clients.openWindow(hedef);
    })
  );
});
