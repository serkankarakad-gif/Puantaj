# 👷 Puantaj Defterim

İnşaat işçileri için yevmiye + mesai + avans takip uygulaması.
Tek dosya (`index.html`), Firebase ile çalışır, GitHub Pages'te ücretsiz yayınlanır.
Herkes kendi hesabını açar, herkes **sadece kendi** puantajını görür.

## Özellikler
- 📅 Takvim üzerinden gün işaretleme: **Tam yevmiye / Yarım yevmiye / Gelmedim**
- ⏱️ Günlük **mesai saati** girişi (yarım saatlik adımlarla)
- 💵 **Avans / hakediş** para girişleri
- 🧮 Aylık otomatik hesap: toplam hakediş, alınan para, **kalan alacak**
- ⚙️ Ayarlardan yevmiye ücreti ve mesai saat ücreti belirleme
- 🍔 Hamburger menü, telefona (Android) uygun tasarım
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
   (Bu kural sayesinde herkes SADECE kendi verisini okuyup yazabilir.)

### 4) Config bilgilerini al
1. Sol üstteki ⚙️ → **Project settings**.
2. Aşağıda **"Your apps"** kısmında **Web** (</> simgesi) uygulaması ekle, isim ver.
3. Karşına çıkan `firebaseConfig = { ... }` bloğundaki değerleri kopyala.
4. `index.html` dosyasını aç, en üstte `BURAYA_API_KEY` yazan
   `firebaseConfig` kısmına kendi değerlerini yapıştır, kaydet.

### 5) GitHub Pages'te yayınla
1. GitHub'da yeni bir repo aç (örn. `puantaj`), **Public** olsun.
2. `index.html` dosyasını repoya yükle (Add file → Upload files).
3. Repo → **Settings → Pages** → Source: **Deploy from a branch**,
   Branch: `main` / `(root)` → Save.
4. 1-2 dakika sonra adresin hazır: `https://KULLANICIADIN.github.io/puantaj/`

### 6) Adresi Firebase'e tanıt (önemli!)
1. Firebase → **Authentication → Settings → Authorized domains**.
2. **Add domain** de ve `KULLANICIADIN.github.io` adresini ekle.
   (Eklemezsen sitede giriş yapılamaz.)

### 7) Telefona kısayol koy (Android)
Chrome'da siteyi aç → sağ üst ⋮ menü → **"Ana ekrana ekle"**.
Artık uygulama gibi ana ekrandan açılır.

---

## Arkadaşların nasıl kullanır?
Site adresini paylaş yeter. Herkes **"Yeni hesap"** sekmesinden kendi
e-postasıyla kayıt olur; herkesin puantajı, ödemeleri ve ayarları
birbirinden tamamen ayrıdır.

## Veriler nerede duruyor?
Senin Firebase projendeki Firestore'da:

```
kullanicilar/{kullaniciId}
  ├── yevmiye, mesaiUcret, santiye     (ayarlar)
  ├── girdiler/{2026-07-08}            (günlük puantaj)
  └── odemeler/{otomatikId}            (avans/ödemeler)
```

Firebase'in ücretsiz (Spark) planı bu iş için fazlasıyla yeterli.
