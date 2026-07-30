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
