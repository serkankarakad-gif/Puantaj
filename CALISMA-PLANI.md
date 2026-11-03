# Çalışma Planı — Puantaj Defterim

> Bu bir sürüm değil. Nasıl çalışacağımızın ve sırada ne olduğunun planı.
> Tarihleri sen netleştir, ben ona göre ilerlerim.

---

## 1. NEDEN YÖNTEMİ DEĞİŞTİRİYORUZ

Şu ana kadar: her turda bir sürüm çıktı (0.0.1.7 → 0.0.3.2, **16 sürüm**).
Hızlıydı ama iki sorun üretti:

- **Sen test edemeden bir sonraki sürüm geliyor.** Gerçek cihazda ne kırıldığını
  anlamadan üstüne yenisi biniyor.
- **Onlarca kişi bu uygulamayı kullanıyor.** Her yayın canlı veriye dokunuyor.

Yeni yöntem: **haftalık döngü.** Hafta içi geliştirir ve incelettiririz,
hafta sonunda tek bir sürüm çıkar.

---

## 2. ⚠️ TEK DOSYA İLE TEST — ÖNEMLİ UYARI

Senin fikrin doğru: yayınlamadan önce tek dosyada inceleyelim. **Ama:**

Tek `test.html` de olsa, içindeki Firebase ayarı **aynı canlı veritabanına**
bağlanır. Yani o dosyada "günü işle" dersen, gerçek hesabına gerçek kayıt düşer.

**Ne için güvenli, ne için değil:**

| İnceleme türü | Tek dosya yeterli mi? |
|---|---|
| Yerleşim, renk, yazı boyutu, animasyon | ✅ Evet, tamamen güvenli |
| Düğmelerin yeri, kaydırma, menü akışı | ✅ Evet |
| Hesap mantığı (yevmiye, avans, FIFO) | ⚠️ Hayır — gerçek veriye yazar |
| Silme / yedekten geri yükleme | 🚫 Kesinlikle hayır |

**Çözüm seçenekleri (biri seçilmeli):**

1. **Ayrı test Firebase projesi** — en temizi. Ücretsiz. `firebase-config.js`'in
   test sürümü ayrı bir veritabanına bağlanır, canlı veriye hiç dokunmaz.
2. **Test hesabı** — aynı veritabanı ama ayrı bir e-posta ile giriş. Kendi
   verinden ayrı durur. Kurulumu 2 dakika.
3. **Sadece görsel inceleme** — hesap mantığına dokunan sürümlerde tek dosya
   kullanmayız, doğrudan sürüm çıkarırız.

> **Önerim: 2 numara (test hesabı).** Hemen kurulur, ayrı proje yönetmek gerekmez,
> canlı verin korunur.

---

## 3. HAFTALIK DÖNGÜ

| Gün | Ne olur |
|---|---|
| **Pazartesi** | Haftanın konusunu belirleriz. "Bu hafta X" — tek bir tema |
| **Salı–Cuma** | Ben çalışırım. Her adımda **tek dosya test build** veririm, sen bakarsın |
| **Cumartesi** | Sen gerçek cihazda denersin, hataları söylersin |
| **Pazar** | Düzeltmeler + **tek sürüm zip** çıkar, yayına gider |

**Kural: hafta içinde sürüm yok.** Sadece test dosyası.

---

## 4. BİRİKEN İŞ LİSTESİ

Bugüne kadar konuştuğumuz ama yapılmamış işler. Öncelik sırasına dizdim.

### 🔴 A — Güncelleme akışı (senin bugün söylediğin)
- [ ] Güncelleme geldiğinde kullanıcı uygulamayı kapatıp açmak zorunda kalmasın
- [ ] "Güncelle"ye bastıktan sonra girişte **tam ekran** yenilik penceresi açılsın
- [ ] Pencerede: eklenen özellikler, düzeltilen hatalar — kategorili, okunur
- [ ] Şu an "Neler yeni" bir kart; kaydırmazsan görmüyorsun

### 🔴 B — Eylem düğmelerinin yeri (senin bugün söylediğin)
- [ ] PDF / WhatsApp / paylaş düğmeleri ekranların **en altında**
- [ ] Kullanıcı aşağı kaydırmadan bulamıyor
- [ ] Üste alınacak ve **sabitlenecek** (kaydırınca kaybolmayacak)
- [ ] Hangi ekranlarda var, tek tek çıkarılacak

### 🟠 C — Köprü denetimi (senin bugün söylediğin)
- [ ] Ana ekrandaki kartlar → Puantaj ekranı bağlantıları
- [ ] Sayaçlar/özetler doğru güncelleniyor mu
- [ ] Bir ekranda yapılan değişiklik diğerlerine yansıyor mu
- [ ] Bu **sistematik bir test listesi** ister, göz kararı olmaz

### 🟠 D — KVKK ve yayın (0.0.3.0'da belgelendi, yapılmadı)
- [ ] "Hesabımı ve verilerimi sil" akışı — **yok, KVKK için gerekli**
- [ ] Firebase App Check → üretimde "Enforce" açılacak
- [ ] Google Cloud bütçe uyarısı
- [ ] Gizlilik politikası halka açık URL'de

### 🟡 E — Tasarım (yarım kalanlar)
- [ ] Giriş ekranı, yıl tablosu, grafik, ısı haritası — hiç elden geçmedi
- [ ] Ana ekran 3 istatistik kutusu (maket A'dan kalan kısım)

### 🟡 F — Performans (ölçülmedi)
- [ ] INP ölçümü (hedef ≤ 200 ms, 6× CPU kısıtlamayla)
- [ ] Uzun görevleri bölme (PDF, Excel, OCR)

---

## 5. İLK HAFTA ÖNERİM

**Konu: "Güncelleme ve erişim"** — yani A + B maddeleri.

Sebebi: ikisi de **her kullanıcıyı, her gün** etkiliyor. Tasarım ve performans
işleri sonra gelebilir, ama kullanıcı güncellemeyi göremiyorsa ve paylaş
düğmesini bulamıyorsa, geri kalan her şeyin değeri düşüyor.

**Sıra:**
1. Pazartesi — B'yi çıkaralım: hangi ekranlarda alt düğme var, listeleyeyim
2. Salı — sabit üst eylem çubuğu, tek ekranda dene
3. Çarşamba — diğer ekranlara yay, test dosyası ver
4. Perşembe — A: tam ekran güncelleme penceresi
5. Cuma — C: köprü denetim listesi çıkar, test et
6. Cumartesi — sen gerçek cihazda dene
7. Pazar — düzelt, **tek sürüm** çıkar

---

## 6. SENDEN İSTEDİKLERİM

1. **Test hesabı kuralım mı?** (bölüm 2, seçenek 2) — evet dersen anlatırım
2. **Tarihleri netleştir** — hangi pazartesi başlıyoruz
3. **İlk hafta konusu A+B mi**, yoksa başka bir şey mi öncelikli?
4. Gerçek cihazda **şu an ne bozuk görünüyor** — 0.0.3.2'yi kurup bakarsan,
   plana onları da eklerim


---

## DOSYA ARŞİVİ — KOD-STILI.md

# Kod Formatı ve Stil Standardı

Bu, mevcut kodda zaten uygulanan (ve yeni eklenen her şeyin de uyması
gereken) kuralların bir dökümü — resmi bir "lint config kur" adımı değil,
çünkü bu proje şu an npm/Node içermiyor (bkz. aşağıdaki "Neden ESLint kurulu
değil" bölümü).

## İsimlendirme
- **Türkçe, okunaklı isimler**: `girdiKazanc`, `ayarlar`, `kokRef` — İngilizce
  kısaltma/jargon yerine (`calcEarnings` değil, `girdiKazanc`).
- Fonksiyon isimleri fiil/eylem bildirir: `...Yukle`, `...Ciz`, `...Kaydet`, `...Ekle`, `...Sil`.
- Firestore koleksiyon adları küçük harf, Türkçe çoğul: `girdiler`, `odemeler`, `borclar`.
- Boolean değişkenler soru bildirir hissi verir: `gizliMod`, `ayKilitli(id)` (fonksiyon), `acikMi`.

## Girinti ve boşluk
- 2 boşluk girinti (tab değil).
- Tek satırlık `if(kosul) tekSatir();` yaygın kullanılıyor (kısa/basit kontrollerde).
- Nesne/dizi literalleri okunaklılık için hizalanabilir (bkz. `sabitler.js`teki ROZETLER).

## Fonksiyon uzunluğu
Bazı fonksiyonlar (örn. `anaYukle`, `girdiKazanc` çevresi) uzun — bunun
kısaltılması **bilerek yapılmadı**: bu boyutta bir dosyada, canlı test
imkanı olmadan büyük fonksiyonları parçalamak (özellikle finansal hesaplama
zincirlerinde) hata riski taşıyor. Yeni kod yazarken tek-sorumluluk
prensibini izle (bir fonksiyon bir iş yapsın) ama var olan büyük
fonksiyonları "temizlik için" bölmeye kalkma — sadece gerçek bir hata
düzeltirken ya da özellik eklerken doğal olarak küçük parçalara ayır.

## Hata yönetimi
- Firestore/async işlemler her zaman `try/catch` içinde, hata `hataGoster(e, "bağlam-adı")`'a gider.
- Çizim (render) fonksiyonları `guvenli("isim", fn)` ile sarmalanır — biri patlarsa diğerleri etkilenmez.
- Kullanıcıya gösterilen her hata Türkçe ve anlaşılır olmalı (`hataCeviriGenel()`'e yeni kod eklenebilir).

## Güvenlik (kesinlikle uyulmalı)
- DOM'a yazılan HER kullanıcı verisi `esc()` ile kaçışlanır — innerHTML'e
  doğrudan bir `.ad`, `.not`, `.aciklama` gibi alan asla çıplak eklenmez.
- Yeni bir `window.open(link)` eklenirse `linkGuvenliMi(link)` ile önce kontrol edilir.

## Dosya organizasyonu
- `sabitler.js` — değişmeyen veri (ay adları, tatiller, rozetler, TV kanalları, haber kaynakları)
- `firebase-config.js` — Firebase bağlantı bilgileri + App Check anahtarı
- `app.js` — tüm uygulama mantığı (büyük, ama işlevsel bölümlere yorum satırlarıyla ayrılmış: `/* ---------- X ---------- */`)
- `style.css` — tüm görsel stil, CSS custom properties (`--sari`, `--metin` vb.) ile tema değişimi

## Neden ESLint/Prettier kurulu değil
Bu proje şu an **npm/Node/build adımı olmayan**, düz dosyalarla çalışan bir
proje — "dosyayı aç, düzenle, tarayıcıda yenile" iş akışı. ESLint/Prettier
kurmak `package.json` + `node_modules` demek, yani projeye bir Node bağımlılığı
eklemek demek. Bu, mevcut basit iş akışını değiştirir. İstersen ayrı bir
oturumda bunu kurabiliriz, ama bu **senin onayınla** yapılacak bir mimari
karar — kimseye danışmadan sessizce eklemedim.

