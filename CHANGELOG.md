# Değişiklik Günlüğü (Changelog)

Bu proje [Anlamsal Sürümleme benzeri](VERSIYONLAMA.md) bir dörtlü numara
kullanır: `0.0.0.X` — X, her güncellemede 1 artar. Uygulama içindeki sürüm
(alt bilgi + "Neler yeni" kartı) ve dağıtılan zip dosyasının adı her zaman
birebir aynıdır.

## 0.0.0.33 — Maaşlar (büyük güncelleme)
- Yeni "Maaşlar" ekranı: her ay kendi hesap kartına sahip (gün sayısı, avans/askeriye/hakediş dökümü, kalan tutar, ödendi durumu)
- Ana ekrandaki "Şirket Hesap Kartı" artık sadece BU AYI gösteriyor (eskiden tüm zamanlar toplamıydı) — geçmiş aylar "Maaşlar"da ayrı ayrı duruyor
- Yeni ödeme türü: "Askeriye"

## 0.0.0.32 — Gece mesaisi zammı
- Gün ekranına normal mesaiden ayrı, opsiyonel "gece mesaisi" saat girişi eklendi, Ayarlar'dan zam yüzdesi belirlenebiliyor

## 0.0.0.31 — Hata düzeltmesi
- "Aşağı çekerek yenile" özelliği normal kaydırmayı bile "çekme" sanıp sürekli bildirim gösteriyordu — özellik kaldırıldı

## 0.0.0.30 — UI/UX: modern grafik
- Gelir-gider grafiği çubuktan çizgi+alan grafiğine çevrildi (aynı doğru matematik, sadece çizim şekli değişti)

## 0.0.0.29 — UI/UX: katlanabilir menü
- Menü 4 dengeli gruba ayrıldı, her grup başlığı açılıp kapanıyor (accordion)

## 0.0.0.28 — UI/UX: gradient başlıklar
- Giriş ekranı, üst bar ve bakiye rakamları gradient metin kullanıyor

## 0.0.0.27 — Navigasyon: akıllı kısayollar
- FAB'a (➕) basılı tutunca "Not ekle / Avans ekle / Dünü işle" hızlı menüsü

## 0.0.0.26 — Mikro animasyonlar
- Ripple efekti, pull-to-refresh (sonradan 0.0.0.31'de kaldırıldı)

## 0.0.0.25 — Takvim
- Sticky gün başlığı, hafif giriş animasyonu; iki ayrı/eksik tatil listesi tek listeye birleştirildi (2025/2028 tatilleri artık doğru gösteriliyor)

## 0.0.0.24 — Ana ekran
- Bugünkü kazanç kartı ve aylık hedef çubuğu Ana ekrana eklendi

## 0.0.0.23 — UI/UX: cam efekti
- Modal ve menü perdelerine glassmorphism eklendi

## 0.0.0.22 — Profesyonel ekstra özellikler
- Gerçek Excel (.xlsx) dışa aktarım, 30 günlük yedek hatırlatması

## 0.0.0.21 — Bakım
- Sabitler ayrı dosyaya (sabitler.js) taşındı, CHANGELOG/VERSIYONLAMA/KOD-STILI eklendi, şirket hesap hareketleri karta taşındı

## 0.0.0.20 — Hata yönetimi
- Global hata yakalayıcı eklendi (`window.onerror`, `unhandledrejection`) — artık hiçbir beklenmedik hata sessizce kaybolmuyor
- Kalıcı hata günlüğü eklendi (Araçlar & Bilgi ekranı, son 30 hata, kopyalanabilir)
- Firestore hata kodları için genel, kullanıcı dostu Türkçe mesajlar

## 0.0.0.19 — UI/UX
- Açık temada sarı vurgu renginin düşük kontrast sorunu düzeltildi (ve mavi/yeşil/turuncu vurgu renkleri için de)
- Dokunma alanları büyütüldü (silme/kapatma düğmeleri → 44x44px)
- Manifest'teki "portrait" kilidi kaldırıldı, yatay (landscape) kullanım mümkün
- Ekranlar arası yumuşak geçiş animasyonu, skeleton loading eklendi
- Haptic feedback tutarlılığı sağlandı (ortak `titret()` fonksiyonu)

## 0.0.0.18 — Firestore maliyet optimizasyonu
- Liderlik tablosunun N+1 sorgu sorunu (775 okumaya kadar) 5 dakikalık önbellekle giderildi
- `MALIYET-RAPORU.md` eklendi

## 0.0.0.17 — Güvenlik (CSP, headers)
- Content-Security-Policy eklendi (kapsamlı dış bağlantı analiziyle)
- Firebase config ayrı dosyaya (`firebase-config.js`) taşındı
- Referrer-Policy eklendi
- Cloudflare köprüsü (worker.js) isteğe bağlı origin kısıtlamasıyla sıkılaştırıldı
- `GUVENLIK-KURULUM.md` eklendi (HTTPS/X-Frame-Options/Permissions-Policy rehberi)

## 0.0.0.16 — PWA
- iOS "Ana ekrana ekle" desteği (apple-touch-icon, meta etiketleri)
- Güncelleme bildirimi (yeni sürüm hazır olunca banner)
- Manuel önbellek temizleme (Ayarlar → Depolama)

## 0.0.0.15 — Performans
- Fotoğraflar WebP olarak sıkıştırılıyor
- Ekip/Planlar/Notlar dinleyicileri ilk ziyarette başlıyor (girişte değil)
- Unutulmuş bir dinleyici sızıntısı (Planlarım) giderildi

## 0.0.0.14 — Güvenlik (Firestore Rules)
- Firestore kuralları sıkılaştırıldı: sadece girdiler/ödemeler herkese açık, geri kalan her şey (borç/cüzdan/kart/ekip/fiş) sahibine özel
- Firebase App Check altyapısı eklendi
- Yeni hesaplara e-posta doğrulama gönderiliyor

## 0.0.0.13 — Şeffaflık
- "Toplam hakediş" yazısına "(tüm aylar dahil)" notu ve "Yıl özeti"ne kısayol eklendi

## 0.0.0.12 — Kritik hata düzeltmesi
- Geç alınan ödemenin (örn. Temmuz'un parası Ağustos'ta) yanlış aya yazılması sorunu çözüldü — "Bu ödeme hangi ayın hesabına yazılsın?" seçici eklendi

## 0.0.0.11 — Kapsamlı hata taraması
- PNG raporunda eksik masraf satırı, "Herkes" ekranında eksik parça-başı kazancı gibi bulgular düzeltildi

## 0.0.0.10 — Hata düzeltmesi
- Geçmiş ay incelenirken ödeme/masraf tarihinin yanlışlıkla bugüne varsayılan alma sorunu düzeltildi

## 0.0.0.9 — Yeni özellik
- "Planlarım": WhatsApp/Drive'dan gelen proje/plan linklerini kaydetme

## 0.0.0.8 — Sürüm birleştirme
- Uygulama içi sürüm numarası ile dağıtılan zip adı birebir eşitlendi

## 0.0.0.7 — Yeni özellik
- Belge/sertifika süre takibi (ehliyet, SRC, MYK vb.)

## 0.0.0.6 — Yeni özellik
- Parça başı (adet/kg/m²/sefer) ücretlendirme
- Yıllık 270 saat fazla mesai sınırı uyarısı

## 0.0.0.5 — Yeni özellik
- Zam kazancı özeti, 2028 dini bayramlar

## 0.0.0.4 — Yeni özellik
- Pazar/resmi-dini bayram zamlı ücret

## 0.0.0.2–0.0.0.3 — Güvenlik
- Kaçışsız (XSS'e açık) kullanıcı verisi gösterimleri düzeltildi (liderlik tablosu, kişi detayı, borç/cüzdan/ekip listeleri)
