# Değişiklik Günlüğü (Changelog)

Bu proje [Anlamsal Sürümleme benzeri](VERSIYONLAMA.md) bir dörtlü numara
kullanır: `0.0.0.X` — X, her güncellemede 1 artar. Uygulama içindeki sürüm
(alt bilgi + "Neler yeni" kartı) ve dağıtılan zip dosyasının adı her zaman
birebir aynıdır.

## 0.0.0.71 — PDF'teki bozuk Türkçe karakterler
- Kullanıcı ekran görüntüsüyle bildirdi: WhatsApp'a giden gerçek PDF'te "TARİH" → "TAR0H", "Salı" → "Sal1", "Çarşamba" → "Çar_amba", "₺" → küçük "0" gibi karakterler bozuk çıkıyordu
- Sebep: jsPDF'in varsayılan (helvetica) fontu, PDF'in temel-14 fontlarının WinAnsi kodlamasını kullanıyor — bu kodlamada Latin-1'de olmayan Türkçe'ye özgü İ, ı, Ş/ş, Ğ/ğ harfleri ve ₺ işareti YOK (Ç/ç/Ü/ü/Ö/ö gibi Latin-1'de olanlar zaten doğru basılıyordu, o yüzden "Kazanç" ve "GÜN" gibi kelimeler kısmen doğruydu)
- Çözüm: `pdfBlobOlustur()` içine bir çeviri katmanı eklendi — `doc.text()` ve `doc.autoTable()` (didParseCell hook'u ile hem başlık hem gövde hem alt toplam hücreleri) üzerinden geçen HER metin otomatik olarak okunabilir Latin karşılıklarına çevriliyor: İ→I, ı→i, Ş/ş→S/s, Ğ/ğ→G/g, ₺→TL. Gerçek bir Türkçe font gömmek (internet + büyük dosya boyutu gerektirdiği için) tercih edilmedi, bu çözüm hem hafif hem de asla bozuk karakter basmıyor

## 0.0.0.70 — WhatsApp'ta takılan "gönderiliyor" sorunu
- Kullanıcı geri bildirimi: PDF'i WhatsApp'a paylaştıktan sonra mesaj sürekli "gönderiliyor" (saat ikonu) durumunda takılı kalıyor, mesaja dokunup "yeniden gönder" yapmak da işe yaramıyordu
- Kök sebep: `navigator.share({files:[...]})` ile paylaşılan dosya, tarayıcının SİLİNEBİLEN bir geçici alanındaki kaynağa işaret ediyor — WhatsApp'ın arka plan yükleme işi zayıf bağlantıda yarıda kesilirse, o geçici kaynak da kaybolmuş olabiliyor, bu yüzden "yeniden gönder" de aynı (artık var olmayan) kaynağı arıyor ve başarısız oluyor
- Çözüm: `pdfPaylas()` artık paylaşım penceresini açmadan ÖNCE PDF'i telefonun İndirilenler klasörüne GERÇEK, kalıcı bir dosya olarak indiriyor. Paylaşım penceresi başarılı olsun olmasın, kullanıcının elinde her zaman gerçek bir PDF dosyası kalıyor — WhatsApp'tan ataç (📎) → Belge ile elle eklenebilir, bu yöntem hiçbir zaman başarısız olmaz

## 0.0.0.69 — Sürüm yenileme
- İçerik olarak 0.0.0.68 ile aynı; sadece güncelleme kontrolünün (SW) yeni bir sürüm numarasıyla tekrar tetiklenmesi için sürüm artırıldı

## 0.0.0.68 — WhatsApp'a gerçek PDF dosyası
- Bir önceki turda eklenen "WhatsApp'ta paylaş" düğmesi, PDF ekranındayken bile sadece düz METİN paylaşıyordu (WhatsApp'ta yeşil sohbet balonu olarak) — istenen, gerçek bir PDF dosyasının doğrudan eklenmesiydi
- jsPDF + jsPDF-AutoTable kütüphaneleri eklendi (CSP'ye cdnjs.cloudflare.com izni verildi), yeni `pdfBlobOlustur()` fonksiyonu tarayıcı belleğinde GERÇEK bir PDF dosyası (Blob) üretiyor — çizelge tablosu, avans/hakediş/kesinti bölümleri, imza satırları dahil, yazdırılan PDF ile aynı içerik
- Yeni `pdfPaylas()` fonksiyonu bu PDF'i `navigator.share({files:[...]})` ile WhatsApp'a gerçek dosya olarak gönderiyor (telefonun paylaşım ekranı açılıp WhatsApp seçilince PDF eki gidiyor, yazı değil)
- Dosya paylaşımını desteklemeyen eski tarayıcılarda otomatik olarak PDF indirilip kullanıcı elle ekleyebilsin diye uyarı veriliyor; jsPDF hiç yüklenemezse (örn. internet yoksa) eski yazdırma ekranına düşülüyor

## 0.0.0.67 — PDF ekranından direkt WhatsApp paylaşımı
- "PDF" düğmesiyle açılan dönem seçim ekranına ("Tüm ay / İlk yarı / İkinci yarı" seçenekleri altına) yeşil bir "📲 WhatsApp'ta paylaş" düğmesi eklendi
- PDF almak isterken WhatsApp'a da paylaşmak istersen artık geri çıkıp ayrı "Paylaş" düğmesini bulmana gerek yok, aynı ekrandan tek dokunuşla hallediyorsun (varsayılan olarak tüm ayı paylaşır)
- Ekran zaten "Paylaş" düğmesiyle açıldıysa bu ek düğme gösterilmiyor (zaten üstteki 3 seçenek de WhatsApp'a gidiyor, tekrar olmasın diye)

## 0.0.0.66 — PDF/paylaşım raporunda kaybolan avanslar
- `hesaplaAralik()`, `pdfYazdir()` (PDF çıktısı) ve `alinanDokum()` (WhatsApp paylaşımı) fonksiyonları hâlâ ödemeleri gerçek `tarih` alanına göre gün-aralığına süzüyordu. Bir avans FIFO gereği farklı bir aya (`aitAy`) sayıldığında, bu ekstra filtre onu HER İKİ AYDA da eliyordu — ne alındığı ayda (artık oraya sayılmadığı için `odemeler` dizisinden zaten çıkmıştı) ne de sayıldığı ayda (çünkü gerçek tarihi o ayın gün aralığının dışındaydı)
- Yeni ortak yardımcı fonksiyon `donemOdemeSec(bId, sId)` eklendi: `odemeler` dizisi (zaten `aitAy`'a göre bu aya süzülmüş halde geliyor) üzerinde sadece AYNI ay içindeki ödemelere gün-aralığı filtresi uygular; farklı ayda alınıp bu aya sayılan ödemeleri her zaman dahil eder (kısmi dönem raporlarında da kaybolmasınlar diye)
- Gerçek app.js kodundan çekilen fonksiyonla Node.js'te test edildi: 1 Ağustos'ta alınan, Temmuz'a sayılan bir avans artık Temmuz'un PDF/WhatsApp raporunda doğru şekilde görünüyor

## 0.0.0.65 — "Herkes" ekranı hangi aya sayılır sorunu
- "Herkes" ekranındaki (Kim ne çalışmış gör) ödeme sorgusu Firestore'a doğrudan `tarih` alanına göre atılıyordu, önceki turlarda diğer tüm ekranlara uygulanan `aitAy` kuralı buraya hiç yansımamıştı — bir işçi Ağustos'ta avans alsa bile bu, ödenmemiş Temmuz borcundan düşülüyorsa artık burada da Temmuz'un altında görünüyor
- Sorgu değiştirildi: artık kişinin tüm ödemeleri çekilip `odemeAyi()` yardımcı fonksiyonuyla istemci tarafında filtreleniyor (Paralar ekranındaki `odemeleriAyaGoreDoldur()` ile aynı mantık)
- Gerçek app.js kodundan çekilen fonksiyonla Node.js'te test edildi: Temmuz'da çalışılıp ödenmeyen, 1 Ağustos'ta alınan avans artık doğru şekilde Temmuz özetinde görünüyor, Ağustos'ta değil

## 0.0.0.44 — Ana ekran ve menü sadeleştirme
- Tekrar eden "günaydın" kartı bulundu ve kaldırıldı (selam bloğuyla aynı işi iki kere yapıyordu) — içindeki çeşitli içerik (fıkra/hukuki bilgi/söz) üstteki tek satıra taşındı
- Seviye + Yıllık mesai sınırı + Emeklilik (SGK) kartları tek bir "İlerleme" kartında birleştirildi (3 ayrı kart yerine kompakt satırlar)
- "Yıl özeti" menüden kaldırıldı (Maaşlar ile çakışıyordu) — işlevi "Maaşlar" ekranının içinden tek dokunuşla erişilebilir hale getirildi

## 0.0.0.43 — Ana ekran: hava durumu + kaydırılabilir kartlar
- Ana ekrandaki hava durumu satırı artık uygulamaya her girişte güncel sıcaklık/durumu gösteriyor (eskiden sadece yarın yağmur ihtimali yüksekse görünüyordu)
- "Şirket Hesap Kartı" ve "Cebimdeki Para" (cüzdan) kartları yan yana, sağa-sola kaydırılan tek bir slider'a taşındı — altındaki noktalar hangi kartta olduğunu gösteriyor, ana ekranı uzun uzun aşağı kaydırmaya gerek kalmadı

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
