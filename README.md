# 👷 Puantaj Defterim

İnşaat işçileri için yevmiye + mesai + avans + masraf + ekip + plan takip
uygulaması (PWA — telefona kurulabilir, çevrimdışı çalışır).
Firebase ile çalışır, GitHub Pages/Firebase Hosting/Cloudflare Pages gibi
statik barındırma servislerinde ücretsiz yayınlanır.

## Dosya yapısı
```
index.html            Arayüz (tüm ekranlar, HTML)
app.js                Uygulama mantığı (hesaplama, Firestore, çizim fonksiyonları)
sabitler.js           Değişmeyen veri: ay/gün adları, resmi tatiller, rozetler, TV kanalları, haber kaynakları
firebase-config.js    Firebase bağlantı bilgilerin + App Check anahtarı (SEN dolduracaksın)
style.css             Görsel stil, karanlık/açık tema + renkli vurgu temaları
sw.js                 Service worker — çevrimdışı önbellek, push bildirim
manifest.webmanifest  PWA meta verisi (ikon, isim, tema rengi)
worker.js             (opsiyonel) Cloudflare Worker — haber/video için köprü
firestore.rules       Firestore güvenlik kuralları (mutlaka Firebase konsoluna yapıştırılmalı)
```
Yükleme sırası önemli: `index.html`, script'leri şu sırayla yükler:
Firebase SDK'ları → `firebase-config.js` → `sabitler.js` → (body sonunda) `app.js`.

Ayrıca bkz: `KOD-STILI.md` (kod standardı), `VERSIYONLAMA.md` (sürüm kuralı),
`CHANGELOG.md` (sürüm geçmişi), `GUVENLIK-KURULUM.md` (Firebase Console
güvenlik adımları), `MALIYET-RAPORU.md` (Firestore okuma/yazma maliyeti).

## Özellikler (özet)
- 📅 Takvim üzerinden gün işaretleme (tam/yarım/gelmedi/izin/saatlik), mesai ve "gün içi artı"
- 🛐 Pazar/resmi-dini bayram zamlı ücret, 📦 parça başı (adet/kg/m²/sefer) ücretlendirme
- 💵 Avans/hakediş takibi, hangi ayın hesabına yazılacağını seçebildiğin ödeme kaydı
- 🧾 Masraf/fiş takibi, 💳 kredi kartı ve 🤝 borç defteri, 💰 kişisel cüzdan
- 👷 Ekip (yanında çalıştırdığın işçiler) yoklaması ve hakediş takibi
- 🌍 "Herkes" ekranı: aynı şirketteki diğer kullanıcıların puantajını karşılaştırma
- 📐 Planlarım: WhatsApp/Drive'dan gelen proje/plan dosyası linkleri
- 📄 Belge/sertifika süre takibi, ⚖️ yıllık fazla mesai sınırı uyarısı, 🏖️ SGK prim günü sayacı
- 📊 Yıl özeti, PDF/PNG/CSV rapor ve dışa aktarım, 🩺 bağlantı sağlık testi + hata günlüğü
- 📴 Çevrimdışı destek: internet gidince veriler cihazda tutulur, gelince eşitlenir

---

## KURULUM (bir kere yapılır, 10 dakika)

### 1) Firebase projesi aç
1. https://console.firebase.google.com adresine gir (Google hesabıyla).
2. **"Proje ekle"** de, bir isim ver (örn. `puantaj`), devam et. (Analytics kapatabilirsin.)

### 2) Giriş yöntemini aç
1. Sol menüden **Build → Authentication → Get started**.
2. **Email/Password** seç ve **etkinleştir**, kaydet.

### 3) Veritabanını aç
1. Sol menüden **Build → Firestore Database → Create database**.
2. Konum seç (örn. `eur3`), **production mode** ile başlat.
3. **Rules** sekmesine gel, oradaki her şeyi sil ve bu klasördeki
   `firestore.rules` dosyasının içeriğini yapıştır → **Publish** de.
   (Bu kural sayesinde herkes SADECE kendi verisini okuyup yazabilir —
   "Herkes" ekranı için gereken girdiler/ödemeler hariç.)

### 4) Config bilgilerini al
1. Sol üstteki ⚙️ → **Project settings**.
2. Aşağıda **"Your apps"** kısmında **Web** (</> simgesi) uygulaması ekle, isim ver.
3. Karşına çıkan `firebaseConfig = { ... }` bloğundaki değerleri kopyala.
4. **`firebase-config.js`** dosyasını aç (index.html değil!), `firebaseConfig`
   kısmına kendi değerlerini yapıştır, kaydet.

### 5) GitHub Pages'te yayınla
1. GitHub'da yeni bir repo aç (örn. `puantaj`), **Public** olsun.
2. Bu klasördeki TÜM dosyaları (`index.html`, `app.js`, `sabitler.js`,
   `firebase-config.js`, `style.css`, `sw.js`, `manifest.webmanifest`)
   repoya yükle (Add file → Upload files) — hepsi aynı klasörde (kök) olmalı.
3. Repo → **Settings → Pages** → Source: **Deploy from a branch**,
   Branch: `main` / `(root)` → Save.
4. 1-2 dakika sonra adresin hazır: `https://KULLANICIADIN.github.io/puantaj/`

### 6) Adresi Firebase'e tanıt (önemli!)
1. Firebase → **Authentication → Settings → Authorized domains**.
2. **Add domain** de ve `KULLANICIADIN.github.io` adresini ekle.
   (Eklemezsen sitede giriş yapılamaz.)

### 7) Telefona kısayol koy
Chrome'da (Android) veya Safari'de (iPhone) siteyi aç → menü →
**"Ana ekrana ekle"**. Artık uygulama gibi ana ekrandan açılır.

---

## Arkadaşların nasıl kullanır?
Site adresini paylaş yeter. Herkes **"Yeni hesap"** sekmesinden kendi
e-postasıyla kayıt olur; herkesin puantajı, ödemeleri ve kişisel verileri
(borç/cüzdan/kart/ekip/fiş) birbirinden tamamen ayrıdır. Sadece "Herkes"
ekranındaki gün/mesai verisi diğer kullanıcılara açık (karşılaştırma için).

## Veriler nerede duruyor?
Senin Firebase projendeki Firestore'da:

```
kullanicilar/{kullaniciId}
  ├── yevmiye, mesaiUcret, santiye, belgeler...   (ayarlar — ana belge)
  ├── girdiler/{2026-07-08}                        (günlük puantaj — herkese açık okuma)
  ├── odemeler/{otomatikId}                        (avans/ödemeler — herkese açık okuma)
  ├── borclar/, cuzdan/, kartlar/, masraflar/      (tamamen kişisel — sadece sahibi okur)
  ├── ekip/, ekipGun/                              (yönettiğin işçiler — tamamen kişisel)
  └── planlar/, fotolar/, dekontlar/, fisler/...   (tamamen kişisel)
```

Firebase'in ücretsiz (Spark) planı bu iş için fazlasıyla yeterli —
detaylı hesaplama için `MALIYET-RAPORU.md`'ye bak.

