# Güvenlik sıkılaştırması — yayına çıkmadan önce yapman gerekenler

Bu sürümde kodda düzelttiklerimin yanında, **Firebase konsolunda senin elinle**
yapman gereken 2 adım var. İkisi de 5 dakikanı alır.

## 1) Yeni firestore.rules'u yayınla (ZORUNLU, kritik)

Eskiden herkes birbirinin **her şeyini** (borcunu, cüzdanını, kredi kartını,
fişlerini) okuyabiliyordu. Artık sadece "girdiler" ve "odemeler" (Herkes
ekranı için gereken) herkese açık, geri kalan her şey sadece sahibine özel.

**Adımlar:**
1. https://console.firebase.google.com → projenin → sol menü **Firestore Database**
2. Üstteki sekmelerden **Rules**'a tıkla
3. Oradaki metnin TAMAMINI sil
4. Bu klasördeki **firestore.rules** dosyasının içeriğini olduğu gibi yapıştır
5. Sağ üstten **Publish** (Yayınla) düğmesine bas

⚠️ Yayınlamadan önce sağ üstteki **Rules Playground** (oynatma alanı) ile
birkaç senaryo dene: kendi hesabınla okuma/yazma (izin vermeli), başka bir
UID ile "borclar" okumaya çalışma (reddetmeli). Yanlış giden bir şey olursa
düzeltmeden yayınlama.

## 2) Firebase App Check ekle (ÖNERİLİR, zorunlu değil)

Bu, botların/sahte kayıtların Firestore'una saldırmasını zorlaştıran ek bir
katman. Eklemesen de uygulama çalışmaya devam eder (kodda "anahtar boşsa
atla" diye ayarladım), ama eklersen daha güvenli olur.

**Adımlar:**
1. Firebase konsolu → sol menüden **App Check**
2. **Web app**'ini seç → **reCAPTCHA v3** sağlayıcısını seç → kayıt ol
3. Sana bir **site key** (uzun bir kod) verecek, onu kopyala
4. **index.html** dosyasını aç, şu satırı bul:
   ```js
   const RECAPTCHA_SITE_KEY = "BURAYA-RECAPTCHA-V3-SITE-KEY-YAPISTIR";
   ```
   Tırnakların arasına yapıştır.
5. Firebase konsolu → App Check → **Firestore** satırının yanında önce
   **Monitor** (izle) modunu seç, 1 gün bekle, App Check sekmesindeki
   grafikte gerçek kullanıcı isteklerinin reddedilmediğini gör.
6. Sorun yoksa **Enforce** (zorunlu kıl) yap. Enforce'u monitor'den önce
   yaparsan gerçek kullanıcılar da (App Check henüz doğrulanmadıysa)
   engellenebilir, o yüzden sırayla ilerle.

## 3) Content-Security-Policy (CSP) eklendi — TEST ETMEDEN GÜVENME

index.html'e artık sıkı bir CSP eklendi. Bu, kodun XSS ile başka bir siteye
veri göndermesini/script çalıştırmasını zorlaştırıyor. **AMA** ben bunu canlı
tarayıcıda çalıştırıp test edemiyorum — sadece kodu okuyup hangi adreslere
gittiğini tek tek çıkardım. **Yayınladıktan hemen sonra şunu yap:**

1. Uygulamayı telefon/bilgisayarda aç, **F12 → Console** (bilgisayarda) sekmesini aç
2. Uygulamada gezin: giriş yap, bir gün işle, haberlere bak, TV'yi aç, hava durumuna bak
3. Konsolda kırmızı **"Refused to connect/load..."** gibi bir CSP hatası görürsen,
   hatada geçen adresi index.html'deki `Content-Security-Policy` satırındaki
   `connect-src` (veya `img-src`/`script-src`) listesine ekle
4. Özellikle **kendi Cloudflare köprü adresini** (KOPRU-KURULUM.md'de kurduysan)
   `connect-src` listesine eklemen gerekebilir — ben senin adresini bilmiyorum,
   `https://*.workers.dev` genel deseni ekledim ama özel bir alan adı
   (custom domain) kullanıyorsan onu da elle eklemelisin.
5. İleride app.js'e yeni bir haber/video kaynağı (yeni bir "yedek sunucu")
   eklersen, CSP'deki `connect-src` listesine de eklemen lazım — yoksa o
   özellik CSP tarafından sessizce engellenir.

## 4) HTTPS, X-Frame-Options, Permissions-Policy — barındırma ayarı

Bunlar HTTP **başlığı (header)** ile ayarlanır, HTML dosyasına gömülemez
(CSP'nin aksine). Nereye yayınladığına göre değişir:

- **Firebase Hosting kullanıyorsan:** proje köküne bir `firebase.json` dosyası
  ekleyip `"headers"` bölümüne şunları yazabilirsin (Firebase dokümantasyonunda
  "Hosting → headers" ara). HTTPS zaten Firebase Hosting'de otomatik zorunlu.
- **Cloudflare Pages / Netlify kullanıyorsan:** bir `_headers` dosyası ekleyip
  içine `X-Frame-Options: DENY` ve `Permissions-Policy: geolocation=(self), camera=(), microphone=()`
  gibi satırlar yazabilirsin. HTTPS otomatik.
- **GitHub Pages kullanıyorsan:** ⚠️ özel header eklemeye izin vermiyor.
  HTTPS otomatik zorunlu (iyi haber), ama X-Frame-Options/Permissions-Policy
  gibi başlıkları koyamazsın. Bunu istiyorsan Cloudflare Pages'e geçmen gerekir.

Bana hangi platforma yayınladığını söylersen, o platforma özel dosyayı
(`firebase.json` ya da `_headers`) hazırlarım.

## 5) Giriş denemesi sınırı ve güvenlik logları — zaten Firebase'de var

- **Giriş denemesi sınırlama:** Firebase Authentication, aynı hesaba art arda
  yanlış şifre girilmesini kendi tarafında zaten sınırlıyor/geciktiriyor
  (Google'ın kendi altyapı seviyesi koruması). Ek bir şey yapmana gerek yok.
- **Güvenlik logları:** Firebase konsolu → **Authentication → Users** sekmesinde
  son giriş zamanlarını görebilirsin. Daha detaylı erişim logları (kim hangi
  belgeyi ne zaman okudu) istiyorsan, Google Cloud Console → **Audit Logs**
  bölümünden Firestore için "Data Access" loglarını açman gerekir — bu Blaze
  (ücretli) plana geçiş ve GCP tarafında ayrı bir ayar ister, kodla yapılmaz.


- **Rate limit / DDoS:** Firebase, App Check + Cloud Firestore'un kendi
  altyapı seviyesinde abuse koruması var. Gerçek "X istek/dakika" sınırı
  istiyorsan bu, sunucu tarafı kod (Cloud Functions) gerektirir — şu an bu
  proje sadece istemci + Firestore, sunucu kodu yok. İstersen ayrı bir
  oturumda Cloud Functions ekleyip bunu kurabiliriz (Blaze planına geçiş
  gerektirir, küçük bir maliyeti olur).
- **Firestore indeksleri:** Kodundaki tüm sorgular tek alan üzerinde aralık
  sorgusu — Firebase'in otomatik indeksleri yeterli, composite index
  oluşturman gerekmiyor.
- **Offline veri çakışması:** `enablePersistence` zaten açık, Firestore
  kendi "son yazan kazanır" (last-write-wins) mantığıyla senkronize ediyor,
  ek bir şey yapmana gerek yok.
