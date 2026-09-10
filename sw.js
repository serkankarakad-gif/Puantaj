/* Puantaj Defterim — service worker (çevrimdışı kabuk) */
const KASA = "puantaj-0.1.3.7";
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
  const url = new URL(istek.url);
  const ayniKok = url.origin === self.location.origin;

  /* ── DIŞ KÜTÜPHANELER: çevrimdışı için önbelleğe al ────────────────
     Uygulama 10 dış kütüphane kullanıyor (Firebase SDK, jsPDF, SheetJS,
     html2canvas, Tesseract). Eskiden bunların tamamı `if(!ayniKok) return`
     ile service worker'ı atlıyordu — yani ÖNBELLEĞE HİÇ ALINMIYORLARDI.
     Sonuç: internet yokken uygulama açılıyor ama Firebase bile yüklenemiyor;
     PDF/Excel çıkarmak da mümkün olmuyordu. Çevrimdışı çalışma iddiası
     kısmen boştu.

     Bunlar sürüm numaralı, sabit adresler (örn. jspdf/2.5.1/...) — yani
     içerikleri hiç değişmez. Bu yüzden "önce önbellek" güvenli.
     API çağrıları (hava durumu, haber, kur, Firestore) BU LİSTEDE YOK:
     onların taze olması gerekiyor, önbelleğe alınmamalı. */
  const KUTUPHANE = /^https:\/\/(www\.gstatic\.com\/firebasejs|cdn\.sheetjs\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net\/npm\/tesseract|fonts\.googleapis\.com|fonts\.gstatic\.com)/;
  if (!ayniKok) {
    if (KUTUPHANE.test(istek.url)) {
      e.respondWith(
        caches.match(istek).then(c => c || fetch(istek).then(y => {
          /* Yalnızca başarılı yanıtları sakla; hatalı/kısmi yanıt önbelleğe
             girerse kütüphane kalıcı olarak bozuk kalır. */
          if (y && (y.ok || y.type === "opaque")) {
            const kopya = y.clone();
            caches.open(KASA).then(k => k.put(istek, kopya));
          }
          return y;
        }).catch(() => caches.match(istek)))
      );
    }
    return; /* Firebase/API istekleri SW'ye takılmasın */
  }

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
  /* UYGULAMA KODU (app.js, style.css, sabitler.js): önce AĞ, olmazsa önbellek.
     ─────────────────────────────────────────────────────────────────────
     Eskiden bunlar da "önce önbellek" ile sunuluyordu. Sonucu şuydu: sunucuya
     yeni sürüm yüklense bile telefondaki eski service worker eski app.js ve
     style.css'i vermeye devam ediyor, kullanıcı "hiçbir şey değişmemiş"
     görüyordu. Yeni kod ancak "Şimdi Yenile"ye basıldıktan sonra devreye
     giriyordu — basılmazsa hiç.
     Bu üç dosya uygulamanın kendisi; birkaç yüz milisaniyelik ağ gecikmesi,
     "güncelleme hiç gelmiyor" sorununa değmez. İnternet yoksa önbellek yedeği
     zaten devrede, yani çevrimdışı çalışma bozulmuyor. */
  const yol = new URL(istek.url).pathname;
  const uygulamaKodu = /\/(app|style|sabitler)\.(js|css)$/.test(yol);
  if (uygulamaKodu) {
    e.respondWith(
      fetch(istek).then(y => {
        const kopya = y.clone();
        caches.open(KASA).then(k => k.put(istek, kopya));
        return y;
      }).catch(() => caches.match(istek))
    );
    return;
  }

  /* Diğer aynı-kök dosyalar (fontlar, ikonlar, resim): önce önbellek —
     bunlar sürümle birlikte değişmediği için hızlı sunulmaları daha değerli. */
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

/* ═══════════════════════════════════════════════════════════════════
   🌙 AKŞAM HATIRLATMASI — uygulama KAPALIYKEN de çalışır
   ───────────────────────────────────────────────────────────────────
   Sorun: "Bugünü işlemedin" hatırlatması app.js içinde, ana ekran
   çizilirken tetikleniyordu. Yani yalnızca kullanıcı uygulamayı
   AÇTIĞINDA çalışıyordu — ama zaten açtıysa hatırlatmaya ihtiyacı yok.
   Özellik tam ihtiyaç duyulan anda (uygulama kapalıyken) sessizdi.

   Çözüm: Periodic Background Sync. Tarayıcı, uygulama kapalıyken bile
   belirli aralıklarla bu olayı tetikleyebiliyor. Destek her cihazda yok
   (Chrome/Android'de var, iOS'ta yok) — bu yüzden app.js içindeki
   mevcut kontrol de KALDIRILMADI, ikisi birlikte çalışıyor:
   destekleyen cihazda kapalıyken, desteklemeyende açılışta hatırlatır.

   Aynı gün iki kez bildirim gitmemesi için işaret paylaşılıyor
   (durt:YYYY-AA-GG anahtarı), ancak service worker localStorage'a
   erişemediği için burada Cache API üzerinden basit bir işaret tutuluyor. */
async function durtIsaretiVarMi(gun){
  try{
    const k = await caches.open("puantaj-durt");
    const y = await k.match("/durt/"+gun);
    return !!y;
  }catch(e){ return false; }
}
async function durtIsaretiKoy(gun){
  try{
    const k = await caches.open("puantaj-durt");
    await k.put("/durt/"+gun, new Response("1"));
    /* Eski işaretleri temizle: yalnızca son 3 günü tut, sonsuz birikmesin */
    const anahtarlar = await k.keys();
    if(anahtarlar.length > 3){
      anahtarlar.slice(0, anahtarlar.length-3).forEach(a=> k.delete(a));
    }
  }catch(e){}
}

self.addEventListener("periodicsync", e => {
  if (e.tag !== "aksam-hatirlatma") return;
  e.waitUntil((async ()=>{
    const simdi = new Date();
    /* Yalnızca akşam 19:00–23:00 arası. Gündüz tetiklenirse sessiz kal. */
    if (simdi.getHours() < 19 || simdi.getHours() > 22) return;
    const gun = simdi.getFullYear()+"-"+String(simdi.getMonth()+1).padStart(2,"0")+"-"+String(simdi.getDate()).padStart(2,"0");
    if (await durtIsaretiVarMi(gun)) return;
    /* Service worker kullanıcının o günü işleyip işlemediğini BİLEMEZ
       (Firestore'a erişimi yok). Bu yüzden mesaj emin bir dille değil,
       hatırlatma dilinde yazıldı — yanlışlıkla "işlemedin" demiyoruz. */
    await self.registration.showNotification("Puantaj hatırlatması 📅", {
      body: "Bugünü işledin mi usta? İki dokunuş, defter tamam 💪",
      tag: "aksam-durt",
      vibrate: [80, 40, 80],
      data: { yol: "./" }
    });
    await durtIsaretiKoy(gun);
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
