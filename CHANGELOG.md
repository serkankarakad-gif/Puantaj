# Değişiklik Günlüğü (Changelog)

Bu proje [Anlamsal Sürümleme benzeri](VERSIYONLAMA.md) bir dörtlü numara
kullanır: `0.0.0.X` — X, her güncellemede 1 artar. Uygulama içindeki sürüm
(alt bilgi + "Neler yeni" kartı) ve dağıtılan zip dosyasının adı her zaman
birebir aynıdır.

## 0.0.0.79 — "İşlerim": işe giriş/çıkış sistemi
- Uzun bir sohbet sonucu netleşen kritik özellik: bir işten çıkıp bambaşka bir firmaya geçince (aynı inşaat sektörü içinde farklı, alakasız firmalar), o iki dönemin puantajının/raporunun kesinlikle karışmaması gerekiyordu
- Yeni veri modeli: `ayarlar.isler` dizisi — her kayıt {id, ad, soyad, santiyeAdi, patronAdi, girisTarihi, cikisTarihi}. `cikisTarihi` boşsa o iş hâlâ "aktif" sayılır
- Yeni yardımcı fonksiyonlar: `aktifIs()` (çıkışı olmayan işi bulur), `isBul(tarih)` (bir tarihin hangi işe ait olduğunu bulur), `isVerileriHesapla(is)` (bir işin giriş-çıkış aralığındaki TÜM günlerini — ay sınırını aşsa bile — tumGirdilerQS/tumOdemelerQS'ten gün gün hesaplar)
- Hamburger menüye yeni "💼 İŞ GEÇMİŞİ" grubu eklendi: "🏗️ İşe Giriş Yap" (ad/soyad/şantiye/patron/giriş tarihi — KESİNLİKLE hepsi zorunlu, boş geçilemiyor), "🚪 İşten Çıkış Yap" (çıkış tarihi zorunlu; kaydedince hemen "📲 Bu işin PDF'ini WhatsApp'ta paylaş" seçeneği çıkıyor), "📋 İşlerim" (geçmiş+aktif tüm işlerin kart listesi)
- Aynı anda sadece TEK aktif iş olabilir — zaten aktif bir iş varken "İşe Giriş Yap" denenirse engellenip önce çıkış yapması isteniyor (yanlışlıkla iki işi aynı anda açık bırakmasın diye)
- Bir işe dokununca (İşlerim listesinden) sadece o dönemin günleri/avansları görünen bir detay ekranı açılıyor, ve oradan da aynı gerçek (Türkçe fontlu, gömülü) PDF raporu paylaşılabiliyor — `pdfTurkceFontKur()` altyapısı burada da yeniden kullanıldı
- Gerçek koddan çekilen `aktifIs()`/`isBul()` mantığı Node.js'te test edildi: Ahmet'in işi (1-15 Temmuz) ve Ali'nin işi (20 Temmuz-) doğru ayrıştı, aradaki boşluk günü (17 Temmuz) hiçbir işe ait çıkmadı (doğru davranış)
- Not: bu sistem sadece RAPOR/DOKÜMANTASYON ayrımı içindir — ücret hesaplaması hâlâ "Ayarlar → Şantiyeler" listesindeki kayıtlara bağlıdır (0.0.0.78'de düzeltilen sistem), ikisi paralel çalışır

## 0.0.0.78 — KRİTİK: yeni şantiyeye geçince eski ücret kullanılıyordu
- Kullanıcı netleştirdi: sorun sadece raporlarda görünüm değil, GERÇEK bir hesaplama hatasıydı — 20 Temmuz'da tamamen farklı bir firmada işe başlayınca, o günden sonraki kayıtlar hâlâ eski firmanın yevmiyesiyle hesaplanıyordu
- `oranBul()`/`guncelOranlar()` mekanizması Node.js'te izole test edildi ve DOĞRU çalıştığı kanıtlandı (Firma A: 1.250₺, Firma B: 1.800₺ — doğru ayrıştı) — yani hesaplama motorunda bug yoktu
- Gerçek kök sebep bulundu: yeni bir şantiye eklendiğinde `localStorage.sonSantiye` (son kullanılan şantiye, yeni gün kayıtlarının varsayılan seçimi) otomatik güncellenmiyordu. Kullanıcı yeni eklediği şantiyeyi en az bir kez elle seçip kaydetmezse, sonraki tüm gün kayıtları sessizce ESKİ şantiyeyi (ve onun donmuş ücretini) kullanmaya devam ediyordu — hiçbir uyarı olmadan
- Çözüm: `btn-santiye-ekle` handler'ında, YENİ bir şantiye eklendiğinde (düzenleme değil) bu otomatik olarak `sonSantiye` yapılıyor artık — "🏗️ [Ad] eklendi — bundan sonraki gün kayıtların otomatik buraya yazılacak" bildirimiyle birlikte. İşe yeni başlayınca doğal ilk adım zaten şantiyeyi eklemek olduğundan, akış artık güvenli
- Not: bu düzeltmeden önce yanlış ücretle kaydedilmiş günler otomatik düzeltilmiyor (geçmişe dönük veri değişikliği risklidir) — kullanıcıya, etkilenen günleri açıp doğru şantiyeyi seçip yeniden kaydetmesi gerektiği bildirildi

## 0.0.0.77 — Şantiye geçmişi kalıcı: eski şantiyenin adı artık kaybolmuyor
- Kritik kullanıcı bildirimi: biri Temmuz'un 1'inde bir şantiyede işe başlayıp, ayın 15'inde başka bir şantiyeye geçtiğinde, raporlar (PDF, Yıl PDF) hep GÜNCEL şantiyenin adını gösteriyordu — eski şantiyede geçirilen günler sanki hiç çalışılmamış gibi görünüyordu, çünkü rapor başlığı tek bir global `ayarlar.santiye` değerine bakıyordu
- Netleştirme soruları sonrası karar: (1) şantiye seçimi ZORUNLU değil, son kullanılan otomatik gelsin — bu zaten `localStorage.sonSantiye` ile hazırmış, dokunulmadı (2) raporlarda hem her günün yanında hangi şantiyede olduğu YAZSIN hem de dönem başında "1–14 Temmuz: A Şantiyesi · 15–31: B Şantiyesi" gibi bir özet olsun (3) bu özellikten önceki, şantiyesi boş eski günler için KESİNLİKLE bir isim yazsın (boş/"Bilinmiyor" değil) — o zaman ayarlarda kayıtlı olan güncel şantiye adına geriye dönük düşülüyor
- Yeni yardımcı fonksiyonlar: `gunSantiyeAdi(v)` (bir günün şantiyesini üç aşamalı çözer: kayıtlı ad → şantiyeId'den ad → geriye dönük ayarlar.santiye), `santiyeBloklariCiz()` (bir tarih aralığındaki ardışık aynı-şantiye günlerini tek bloğa birleştirir), `santiyeOzetMetni()` (blokları "1–14 Tem: A · 15–31: B" formatında okunabilir tek satıra çevirir)
- Hem aylık PDF (`pdfBlobOlustur`/`raporIcerikUret`) hem Yıl PDF'inin her aylık detay sayfası (`yilPdfBlobOlustur`) güncellendi: çizelgeye yeni bir ŞANTİYE sütunu eklendi, başlıkta tek "Şantiye: X" yerine (birden fazlaysa) tarih aralıklı özet gösteriliyor
- Gerçek koddan çekilen mantık Node.js'te test edildi: 1-14 Temmuz A Şantiyesi, 15-25 Temmuz B Şantiyesi, 26-28 Temmuz (eski, şantiyesi boş kayıt) senaryosunda üç blok da doğru ayrıştı, boş kayıt geriye dönük güncel şantiye adını aldı

## 0.0.0.76 — Yıl PDF'i tam detaylı + "tepki vermiyor" hatası düzeltildi
- Kullanıcı bildirdi: "Gerçek PDF indir" düğmesine basınca hiçbir tepki yoktu (ekran görüntüsüyle) — düğme artık `try/catch` ile sarmalandı, herhangi bir hata olursa `hataGoster()` ile görünür şekilde bildiriliyor, sessizce yutulmuyor
- Kullanıcı geri bildirimi (kritik olarak işaretlendi): yıl PDF'i WhatsApp'tan birine paylaşıldığında sadece aylık toplamlar (Gün/Mesai/Hakediş/Alınan/Kalan) yetmiyor — hangi GÜN çalışıldığı, artılar, ve avanslar TARİH TARİH de görünmesi gerekiyor, ekrandaki Yıl Özeti sayfasında olmasa da PDF'te olmalı
- `yilPdfBlobOlustur()` genişletildi: 1. sayfa yıl özet tablosu (değişmedi), sonrasında veri olan HER AY için ayrı bir sayfa — aylık PDF'teki (`pdfBlobOlustur`) ile birebir aynı yapıda gün gün çizelge (TARİH/YEVMİYE/GÜN İÇİ ARTI/MESAİ/KAZANÇ) ve avans/hakediş/kesinti/diğer ödeme dökümü (# · Tarih · Not · Tutar)
- Bunun için yeni bir Firestore sorgusu atılmadı — zaten bellekte canlı tutulan `tumGirdilerQS`/`tumOdemelerQS` (tüm zamanların önbelleği) kullanıldı, `odemeAyi()` ile ay bazında süzülerek. Gerçek koddan çekilen mantık Node.js'te test edildi: 1 Ağustos'ta alınıp Temmuz'a sayılan avans, Temmuz'un detay sayfasında doğru çıkıyor

## 0.0.0.75 — Yıl Özeti'ne gerçek PDF eklendi
- Kullanıcı isteği: Puantaj ekranındaki "gerçek PDF" özelliği Yıl Özeti'ne de eklensin
- Font gömme kodu (`pdfTurkceFontKur()`) tek bir yardımcı fonksiyona çıkarıldı — hem `pdfBlobOlustur()` (aylık rapor) hem de yeni `yilPdfBlobOlustur()` (yıllık rapor) aynı Türkçe destekli fontu kullanıyor, kod tekrarı yok
- Yeni `yilPdfBlobOlustur()`: ekrandaki 12 aylık dökümü (AY · GÜN · MESAİ · HAKEDİŞ · ALINAN · KALAN, TOPLAM satırı dahil) gerçek metin tabanlı bir PDF tablosuna döküyor
- Yeni `yilPdfPaylas()`: diğer PDF paylaşımlarıyla aynı güvenli desen — önce PDF'i telefona kalıcı dosya olarak indirir, sonra paylaşım penceresini dener
- Yıl Özeti ekranına "📄 Gerçek PDF indir" düğmesi eklendi (mevcut "Yıl raporunu paylaş" ve Excel düğmelerinin arasına)

## 0.0.0.74 — PDF artık gerçek (metin tabanlı) PDF, resim değil
- Kullanıcı isteği: görsel paylaşımı çalıştı, PDF için "resim değil gerçek PDF" istendi — bir önceki turdaki html2canvas yaklaşımı (sayfanın ekran görüntüsünü PDF'e gömmek) yerine gerçek, seçilebilir/aranabilir METİN içeren bir PDF isteniyordu
- Sandbox'ta Türkçe'nin tamamını (İ, ı, Ş, ş, Ğ, ğ dahil — cmap ile doğrulandı, python fontTools ile test edildi) destekleyen Liberation Sans fontu (Arial ile ölçü uyumlu, Apache lisanslı, açık kaynak) bulundu, Regular + Bold ağırlıkları base64'e çevrilip `font-liberationsans-regular.js` ve `font-liberationsans-bold.js` olarak projeye eklendi (toplam ~1.1 MB, uygulamayla birlikte bir kere önbelleğe alınıyor, internet gerektirmiyor)
- `pdfBlobOlustur()` artık bu fontu `doc.addFileToVFS()` + `doc.addFont()` ile PDF'in içine gömüyor, tüm `doc.text()` ve `doc.autoTable()` çağrıları bu fontu kullanıyor — önceki turdaki karakter ÇEVİRME (İ→I, ş→s gibi) yöntemi kaldırıldı, artık gerçek Türkçe karakterler doğru çıkıyor. Tek istisna: ₺ (Lira) işareti bu fontta da yok (çok yeni bir Unicode karakter), o "TL" olarak yazılmaya devam ediyor
- `pdfPaylas()` artık önce bu gerçek metin tabanlı PDF'i deniyor; sadece font/jsPDF hiç yüklenemezse (örn. ilk açılışta internet yoksa) bir önceki turun html2canvas'lı "resim" yöntemine, o da olmazsa yazdırma ekranına düşüyor
- `sw.js` önbellek listesine yeni font dosyaları eklendi, CSP değişikliğine gerek kalmadı (aynı sunucudan geldikleri için zaten 'self' kapsamında)

## 0.0.0.73 — Görsel paylaşımına 2. resim: Alınan Avanslar (tarih tarih)
- Kullanıcı isteği: PDF'i bırakıp mevcut "Görsel" (PNG) özelliğine, avansların TARİH TARİH listelendiği ikinci bir resim eklensin
- `pngRapor()` ikiye bölündü: `pngOzetBlobOlustur()` (eski tek resim, değişmedi) ve yeni `pngAvansBlobOlustur()` (o dönemde alınan avans/ödemeleri `donemOdemeSec()` ile aynı FIFO-doğru mantıkla çekip # · Tarih (gün/ay/yıl — gün adı) · Not · Tutar şeklinde tek tek çizen, en altta toplamı gösteren yeni bir canvas). Dönemde hiç ödeme yoksa bu fonksiyon `null` döner
- Yeni `gorselPaylas()`: her iki resmi de üretip `navigator.share({files:[...]})` ile TEK paylaşımda, avans resmi varsa 2. sırada göndürüyor. Çoklu dosya paylaşımı desteklenmiyorsa ikisini de sırayla indiriyor
- "Görsel" düğmesindeki dönem seçim akışı (Tüm ay / İlk yarı / İkinci yarı) artık `gorselPaylas()`'ı çağırıyor; PDF dönemi ekranındaki ekstra "WhatsApp'ta paylaş" düğmesi artık sadece PDF modunda görünüyor (Görsel modunda zaten üstteki 3 seçenek doğrudan paylaşıyor, tekrar olmasın diye)

## 0.0.0.72 — PDF artık gerçek PDF'in birebir görüntüsü
- Bir önceki turdaki çözüm (jsPDF metin motorunu Latin karşılıklarına çevirerek düzeltmek) kullanıcıya yetmedi — "aynı 1e1 PDF gibi olsun, resim gibi" istendi
- Yaklaşım değiştirildi: `pdfYazdir()`'in yazdırma sekmesinde kullandığı HTML içeriği artık `raporIcerikUret()` adında ortak bir fonksiyonda üretiliyor (tek yerden bakım, ikisi birbirini tutuyor)
- Yeni `pdfResimBlobOlustur()`: bu HTML'i ekranda görünmeyen bir kutuda (position:fixed, ekran dışı) render edip html2canvas ile YÜKSEK ÇÖZÜNÜRLÜKTE (2x) görüntüsünü alıyor, sonra bu görüntüyü jsPDF ile gerçek bir PDF sayfasına (gerekirse birden fazla sayfaya bölünerek) gömüyor
- Sonuç: WhatsApp'a giden PDF, artık tarayıcının KENDİ font motoruyla (Arial) render edildiği için Türkçe karakterler (İ, ı, ş, ğ, ₺ dahil) HİÇBİR ZAMAN bozulmuyor — yazdırıp kaydettiğin PDF ile birebir aynı görünüyor
- Eski jsPDF metin tabanlı yöntem (`pdfBlobOlustur`) kaldırılmadı, html2canvas bir sebeple çalışmazsa otomatik yedek olarak devrede kalıyor
- CSS seçicileri ".pdf-rapor" öneki ile sarmalandı ki görüntü alma sırasında ana uygulamaya geçici eklenen `<style>` etiketi, uygulamanın kendi tablo/başlık stillerini ezmesin

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
