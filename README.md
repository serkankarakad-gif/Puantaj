## 0.1.5.6 — Tanı raporu onarımı
0.1.5.4 cihaz raporunda görülen `pinKasasiKaydi is not defined` kaynaklı tanı çökmesi yeni sürümde giderildi. Sonuç paneli artık yalnızca mevcut kullanıcının bu cihazdaki PIN özeti olup olmadığını bildirir; PIN doğrulama sistemi ve tüm finans kuralları aynı kaldı. Tarihi hata kayıtları silinmez. Gerçek Firebase kuralları ve mutabakat onayı uygulamanın dışındaki sunucuda ayrıca test edilmelidir. **20 dosya sınırı korunmuştur.**

## 0.1.5.5 — Veri Kalkanı
**Tanı / Test** bölümünde üç sekmeli Veri Kalkanı bulunur. JSON yedeğini geri yüklemeden analiz edebilir ve uygulamanın üretim öncesi kontrol listesini tutabilirsin. Teknik denetim raporu kimlik/ödeme verilerini içermez. Finansal kayıtlar üzerinde otomatik düzeltme yapılmaz.

**Sınırlar:** Fotoğraf/fiş/dekontlar JSON yedeğinde değildir. Sunucu okuma testinin başarılı olması tüm kayıtların senkronize olduğu anlamına gelmez. Güvenlik kurallarındaki geniş okuma izni mevcut sürümde devam eder, test edilmeden değiştirilmedi. FIFO hesaplama mantığı ve eşikler 0.1.4.1 ile aynı bırakılmıştır. Eski APK'yi silme veya verilerini temizleme.

## 0.1.5.4 Önemli
- Uygulama içi Tanı / test bölümünde “Uygulama Sağlık Kontrolü” vardır. Kayıt yazmaz, tanılama raporu JSON oluşturur.
- Tanı **sadece cihaz ve arayüz hazırlığını** doğrular; Firestore veri eşitlenmesi, PDF üretimi veya FIFO doğruluğu iddiasında bulunmaz.
- Kayıtlar silinmemeli; bu güncelleme önce ayrı bir test hesabında denenmelidir.
- Firebase kurallarındaki geniş okuma erişimi güvenlik riski oluşturur. Otomatik kural değişikliği yapılmadı.

## 0.1.5.3 — Takvim hücreleri okunurluk düzeltmesi (28.10.2026)

- Gün numarası üstte, kısa kazanç tutarı altta, iki ayrı satırda yer alır. Dar ekranlarda takvim hücreleri biraz daha uzun gösterilir.
- Tam/yarım/gelmedi renkleri ve tüm dokunma/kayıt işlemleri aynıdır.
- Mevcut `app.js`, `sabitler.js`, `firebase-config.js`, `firestore.rules`, PDF fontları ve kullanıcı veri yapısı **birebir korunmuştur**.
- Sürüm etiketleri HTML meta bilgisi ve SW önbelleğinde 0.1.5.3'tür; APK Builder Version Name ayrıca 0.1.5.3 olmalıdır.
- Orijinal uygulamayı silmeden, önce veri yedeği alıp test hesabında doğrulayın.

## 0.1.5.2 — Canlı Gold görünüm

Güncelleme ekranı daha yüksek kontrastlı altın, turuncu, koyu lacivert ve canlı yeşil tonlarıyla yenilendi. Standart Gold görünümünün ana kazanç kartında ve düğmelerinde renk netliği artırıldı.

**Güvenlik:** FIFO, avans, puantaj, maaş, PDF, PIN ve Firebase veri kuralları değiştirilmedi. Mevcut uygulamayı kaldırmayın veya verileri temizlemeyin. Gerçek Firebase testini tamamlamadan üretime geçmeyin.

HTML to APK Builder: **Version Name = 0.1.5.2**, **Version Code** önceki APK’dan yüksek olmalı; aynı paket kimliği ve imza anahtarı korunmalı.

---

## 0.1.5.1 güncellemesi

Sürüm etiketi: `index.html` içindeki `<meta name="application-version" ...>`.
Yeni sürüm üretirken `sw.js` içindeki `KASA` ve `SW_SURUM` ile bu metayı eşleştirin. Paketleme sırasında hepsini otomatik denetleyin.
Android uygulama sürümünü değiştirmek için HTML to APK Builder uygulamasında **Version Name = 0.1.5.1**, Version Code önceki APK'dan büyük olmalıdır.
Aynı paket kimliği ve imzalama anahtarıyla mevcut uygulama üstüne kurun; uygulama verilerini temizlemeyin.

**0.1.5.0 — Akıllı Çalışma Alanı:** Hızlı işlemler içinde sayfa favorileri (yalnızca cihazdaki sayfa isimleri), son ziyaret edilen dört menü, arama eş anlamlıları ve ana ekran favori kısayolları eklendi. Finansal hesaplamalar / FIFO / Firebase / PDF / PIN iş akışları değiştirilmedi. Paket yine 20 dosyadır. Canlı APK/Firebase üzerinde test etmeden üretime almayın. Mevcut cihaz depolamasını temizlemeyin.

**0.1.4.6 — Giriş/PIN sırası onarımı:** Önce hesap girişi veya mevcut oturumla devam etme, ardından zorunlu PIN oluşturma/doğrulama gelir. PIN doğrulanmadan veri dinleyicileri başlatılmaz. Firebase PIN kasası erişilemezse hesabın parolasıyla doğrulama sonrasında PIN yerelde oluşturulabilir; bulut eşitlemesi başarısızsa bu durum açıkça gösterilir. Firebase Firestore `pinKasasi/{uid}` izni canlı kurallarda bulunmalıdır. Önce test hesabında deneyin. Mevcut kayıtları/uygulama deposunu SİLMEYİN.

**0.1.4.5 — Gold Plus:** Korumalı, 20 dosyalık güncelleme. Ana ekranda salt-okunur Firebase hesap belgesi durum paneli, manuel sunucu sorgusu, bu cihazdaki son JSON yedek tarihi ve güncelleme ekranında yeni bilgiler bulunmaktadır. Sunucudan hesap belgesi okunması **tüm alt koleksiyonların eşitlendiği garantisi değildir**. Yedek JSON fotoğraf eklerini içermez. Var olan avans/FIFO, maaş, PDF, Firebase/PIN ve kullanıcı verisi şeması değiştirilmedi. Canlı ortama yüklemeden önce test hesabında doğrulayın.

**Sürüm 0.1.4.4 — 20 dosyalık korumalı güncelleme:** Yenilik ekranındaki metin ve görünüm güncellendi. Dört eski belge, içerikleri korunarak bu paketin mevcut README / CHANGELOG / CALISMA-PLANI dosyalarına taşındı. Program kodu, veri saklama, Firebase/PIN, FIFO, PDF, PWA çekirdeği ve PDF fontları korunmuştur. Canlı Firebase üzerinde test yapılmamıştır; yayın öncesinde yedek alıp test hesabıyla doğrulayın.

**Sürüm 0.1.4.3 notu:** Bu paket 0.1.4.2 üzerine yalnızca görsel/animasyon iyileştirmeleri ekler. Veri şemasını ve Firebase kurallarını değiştirmez. Ayrıntılar için `CHANGELOG.md (0.1.4.3 arşiv bölümü)` dosyasına bakın. Yayın öncesinde Firebase dışa aktarım/yedek alın ve önce test hesabında deneyin.

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

Ayrıca bkz: `CALISMA-PLANI.md (Kod Stili arşivi)` (kod standardı), `VERSIYONLAMA.md` (sürüm kuralı),
`CHANGELOG.md` (sürüm geçmişi), `GUVENLIK-KURULUM.md` (Firebase Console
güvenlik adımları), `README.md (Maliyet Raporu arşivi)` (Firestore okuma/yazma maliyeti).

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
detaylı hesaplama için `README.md (Maliyet Raporu arşivi)`'ye bak.



---

## DOSYA ARŞİVİ — MALIYET-RAPORU.md

# Firestore Maliyet Raporu (Temmuz 2026)

Gerçek kullanım verine (billing/analytics) erişimim yok, bu yüzden aşağıdaki
rakamlar kodun sorgu desenlerinden çıkardığım **teorik tahmin**. Gerçek
sayıları görmek istersen: Firebase konsolu → **Usage and billing** sekmesi.

## Ücretsiz kota (Spark plan)
- 50.000 okuma / gün
- 20.000 yazma / gün
- 20.000 silme / gün
- 1 GiB depolama

## Bulduğum ve düzelttiğim gerçek sorun: Liderlik tablosu

**Önce:** "Bu ayın çalışkanları" (liderlik tablosu) her açıldığında, kayıtlı
en fazla 25 kişinin HER BİRİNİN o ayki tüm günlerini tek tek okuyordu.
25 kişi × ~31 gün = **ekranı her açışta 775 okumaya kadar**, hem de hiç
önbelleğe alınmadan — 10 kişi günde 3 kez bu ekranı açsa 23.000 okuma demek,
tek başına günlük kotanın neredeyse yarısı.

**Şimdi:** Aynı ay için sonuç 5 dakika önbelleğe alınıyor. Aynı ekranı
5 dakika içinde tekrar açan kimse yeni bir sorgu tetiklemiyor.

## Diğer okuma kalemleri (mevcut haliyle, kodda inceledim)

| Kalem | Ne zaman çalışır | Yaklaşık maliyet |
|---|---|---|
| Ana ekran "Şirket hesap kartı" | Girişte 1 kez, gerçek-zamanlı dinler | Kullanıcının **baştan beri** girdiği gün+ödeme sayısı kadar okuma (1 kere), sonrası sadece değişen kayıt kadar |
| Aylık takvim (Puantaj ekranı) | Ay değiştirildikçe | O ayki gün+ödeme sayısı (≤~40) |
| Yıl özeti | Ekran açıldıkça | O yıldaki gün+ödeme sayısı (≤~400) |
| Herkes / kişi karşılaştırma | Kişi seçildikçe | O kişinin o ayki verisi (≤~40) |
| Arama | Yazdıkça | **0 ek okuma** — zaten yüklü veride arıyor |
| CSV/Yedek dışa aktarım | Kullanıcı istediğinde | Tüm geçmiş (kullanıcı bilerek istiyor, tek seferlik) |

## En büyük büyüme kalemi: "Şirket hesap kartı" (tüm zamanlar toplamı)

Bu, kullanıcının **hiç silmediği sürece büyüyen** tek kalem — 5 yıl kullanan
biri için ~1800-2000 belge (gün+ödeme) demek. Kötü haber değil aslında:
- Firestore'da gerçek-zamanlı dinleyici (onSnapshot) kullanıyoruz, yani bu
  N belge sadece **ilk açılışta bir kere** okunuyor; sonraki her değişiklik
  sadece değişen belge kadar okuma yapıyor (tekrar tekrar N okumuyor).
- 5 yıllık ağır bir kullanıcı bile günde birkaç kez açtığında birkaç bin
  okumayı geçmiyor — tek kullanıcı için ücretsiz kotanın çok altında.

**Ne zaman gerçek sorun olur:** Aynı şirketin Firebase projesinde **çok
sayıda işçi** (50-100+) varsa ve hepsi aynı gün uygulamayı açarsa, toplam
okuma sayısı kotaya yaklaşabilir. Bunun gerçek çözümü (kalıcı bir "toplam"
sayaç alanı tutup her yazışta onu güncellemek) **Cloud Functions** gerektirir
— bu proje şu an sunucu kodu içermiyor, ben de bunu canlı test edemeden
riske atmak istemedim (yanlış yaparsam sessizce yanlış bakiye gösterebilir,
bu bir maaş/hakediş uygulamasında affedilmez bir hata olur). Şu an gerçek
bir sorun olduğuna dair kanıt yok; olursa ayrı bir oturumda ele alalım.

## Composite Index

Kodundaki 20+ sorgunun tamamı tek alan üzerinde aralık sorgusu
(`tarih >= X, <= Y` ya da `documentId() >= X, <= Y`) veya tek `orderBy`.
**Composite index'e hiç ihtiyaç yok**, otomatik indeksler yeterli.

## Batch Write

Toplu gün işleme, ekip yoklaması kaydı, yedek geri yükleme — üçü de zaten
`db.batch()` kullanıyor, 450 işlemde bir yeni batch açıyor (Firestore'un
500 sınırının altında, güvenli). Ek bir şey yapmaya gerek yoktu.

## Transaction

Bu uygulamada "aynı anda iki yazma birbirinin üstüne yazsın" riski taşıyan
bir sayaç/increment deseni yok (her kayıt kendi tarihine ait bağımsız bir
belge, üstüne yazma zaten kullanıcının kendi bilinçli işlemi). Transaction
gerektiren bir nokta bulmadım.

## Arşiv sistemi / Veri yaşam döngüsü

**Bilerek önermiyorum.** Bu bir yevmiye/hakediş defteri — kullanıcılar
muhtemelen yıllarca geriye dönük kayıtlarını (ileride ihtilaf çıkarsa kanıt
olarak, ya da SGK/vergi amaçlı) saklamak ister. Otomatik silme (TTL) ya da
zorla arşivleme, birinin parasıyla ilgili kanıtını kaybetmesine yol açabilir
— bu, "performans kazancı" için göze alınacak bir risk değil. İstersen
**isteğe bağlı, kullanıcının kendi seçtiği** bir "eski yılları dışa aktar
ve iste​rsen sil" özelliği ekleyebilirim (zaten CSV/yedek indirme var, onun
üstüne "ve şimdi silmek ister misin?" sorusu eklemek kolay) — ama otomatik
hiçbir şeyi silmem.

## Yazma maliyetleri

Her gün kaydı 1 yazma, her ödeme 1 yazma — standart, düşürülecek bir şey
yok. Tek dikkat: "hızlı işaretleme" (takvimde bir güne dokunup tam/yarım/
gelmedi arası döndürme) her dokunuşta 1 yazma yapıyor — bu zaten kullanıcının
bilinçli her tıklaması karşılığı, azaltılabilecek bir "gereksiz" yazma değil.



## 0.1.4.7 APK yükseltme ve sürüm doğrulama
1. Bu ZIP paketini **tamamı çıkarılmış, aynı kök klasör yapısıyla** HTML to APK Builder içine yükle; eski proje içeriğini karıştırma.
2. APK Builder ayarlarında uygulama sürüm adını **0.1.4.7** yap ve **versionCode** değerini telefonda kurulu sürümünkinden daha büyük bir tam sayıya yükselt.
3. **Aynı Android paket kimliği (package ID) ve aynı imzalama anahtarı** ile mevcut uygulamanın üzerine güncelleme kur. Bunlar değişirse yerel kayıtlar taşınmaz.
4. Kesinlikle eski uygulamayı kaldırma; uygulama verisini/yerel depolamayı temizleme. Öncesinde mümkünse JSON veri yedeği al ve bulut eşitlemesini doğrula.
5. Giriş ve PIN ekranında `Uygulama sürümü: 0.1.4.7` yazmalı. Android sistem bilgilerindeki sürüm hâlâ 1.4.1 ise APK Builder sürüm adını değiştir.
6. Bulut/PIN erişimi ayrı bir sorundur; sürüm etiketinin düzelmesi Firebase bağlantısını onarmaz.


## 0.1.4.9 Pro — Hızlı İşlem ve Güvence Merkezi

- Uygulama giriş/PIN sonrasında üstteki arama simgesinden veya ana ekrandaki kısa yoldan açılır.
- Bölümlerde ara ve hazır gezinme seçenekleri mevcut ekranları açar, yeni hesaplama veya kayıt fonksiyonu çalıştırmaz.
- Güvence sekmesinde cihaz bağlantısı, hesap belgesi erişimi ve cihazdaki JSON yedek bilgisi **salt okunur** şekilde gösterilir; tüm kayıtların eşitlenmesini garanti etmez.
- Firebase Firestore kuralları ve avans/FIFO, maaş, PDF, PIN, veri yolu ile geri yükleme kodları değiştirilmemiştir.
- Uygulama veri deposunu silme; önce JSON yedek alıp test hesabında kurulum/oturum doğrula.
- HTML to APK Builder içinde Android Version Name ve Version Code ayrıca güncellenmelidir.
