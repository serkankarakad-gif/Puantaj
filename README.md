# Puantaj — Tek Dosya (index.html)

Tek bir `index.html` dosyası. Build/npm gerekmiyor, React ve Firebase CDN üzerinden yükleniyor. GitHub Pages ile direkt yayınlayabilirsin.

## 1. Firebase projesi kur
1. https://console.firebase.google.com → yeni proje
2. Build > Authentication → Get started → Email/Password sağlayıcısını aç
3. Build > Firestore Database → Create database
4. Proje Ayarları → Your apps → Web (</>) → bir isim ver, `firebaseConfig` değerlerini kopyala

## 2. index.html içine yapıştır
Dosyada şu kısmı bulup kendi bilgilerinle değiştir (yaklaşık 60. satır civarı):

```js
const firebaseConfig = {
  apiKey: "BURAYA_YAZ",
  authDomain: "BURAYA_YAZ.firebaseapp.com",
  projectId: "BURAYA_YAZ",
  storageBucket: "BURAYA_YAZ.appspot.com",
  messagingSenderId: "BURAYA_YAZ",
  appId: "BURAYA_YAZ",
};
```

⚠️ Not: Bu bilgiler tek dosya HTML olduğu için kod içinde açıkta duracak (build sistemi olmadığından .env kullanamıyoruz). Bu normal — Firebase web API anahtarları zaten gizli değildir, güvenlik `firestore.rules` ile sağlanır (aşağıya bak). Yine de bu dosyayı **public** bir GitHub reposuna atacaksan bunun farkında ol.

## 3. Firestore güvenlik kurallarını yükle
Firebase Console → Firestore Database → Rules → bu klasördeki `firestore.rules` dosyasının içeriğini yapıştır → Publish.
Bu olmadan herkes birbirinin verisini okuyup yazabilir.

## 4. Test et
`index.html` dosyasına çift tıkla, tarayıcıda aç. (Bazı tarayıcılarda `file://` üzerinden Firebase Auth sorun çıkarabilir — sorun olursa VS Code'da "Live Server" eklentisiyle veya `python3 -m http.server` ile aç.)

## 5. GitHub'a at
```bash
git init
git add .
git commit -m "Puantaj tek dosya"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADIN/puantaj-app.git
git push -u origin main
```

## 6. (Opsiyonel) GitHub Pages ile yayınla
Repo → Settings → Pages → Branch: main, klasör: / (root) → Save.
Birkaç dakika sonra `https://KULLANICI_ADIN.github.io/puantaj-app/` adresinden herkese açık çalışır.
