# Puantaj Defterim — 0.1.5.4 kapsamlı denetim raporu

**İncelenen sürümler:** Kullanıcının 0.1.4.1 orijinal ZIP'i ile son 0.1.5.3 ZIP'i; geliştirilen yeni 0.1.5.4 ZIP'i. **İnceleme tarihi:** 28 Ekim 2026.

## Sonuç özeti

- **20 dosya / ZIP testi:** Başarılı. Yeni ZIP açıldı, 20 dosya doğrulandı, ZIP CRC/bütünlük testi geçti.
- **JavaScript kontrolü:** `app.js` ve `sw.js` için Node.js sözdizimi kontrolü geçti.
- **HTML bağları:** Son kaynakta 660 DOM kimliği, 184 ID'li buton, 22 ana bölüm belirlendi. Kimlik tekrarı ve kopuk HTML etiket hedefi bulunmadı. Kodda iki eski `#` referansı yorum satırında bulunuyor (`ayar-kumbara`, `cuzdan-tarih`); aktif hata sayılmadı.
- **Profil düzenleme:** Kodda buton ID'sine özel olay bağlayıcısı yok; ancak buton `data-goruntu="ayarlar"` üzerinden **genel menü işleyicisiyle bağlıdır**. Bu nedenle bozuk olduğuna dair kanıt yoktur.
- **FIFO:** 0.1.4.1 karşısında 11 kritik fonksiyon *metin bazında birebir aynı*. Bunlar `odemeAyi`, `enEskiOdenmemisAy`, `odemeAitAySecDoldur`, `odemeTarihiAyaGoreAyarla`, `tumOdemeleriGetir`, `tumDonemOzeti`, `girdiKazanc`, `hesaplaAralik`, `alinanDokum`, `donemOdemeSec`, `maaslarListCiz`. 50 TL eşiği dahil mevcut davranış aynen kaldı.
- **Kaynak sabitliği:** `sabitler.js`, `firebase-config.js`, iki PDF font dosyası, `worker.js` ve PWA manifesti 0.1.4.1 ile birebir aynı. Firebase kural dosyası eski sürümden farklı (PIN kasası istisnası eklendi) ancak 0.1.5.3 ile 0.1.5.4 arasında değiştirilmedi.
- **Yeni fonksiyon:** 24 ayrı cihaz/arayüz sağlık kontrolü, JSON tanı raporu indirme; kullanıcı hesaplamalarını veya Firestore belgelerini değiştirmez.
- **Başlatma onarımı:** Gerekli Firebase SDK'sı yüklenmezse boş ekran yerine bağlantı hatası ve tekrar dene düğmesi. PIN kilidi atlanmaz; kayıtları sıfırlama komutu yoktur.
- **Mobil deneme:** 320, 360, 393, 430 pikselde, **SDK yüklemenin engellendiği kontrollü tarayıcı ortamında** güvenli hata ekranı ve 24 tanı kontrolünün çalışması doğrulandı; yatay taşma ve JavaScript sayfa hatası görülmedi.

## Güvenlik açısından yüksek öncelikli bulgular

1. **Firestore alt koleksiyonları:** Paket `firestore.rules` içindeki `match /{altKoleksiyon=**}` için `allow read: if request.auth != null` kullanıyor. Yani giriş yapan bir kullanıcı, belge yolunu bildiği/öğrenebildiği durumda başka kullanıcıların ödeme, borç, fotoğraf veya diğer alt kayıtlarını okuyabilir. Bu kullanıcı gizliliği için ciddi risktir. **Düzeltilmedi**, çünkü canlı uygulamanın "Herkes" ekranı ve mutabakat akışının test edilmeden kırılması riski var. Yeni erişim politikası test hesabıyla, gerçek Firestore'da doğrulanmalı.
2. **Firebase SDK/CDN ve APK WebView:** SDK indirme hatasında giriş çalışmayabilir. Yeni sürüm bunu açıklayan güvenli uyarı gösterir. **Çevrimdışı ilk kurulum** ve APK internet izinleri gerçek cihazda ayrıca test edilmelidir.
3. **PIN ilk kayıt/eşitleme:** Gerçek Firebase `pinKasasi` izinleri uygulanmış mı doğrulanamadı. Yerel PIN ile bulut PIN arasında olası çakışmalar gerçek hesapla sınanmadı; kayıt temizleme önerilmez.
4. **Yedek kapsamı:** JSON yedeğin fotoğraf/dekont dosyalarını kapsamadığı belgelerde açıkça belirtiliyor. Sadece JSON yedeğiyle tüm veriyi geri yükleme garantisi yok.
5. **Tanı ekranında yanlış güven:** Önceki tanı aracındaki “tüm kayıtların Firestore'da”, “fonksiyonların hepsi çalışır” ve “çevrimdışı kayıt aktif” gibi doğrulama yapılmadan kullanılan ifadeler sınırlandırıldı; cihaz göstergesi sunucuya yazma kanıtı sayılmıyor.
6. **Tutar onarımı riski:** Mevcut `btn-onarim` işlevi, 100 TL altındaki bazı tutarları kullanıcı onayından sonra 1000 ile çarpma yoluyla değiştirebiliyor. Gerçekte küçük tutarlar varsa bu işlem zarar verebilir. **Mali kayıt işleyicisi kullanıcının açık FIFO koruma talebi nedeniyle değiştirilmedi;** gerçek veri üzerinde bu onarım düğmesine özellikle dikkat edilmeli.

## Doğrulanamadığı için "çalışıyor" denmeyen alanlar

Canlı Firebase sunucusu üzerinde PIN kurma/doğrulama, çok kullanıcılı yetki, uygulamanın bütün veri koleksiyonları, tam çevrimdışı kayıt/senkronizasyon, PDF belgesi üretip WhatsApp üzerinden paylaşma, Excel ve OCR işlemleri, geolocation, cihaz push bildirimleri, Android APK WebView özellikleri ve gerçek para verisiyle FIFO uçtan uca testleri bu ortamda tamamlanmadı.

## Güvenli yayın kontrolü

Önce gerçek veri dışa aktarımını ve fotoğraf/dekont korumasını doğrula. Sonra ayrı test hesabında giriş → PIN → kayıt → kapat/aç → bulut eşitleme → rapor/PDF → FIFO senaryolarını dene. 20 dosya sınırı korunsun, mevcut APK silinmesin ve depolama alanı temizlenmesin. APK Builder'da Version Name `0.1.5.4`, Version Code eskisinden yüksek olmalı; aynı paket adı/imza kullanılmalı.

**Sonuç:** Kod ve statik UI tutarlılığı açısından önceki sürümden daha güvenilir; gerçek cihaz ve canlı Firebase testi olmadan "sıfır hata" ya da "tüm modüller çalışıyor" garantisi verilemez.

---

## 0.1.5.4 — Yayın öncesi bloklayıcılar
- [ ] Canlı olmayan test hesabıyla hesap girişi → PIN → puantaj akışını gerçek APK'da doğrula.
- [ ] Ekran erişimi, gün kaydı, avans/FIFO ve PDF tutarlarının 0.1.4.1 ile birebir eşleştiğini kaydederek sınama yap.
- [ ] Firebase Security Rules: giriş yapmış tüm kullanıcıların diğerlerinin alt koleksiyonlarını okuyabildiği izinleri gözden geçir; değişiklikten önce “Herkes” sayfası ve mutabakatı test et.
- [ ] Var olan kullanıcıların fotoğrafları JSON yedek dosyasında olmadığı için ayrıca yedek sürecini doğrula.
- [ ] APK Builder: Version Name 0.1.5.4, Version Code > eski, aynı package name ve imza.
- [ ] Eski APK'yi silme / veri deposunu temizleme.
- [ ] Gerçek APK içindeki çevrimdışı Firebase SDK, Web Crypto, PDF font ve dosya paylaşımını test et.

# Üretim / Yayın Kontrol Listesi

Araştırma bulgularına göre hazırlandı. **[✅] = 0.0.3.0'da kodda yapıldı**,
**[ ] = senin yapman gereken** (konsol ayarı, dosya yükleme, hukuki metin).

---

## A. PWA KURULABİLİRLİK

- [✅] HTTPS üzerinden sunum (Firebase Hosting zaten sağlıyor)
- [✅] `fetch` olayı işleyen service worker
- [✅] Manifest: `name`, `short_name`, `start_url`, `scope`, `display:standalone`
- [✅] 192×192 ve 512×512 PNG ikon + **maskable** 512×512
- [✅] `id` alanı eklendi (güncellemelerde uygulama kimliği kaymasın diye)
- [✅] `categories`, `dir`, `display_override`, `lang:"tr"`
- [✅] `shortcuts` (ikona uzun basınca hızlı görevler)
- [ ] **`screenshots` ekle** — kurulum penceresini ve Play Store girişini
      zenginleştirir. Gerçek ekran görüntüsü dosyası gerektiği için kodla
      üretemedim. Gereksinimler:
      - Genişlik/yükseklik 320–3840 px arası
      - En büyük boyut, en küçüğün 2.3 katından fazla olamaz
      - Hepsi aynı en-boy oranında olmalı
      - `"form_factor": "narrow"` (telefon) ve istersen `"wide"` (tablet)
      - Örnek ekleme:
        ```json
        "screenshots": [
          { "src": "ss-ana.png", "sizes": "1080x1920", "type": "image/png", "form_factor": "narrow" },
          { "src": "ss-takvim.png", "sizes": "1080x1920", "type": "image/png", "form_factor": "narrow" }
        ]
        ```

> ℹ️ **Not:** "Lighthouse PWA skoru" artık YOK. Chrome 126 / Lighthouse v12 ile
> PWA kategorisi kaldırıldı, PageSpeed Insights'tan da 20 Ekim 2025'te çıkarıldı.
> Kurulabilirliği **DevTools → Application → Manifest** panelinden ve gerçek
> cihazda kurarak doğrula.

---

## B. SERVICE WORKER

- [✅] Sürümlü önbellek (`KASA` sabiti), `activate`'te eski sürümler siliniyor
- [✅] Navigasyon (HTML) için **network-first** — cache-first değil
- [✅] Statik varlıklar için cache-first
- [✅] Firebase istekleri SW'ye takılmıyor (kendi çevrimdışı katmanı var)
- [✅] **`skipWaiting()` otomatik çağrılmıyor** → kullanıcı form doldururken
      sayfa kendi kendine yenilenip veri kaybetmiyor. Kullanıcı "Yenile"ye
      basınca `SKIP_WAITING` mesajı gönderiliyor.
- [ ] İstersen **Navigation Preload** eklenebilir (`navigationPreload.enable()`)
      — SW uyanma gecikmesini gizler, ilk boyamayı hızlandırır. Şu an yok,
      kritik değil.

---

## C. FIREBASE / FIRESTORE

- [✅] Firestore güvenlik kuralları mevcut (`firestore.rules`)
- [✅] Dinleyiciler çıkışta ve hesap değişiminde kapatılıyor
- [✅] **Arka planda 2 dk sonra ağır dinleyiciler kapatılıyor** (0.0.3.0)
      → 30 dakikadan uzun kopan dinleyicinin yeniden bağlanınca TÜM
      dökümanları yeniden faturalaması tuzağına karşı
- [ ] **App Check'i üretimde ENFORCE et** (şu an sadece kayıtlı olabilir):
      1. Firebase Console → App Check → Apps → uygulamayı seç
      2. reCAPTCHA v3 site key gir
      3. Firestore ve Authentication için **Enforce**'u aç
      4. Etkin olması ~10 dk sürebilir
      5. Enforce ÖNCESİ metrikleri izle (Verified / Unknown oranı)
      - ⚠️ `localhost`'u reCAPTCHA izinli domainlere **EKLEME** —
        onun yerine debug token kullan, token'ı asla repoya koyma
- [ ] **Bütçe uyarısı kur**: Google Cloud Console → Billing → Budgets & alerts.
      ⚠️ Uyarı harcamayı **durdurmaz**, sadece haber verir.
- [ ] Ücretsiz (Spark) kotalarını bil: **50.000 okuma/gün, 20.000 yazma/gün,
      20.000 silme/gün, 1 GiB depolama, 10 GiB/ay çıkış** (Pasifik gece yarısı
      sıfırlanır). Blaze planında **harcama tavanı yoktur**.
- [ ] Bileşik indeksleri **yayından önce** oluştur (indeks hataları genelde
      üretimde keşfedilir). Kullanılmayan indeksleri sil.
- [ ] Güvenlik kurallarına **alan düzeyi doğrulama** ekle (zorunlu alanlar,
      tip kontrolü). Kurallar tek sunucu-taraflı doğrulama katmanın.

---

## D. PERFORMANS (düşük donanımlı Android)

- [✅] PDF fontları tembel yükleniyor (açılışta 1,05 MB tasarruf)
- [✅] Hafif mod (otomatik algılama + elle ayar)
- [✅] `content-visibility:auto` uzun listelerde (0.0.3.0)
- [ ] **INP ölçümü yap**: Chrome DevTools → Performance → CPU 6× throttle.
      Hedef: 75. yüzdelik dilimde **≤ 200 ms** (Core Web Vital eşiği).
- [ ] Uzun görevleri böl (>50 ms): PDF üretimi, Excel dışa aktarım, OCR.
      `await new Promise(r=>setTimeout(r))` ile parçala.
- [ ] `innerHTML` ile tam liste yeniden çizimini azalt → `DocumentFragment`
      veya sanal liste (uzun puantaj/ödeme geçmişlerinde).

---

## E. MOBİL FORM VE ERİŞİLEBİLİRLİK

- [✅] **iOS 16px kuralı** — girdi alanları dokunmatik cihazda 16px
      (altındaysa Safari her odakta yakınlaştırıp geri döndürmüyordu)
- [✅] `inputmode` yaygın kullanılıyor (44 yerde)
- [✅] Dokunma hedefleri ≥44px (tek istisna tema düğmeleri düzeltildi)
- [✅] `:focus-visible` odak halkası
- [✅] **Türkçe harf dönüşümü** — 17 yerde düzeltildi (aşağıda ayrıntı)
- [ ] `enterkeyhint` daha fazla forma eklenebilir (şu an 1 yerde) —
      form akışında `"next"`, son alanda `"done"`
- [ ] Kontrast denetimi: güneş altında okunabilirlik için **AAA (7:1)** hedefle

---

## F. GOOGLE PLAY STORE'A YAYINLAMA (TWA)

### Adımlar
```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://[ALANADIN]/manifest.webmanifest
bubblewrap build          # → .aab dosyası üretir
```

### Digital Asset Links (URL çubuğunu kaldırmak için ŞART)
`https://[ALANADIN]/.well-known/assetlinks.json` dosyası:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.[SENIN].puantajdefterim",
    "sha256_cert_fingerprints": ["<<SHA-256 PARMAK İZİ>>"]
  }
}]
```

> 🚨 **EN SIK YAPILAN HATA:** Play App Signing kullanıyorsan Google uygulamayı
> **kendi anahtarıyla yeniden imzalar.** Buraya **Play Console → Setup →
> App signing** altındaki SHA-256'yı koymalısın, yerel keystore'unkini DEĞİL.
> Yanlış parmak izi = doğrulama başarısız = uygulama Chrome adres çubuğuyla açılır.
> Parmak izini almak için: `bubblewrap fingerprint`

### Sık ret sebepleri
1. **Minimum Functionality / Webview politikası** — Google, "sadece bir web
   sitesini webview'da gösteren" uygulamaları reddediyor.
   ✅ **Senin avantajın:** çevrimdışı çalışıyor, PIN kilidi var, PDF/Excel
   üretiyor, kamera/OCR kullanıyor. Bunları store açıklamasında vurgula.
2. **Digital Asset Links / SHA-256 uyuşmazlığı** (yukarıdaki hata)
3. **12 test kullanıcısı / 14 gün kuralı** — 13 Kasım 2023'ten sonra açılan
   **bireysel** hesaplar için: en az 12 test kullanıcısıyla, kesintisiz
   **14 gün** kapalı test yapmadan üretime çıkılamıyor.
   (Başta 20 kişiydi, 11 Aralık 2024'te 12'ye indirildi.)
   → Yayın planına **~17-21 gün** ekle.
4. Gizlilik Politikası URL'si eksikliği (bkz. `KVKK-VE-GIZLILIK.md`)

---

## G. KVKK

Ayrı dosyaya bakınız: **`KVKK-VE-GIZLILIK.md`**

Özet zorunlular:
- [ ] Aydınlatma metni (her durumda zorunlu, açık rızadan AYRI)
- [ ] Gizlilik Politikası halka açık URL'de (Play Store için zorunlu)
- [ ] "Hesabımı ve verilerimi sil" akışı (şu an yok)
- [ ] Saklama/imha politikası (periyodik imha ≤ 6 ay)
- [ ] Veri ihlali planı (72 saat bildirim)
- [ ] Yurt dışı aktarım (Firebase) aydınlatması

---

## EK: 0.0.3.0'DA DÜZELTİLEN TÜRKÇE HARF HATASI

JavaScript'in `toUpperCase()`/`toLowerCase()` fonksiyonları İngilizce kuralı
uygular. Türkçede iki somut hata üretiyordu:

| Girdi | Eski (hatalı) | Yeni (doğru) |
|---|---|---|
| `"Haziran"` | `HAZIRAN` | `HAZİRAN` |
| `"Nisan"` | `NISAN` | `NİSAN` |
| `"İbrahim"` | `i̇brahim` (gizli birleşik nokta) | `ibrahim` |

**Etkisi:** PDF ve PNG raporlarındaki ay başlıkları yanlış yazılıyordu.
Daha sinsisi: "İbrahim" adlı işçiyi **"ibrahim" yazarak arayınca bulunamıyordu**,
çünkü küçültülmüş hâlde görünmeyen fazladan bir karakter oluşuyordu.

17 yerde `trBuyuk()` / `trKucuk()` yardımcılarıyla düzeltildi
(kayıt arama, ödeme arama, kişi arama, not arama, ekip listesi, PIN avatarı,
PDF/PNG rapor başlıkları).


## 0.1.4.7 sürüm kontrolü — yayın öncesi
- [ ] ZIP dosyalarının sayısı 20; tüm mevcut çalışma dosyaları yerinde.
- [ ] app.js `YENILIK_SURUM` = 0.1.4.7; sw.js `KASA` = `puantaj-0.1.4.7`.
- [ ] Giriş, PIN, açılış, çekmece ve Ayarlar içinde sürüm 0.1.4.7 görünür.
- [ ] Android Builder Version Name = 0.1.4.7 ve Version Code > eski kurulu APK değeri.
- [ ] Android Paket Kimliği ve imzalama anahtarı aynı; **silmeden üzerine yükleme** planlandı.
- [ ] Üretim verilerini değiştirmeden ayrı test hesaplarında giriş/PIN/Firebase kontrolü yapıldı.
