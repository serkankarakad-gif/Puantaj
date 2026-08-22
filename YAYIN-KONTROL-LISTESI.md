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
