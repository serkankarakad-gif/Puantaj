# Değişiklik Günlüğü (Changelog)

Bu proje [Anlamsal Sürümleme benzeri](VERSIYONLAMA.md) bir dörtlü numara
kullanır: `0.0.0.X` — X, her güncellemede 1 artar. Uygulama içindeki sürüm
(alt bilgi + "Neler yeni" kartı) ve dağıtılan zip dosyasının adı her zaman
birebir aynıdır.

## 0.0.1.2 — Profil fotoğrafı değiştirme artık sadece Ayarlar'dan
- Kullanıcı isteği: "orda profil resmi koyma şeklini kaldır, profil koyma Ayarlar kısmından ayarlansın"
- Hamburger menüdeki avatardan fotoğraf değiştirme kaldırıldı (kamera rozeti ve tıklama olayı silindi, artık sadece salt-okunur görüntü)
- Ayarlar → 👤 Hesap kartına yeni bir bölüm eklendi: küçük bir avatar önizlemesi (`#ayar-avatar-onizle`) + "📷 Profil fotoğrafı seç" düğmesi — fotoğraf değiştirmenin artık TEK yeri burası
- `avatarCiz()` merkezi bir fonksiyona dönüştürüldü: hamburger menü avatarı, Ayarlar'daki yeni önizleme, ve PIN ekranındaki avatar — üçü de tek çağrıda aynı anda güncelleniyor. Bu sayede önceki turda PIN ekranı için ayrıca yazılmış olan manuel "eğer PIN ekranı açıksa avatarı da tazele" kodu artık gereksiz hale geldi, kaldırıldı (kod tekrarı azaldı)

## 0.0.1.1 — PIN ekranına kullanıcının kendi fotoğrafı eklendi
- Kullanıcı gerçek bir inşaat fotoğrafı istedi, önce telif hakkı riski konusunda uyarıldı (haklı olarak sabırsızlandı), sonra kendi fotoğrafını gönderip "benim fotoğraf" diye sahipliğini onayladı
- Fotoğraf Python/PIL ile işlendi: JPEG kalitesi optimize edilip ~37 KB'a indirildi (`pin-arka-fotograf.jpg` olarak projeye eklendi), `sw.js` önbellek listesine eklendi (çevrimdışı da çalışsın diye)
- CSS'te `#pin-arka-foto` katmanı eklendi: fotoğraf arka plan olarak yerleşiyor, üstüne okunabilirlik için alttan koyulaşan bir gradyan karartma bindiriliyor (PIN noktaları/tuş takımı her zaman net okunuyor), yavaş bir "Ken Burns" yakınlaşma animasyonu (22 saniyede %12 büyüyüp geri küçülüyor) ile sabit durmuyor
- Önceki turdaki sıcak ışık lekesi Canvas'ı kaldırılmadı — `mix-blend-mode:overlay` ile fotoğrafın üstüne ince bir sıcak parıltı katmanı olarak bindirildi, ikisi birlikte çalışıyor
- Kullanıcının önceki turda çizilen (SVG) vinç silüeti artık gereksiz olduğundan kaldırıldı — gerçek fotoğraf onun yerini aldı

## 0.0.1.0 — PIN ekranı: animasyonlu + video-benzeri arka plan, güvenlik açığı kapatıldı
- (Sürüm numarası kuralı: 0.0.0.99'dan sonra kullanıcının istediği gibi 0.0.1.0'a geçildi — araba kilometre sayacı gibi.)
- Kullanıcı önce PIN ekranının "çok basit" kaldığını belirtti, Google'dan modern kilit ekranı animasyon trendleri araştırıldı: 2026 yönelimi yay-tabanlı (spring) animasyonlar, anında görsel geri bildirim, ve düşük/orta segment cihazlarda performans sorunu yaratmayacak HAFİF efektler
- Önce canlı, dokunulabilir bir HTML önizlemesi hazırlanıp kullanıcıya onaylatıldı (gerçek koda geçmeden önce) — kullanıcı "video animasyon" de istedi, "arka taraf siyah kalmasın" dedi
- Gerçek video dosyası yerine (birkaç MB, zayıf internette/düşük bütçeli telefonlarda ağır) Canvas'ta çizilen, yavaşça hareket eden 3 sıcak ışık lekesi eklendi — PIN ekranı kapalıyken çizim durduruluyor (pil tasarrufu)
- Tüm animasyonlar `transform`/`opacity` ile sınırlandı (GPU hızlandırmalı, pürüzsüz)
- KRİTİK GÜVENLİK DÜZELTMESİ: Bu çalışma sırasında kullanıcı fark etti — PIN ekranındaki avatara dokununca (yani PIN girmeden/bilmeden) profil fotoğrafı değiştirilebiliyordu. "Babamın telefonunu aldı diyelim, şifresini bilmese bile saçma bir fotoğraf koyabilir" — haklı. Fotoğraf değiştirme özelliği PIN ekranından TAMAMEN kaldırıldı (hem JS hem HTML hem CSS'ten), artık sadece kilidi açtıktan sonra hamburger menüden erişilebiliyor

## 0.0.0.99 — Uçtan uca kalite taraması
- Kullanıcı isteği: "hiçbir sıkıntı, hiçbir eksik kalmasın... bütün programları baştan aşağı incele, test et... noktalama ve benzeri hatalar olmasın"
- Debug kalıntısı taraması: `console.log`/`debugger` yok, TODO/FIXME notu yok
- 154 id'li düğmenin tamamı JS'e bağlı olduğu doğrulandı (bazıları `getElementById`, bazıları `$()`, bazıları `data-goruntu` genel mekanizmasıyla — üç düğme ilk otomatik taramada "bağlı değil" gibi göründü ama tek tek elle kontrol edilip hepsinin gerçekte bağlı olduğu doğrulandı)
- Kullanılmayan CSS taraması: 201 sınıftan 6'sı ilk bakışta "ölü" göründü, 4'ü (`d-yarim`, `secili-tam` vb.) aslında JS'te dinamik string birleştirmeyle (`"secili-"+durum`) üretiliyormuş — yanlış alarm, dokunulmadı. Gerçekten ölü olan 2 tanesi (`.renk-sec` — önceki turda kaldırılan "Vurgu rengi" kartından kalma; `.pin-not` — eski PIN ekranından kalma) temizlendi
- Görünür tüm metinler (index.html'deki HTML içerikleri + app.js'teki tüm string sabitleri) çift boşluk/bozukluk için programatik olarak tarandı — hiçbir sorun bulunamadı
- Kullanıcı girdilerinin (patron adı, şantiye adı, not alanları) ekrana `innerHTML` ile basıldığı her yerde `esc()` ile güvenli kaçışlandığı doğrulandı — HTML bozulması/enjeksiyon riski yok
- Son doğrulama: `node --check` temiz, HTML etiket dengesi (div/section/ul/li) tam, CSS parantez dengesi (390/390) tam

## 0.0.0.98 — e-Devlet bağlantısı hamburger menüye taşındı
- Kullanıcı bildirdi: "e-Devlet falan gibi şeyler hamburger menüde görünmüyor"
- Sebep bulundu: 0.0.0.96'da eklenen e-Devlet SGK linki "Emeklilik yolculuğu" kartının içine konmuştu, ama o kart `sgkCiz()` içinde `if(!(hedef>0)){ kart.classList.add("gizli"); return; }` koşuluyla — kullanıcı Ayarlar'dan bir SGK hedefi girmediği sürece kart (ve içindeki link) HİÇ görünmüyordu
- Düzeltildi: hamburger menüye, "Araçlar & Bilgi" satırının hemen altına, hiçbir ön koşula bağlı olmayan bağımsız bir "📄 e-Devlet'te SGK Kaydımı Sorgula" bağlantısı eklendi — artık her zaman görünüyor
- Bu menü öğesi `<button>` değil `<a href target="_blank">` olduğundan, `.cekmece li button` stilinin aynısı `.cekmece li a` için de CSS'e eklendi (görünüm birebir aynı, davranış farklı — sayfa içi gezinme değil, yeni sekmede dış bağlantı açıyor)

## 0.0.0.97 — Yasal asgari ücret altı yevmiye uyarısı
- Google araştırması devam etti, bu sefer 2026 asgari ücret/işçi hakları odaklı
- Doğrulanan gerçek: 2026 yılı için günlük brüt asgari ücret (SGK günlük kazanç alt sınırı) 1.101 TL — 4857 sayılı İş Kanunu madde 39 gereği bu sınırın altında ödeme yapılamaz
- Şantiye/patron ekleme formundaki "Yevmiye" alanına canlı bir kontrol eklendi: girilen tutar 1.101₺'nin altındaysa, alanın hemen altında "⚠️ Bu, 2026 yasal günlük asgari ücretin altında" notu beliriyor. Kaydı ENGELLEMİYOR (enformel/nakit yevmiyeli çalışmada gerçek durum resmi rakamlardan farklı olabilir), sadece bilgilendiriyor — tıpkı SGK ve 270 saat mesai sınırı kartlarındaki gibi aynı "bilgilendir, engelleme" felsefesiyle

## 0.0.0.96 — Google araştırması: KVKK + e-Devlet gerçekleri
- "Google'dan araştır" isteği üzerine, önceki genel roadmap yerine bu sefer Türkiye'ye özel, daha önce hiç bakılmamış iki açıdan araştırma yapıldı: KVKK uyumluluğu ve e-Devlet/SGK entegrasyon imkanı
- Bulgu 1: KVKK, 29.04.2026 tarihli 2026/921 sayılı ilke kararında, mesai takibi amacıyla biyometrik veri işlenmesinde tek başına "açık rıza"nın işçi-işveren güç dengesizliği yüzünden yeterli hukuki zemin oluşturmadığını belirtti. Bizim WebAuthn uygulamamız bundan ETKİLENMİYOR (biyometrik veri hiçbir sunucuya gönderilmiyor, sadece cihazın kendi güvenli donanımında işleniyor, biz sadece bir kimlik anahtarı saklıyoruz) ama şeffaflık için Ayarlar'daki biyometrik düğmesinin altına bunu açıkça belirten bir güven notu eklendi
- Bulgu 2: e-Devlet'in SGK hizmet dökümü için gerçek, üçüncü parti uygulamaların kullanabileceği bir API'si YOK — sadece kullanıcının kendi e-Devlet şifresiyle giriş yapması gereken bir portal sayfası var (turkiye.gov.tr/sgk-tescil-ve-hizmet-dokumu). "Emeklilik yolculuğu" kartına, bizim gösterdiğimiz prim gün sayısının kendi girdiği verilere dayalı bir TAHMİN olduğunu (patronun gerçekten bildirim yapıp yapmadığını göstermediğini) açıklayan bir uyarı ve gerçek sayfaya giden bir bağlantı eklendi
- İki değişiklik de CSP değişikliği gerektirmedi (basit `<a target="_blank">` linkleri CSP'nin script-src/connect-src kurallarına tabi değil, sadece `form-action` etkiler, o da `<form>` gönderimleri için)

## 0.0.0.95 — Ayarlar taraması: çakışan renk seçicileri birleştirildi
- Kullanıcı bildirdi: "Ayarlar kısmında sorunlar var, kaydetme sorunları var"
- Ayarlar ekranındaki 58 id tek tek çıkarılıp HER birinin app.js'te karşılığı olup olmadığı kontrol edildi
- Gerçek bulgu: "Vurgu rengi" (`.renk-sec`, 4 renk, `documentElement` üzerinde inline `--sari` set ediyordu) ile "Uygulama teması" (`#tema-secim`, Amoled dahil 5 seçenek, `body[data-tema]` CSS kuralları üzerinden AYNI `--sari` değişkenini set ediyordu) aynı anda vardı. CSS özgüllük kuralları gereği, `body[data-tema="mavi/yesil/turuncu/amoled"]` seçiliyse "Vurgu rengi" seçimi sessizce etkisiz kalıyordu — kullanıcı bir renk seçip "kaydettiğini" düşünse de görünürde hiçbir şey değişmiyordu
- (Düzeltme sırasında bir ara yanlışlıkla `#tema-secim`'in zaten TAM ÇALIŞIR durumda olduğunu — `temaUygula()` fonksiyonu zaten mevcuttu — gözden kaçırıp onu YENİDEN yazmaya çalıştım, bu da `Identifier 'temaUygula' has already been declared` sözdizimi hatasına yol açtı. Hemen fark edilip geri alındı, kod tabanına hiç gönderilmedi.)
- Çözüm: eski, daha eksik "Vurgu rengi" kartı ve JS'i tamamen kaldırıldı, tek ve tutarlı sistem olarak zaten var olan "Uygulama teması" (`#tema-secim`) kaldı
- Ayarlar'daki TÜM kaydet düğmeleri (`btn-ayar-kaydet`, `btn-sgk-kaydet`, `btn-ad-kaydet`, `btn-sifre-degistir`, `btn-belge-ekle`, `btn-onarim`) tek tek incelendi — hepsinin try/catch + Firestore `.set(...,{merge:true})` deseni doğru, form alanlarının Firestore'dan doldurulup doldurulmadığı da (`ayarlariDinle()` içinde) tek tek kontrol edildi, hepsi doğru besleniyor

## 0.0.0.94 — iOS taraması: safe-area boşluğu eksikti
- Kullanıcı sorusu: "iOS'ta kritik sorun var mı" — kod tabanı bilinen iOS Safari/PWA tuzakları için taranarak yanıtlandı
- Bulunan gerçek hata: viewport meta etiketinde `viewport-fit=cover` eksikti. Bu olmadan iOS Safari, CSS'te kullanılan `env(safe-area-inset-bottom)` değerini 0 kabul ediyor — yani alt menü/düğmelerin iPhone'un home indicator çizgisine yapışmaması için yazılan kod muhtemelen hiç çalışmıyordu. Eklendi
- Temiz çıkan kontroller: `apple-touch-icon`/`apple-mobile-web-app-capable` meta etiketleri zaten doğruydu (Ana ekrana eklerken düzgün ikon çıkar), tüm `backdrop-filter` kullanımlarının yanında zaten `-webkit-backdrop-filter` vardı, adres çubuğu yüzünden sorunlu olan `100vh` hiç kullanılmamış (`100dvh` kullanılmış, iOS 16.4+ itibarıyla güvenli), gizli dosya seçici zaten 0.0.0.88'de iOS'u da düşünerek düzeltilmişti
- Doğrulanamayan (canlı iOS cihazda test gerektiren) riskler açıkça not edildi: WebAuthn biyometrik ceremonysi ve Tesseract.js'in CDN'den çektiği Web Worker'ı iOS Safari'de teorik olarak çalışmalı ama gerçek cihazda doğrulanamadı — kullanıcıdan bildirim bekleniyor

## 0.0.0.93 — Yıl Özeti'nin kendisi de yıl-sınırı hatasını taşıyordu
- "Geliştirmeye devam" isteği üzerine kod tabanı `odemeler` koleksiyonuna atılan tüm ham-tarih sorguları için tekrar tarandı
- Bir tane daha bulundu: `yilYukle()` — Yıl Özeti ekranındaki AY/GÜN/MESAİ/HAKEDİŞ/ALINAN/KALAN tablosunu VE ondan beslenen Yıl PDF'ini üreten asıl fonksiyon — hâlâ `.where("tarih",">=",bas).where("tarih","<=",son)` kullanıyordu. İçerideki ay-gruplama mantığı zaten `odemeAyi()` kullanıyordu ama SORGUNUN KENDİSİ ham tarihe göre atıldığından, yıl sınırını aşan bir ödeme sorguya hiç girmiyordu
- Düzeltildi: `tumOdemelerQS` (tüm zamanların önbelleği) `odemeAyi()`'nin YIL kısmına göre süzülüyor artık — CSV/Excel'de az önce uygulanan aynı çözüm
- Kod tabanında `.where("tarih"` ile atılan tüm sorgular tek tek tekrar kontrol edildi: geriye kalan ikisi (`masraflar` ve `ekipGun` koleksiyonları) aitAy/FIFO kavramına tabi olmadığından dokunulmadı — bu artık kesin, kod tabanında `odemeler` koleksiyonuna ait başka ham-tarih sorgusu kalmadı

## 0.0.0.92 — Eski FIFO borcu kapatıldı: CSV/Excel + İşlerim detay ekranı
- "Devam et güncellemeye" isteği üzerine, önceki turlarda not edilip düşük öncelikli diye ertelenen iki tutarsızlık ele alındı
- `csvIndir()`/`excelIndir()`: ödeme sorgusu artık `.where("tarih",...)` yerine `tumOdemelerQS`'ten `odemeAyi()` (aitAy/FIFO) ile süzülüyor — yıl sınırını aşan (örn. 1 Ocak'ta alınıp Aralık'a sayılan) bir ödemenin dışa aktarımdan hiç görünmemesi/yanlış yılda çıkması ihtimali ortadan kalktı. Node.js'te gerçek senaryoyla test edildi: 1 Ocak 2027 tarihli ama aitAy=2026-12 olan bir avans, doğru şekilde 2026 dışa aktarımında çıktı
- `isDetayAc()` (İşlerim → bir işin detay ekranı): PDF'te 0.0.0.84'te düzelttiğimiz "sadece çalışılan günler görünüyor, boş/izinli günler kayboluyor" sorunu ekranda hâlâ duruyordu — artık PDF ile ekran birebir tutarlı, ikisi de o dönemin HER gününü gösteriyor

## 0.0.0.91 — OCR fiş okuma (deneysel)
- Kullanıcı "devam et güncellemeye" dedi, önceki turda bilerek ertelenen OCR fiş okuma özelliğine geçildi
- Teknik engel: Tesseract.js kendi Web Worker'ını ve dil verisini CDN'den çekiyor, mevcut `worker-src 'self'` CSP kuralı bunu engelliyordu. `worker-src`'ye `blob:` ve `https://cdn.jsdelivr.net` eklendi, `connect-src`'ye `cdn.jsdelivr.net` ve `tessdata.projectnaptha.com` (dil verisi barındıran varsayılan sunucu) eklendi, `script-src`'ye `cdn.jsdelivr.net` eklendi
- `tesseract.js@5` CDN'den script olarak eklendi (`window.Tesseract` yüklenemezse OCR düğmesi hiç gösterilmiyor, fotoğraf ekleme özelliği bundan etkilenmiyor)
- Masraf ekleme ekranına "🔍 Fişten tutarı okumayı dene (deneysel)" düğmesi eklendi — fiş fotoğrafı Tesseract'a (`tur+eng` dil modeliyle) veriliyor, metindeki para tutarına benzeyen tüm sayılar (regex ile) çıkarılıp tıklanabilir öneri çipleri olarak sunuluyor
- GÜVENLİK TASARIMI: hiçbir tutar OTOMATİK doldurulmuyor/kaydedilmiyor — kullanıcı önerilen çiplerden birine dokunmadıkça tutar alanı boş kalıyor, yanlış okuma riski kullanıcının kontrolünde kalıyor
- Regex mantığı Node.js'te örnek bir fiş metniyle test edildi: "VIDA SET 45,00 / SILIKON 120,50 / TOPLAM 198,60" gibi bir metinden tüm tutarlar (45, 120.5, 165.5, 198.6 vb.) doğru ayıklandı
- Bu özellik CDN'e ve gerçek cihazda Türkçe el yazısı/baskı fiş kalitesine bağlı olduğundan "deneysel" işaretli tutuldu — kullanıcı testi bekleniyor

## 0.0.0.90 — Biyometrik (parmak izi/Yüz) hızlı açma + özellik envanteri
- Kullanıcı, Google araştırmasıyla derlenen bir "yenilikçi özellik" yol haritasının TAMAMININ eklenmesini istedi (çoklu dil hariç, açıkça istenmedi)
- Kod tabanı taranınca yol haritasındaki maddelerin ÇOĞUNUN zaten var olduğu görüldü: sesli not (Web Speech API, `btn-sesli-not`), GPS "buradaydım" konum damgası (gün kaydında), hava durumu, SGK prim günü takibi + emeklilik tahmini (`sgkCiz`), İş Kanunu 270 saat fazla mesai sınırı takibi, çalışma serisi/streak (`seriHesapla`, 🔥 rozet), kredi kartı takibi, JSON yedek indirme, ve "Ana ekrana ekle" daveti (Android native prompt + iOS elle rehber) — hepsi önceki turlarda kurulmuş
- Gerçekten eksik olan tek şey biyometrikti, bu turda eklendi: `navigator.credentials` (WebAuthn) ile, PIN ekranına "🫆 Parmak izi/Yüz ile aç" düğmesi ve Ayarlar'a "Etkinleştir" düğmesi eklendi. Kayıt (`create()`) ve doğrulama (`get()`) tamamen cihaz üzerinde çalışıyor, sunucu tarafı doğrulama gerektirmiyor (bu, PIN'i hızlandıran yerel bir jest — asıl kimlik doğrulaması zaten Firebase Auth ile yapılmış durumda)
- Platform desteklemiyorsa (`isUserVerifyingPlatformAuthenticatorAvailable()` false dönerse) düğme hiç gösterilmiyor, PIN her zaman yedek olarak kalıyor
- Bilerek BU TURA dahil edilmeyen: OCR fiş okuma (Tesseract.js gibi ~2MB'lık bir kütüphane + CSP değişikliği + gerçek cihazda doğruluk testi gerektiriyor, yanlış okursa yanlış tutar girme riski var — ayrı, dikkatli bir turda ele alınacak)

## 0.0.0.89 — Gerçek "PIN'imi unuttum" akışı
- Kullanıcı eleştirisi: eski PIN kurtarma metni "tarayıcının site verilerini temizle" diyordu — "ne alaka" tepkisi haklıydı, gereksiz ağır/yıkıcı bir öneriydi
- PIN girme ekranına (sadece normal "gir" modunda görünen, oluşturma/değiştirme sırasında gizlenen) bir "PIN'imi unuttum" düğmesi eklendi
- Akış: onay istendikten sonra sadece `localStorage`'daki "pin" anahtarı siliniyor, `auth.signOut()` çağrılıyor — kullanıcı login ekranına düşüyor, e-posta/şifresiyle (zaten bilmesi gereken gerçek kimlik kanıtı) tekrar giriş yapıyor, `onAuthStateChanged` yeniden tetiklenip pin bulunamadığından otomatik olarak "yeni PIN oluştur" akışına giriyor
- Hiçbir puantaj/ödeme/ayar verisi silinmiyor — hepsi zaten Firestore'da (bulutta), sadece cihaza özel PIN kilidi sıfırlanıyor

## 0.0.0.88 — Galeri açılmıyordu: gizli dosya girişi düzeltildi
- Kullanıcı bildirdi: 0.0.0.87'deki düzeltmeye rağmen avatara dokununca galeri hâlâ açılmıyordu
- Kök sebep: `#profil-foto-input` dosya seçici `style="display:none"` ile gizlenmişti — bazı mobil tarayıcılar (özellikle Android WebView/Chrome sürümleri), tamamen render edilmeyen (`display:none`) bir `<input type="file">`'ı JS'ten `.click()` ile tetiklemeyi güvenlik nedeniyle reddedebiliyor, çünkü bunu geçerli bir "kullanıcı jesti" olarak saymayabiliyor
- Düzeltildi: input artık `display:none` yerine "görünmez ama teknik olarak var" tekniğiyle gizleniyor (`position:absolute; width:1px; height:1px; opacity:0; overflow:hidden`) — bu, dosya seçicileri programatik olarak tetiklemenin bilinen, güvenilir standart yöntemi

## 0.0.0.87 — PIN ekranına da profil fotoğrafı ekleme
- Kullanıcı bildirdi: "profil fotoğrafı koyma yeri yok" — 0.0.0.86'da PIN ekranı zorunlu hale gelince, artık hamburger menüdeki (fotoğraf yükleme yeri olan) avatara ulaşmadan ÖNCE PIN ekranıyla karşılaşılıyordu; PIN ekranındaki avatar sadece gösteriyordu, tıklanamıyordu — tavuk-yumurta durumu
- `#pin-avatar`'ın etrafına da aynı sarmal+kamera rozeti deseni eklendi (`#pin-avatar-sarmal`), tıklanınca aynı paylaşılan `#profil-foto-input` dosya seçiciyi tetikliyor, aynı `profilFotoSecildi()` fonksiyonunu kullanıyor — kod tekrarı yok, tek fonksiyon iki yerden de çağrılıyor
- Firestore'a kayıt olduğunda (ayarlar dinleyicisi) zaten PIN ekranı açıksa avatarını canlı güncelleyen kod önceki turda eklenmişti, o sayede yeni fotoğraf hemen görünüyor

## 0.0.0.86 — Zorunlu PIN kilidi (banka uygulaması tarzı)
- Kullanıcı isteği: Yapı Kredi mobil uygulaması ekran görüntüsü referans gösterilerek — profil fotoğrafı + "İyi Geceler, Ad Soyad" karşılaması + 6 haneli PIN noktaları + özel sayısal tuş takımı olan bir kilit ekranı istendi, ve bunun ZORUNLU olması, PIN oluşturmadan/girmeden uygulamaya kesinlikle geçilmemesi istendi ("çıkış girişte gitmesin")
- `#pin-ekran` tamamen yeniden tasarlandı: eski 4 haneli metin kutusu kaldırıldı, yerine avatar (profil fotoğrafı varsa onu, yoksa baş harfi gösterir), dinamik selamlama (saate göre "Günaydın/İyi günler/İyi akşamlar/İyi geceler"), 6 nokta göstergesi, ve dairesel butonlu özel sayısal tuş takımı (1-9, 0, ⌫) geldi
- Durum makinesi (`pinModu`): `olustur1`→`olustur2` (ilk kurulum, iki kez girip onaylatma), `gir` (normal açılış), `dogrula`→`olustur1`→`olustur2` (Ayarlar'dan PIN değiştirme, önce eskisini doğrulatıyor). Yanlış PIN'de noktalar titreşip kırmızı hata mesajı çıkıyor
- `pinEkraniHazirla()` artık `auth.onAuthStateChanged` içine, `kullaniciBilgiYaz()`'ın hemen ardından bağlandı — bu, HER uygulama açılışında (kapat-aç dahil, çünkü Firebase oturumu hatırlıyor ve bu olay yeniden tetikleniyor) çalışıyor, artık isteğe bağlı değil
- Ayarlar'daki eski "PIN'i etkinleştir/kaldır" toggle'ı kaldırıldı (artık kapatılamaz), yerine "🔒 PIN'imi değiştir" düğmesi geldi
- Gerçek koddan çekilen durum makinesi mantığı Node.js'te 3 senaryoyla test edildi: ilk kurulum (oluştur→onayla), ikinci açılış (yanlış PIN reddedilir, doğru PIN kabul edilir), PIN değiştirme akışının doğru modda başladığı — hepsi doğrulandı

## 0.0.0.85 — Profil fotoğrafı ekleme özelliği
- Kullanıcı isteği: hamburger menüdeki profil avatarına dokununca kendi fotoğrafını koyabilsin
- Firebase Storage kurmaya gerek kalmadan: seçilen fotoğraf tarayıcıda kare kırpılıp 200x200'e küçültülüyor, JPEG %75 kalitede base64'e çevrilip doğrudan Firestore'daki ayarlar belgesine (`profilFoto` alanı) kaydediliyor — genelde 15-30 KB civarı kalıyor, Firestore'un 1 MB belge sınırının çok altında
- Yeni `avatarCiz()` fonksiyonu: `ayarlar.profilFoto` doluysa avatarı o fotoğrafla dolduruyor, boşsa eskisi gibi adın baş harfini gösteriyor
- Avatarın köşesine küçük bir 📷 rozeti eklendi (dokunulabilir olduğunu belli etsin diye)
- Profil başlığına "Profili ve ayarları düzenle ›" bağlantısı eklendi — direkt Ayarlar ekranına götürüyor
- CSP zaten `img-src` için `data:` URI'lara izin veriyordu, ek bir CSP değişikliği gerekmedi

## 0.0.0.84 — İşlerim PDF'inde boş/izinli günler eksikti
- Kullanıcı ekran görüntüsüyle bildirdi: bir işin PDF çizelgesinde (TEMMUZ 2026 tablosu) 16, 21, 25 Temmuz gibi günler hiç görünmüyordu — bu günler işaretlenmemiş/boş günlerdi, "izin" kaydı da değildi
- Kök sebep: `isPdfBlobOlustur()`'daki ay-gruplama kodu `t.gunler.filter(g=>g.kazancVar)` ile SADECE kazancı olan (çalışılan) günleri tabloya alıyordu — boş/kayıtsız günler baştan filtreleniyordu. (İzin günleri zaten `kazancVar` sayıldığından bu filtreden etkilenmiyordu, ama tamamen boş günler etkileniyordu)
- Düzeltildi: artık filtre kaldırıldı, `t.gunler` (o dönemdeki HER gün) doğrudan kullanılıyor — normal aylık Puantaj PDF'iyle tutarlı, boş günler "0" olarak, izin günleri "İ" olarak, çalışılan günler kazancıyla birlikte tabloda görünüyor
- Gerçek koddan çekilen `gunIsaret()` mantığı Node.js'te test edildi: hiç kaydı olmayan bir gün eski kodda tablodan düşüyordu, yeni kodda düşmüyor

## 0.0.0.83 — PDF'lerdeki avans tabloları artık asla ortadan bölünmüyor
- Kullanıcı 0.0.0.82'de bile bir avans satırının PDF'te "kaybolduğunu" bildirdi (başlıkta "3 adet" yazıyordu, TOPLAM doğruydu, ama listede sadece 2 satır görünüyordu)
- `isVerileriHesapla()`/`odemeAyi()` mantığı Node.js'te tam bu senaryoyla (aynı 3 avans) test edildi ve KOD SEVİYESİNDE doğru sonuç verdiği doğrulandı (3/3 satır, doğru toplam) — yani hesaplama tarafında bug yoktu
- En olası açıklama: tablo sayfa sonuna yakın başlayınca jsPDF-autotable bir satırı sessizce bir sonraki (görünmeyen/kaydırılmamış) sayfaya itebiliyordu — veri kaybolmuyordu ama kullanıcı fark etmiyordu
- Önlem alındı (kanıtlanamasa da, tekrar olmasın diye): `isPdfBlobOlustur()`, `pdfBlobOlustur()` ve `yilPdfBlobOlustur()`'daki TÜM avans/ödeme tabloları artık çizilmeden ÖNCE gereken yükseklik (satır sayısına göre) hesaplanıyor; sığmayacaksa tüm bölüm (başlık+tablo+toplam) BİRLİKTE yeni sayfaya alınıyor. Ayrıca `rowPageBreak:"avoid"` eklendi — bir satır artık hiçbir zaman ortadan bölünemez, ya tamamı bu sayfada ya tamamı sonrakinde

## 0.0.0.82 — İşlerim'de avans FIFO düzeltmesi + "(tüm aylar)" yazı hatası
- Kullanıcı ekran görüntüsüyle bildirdi: bir işin (Orhan Oypan Semadem, 12 Temmuz - devam ediyor) sadece Ağustos'u paylaşınca, 1 Ağustos'ta alınan avans (5.000₺) Ağustos'un "ALINAN PARALAR" listesinde çıkıyordu — halbuki bu avans, Temmuz'da çalışılıp ödenmeyen hakedişten (FIFO gereği) düşülmesi gerekiyordu, yani Temmuz'a sayılmalıydı
- Kök sebep: `isVerileriHesapla()` (0.0.0.79'da "İşlerim" için yazılan yeni fonksiyon) ödemeleri ham `tarih` alanına göre filtreliyordu — ana Puantaj sisteminde aylar önce düzeltilmiş olan `odemeAyi()`/aitAy/FIFO mantığı buraya hiç taşınmamıştı. Yorum satırında "FIFO farklı işverenler arası anlamsız kalır" denilse de, kod yanlışlıkla AYNI işveren içindeki ay geçişlerinde de ham tarihi kullanıyordu — oysa bu senaryo tam olarak FIFO'nun var olma sebebiydi
- Düzeltildi: artık `odemeAyi(o)` kullanılıyor, iş aralığının ay-ay (`basAy`-`sonAy`) karşılaştırmasıyla. Node.js'te gerçek koddan test edildi: 1 Ağustos'ta alınıp aitAy=Temmuz olan avans artık Temmuz'a doğru sayılıyor, Ağustos'a hiç düşmüyor
- Ayrıca: bir ay tek başına paylaşılınca (örn. sadece Ağustos), alt toplam kutusundaki "(tüm aylar)" ibaresi yanlışlıkla hâlâ görünüyordu — bu da Temmuz'un günlerinin sanki kaybolmuş gibi bir kafa karışıklığına yol açıyordu (kullanıcının asıl şikayeti buydu). Artık sadece işin TAMAMI paylaşılınca bu ibare çıkıyor
- Bu düzeltme hem PDF'i hem "İşlerim" ekranındaki Hakediş/Alınan/Kalan kartlarını aynı anda düzeltiyor (`isVerileriHesapla()` her ikisinin de ortak veri kaynağı)

## 0.0.0.81 — Belirli bir ayı ayrı paylaşma seçeneği
- Kullanıcı sorusu: "İşlerim" PDF'i sadece bir kerede hepsini mi atıyor, yoksa ay ay ayrı da atılabiliyor mu? — o an sadece "hepsi bir arada" mümkündü, ayrı ay seçeneği istendi
- `isVerileriHesapla(is, aySecim)` artık isteğe bağlı `{yil,ay}` parametresi alıyor — verilirse hesaplama, işin gerçek giriş/çıkış sınırlarının İÇİNDE kalacak şekilde sadece o aya kısıtlanıyor
- `isPdfBlobOlustur(is, aySecim)`/`isPdfPaylas(is, aySecim)` aynı parametreyi alıp başlığa ("İŞ RAPORU — AĞUSTOS 2026") ve dosya adına yansıtıyor
- Yeni `isAylarListele(is)` (işin kapsadığı, en az 1 gün çalışılmış ayları listeler) ve `isAySecenekleriCiz()` (bunları tıklanabilir küçük çip düğmeleri olarak çizip tıklanınca `isPdfPaylas(is,{yil,ay})` çağıran ortak fonksiyon) eklendi
- Bu çipler hem "İşlerim" listesinden bir işe dokunulunca açılan detay ekranında, hem de "İşten Çıkış Yap" sonrasında çıkan panelde görünüyor. İş sadece TEK bir ayı kapsıyorsa (bölünecek bir şey olmadığından) çipler hiç gösterilmiyor
- Gerçek koddan çekilen mantık Node.js'te test edildi: 12 Temmuz - 5 Ağustos'u kapsayan bir işte, sadece Ağustos seçilince yalnızca 01-05 Ağustos günleri, sadece Temmuz seçilince yalnızca Temmuz günleri geldi — sınırlar doğru korundu

## 0.0.0.80 — İş PDF'i ay ay ayrı bölümlere ayrıldı
- Kullanıcı bildirdi: "İşlerim" sisteminde bir iş birden fazla ayı kapsıyorsa (örn. 12 Temmuz'da giriş, hâlâ devam ediyor → 5 Ağustos'a kadar), PDF'teki gün gün çizelge TEK uzun tabloda, aylar karışık halde çıkıyordu — kesinlikle ay ay ayrılması istendi
- `isPdfBlobOlustur()` yeniden yazıldı: günler önce `getFullYear()+"-"+ay` anahtarına göre gruplanıyor, sonra HER AY için ayrı bir başlık ("TEMMUZ 2026", "AĞUSTOS 2026") ve ayrı bir tablo (kendi ay-bazlı gün/mesai/hakediş alt toplamıyla) çiziliyor. En altta, tüm ayların toplamını gösteren tek bir GENEL toplam kutusu (Hakediş/Alınan/Kalan) ayrıca var
- Gerçek koddan çekilen ay gruplama mantığı Node.js'te test edildi: 12/07-31/07 arası Temmuz grubuna, 01/08-05/08 arası Ağustos grubuna doğru ayrıştı

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
