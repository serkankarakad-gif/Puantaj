/* =========================================================
   !!! BURAYI DOLDUR !!!
   Firebase konsolundan (console.firebase.google.com)
   kendi projenin ayarlarını buraya yapıştır.
   Nasıl yapılacağı README.md dosyasında adım adım anlatılıyor.
   ========================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyB5pl78DRao2SmUWsMYMSZ6YbfX4rtRNdc",
  authDomain: "gamezone-e11b0.firebaseapp.com",
  databaseURL: "https://gamezone-e11b0-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gamezone-e11b0",
  storageBucket: "gamezone-e11b0.firebasestorage.app",
  messagingSenderId: "775694460272",
  appId: "1:775694460272:web:7e5fd5691df9d8399d5bb5",
  measurementId: "G-3M7FXX8XR4"
};
/* =========================================================
   Firebase App Check (bot/spam koruması) — OPSİYONEL ama önerilir.
   1) Firebase konsolu → App Check → Web app → reCAPTCHA v3 kaydı yap,
      "site key" (anahtar) verecek, aşağıya yapıştır.
   2) Firebase konsolu → App Check → Firestore → "Enforce" yap
      (kaydı yapmadan Enforce açarsan gerçek kullanıcılar da engellenir,
      önce bir gün "Monitor" modunda bırakıp loglara bak).
   3) Anahtar boşsa (aşağıdaki gibi "BURAYA-..." ile başlıyorsa) App Check
      hiç devreye girmez, uygulama eskisi gibi çalışmaya devam eder.
   ========================================================= */
const RECAPTCHA_SITE_KEY = "BURAYA-RECAPTCHA-V3-SITE-KEY-YAPISTIR";
