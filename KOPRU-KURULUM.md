# 🌉 Kendi Köprünü Kur (5 dakika, ücretsiz, kart istemez)

Haberler / video arama / A Spor bazen açılmıyorsa sebep halka açık köprülerin
yoğunluğudur. Kendi köprünü kurunca bu dertler biter.

## Adımlar

1. **https://dash.cloudflare.com** adresine gir → ücretsiz hesap aç
   (e-posta + şifre yeter, kart İSTEMEZ).
2. Sol menüden **Workers & Pages** → **Create** → **Create Worker**.
3. İsim kutusuna: `puantaj-kopru` yaz → **Deploy** düğmesine bas.
4. Açılan sayfada **Edit code** düğmesine bas.
5. Soldaki kod alanındaki HER ŞEYİ sil → bu klasördeki **worker.js**
   dosyasının içeriğini olduğu gibi yapıştır → sağ üstten **Deploy**.
6. Sayfanın üstünde adresin yazar, şuna benzer:
   `https://puantaj-kopru.KULLANICIADIN.workers.dev`
   Bu adresi kopyala.

## Adresi uygulamaya tanıt

**index.html** dosyasını aç, en üste yakın şu satırı bul:

```js
const OZEL_KOPRU = "";
```

Tırnakların arasına adresini yapıştır:

```js
const OZEL_KOPRU = "https://puantaj-kopru.KULLANICIADIN.workers.dev";
```

Kaydet, GitHub'a yükle. Bitti! Artık haber/video/TV istekleri önce SENİN
köpründen geçer (günde 100.000 istek bedava — fazlasıyla yeter),
o çökerse eski halka açık köprüler yedek olarak devrede kalır.

Adresi bana (Claude'a) da gönderebilirsin, bir sonraki sürüme gömülü hazırlarım.
