# Değişiklik Günlüğü (Changelog)

Bu proje [Anlamsal Sürümleme benzeri](VERSIYONLAMA.md) bir dörtlü numara
kullanır: `0.0.0.X` — X, her güncellemede 1 artar. Uygulama içindeki sürüm
(alt bilgi + "Neler yeni" kartı) ve dağıtılan zip dosyasının adı her zaman
birebir aynıdır.

## 0.1.2.5 — 🔄 Mutabakat bağlantısı otomatik tazeleniyor
- Kullanıcı bildirdi: hakediş 0.1.2.4 ile düzeldi (71.250 ₺) ancak işverene gönderilen bağlantı hâlâ eski rakamları gösteriyordu
- **Sebep**: `mutabakat` belgesi gönderim anındaki değerlerin anlık görüntüsü. Sonradan gün eklenmesi ya da yevmiye değişmesi belgeye yansımıyordu
- 🔄 **`mutabakatDurumCiz()` içinde otomatik tazeleme**: ay ekranı her açıldığında, **henüz onaylanmamış** mutabakat güncel `hesapla()` sonuçlarıyla güncelleniyor (`gunSayisi`, `mesaiToplam`, `artiToplam`, `yevmiye`, `hakedis`, `alinan`, `kalan`). İşveren aynı bağlantıya tıkladığında doğru rakamları görüyor
  - Yalnızca değer farkı varsa yazılıyor (gereksiz Firestore yazımı yok)
  - Hata durumunda sessizce eski rakamlarla devam ediliyor
- 🔒 **Onaylanmış mutabakata dokunulmuyor**: imzalanmış belgenin sonradan değişebilir olması onayın değerini sıfırlardı. Bunun yerine kullanıcıya uyarı gösteriliyor: "Onaydan sonra bu ay değişti (eski → yeni). Yeni hâlini onaylatmak istersen tekrar gönder."
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.2.5`

## 0.1.2.4 — 💰 Hesap kökten sadeleşti: GÜN × GÜNCEL YEVMİYE
- Kullanıcı üç sürüm boyunca aynı şeyi söyledi: **"Günlük yevmiyem kaç TL ise onunla çarpacaksın."** 0.1.2.1'deki ortalama gösterimi ve 0.1.2.2'deki güncelleme düğmesi ikisi de dolaylı çözümdü; asıl sorun hesabın kendisindeydi
- 💰 **`oranBul()` değişti**: gün kaydına mühürlenmiş `uYevmiye` / `uMesai` / `uSaatU` değerleri **artık hesaba girmiyor**. Ayarlardaki güncel yevmiye esas alınıyor
  - Gerekçe: yevmiyeli işçi için hesap `gün × yevmiye`'dir. Mühürlü eski ücretle hesaplamak ne kullanıcının beklentisine ne de işverenle yapılan konuşmaya uyuyordu; mutabakat belgesinde rakamlar tutmuyordu
  - Mühürlü değerler **kayıtta duruyor** (silinmedi) — geçmişte hangi ücretin geçerli olduğu gerekirse görülebilir
  - **Şantiye bazlı ücret korundu**: `v.santiyeId` varsa o şantiyenin yevmiyesi geçerli
  - `uEk` (güne özel yol/yemek) korundu — 0 geçerli bir değer ve güne göre değişebiliyor
- 🧹 **Artık gereksiz kalanlar kaldırıldı**: `ayUcretleriniGuncelle()` fonksiyonu ve düğmesi, `mutabakatOlustur()` içindeki ücret tutarlılık uyarısı, `yevmiyeDegisken` alanı
- **Test**: 20 tam gün (1.500 ₺ mühürlü) + 5 gelmedi günü, ayarda 2.500 ₺ → gün sayısı 20, hakediş **50.000 ₺**. `20 × 2.500` ile birebir tutuyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.2.4`

## 0.1.2.3 — ❌ "Ortalama günlük" kaldırıldı, tutarlılık kaynağında çözülüyor
- 0.1.2.1'de mutabakat tutarsızlığına çözüm olarak "ortalama günlük ücret" gösterilmişti. **Yanlış yaklaşımdı**: kullanıcı yevmiyeli çalışıyor ve "gün × yevmiye" diye düşünüyor; 1.842 ₺ gibi türetilmiş bir rakam hem kafa karıştırıyor hem de çalışma biçimine aykırı
- ❌ `yevmiye` alanı tekrar `ayarlar.yevmiye` (düz günlük ücret) oldu; onay ekranındaki "Ortalama günlük" etiketi ve "farklı ücretler uygulanmış" notu kaldırıldı
- ✅ **Sorun kaynağında çözülüyor**: `mutabakatOlustur()` gönderim öncesi tüm çalışılan günlerin `uYevmiye` değerini güncel yevmiyeyle karşılaştırıyor
  - Tutarlıysa doğrudan gönderiyor
  - Farklı ücretli gün varsa uyarıyor ("gün sayısı × yevmiye ≠ hakediş görünecek") ve `ayUcretleriniGuncelle()` çağrısını öneriyor. Kullanıcı kabul ederse düzeltip tekrar göndermesi isteniyor; iptal ederse mevcut hâliyle gönderiliyor
- Böylece işverene giden belgede daima `gün × yevmiye = hakediş` tutuyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.2.3`

## 0.1.2.2 — 💰 "Bu ayın ücretlerini güncelle" aracı
- 0.1.2.1'deki mutabakat tutarsızlığının **kök nedenine** çözüm: her gün kaydedildiği andaki `uYevmiye` ile mühürleniyor. Bu koruma amaçlı (işveren geriye dönük düşürürse kayıt korunur) ancak **zam durumunda ters çalışıyor** — eski günler eski ücretten kalıyor, toplam düşük görünüyor
- 💰 **`ayUcretleriniGuncelle()`**: görüntülenen ayın günlerini güncel `ayarlar.yevmiye` değerine çeviriyor
  - Yalnızca `girdiGun(v) > 0` olan günler (gelmediği günlere dokunmuyor)
  - Zaten güncel ücretteki günler atlanıyor
  - **Önizleme zorunlu**: kaç gün değişecek, ilk 3 gün için eski→yeni ücret, ayın hakedişi eski→yeni ve fark. `confirm()` ile onay
  - Kilitli aylarda çalışmıyor (`ayarlar.kapali` kontrolü)
  - Firestore `batch()` ile tek işlemde yazılıyor — yarım kalma riski yok
  - Hata durumunda anlaşılır uyarı + `hataKaydet()`
- Düğme: Ayarlar → Ücret ayarları'nın altında, ne işe yaradığını anlatan kısa açıklamayla
- Doğrulandı: `gelmedi` günleri `girdiGun()` içinde zaten 0 sayılıyor — kullanıcının "çalışmadığım günü hesaplamasın" endişesi mevcut kodda karşılanmış durumda
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.2.2`

## 0.1.2.1 — 🐞 Mutabakatta yevmiye tutarsızlığı + kurallar sadeleştirildi
- Kullanıcı onay ekranından bildirdi: "28,5 gün nasıl 52.500 ₺ yapıyor, 2.500'den?"
- 🐞 **Kök sebep**: `mutabakatOlustur()` `yevmiye` alanına **`ayarlar.yevmiye`** (bugünkü ayar) yazıyordu. Ancak hakediş, her günün mühürlü `uYevmiye` değerinden hesaplanıyor. Kullanıcı yevmiyesini dönem içinde/sonrasında yükselttiği için ikisi tutmuyordu
  - 28,5 gün × 2.500 = 71.250 ₺ beklenirken 52.500 ₺ görünüyordu (gerçek ortalama 1.842 ₺/gün)
  - İşveren tutarsızlığı görüp belgeye güvenmezdi — mutabakatın tüm amacı güven olduğu için bu kritik
- ✅ **Düzeltme**: `yevmiye` alanına dönemin **gerçek ortalaması** (`hakedis / gunSayisi`) yazılıyor. Ayrıca `yevmiyeDegisken` bayrağı hesaplanıyor — dönemde birden fazla farklı `uYevmiye` varsa `true`
  - Onay ekranında etiket "Günlük yevmiye" yerine **"Ortalama günlük"** oluyor ve açıklama gösteriliyor: "Bu dönemde farklı günlük ücretler uygulanmış. Her gün kendi ücretinden hesaplanmıştır."
- 📄 **`firestore.rules` kullanıcının canlı kurallarına göre yeniden yazıldı**: kullanıcı Firebase konsolundaki mevcut kurallarını paylaştı (sade, 15 satır). Uzun dosyayı tamamen değiştirmek yerine mevcut `kullanicilar` bloğu **aynen korunup** yalnızca `mutabakat` bloğu eklendi — 45 satır, mobilde yapıştırılabilir, mevcut davranışı bozma riski yok
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.2.1`

## 0.1.2.0 — 🩺 Tanı yanlış alarmları + çift tıklama koruması
- Kullanıcının gönderdiği tanı raporu (0.1.1.8) incelendi. Üç uyarı **yanlış alarm** çıktı; rapor okuyan kişiyi olmayan sorunlara yönlendiriyorlardı
- 🩺 **"Güvenlik kuralları — Başka kullanıcı belgesi okunabildi"**: bu bilinçli tasarım. `kullanicilar/{id}` okuması "Herkes" ekranı için giriş yapmış herkese açık, **yazma yalnızca sahibinde**. Uyarı → bilgi
- 🩺 **"PDF/Excel/Görsel/OCR motoru YÜKLENMEMİŞ"**: 0.0.9.2'den beri bu kütüphaneler talep üzerine yükleniyor; açılışta yüklü olmamaları istenen davranış. Uyarı → bilgi ("ilk kullanımda iner")
- 🩺 **"Mesai saat ücreti girilmemiş"**: 0.0.9.5'te mesai yevmiye katına geçti, 0.0.9.6'da ayar kaldırıldı. Kontrol `ayarlar.yevmiye` üzerinden yeniden yazıldı
- 🛡️ **Çift tıklama koruması**: `.add()` ile yeni kayıt oluşturan üç düğme korumasızdı — `btn-kart-ekle`, `btn-kaza-kaydet`, `btn-plan-ekle`. Hızlı iki dokunuşta aynı kayıt iki kez oluşuyordu. `disabled` bayrağı + `finally` ile serbest bırakma eklendi. Ödeme, masraf, borç ve beklenen düğmelerinde koruma zaten mevcuttu
- **Raporda doğrulanan sağlıklı sonuçlar**: para köprüsü (ekran 16.250 ₺ = hesaplanan 16.250 ₺), 6 kazanç senaryosu, 5 FIFO senaryosu, 5 tarih sınır durumu, artık yıl, ay sorgu sınırı, 22 ekran, 27 fonksiyon
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.2.0`

## 0.1.1.9 — 🛡️ Bozuk kayıt çökme koruması (6 çekirdek fonksiyon)
- 0.1.1.8'de kurulan çalışma-anı test altyapısı kullanılarak fonksiyonlar **sınır ve bozuk değerlerle gerçekten çağrıldı**
- 🛡️ **BULGU: 6 çekirdek fonksiyon `null`/eksik kayıtta `TypeError` fırlatıyordu**
  - `girdiKazanc(null)`, `kisiKazanc(null)`, `girdiGun(null)`, `odemeAyi(null)`, `girisEtiket(null)`, `oranBul(null)`
  - Bu fonksiyonlar her gün kartında, her raporda, her toplamda çağrılıyor. Firestore'da yarım yazılmış tek bir kayıt (ağ kesintisi sırasında) ilgili ekranın tüm çizimini durdururdu — 0.1.1.7'deki ana ekran çökmesiyle aynı mekanizma
  - Düzeltme: her birine giriş koruması (`if(!v) return 0/""` , `oranBul` için `v = {}`)
- **Test**: 10 senaryo — `null`, `undefined`, boş nesne, `{durum:null}`, `{mesai:'abc'}`, geçersiz durum değeri. Hepsi güvenli değer döndürüyor, çökme yok
- 🔍 **Yanlış alarm giderildi**: `trBuyuk` tanımsız göründü; `sabitler.js` içinde tanımlı olduğu tespit edildi. Test ortamı `sabitler.js`'i de yükleyecek şekilde düzeltildi — aksi hâlde var olmayan bir hata "düzeltilecekti"
- 277 fonksiyon + 201 olay dinleyicisi derlemesi yine temiz
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.1.9`

## 0.1.1.8 — 🛡️ Kapsamlı tarama + otomatik kontrol sistemi
- 0.1.1.7'deki `mesaiYaziB is not defined` hatasının aynısı başka yerde var mı diye tarandı
- **Tarama sonucu — temiz**:
  - 277 `function` bildirimi tek tek derlendi (async olanlar `async` sarmalayıcıyla). Yalnızca `ytSonuclariAyikla` şüpheli göründü; incelendi — içindeki `};</script>` metni ayrıştırıcıyı yanılttı, kod doğru
  - `addEventListener` içindeki 201 ok fonksiyonu derlendi — **0 hata**
  - IIFE gövdesi sahte tarayıcı ortamında baştan sona çalıştırıldı — çalışma anı hatası yok. Örnek çağrılar doğru sonuç verdi (`gunIsaret` → `{yev:"X",arti:"/",mesai:"X"}`, `paraKisa(3750)` → `3,8B`, `mesaiOzetMetni(0,1.5)` → `1,5 yevmiye mesai`)
- 🛡️ **Kalıcı kontrol sistemi kuruldu** (`kontrol.sh` + `calisma-testi.js`): her paketleme öncesi otomatik çalışıyor
  1. `node --check` — söz dizimi (app.js, sw.js)
  2. **Sahte tarayıcı ortamında gerçek çalıştırma** — tanımsız değişken, kapsam hatası
  3. HTML etiket dengesi (10 etiket türü)
  4. CSS parantez dengesi
  5. `firestore.rules` parantez dengesi
  6. `manifest.webmanifest` JSON geçerliliği
  7. Sürüm tutarlılığı (`app.js` ↔ `sw.js`)
- **Gerekçe**: 0.1.1.7'deki hata söz dizimi açısından geçerliydi, yalnızca çalışma anında patlıyordu. Yalnız `node --check` bunu yakalayamıyor; 2. adım tam bu boşluğu kapatıyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.1.8`

## 0.1.1.7 — 🚨 ANA EKRAN ÇÖKÜYORDU: tanımsız değişken (0.1.1.1 regresyonu)
- Kullanıcı ekran görüntüsüyle bildirdi: şirket hesap kartında bakiye boş, "Bugün" kartı boş, hafta kazancı yok, ekranda "Bir sorun oldu" uyarısı
- 🚨 **KÖK SEBEP**: 0.1.1.1'de `bugunKazancCiz()` içinde mesai gösterimi güncellenirken `mesaiYaziB` değişkeni **kullanıma sokuldu ancak tanımı eklenmedi**. Uygulanan iki `replace` işleminden yalnızca kullanım tarafı tuttu, tanım tarafı hedefi bulamadı ve sessizce atlandı
  - `bugunKazancCiz()` `anaYukle()` içinde **erken** çağrılıyor (bakiye yazımından önce). `ReferenceError` fırlatınca sonraki tüm çizim adımları çalışmadı: bakiye, avans hareketleri, ay sonu tahmini, hafta kartı
- ✅ **Düzeltme**: eksik tanım eklendi — `mesai` (eski saat), `mYevB` (yeni yevmiye katı) ve `mesaiYaziB` (gösterim metni)
- **Yöntem düzeltmesi**: `node --check` yalnızca söz dizimi hatalarını yakalıyor, tanımsız değişkeni yakalamıyor. Bu sürümden itibaren `new Function(kaynak)` ile **derleme kontrolü** de yapılıyor; hata bu yöntemle bulundu
- Doğrulama: kod baştan sona derlendi, tanımsız değişken hatası yok. Ana ekran çizim zincirindeki 6 fonksiyon (`anaYukle`, `bugunKazancCiz`, `haftaCiz`, `ayBarCiz`, `takvimCiz`, `hepsiniCiz`) mevcut
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.1.7`

## 0.1.1.6 — 🚨 Mutabakat güvenlik denetimi: iki açık kapatıldı
- 0.1.1.4-5'te eklenen mutabakat sistemi güvenlik gözüyle denetlendi
- 🚨 **KRİTİK AÇIK 1 — koleksiyon listeleme**: kural `allow read: if true` yazılmıştı. Firestore'da `read` hem `get` (tek belge) hem `list` (koleksiyon sorgusu) kapsar. Bu hâliyle herhangi biri `db.collection("mutabakat").get()` çağırarak **tüm kullanıcıların** mutabakat kayıtlarını (ad, şantiye, hakediş, alacak) dökebilirdi — anahtar bilmesine gerek kalmadan
  - Düzeltme: `allow get: if true` + `allow list: if false`
- 🔒 **KRİTİK AÇIK 2 — onay değiştirilebiliyordu**: `update` kuralı onay verildikten sonra da onay alanlarının yazılmasına izin veriyordu. Bağlantıyı bilen biri onayı iptal edebilir veya onaylayan adını değiştirebilirdi. İmza yerine geçen bir belgede kabul edilemez
  - Düzeltme: `sadeceOnayAlanlari() && resource.data.onay == false` — onay **bir kez** verilebiliyor, sonrasında değiştirilemiyor. Sahip (işçi) kendi belgesini güncellemeye devam edebiliyor
- **Temiz çıkan kontroller**:
  - `mutabakatGoster()` içinde `kokRef()` kullanımı **0** — onay sayfası işçinin kişisel koleksiyonlarına hiç erişmiyor, yalnızca `mutabakat` belgesini okuyor
  - Ekrana basılan tüm kullanıcı verisi (`isciAd`, `santiye`, `onaylayanAd`, `onaylayanNot`) `esc()` ile kaçırılıyor — XSS yok
  - Belgeye yazılan 14 alan incelendi; not, konum, fotoğraf, telefon gibi hassas alan yok
  - Belge bulunamadığında ve ağ hatasında anlaşılır mesaj gösteriliyor
- ⚠️ `firestore.rules` Firebase konsoluna yüklenmeden bu düzeltmeler etkin olmaz
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.1.6`

## 0.1.1.5 — ✅ Mutabakat: onay durumu görünürlüğü ve tekrar gönderme
- 0.1.1.4'teki mutabakat sistemi denetlendi, **üç eksik** bulundu ve giderildi
- ✅ **Onay durumu görünmüyordu**: işçi bağlantıyı gönderiyor ama patronun onaylayıp onaylamadığını bilmiyordu. `#mutabakat-durum` kartı eklendi — "⏳ Onay bekleniyor" veya "✅ Patron onayladı" (onaylayan adı, sunucu zaman damgası, not). `ayBarCiz()` içinde ve gönderim sonrasında tazeleniyor
- 🔁 **Tekrar gönderme**: aynı dönem yeniden gönderildiğinde yeni anahtar üretmek yerine **mevcut anahtar korunuyor**, rakamlar güncelleniyor. Aksi hâlde işverende birden fazla bağlantı oluşur ve hangisinin geçerli olduğu belirsizleşir
- ⚠️ **Onaylanmış ay koruması**: zaten onaylanmış bir dönem yeniden gönderilmek istenirse `confirm()` ile uyarı veriliyor (onaylayan ve tarih gösterilerek), çünkü `set()` işlemi `onay:false` yazarak mevcut onayı siliyor
- 🔧 **Bileşik indeks gereksinimi kaldırıldı**: ilk tasarım `where("sahipId") + where("donem")` kullanıyordu; Firestore bunun için bileşik indeks ister ve kullanıcının Firebase konsolunda ek kurulum yapması gerekirdi. Bunun yerine dönem→anahtar eşlemesi `localStorage`'da saklanıyor, sorgu tek belge okumasına indi. Okunan belgede `sahipId === kullanici.uid` doğrulaması yapılıyor. Yerel kayıt silinirse durum gösterimi gizleniyor, çökme olmuyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.1.5`

## 0.1.1.4 — 🤝 MUTABAKAT: işveren onay sistemi
- Uygulamanın en büyük eksiği gideriliyor: kayıtlar bugüne kadar **tek taraflıydı**. Bir ödeme anlaşmazlığında "kendi uygulamama yazdım" zayıf bir dayanak. Bu sistem kaydı karşılıklı belgeye dönüştürüyor
- **Akış**: işçi ay sonunda bağlantı üretir → WhatsApp'tan işverene gönderir → işveren **hesap açmadan** açar, özeti görür → "Onaylıyorum" der → sunucu zaman damgasıyla kaydedilir
- 🔒 **Güvenlik tasarımı (üç katman)**:
  1. **Tahmin edilemez anahtar**: 24 karakter, `crypto.getRandomValues` (yedek: `Math.random`), 32 harflik alfabe ≈ 10³⁶ olasılık. 5000 üretimde çakışma yok. Listeleme yok — yalnızca bağlantıyı bilen erişebiliyor
  2. **Asgari veri**: `mutabakat` belgesinde yalnızca o ayın özeti (dönem, şantiye, gün, mesai, artı, yevmiye, hakediş, alınan, kalan). İşçinin diğer koleksiyonlarına erişim yok
  3. **Yazma kısıtı**: `firestore.rules` içinde `diff().affectedKeys().hasOnly([...])` ile işveren yalnızca `onay`, `onayTarih`, `onaylayanAd`, `onaylayanNot` alanlarını yazabiliyor — **tutarları değiştirmesi kural düzeyinde engelli**. Oluşturma yalnızca `sahipId == request.auth.uid` ile, silme yalnızca sahibinde
- **İzole mod**: `?mutabakat=ANAHTAR` parametresi varsa `basla()` içinde erken `return` — giriş akışı hiç başlamıyor, dinleyici kurulmuyor, kişisel veri okunmuyor. Yalnızca tek belge okunuyor
- Onaylanmış mutabakat tekrar açıldığında onaylayan adı, tarihi ve notu gösteriliyor
- ⚠️ **Kurulum notu**: `firestore.rules` dosyası Firebase konsoluna da yüklenmeli; yalnızca uygulama güncellemesi yeterli değil
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.1.4`

## 0.1.1.3 — 🧾 Masraf raporu PDF (fiş fotoğraflarıyla)
- Yeni özellik. Masraflar kaydediliyordu ancak toplu bir belge üretilemiyordu; ay sonunda patrona/muhasebeye tek dosya vermek gerekiyor
- 🧾 **`masrafPdfPaylas(fotolarDahil)`**: mevcut PDF altyapısını kullanıyor (jsPDF + autoTable + Türkçe font), böylece görünüm diğer raporlarla aynı ve tek kaynak korunuyor
  - Tablo: tarih · kategori · açıklama · fiş var mı · ödendi/bekliyor · tutar
  - Alt toplam satırları: masraf adedi + genel toplam, ayrıca **bekleyen tutar**
  - **Kategori dağılımı** bölümü (birden fazla kategori varsa), tutara göre sıralı
  - **Fişlerle birlikte** seçeneğinde her fiş fotoğrafı ayrı sayfada; üstünde tarih, kategori ve tutar
  - Tüm sayfalara "Sayfa N / Toplam" ve alt bilgi
- **Dayanıklılık**: okunamayan fiş atlanıyor (rapor yine üretiliyor), bozuk görsel `addImage` hatası yakalanıyor, kütüphane yüklenemezse anlaşılır uyarı veriliyor, tüm gövde try/catch içinde
- `#masraf-rapor-satir` yalnızca masraf varken görünüyor
- Bağımlılıklar doğrulandı: `pdfTurkceFontKur`, `pdfDosyaPaylas`, `kutuphaneYukle`, `pdfFontlariYukle`, `tarihFormatla`, `hataKaydet` — hepsi mevcut. Masraf kayıtlarında `id` alanı var (fiş çekimi için gerekli)
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.1.3`

## 0.1.1.2 — 👷 Ekip: toplu yoklama işaretleme
- Yeni özellik. Ustabaşı her gün ekipteki 8-10 kişiyi tek tek işaretliyordu; çoğu gün herkes tam çalıştığı için tek dokunuşla işaretleyip yalnızca eksikleri düzeltmek çok daha hızlı
- 👷 **`#yoklama-toplu`**: üç düğme — "Hepsi tam", "Hepsi yarım", "Temizle". Yalnızca ekipte işçi varken görünüyor
- **`yoklamaTopluIsaretle(durum)`**: `ekipListe` üzerinde dönüp `yoklama[id].durum` değerini set ediyor
  - 🔒 **Mesai değerleri korunuyor**: `mesai: Number(mevcut.mesai)||0` — bir işçiye girilmiş mesai toplu işaretlemede silinmiyor. Test edildi
  - Kaydı olmayan işçiler de listeye ekleniyor
  - **Kaydetmiyor**: yalnızca ekrandaki seçimi dolduruyor; kullanıcı düzeltmelerini yapıp "Yoklamayı kaydet"e basana kadar Firestore'a hiçbir şey yazılmıyor. Yanlışlıkla basılması veri kaybına yol açmıyor
  - "Temizle" `confirm()` soruyor ve kaydedilmiş yoklamayı silmiyor — yalnızca ekrandaki seçimi sıfırlıyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.1.2`

## 0.1.1.1 — 🚨 Mesai sistemine geçişte atlanan 8 nokta daha
- 0.1.1.0'daki `kisiKazanc` hatasının ardından **tüm hesap/gösterim fonksiyonları tarandı**: eski `v.mesai` (saat) okuyup yeni `mesaiYev` alanını bilmeyen fonksiyonlar listelendi
- 🚨 **`kazancVar` kontrolü 4 raporda eksikti**: `i.yev!=="0" || Number(v.mesai)>0` — yalnızca mesaiye kalınan gün (durum "gelmedi", mesai dolu) yeni sistemde `v.mesai=0` olduğu için **kazançsız sayılıyor ve rapordan düşüyordu**. Etkilenen: `pdfBlobOlustur`, `raporIcerikUret`, `santiyeBloklariCiz`, `isVerileriHesapla`. Kazanç hesaba giriyor ancak satır belgede görünmüyordu
- 📄 **CSV ve Excel mesai sütunu**: `v.mesai||0` yazıyordu; yeni kayıtlarda 0 çıkıyordu. `gunIsaret(v).mesai` ile X / `/` / XX biçimine bağlandı
- 📅 **`bugunKazancCiz`**: ana ekrandaki "bugün" satırında yeni mesai görünmüyordu
- 📋 **`gunListesiCiz`**: kayıt listesinde yeni mesai görünmüyordu
- **`isVerileriHesapla`**: `mesaiYevToplam` eklendi ve dönüş nesnesine dahil edildi
- Toplama noktalarında `mesaiSaatMik()` / `mesaiYevMik()` kullanımı yaygınlaştırıldı — iki birim asla aynı toplamda birleşmiyor
- **Test**: 5 senaryo (yarım/tam/iki mesai, sadece mesai, eski saat kaydı) `girdiKazanc` ve `kisiKazanc` üzerinde karşılaştırıldı — ikisi de birebir aynı sonuç veriyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.1.1`

## 0.1.1.0 — 🚨 Başkasının puantajında mesai parası hiç sayılmıyordu
- Kullanıcı bildirimi: "mesai kısmına / koyuyoruz, herkesin puantajına bakınca onu göstermiyor, saymıyor — bu çok kritik"
- 🚨 **KÖK SEBEP**: 0.0.9.5'te mesai saat→yevmiye katına geçirilirken `girdiKazanc()` güncellendi ancak **`kisiKazanc()` atlandı**. Bu fonksiyon Kişiler/Herkes ekranında başkasının puantajını hesaplıyor ve yalnızca eski `v.mesai` (saat) alanını okuyordu. Yeni kayıtlarda o alan 0 olduğu için **mesai parası tamamen kayboluyordu**
  - Ölçüm: "X mesai" gününde **−2.500 ₺**, "XX mesai" gününde **−5.000 ₺**, "/ mesai" gününde **−1.250 ₺**
  - Ustabaşı ekibinin hakedişini sistematik olarak düşük görüyordu
- ✅ **Düzeltilen dört nokta**:
  1. `kisiKazanc()` — `mesaiYev` ve `geceYev` alanları eklendi; eski saat hesabı korundu (bir kayıtta ikisi birden olmuyor)
  2. `kisiVeriYukle()` gün listesi — mesai artık X / `/` / XX biçiminde gösteriliyor; eskiden yeni kayıtlarda hiç görünmüyordu
  3. Kişi özet kutusu — `mesaiYevT` toplamı ayrı tutuluyor, dolu olan birim gösteriliyor
  4. `santiyeOzetCiz()` — şantiye dökümünde iki birim ayrı toplanıyor, ortak `mesaiOzetMetni()` ile yazılıyor
- **Ekip yoklaması incelendi, değiştirilmedi**: `ekipGun` kayıtları saat tabanlı (`yok-mesai` girişi saat alıyor) ve kendi içinde tutarlı. Yine de yeni alan gelirse okunacak şekilde savunma eklendi
- Test: 8 senaryo `kisiKazanc` üzerinde (yeni mesai ×3, gece, eski saat, yarım gün, gelmedi+mesai, sade) — 8/8 doğru
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.1.0`

## 0.1.0.9 — 🐞 Ay sonu tahmininde güvenilirlik korumaları
- Son üç sürümde eklenenler (ay tahmini, fotoğraf korumaları, dinleyici düzeltmeleri) kritik gözle denetlendi
- 🐞 **BULUNAN ZAYIFLIK — tahmin az veriyle uçuyordu**: `buAyHak / buAyGun` ortalaması tek güne dayanabiliyordu. Ayın başında 1 gün çalışılıp o gün 5 artı yevmiye alınmışsa ortalama 15.000 ₺ çıkıyor, 22 günle çarpılınca **330.000 ₺** gibi gerçek dışı tahmin üretiliyordu. Ayrıca 1-2 günlük veriyle tahmin her yeni günde binlerce lira zıplıyordu
  - **Koruma 1**: en az 3 işlenmiş gün şartı
  - **Koruma 2**: günlük ortalama tavanı = `ayarlar.yevmiye × 3`. Olağandışı bir gün (çok artı yevmiye) tüm ayın tahminini şişiremiyor
  - **Sessiz kalmıyor**: 1-2 gün varken "Ay sonuna N iş günü kaldı · Tahmin için birkaç gün daha işlemen gerekiyor" gösteriliyor
  - Test: 5 senaryo (1 gün anormal, 2 gün normal, 3 gün, 10 gün normal, 10 gün çok artılı) — hepsi makul
- ✅ **0.1.0.7 fotoğraf korumaları doğrulandı**: `fisOkunamadi` / `dekontOkunamadi` / `fotoOkunamadi` erken çıkışları silme işleminden ÖNCE gerçekleşiyor; `silinenGunFoto` doğru kapsamda tanımlanıp kullanılıyor; `islem.foto` null olduğunda geri alma fotoğrafa dokunmuyor
- ✅ **0.1.0.6 dinleyici düzeltmeleri doğrulandı**: `kartlar`, `planlar`, `beklenenler` — üçünde de hata callback'i tutamacı `null`'a çekiyor, tek kurulum noktası var, yeniden bağlanma yolu açık
- Genel bütünlük: JS söz dizimi, HTML etiket dengesi, CSS parantez dengesi — hepsi temiz
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.0.9`

## 0.1.0.8 — 📈 Ay sonu kazanç tahmini
- **Önce mevcut durum denetlendi**: kullanıcıya önerilen 10 özellikten **6'sı zaten mevcut** çıktı — yıllık izin takibi (`yillikIzinCiz`, kıdem + hak + kullanılan + kalan hesaplıyor), söz takibi (`beklenen-uyari`, vadesi geçmiş uyarısı), konum damgası (`gunKonum`), sesli kayıt (`SesTanima`), ay kapanış hatırlatması (`kapanis-uyari`). Öneriler kontrol edilmeden yapılmıştı; gerçekten eksik olan 4'ten en yüksek değerlisi seçildi
- 📈 **Yeni `#ay-tahmin`**: para kartının altında, kalan iş günü ve tahmini ay sonu tutarı
  - Hesap: `buAyHak / buAyGun` ile **bu ayın gerçek ortalaması** alınıyor, kalan iş günüyle çarpılıyor. Sabit yevmiye kullanılmıyor — artı yevmiye, mesai ve yarım günler ortalamaya dahil
  - Pazar günleri kalan iş gününe sayılmıyor (uygulamanın geri kalanıyla tutarlı)
  - **Gizlenme koşulları**: kalan iş günü 0 (ay bitmiş), ortalama 0 (hiç kayıt yok) veya gizli mod açık. Veri yokken tahmin üretilmiyor
  - Altında "Bu ayki ortalamana göre tahmin — kesin değil" notu
- Test: 4 senaryo (ay ortası, ay sonu, son gün, kayıt yok) — hepsi doğru davranıyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.0.8`

## 0.1.0.7 — 🚨 Fotoğraf yedeklemesi başarısız olsa bile silme yapılıyordu
- Tarama: 169 boş `catch` bloğu risk sınıfına ayrıldı — 140'ı zararsız (localStorage, titreşim, odak, JSON.parse), **29'u veri işlemi içeriyor**. 29'u tek tek incelendi
- 🚨 **BULUNAN KRİTİK HATA — üç yerde aynı desen:**
  - `masrafCiz()`: fiş yedeklenirken `try{...}catch(e){}` — hata yutuluyor, `fisYedek` null kalıyor, ancak bir sonraki satır fişi **yine de siliyor**. "GERİ AL" masrafı geri getiriyor ama fiş fotoğrafı **kalıcı kayıp**
  - `odemeListesiCiz()`: dekontlarda birebir aynı sorun
  - `#btn-gun-sil`: gün fotoğrafında birebir aynı sorun
  - **Düzeltme**: yedek okuma başarısız olursa silme işlemi iptal ediliyor, kullanıcıya anlaşılır uyarı veriliyor, hata `hataKaydet()` ile günlüğe yazılıyor
- 🚨 **İkinci hata — gün kaydetme akışında fotoğraf geri alınamıyordu:**
  - Kullanıcı gün penceresinden fotoğrafı kaldırıp kaydettiğinde `fotolar` kaydı siliniyordu, ancak `toastGeriAl(...)` çağrısına `foto` alanı verilmiyordu. Geri alma mekanizması fotoğrafı restore edebiliyor (`islem.foto`) ama veri hiç gelmiyordu
  - **Düzeltme**: silmeden önce yedekleniyor ve `toastGeriAl`'a `foto: silinenGunFoto` olarak veriliyor
- Doğrulama: `fisOkunamadi`, `dekontOkunamadi`, `fotoOkunamadi`, `silinenGunFoto` — dördü de tanımlı ve kullanımda
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.0.7`

## 0.1.0.6 — 🚨 Üç ekranın veri dinleyicisinde boş hata callback'i
- Talep: hamburger menüdeki tüm ekranlarda derinlemesine kritik hata taraması
- **Denetim kapsamı**: 21 ekran × (HTML yapısı · çizim fonksiyonu · düğme bağlantısı · ölü düğme · boş durum mesajı) + veri çeken 34 fonksiyonun hata koruması + 10 `onSnapshot` dinleyicisinin hata callback'i
- 🚨 **BULUNAN KRİTİK HATA — 3 dinleyicide hata callback'i boştu (`}, ()=>{})`):**
  - `kartlar` (Kredi kartlarım) — en riskli: son ödeme günü güncellenmediği için ödeme kaçırılabilir
  - `planlar` (Planlarım)
  - `beklenenler` (Beklenen ödemeler)
  - **Mekanizma**: Firestore bir dinleyici hata alınca onu KALICI olarak koparıyor, kendi kendine yeniden bağlanmıyor. Tutamaç değişkeni (`dinleyiciKart` vb.) dolu kaldığı için kod "zaten dinliyorum" sanıp yeniden kurmuyordu. Bağlantı bir kez koptuktan sonra ekran sessizce donuyor, yeni kayıtlar hiç görünmüyordu — hata mesajı da yoktu
  - **Düzeltme**: `tumVeriDinle`'de daha önce uygulanan `dusursen()` deseninin aynısı — hata callback'inde tutamaç `null`'a çekiliyor, bir sonraki çağrı dinleyiciyi yeniden kuruyor
  - Doğrulama: `}, ()=>{});` deseni kod genelinde **0**
- **Temiz çıkanlar**: 21 ekranın HTML bölümü mevcut ve dengeli · 118 düğmenin tamamı `app.js`'te bağlı · ölü düğme yok · boş durum mesajları mevcut · veri çeken 34 fonksiyondan 31'i zaten `try/catch` veya `hataGoster` ile korumalı
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.0.6`

## 0.1.0.5 — 🔍 Tam kritik hata taraması (8 başlık)
- Talep: tüm dosyalarda kritik hata taraması
- **Bulunan ve düzeltilen 2 hata:**
  1. 🐞 **`isPdfPaylas()` ve `yilPdfPaylas()` korumasızdı.** `await kutuphaneYukle("jspdf")` / `pdfFontlariYukle()` / `tumOdemeOnbellegiHazirla()` çağrıları try/catch dışındaydı; internet yoksa fonksiyon yakalanmayan hatayla sonlanıyor, kullanıcı düğmeye basıyor ama hiçbir tepki almıyordu. Gövdeler try/catch'e alındı, anlaşılır uyarı ve `hataKaydet()` eklendi
  2. 🔒 **2 `target="_blank"` bağlantısında `rel="noopener"` yoktu** (WhatsApp bağlantıları). Açılan sayfa `window.opener` üzerinden uygulamaya erişebilirdi. `rel="noopener noreferrer"` eklendi — 4/4 tamamlandı
- **Temiz çıkan başlıklar:**
  - Söz dizimi: 5 JS dosyası, manifest JSON, 18 HTML etiket türü dengeli, CSS parantez/yorum dengeli
  - Para hesabı: 14 senaryo doğru (tam/yarım/gelmedi/izin/artı/yeni mesai/gece/eski saat kaydı/mühürsüz ücret/negatif değer + 3 FIFO senaryosu)
  - Çapraz bağlantı: 597 id çakışmasız, 269 fonksiyon tekrarsız, 139 düğmenin tamamı bağlı. JS'in aradığı 3 id ve 1 düğme incelendi — ikisi yorum satırında, biri `createElement` ile üretiliyor, biri `data-goruntu` ile çalışıyor
  - Güvenlik: sabit sır yok, `eval`/`new Function` yok, `innerHTML`'e kaçışsız kullanıcı verisi yok
  - Silme işlemleri: 18 `delete()` çağrısının tamamı ya `confirm()` soruyor ya `toastGeriAlVeri()` ile geri alma sunuyor
  - Ölçek kural sıralaması doğru (kucuk < buyuk < normal < girdi koruması)
  - Yedekleme: 12 koleksiyon; dışarıdaki 4'ü bilinçli (3 fotoğraf koleksiyonu + `cihazlar`)
- Not: 169 boş `catch` bloğu mevcut, çoğu bilinçli (localStorage, titreşim gibi kritik olmayan işlemler)
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.0.5`

## 0.1.0.4 — 🐞 Başka aydaki gün boş açılıyordu (üç yerde)
- 0.1.0.3'te Maaşlar paylaşımı eklenirken fark edilen tuzak (`ayiYukle()` dinleyici kuruyor, veri sonradan geliyor) aynı desenin başka örnekleri için tarandı — **üç yerde daha bulundu**
- 🐞 **Sorun**: ay değiştirilip hemen `modalAc()` çağrılıyordu. `girdiler` önbelleği henüz boş olduğu için gün modalı **kayıt yokmuş gibi** açılıyordu; kullanıcı mevcut kaydını göremiyor ve üzerine yazabiliyordu
  - `aramaCalistir()` → gün sonucuna tıklama (satır ~3606)
  - `aramaCalistir()` → ödeme sonucuna tıklama (satır ~3622)
  - Hafta şeridi → ay sınırını aşan güne tıklama (satır ~4615). Hafta şeridi komşu aya taşabiliyor (1 Eylül Pazartesi ise 30 Ağustos da görünür)
- ✅ **Yeni `ayaGecVeBekle(yil, ay)`**: önce tek seferlik `get()` sorgusuyla o ayın girdilerini çekip `girdiler`e koyuyor, sonra `ayiYukle()` ile canlı dinleyiciyi kuruyor. Üç çağrı noktası `await` ile bu yardımcıyı kullanıyor
- Sorgu başarısız olsa bile dinleyici yine kuruluyor — veri biraz gecikmeli de olsa geliyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.0.4`

## 0.1.0.3 — 📲 Maaşlar: ay detayına PDF + WhatsApp paylaşımı
- Kullanıcı "Maaşlar kısmında PDF/WhatsApp paylaşımı kaldırmışsın" dedi. **Doğrulandı: kaldırılmamış** — kullanıcının ilk yüklediği orijinal `index.html`'de ve 0.0.6.4'te de `goruntu-maaslar` içinde paylaşım düğmesi yok. Özellik hiç var olmamış. Yine de mantıklı olduğu için eklendi
- Kullanıcı tercihi (soruldu): PDF + WhatsApp, paylaşılan şey **bir aya dokununca o ayın detayı**
- 📲 `#ay-detay-modal` içine iki düğme eklendi (`btn-ay-detay-wp`, `btn-ay-detay-pdf`)
- **Mevcut üreticiler yeniden kullanıldı** (`raporPaylas`, `pdfPaylas`) — ikinci bir rapor yazılmadı. Gerekçe: bu projede daha önce aynı düzeltmenin bazı çıktılarda atlanması sorunu yaşandı; tek kaynak bunu yapısal olarak engelliyor
- ⚠️ **Kapatılan tuzak**: her iki üretici de `aktifAy`/`aktifYil` genel değişkenlerine ve `girdiler` önbelleğine bakıyor. Başka bir ay paylaşılırken:
  - `ayiYukle()` KULLANILMADI — o `onSnapshot` dinleyicisi kuruyor, veri sonradan geliyor; beklemeden rapor üretilse **boş çıkardı**
  - Yerine tek seferlik `get()` sorgusu yapılıp sonuç bekleniyor
  - `finally` bloğunda ay, yıl ve `girdiler` her durumda geri konuyor; hata olsa bile kullanıcının baktığı ekran bozulmuyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.0.3`

## 0.1.0.2 — 💰 Takvim altı HAKEDİŞ kutusunda kısaltma kaldırıldı
- Kullanıcı bildirimi: "hakediş kısmı parayı yanlış hesaplıyor". Hesap aslında doğruydu (2.500 tam gün + 1.250 yarım mesai = 3.750) ancak kutu `paraKisa()` ile "3,8B" gösteriyordu; hemen üstündeki kazanç kartında "3.750 ₺" yazdığı için yanlış hesap izlenimi doğuyordu
- ✅ Kutu artık tam rakam gösteriyor: `toLocaleString("tr-TR")`. Ölçüm: Saira Condensed 19px ile kutuya 7 karakter ("125.000") rahat sığıyor, milyonun altında kısaltmaya gerek yok. 1.000.000 ve üstünde `paraKisa()` devrede kalıyor
- Diğer `paraKisa()` kullanımları korundu — grafik ekseni ve dar alanlarda kısaltma doğru davranış
- Bu sürüm 0.1.0.1'deki mesai gösterim düzeltmelerini de içeriyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.0.2`

## 0.1.0.1 — 🐞 Mesai üç ayrı yerde çelişkili gösteriliyordu
- Kullanıcı ekran görüntüsüyle bildirdi: aynı ekranda ay başlığı "0 saat mesai", hafta kutusu "0s", alt özet "0,5 yevmiye" diyordu
- **Kök sebep**: 0.0.9.5'te mesai yevmiye katına geçirilirken yalnızca takvim altı özeti güncellenmişti. `ayBarCiz()` ve `haftaCiz()` hâlâ yalnızca eski `v.mesai` (saat) alanını okuyordu; yeni kayıtlarda bu alan 0 olduğu için "0" gösteriyorlardı
- ✅ Düzeltmeler:
  - Yeni `mesaiOzetMetni(saat, yevmiye)` yardımcısı — iki birimi tek cümlede doğru yazıyor
  - `ayBarCiz()`: "1 gün · 0,5 yevmiye mesai"
  - `haftaCiz()`: `mesaiSaatMik()` ve `mesaiYevMik()` ile iki birim ayrı toplanıyor; dolu olan gösteriliyor (ikisi de varsa yevmiye önde)
  - Takvim altı özetinde ondalık ayracı Türkçe virgüle çevrildi ("0.5" → "0,5")
- Eski saat bazlı kayıtlar "3s" biçiminde gösterilmeye devam ediyor; iki birim karışmıyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.0.1`

## 0.1.0.0 — 🖥️ Güncelleme penceresi arkasında içerik görünüyordu
- Kullanıcı bildirimi: "güncelleme yaşarken arkada özellikler gösteriyor, ne kadar saçma"
- **İki ayrı sebep**:
  1. `#guncelleme-ekrani` zemini `rgba(0,0,0,.72)` — yarı saydam, arkadaki ekran okunabiliyordu
  2. Güncelleme bildirimi geldiğinde açık olan pencereler (özellikle tam ekran "Neler değişti") kapatılmıyordu. Pencere "yenileyince neler değiştiğini göreceksin" derken liste zaten arkada duruyordu — mantık çelişkisi
- ✅ Zemin `var(--beton)` ile tamamen opak yapıldı; `guncellemeBandiGoster()` içinde açık pencereler (`#yenilik-tam`, `#kur-modal`, `#gun-modal`, `#modal-perde`, `#cekmece`, `#perde`) kapatılıyor. Kullanıcı zaten sayfayı yenileyeceği için açık pencereleri korumanın anlamı yok
- Altı seçicinin de HTML'de var olduğu doğrulandı
- Bu sürüm 0.0.9.9'daki `paraKisa()` düzeltmesini de içeriyor (kullanıcı o sürümü yüklemedi)
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.1.0.0`

## 0.0.9.9 — 🐞 `paraKisa()` tutarları yukarı yuvarlıyordu (kullanıcı yakaladı)
- Kullanıcı bildirimi: "yukarıda kazanç 3.750 yazıyor, altta hakediş 4.000 yazıyor — 1 gün çalışmışım, ne kadar mantıksız"
- 🐞 **Kök sebep**: `paraKisa()` binleri `Math.round(n/1000)+"k"` ile tam sayıya yuvarlıyordu. Sonuç: **2.500 ₺ → "3k" (+500 ₺), 3.750 ₺ → "4k" (+250 ₺), 7.500 ₺ → "8k" (+500 ₺)**. Bir para uygulamasında yarım yevmiyeye varan sapma
- **İkinci sorun**: takvim grafiği ayrı bir yuvarlama kullanıyordu (`Math.round(deger/1000)+"K"`), böylece aynı tutar üç farklı biçimde görünüyordu — "3.750 ₺" / "3.8K" / "4k"
- ✅ **Düzeltme**: `paraKisa()` yeniden yazıldı — 1.000–9.999 arası bir ondalık basamakla ve Türkçe "B" (bin) kısaltmasıyla (2.500 → `2,5B`), 10.000 üstü tam sayı (`69B`), milyon üstü `1,5M`. Negatif değerler de doğru işleniyor
- Grafik sütun etiketi ortak `paraKisa()`'ya bağlandı; ayrı yuvarlama kaldırıldı — tek kaynak
- ⏱ **"saat" etiketleri düzeltildi**: 0.0.9.5'te mesai yevmiye katına geçmişti ama takvim altı özeti ve CSV başlığı hâlâ "saat" diyordu. Özet artık `artiToplam > 0` ise "yevmiye", değilse (eski saat bazlı kayıtlar için) "saat" gösteriyor. Takvim lejantında "Mesai (saat)" → "Mesai"
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.9.9`

## 0.0.9.6 — 🗑️ Mesai saat ücreti ayarı kaldırıldı
- 0.0.9.5'in devamı: mesai artık yevmiye katıyla hesaplandığı için saatlik mesai ücreti sormanın anlamı kalmadı
- 🗑️ **`ayar-mesai` (Mesai saat ücreti) alanı arayüzden kaldırıldı.** Girdi `type="hidden"` olarak bırakıldı — `app.js` iki noktada (`ayarYukle`, `ayarKaydet`) bu id'yi okuyor; tamamen silinseydi hata verirdi. Değeri 0 kalıyor
- Yerine kısa bir açıklama kutusu kondu ("Mesai nasıl hesaplanıyor?"), kullanıcı kaldırılan ayarı arayıp kafası karışmasın
- 👁️ **`ayar-saat` ve `ayar-gunsaat` yalnızca saatlik modda görünüyor.** Bu iki alan yalnızca `calismaTipi === "saatlik"` için anlamlıydı ama herkese gösteriliyordu. Mevcut `flex` sarmalayıcıya `#alan-saatlik-grup` kimliği verildi; `ayarYukle()` içinde ve `#ayar-tip` `change` olayında `.gizli` sınıfıyla açılıp kapanıyor (`.gizli` `!important` taşıdığı için satır içi `display:flex`'i eziyor)
- **Saatlik çalışma modu korundu** — 18 kod noktasında kullanılıyor, başka kullanıcılar için geçerli bir çalışma şekli. Yalnızca görünürlüğü moda bağlandı
- 🔒 **Eski kayıtlar etkilenmiyor**: her gün kaydında `uMesai` (o günkü mesai ücreti) mühürlü tutuluyor, hesap ayardan değil kayıttan okunuyor. Test: `mesaiUcret = 0` iken 5 senaryo doğru hesaplandı
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.9.6`

## 0.0.9.5 — ⏱ Mesai saat hesabından X/slash düzenine geçti
- Kullanıcı kararı (üç soruyla netleştirildi): mesai artık saat değil, **yevmiye katı**. `X` = bir tam yevmiye, `/` = yarım. Gün içi artı ile aynı dil, ancak **ayrı sütun** olarak kalıyor
- **Eski kayıtlara dokunulmadı** (kullanıcı tercihi). Dönüştürme senaryosu hesaplandı ve gösterildi: en yakına yuvarlama 1-2 saatlik mesaileri sıfırlıyor, işçi para kaybediyordu. Bu nedenle geçmiş kayıtlar olduğu gibi bırakıldı
- **Veri modeli**: yeni `mesaiYev` ve `geceYev` alanları eklendi; eski `mesai` / `geceMesai` (saat) alanları korunuyor. `girdiKazanc()` önce yevmiye katına bakıyor, yoksa saat hesabına düşüyor — bir kayıtta ikisi birden olmuyor
- **Gösterim**: `gunIsaret()` yeni kayıtları `X` / `/` / `XX` / `4X` biçiminde, eskileri `3s` biçiminde döndürüyor
- **Toplamlar ayrıştırıldı**: iki farklı birim (saat ve yevmiye katı) aynı toplamda birleştirilemez. `mesaiSaatMik()` ve `mesaiYevMik()` yardımcıları eklendi; yevmiye katları artı toplamına, saatler mesai toplamına gidiyor
- Güncellenen noktalar: kaydetme, modal açılışı, "dünü kopyala", kazanç önizlemesi, +/− sayaç sınırları (16 saat → 5 yevmiye), ana ekran/rapor/özet toplamları, HTML etiketleri ve `aria-label`'lar
- 🐞 **Yakalanan hata**: `gunIsaret()` içindeki "çalışılmadı" dalı yalnızca eski `mesai` alanını okuyordu; gelinmeyen bir güne yeni sistemle mesai girilirse gösterimde **boş** görünüyordu. Düzeltildi
- **Uyarı metni düzeltildi**: mesai artık saat ücretine bağlı olmadığı için "mesai saat ücretini gir" uyarısı yanlış yönlendirme olurdu; "günlük yevmiyeni gir" olarak değiştirildi
- **Test**: 9 senaryo (sade tam gün, yarım/tam/iki mesai, artı+mesai, sadece akşam gelme, yarım gün + yarım mesai, gece mesaisi, eski saat kaydı) — hepsi doğru
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.9.5`

## 0.0.9.4 — 🐞 Kayıt arama sessizce boş sonuç veriyordu
- 0.0.9.1'de arama ekranının görseli düzenlenmişti; bu turda **işlevi** incelendi
- 🐞 **BULUNAN HATA**: `aramaCalistir()` `tumGirdilerQS` ve `tumOdemelerQS` önbelleklerinden okuyor, ancak arama ekranı bu önbellekleri **hazırlamıyordu**. `tumVeriDinle()` yalnızca `anaYukle()`, `zamAnalizYap()` ve `ozetDetayYukle()` içinden çağrılıyor
  - Sonuç: uygulama açılıp doğrudan aramaya gidilirse (menü → Kayıt ara) hiçbir sonuç dönmüyor, kullanıcı "kaydım yok" sanıyordu. `if(tumGirdilerQS)` deseni hatayı sessiz kılıyordu
  - Düzeltme: `gorunumSec("arama")` içinde `tumVeriDinle()` tetikleniyor
- ⏳ **"Bulunamadı" / "henüz yüklenmedi" ayrımı**: önbellek hazır değilken de "kayıt bulunamadı" gösteriliyordu. Artık önbellek durumu kontrol ediliyor; hazır değilse "Kayıtların yükleniyor…" mesajı çıkıyor ve arama 1,2 sn sonra kendiliğinden tazeleniyor (kutudaki metin değişmediyse)
- **Kendi eklenen kodda risk kapatıldı**: otomatik tazeleme, önbellek hiç gelmezse (internet yok) sonsuz döngüye girecekti. `aramaTazeSayac` ile en fazla 5 deneme (~6 sn); önbellek geldiğinde sayaç sıfırlanıyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.9.4`

## 0.0.9.3 — 🔔 Bildirim zinciri tanıya bağlandı (5 halka ayrı ayrı test ediliyor)
- Bildirimler bugüne kadar hiç test edilmemişti. **Altyapı denetlendi ve sağlam çıktı**: `VAPID_ANAHTAR` tanımlı, `getToken` kendi service worker'ını veriyor (`serviceWorkerRegistration: kayit` — bu yüzden ayrı bir `firebase-messaging-sw.js` gerekmiyor), `sw.js` içinde `push` ve `notificationclick` işleyicileri var, `periodicsync` akşam hatırlatması kayıtlı, `#btn-bildirim-dene` deneme düğmesi mevcut
- **Eksik olan sistem değil, görünürlüktü**: zincirde beş halka var ve herhangi biri koparsa bildirim gelmiyor, ancak kullanıcı sebebini göremiyordu. Tanı yalnızca `Notification.permission` değerini gösteriyordu
- 🔔 **Tanıya beş ayrı kontrol eklendi**:
  1. Service worker kayıtlı/etkin mi
  2. `pushManager.getSubscription()` — **izin verilmiş olsa bile abonelik olmayabilir**; bu durumda "İzin var ama abonelik yok, bildirimleri kapatıp tekrar aç" yönlendirmesi veriliyor
  3. `cihazlar` koleksiyonunda kayıtlı cihaz var mı (yoksa duyuru ulaşmaz)
  4. `periodicSync` desteği (iOS'ta yok)
  5. `periodicSync.getTags()` ile `aksam-hatirlatma` gerçekten kayıtlı mı
- Pratik faydası: "bildirim gelmiyor" diyen kullanıcıya tanı raporu istenebiliyor; rapor zincirin nerede koptuğunu ve ne yapılması gerektiğini yazıyor
- Kontrol sayısı 138 → 147
- Yalnızca `app.js` (tanı bölümü) değişti; `style.css` bir önceki sürümle aynı
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.9.3`

## 0.0.9.2 — ⚡ Ağır kütüphaneler talep üzerine yüklemeye alındı
- İlk performans ölçümü yapıldı: gzip'li ilk yük **246,6 KB** (app.js 164 + style.css 38,8 + index.html 40,1 + sabitler 3,4). Açılışta **10 dış betik** yükleniyordu, hiçbiri `defer`/`async` değildi
- **Tespit**: 10 betiğin 5'i açılışta gereksiz — SheetJS (Excel), jsPDF + autotable (PDF), html2canvas (görsel), Tesseract (fiş okuma). Ham ~1,2 MB / sıkıştırılmış ~350 KB. Yalnızca ilgili işlem yapılırken gerekiyorlar
- ⚡ **Yeni `kutuphaneYukle(ad)`**: `KUTUPHANE_ADRES` ve `KUTUPHANE_HAZIR` haritalarıyla çalışıyor. Aynı anda gelen çağrılar tek indirme yapıyor (söz saklanıyor); başarısızlıkta söz sıfırlanıp tekrar denenebiliyor. jsPDF ve autotable **sırayla** yükleniyor (autotable jsPDF'e bağımlı, paralel yükleme bozardı)
- Bağlanan noktalar: `excelIndir` (xlsx), üç PDF yolu (`jspdf` + font yüklemesiyle paralel), `pdfResimBlobOlustur` (html2canvas + jspdf), fiş okuma düğmesi (tesseract)
- 🐞 **Yakalanan regresyon**: `btn-masraf-ocr` görünürlüğü `if(window.Tesseract)` koşuluna bağlıydı. Kütüphane artık açılışta yüklenmediği için düğme **kalıcı olarak gizli kalacaktı**. Koşul kaldırıldı; düğme her zaman görünüyor, tıklamada "Fiş okuyucu hazırlanıyor…" bildirimiyle kütüphane yükleniyor, yüklenemezse anlaşılır hata veriliyor
- Mevcut varlık kontrolleri (`typeof XLSX === "undefined"`, `!window.jspdf`) korundu — kütüphane gelmezse uygulama çökmüyor. PDF için `pdfYazdir()` yedeği zaten mevcut
- Service worker bu adresleri önbelleğe aldığı için (0.0.7.0) ikinci kullanımda ağ beklemesi yok
- Açılışta kalan betik: 5 Firebase modülü (auth/firestore için şart)
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.9.2`

## 0.0.9.1 — 🎨 Tasarım turunda atlanan 8 ekran tamamlandı (yalnızca CSS)
- **Önce mevcut durum kontrol edildi**: "yeni kullanıcı karşılaması" önerilecekti ancak `#rehber-kart` zaten mevcut ve çalışıyor (3 adımlı, `rehberKapandi` ile kalıcı kapatma, yevmiye girilince 1. adım ✅ oluyor). Öneri iptal edildi — var olanı tekrar önerme hatası tekrarlanmadı
- **Ölçüm**: tasarım turundan geçmemiş 8 ekran bulundu — Kredi kartları (23 öğe), Başarımlar (8), Gündem (8), Notlarım (7), Planlarım (7), Video (5), Kayıt arama (3), Canlı TV (2). Toplam 63 öğeden yalnızca 1'inin CSS tanımı vardı
- 🎨 Yapılanlar:
  - `#liste-kartlar`: hafif degradeli kart yüzeyi, `.tutar` 17px/800, `#kart-toplam` sarı vurgulu
  - `#rozet-grid`: `repeat(auto-fill, minmax(84px,1fr))` ızgara; seviye kartı ve ikonu vurgulandı
  - `#arama-sonuclar`: kart ritmi + kesik çizgili boş durum; `#arama-kutu` 16px (iOS yakınlaştırma koruması)
  - `#liste-notlar`: sol renk şeridi, `white-space:normal` — uzun notlar artık kırpılmıyor
  - `#haber-liste`, `#video-sonuclar`: içerik kartları, başlıklar çok satırlı
- **Yakalanan hata**: `#video-liste` diye kural yazılmıştı ancak HTML'deki gerçek id `#video-sonuclar`. Hedef doğrulaması sırasında bulundu ve düzeltildi — hedefsiz kural bırakılmadı
- Yalnızca `style.css`; `app.js` ve `index.html` bir önceki sürümle `diff` alınarak doğrulandı, fark yok
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.9.1`

## 0.0.9.0 — 📦 Yeniden paketleme (0.0.8.8 + 0.0.8.9 içeriği)
- Kullanıcı 0.0.8.7'de kalmıştı; aynı dosya adıyla tekrar indirme sorunu nedeniyle yeni sürüm numarasıyla paketlendi
- İçerik değişmedi; 0.0.8.8 (X/XX gösterimine dönüş) ve 0.0.8.9 (artı kırpılması + ondalık ayracı) düzeltmelerini taşıyor
- Doğrulama: `gunDurumAdi`/`gunArtiAdi` kalıntısı 0, `EK YEVMİYE` başlığı 0, ham `i.yev` gösterimi yerinde, PDF başlıkları `YEVMİYE`/`GÜN İÇİ ARTI`
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.9.0`

## 0.0.8.9 — 🐞 Artı yevmiye 3'ten sonra kırpılıyordu + mesaide ondalık ayracı
- Kullanıcı isteği: "artı ve mesailerde de sıkıntı var mı bak"
- ✅ **Hesap doğrulaması temiz**: `girdiKazanc()` kullanıcının gerçek PDF satırlarıyla test edildi — 0,5 artı → 3.750 ₺, 2 artı → 7.500 ₺, tam+mesai, yarım gün, gelmedi+mesai, tam+artı+mesai. **8/8 doğru**. Toplam satırı da tutuyor (22,5 gün · 5,5 artı)
- 🐞 **BULUNAN HATA: `gunIsaret()` artıyı 3'te kırpıyordu.** `"X".repeat(Math.min(tamA,3))` — 4 artı da 5 artı da `"XXX"` olarak gösteriliyordu. Kazanç sütunu doğru hesaplanıyor ancak artı sütunu yanlış; imza alanı bulunan bir belgede işveren 3 sayarken işçi 5 bekliyor
  - Düzeltme: 3'e kadar geleneksel X gösterimi korundu (`X`, `XX`, `XXX`, `X/`, `XX/`, `XXX/`), 4 ve üstü sayıyla — `4X`, `5X`, `7X`. Kullanıcının mevcut verisindeki hiçbir değer değişmiyor
- 🐞 **Mesaide İngilizce ondalık ayracı**: `m+"s"` doğrudan JS sayısını yazdırdığı için 2,5 saat `"2.5s"` görünüyordu. Uygulamanın geri kalanı (`paraFmt`, `sayi`) virgül kullanıyor. `String(m).replace(".", ",")` ile Türkçe ayraca çevrildi → `"2,5s"`
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.8.9`

## 0.0.8.8 — ↩️ Rapor gösterimi geri alındı (X / XX sektör standardıymış)
- Kullanıcı, eski paylaşım görselini göstererek "bu şekilde olması lazım" dedi
- **Hatalı varsayım**: 0.0.6.5–0.0.6.6 ve 0.0.8.7'de rapor çıktılarındaki `X` / `/` / `XX` işaretleri "patron ters okur" gerekçesiyle `Tam` / `Yarım` / `+2 yevmiye` biçimine çevrilmişti. Ancak **X, Türkiye'de inşaat puantajının yerleşik gösterimi** — işveren ve ustabaşı bu notasyonu zaten biliyor. Sektörün kendi dili "anlaşılmaz" sayılıp değiştirilmiş
- **İkinci hasar**: yazıya çevirme sütun genişliğini 6→13 karaktere çıkarmış, WhatsApp'taki tek aralıklı tablo düzeni bozulmuştu
- ↩️ **Tam geri alma**: `gunDurumAdi()` ve `gunArtiAdi()` fonksiyonları tamamen kaldırıldı; 13 kullanım noktası ham gösterime döndürüldü
  - PNG görseli (`isr.yev`, `isr.arti`, başlık `["TARİH","YEVMİYE","ARTI","MESAİ"]`)
  - WhatsApp metni (`kolon(i.yev,9) + kolon(i.arti,6)`, başlık ve lejant)
  - Üç `autoTable` PDF'i ve HTML-tablo PDF'i (`"TARİH","YEVMİYE","GÜN İÇİ ARTI"`)
- **Doğrulama**: değişiklik öncesi sürümle (0.0.6.4) 9 ayrı nokta karşılaştırıldı — hepsi birebir aynı
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.8.8`

## 0.0.8.7 — 🔍 Raporlardaki "EK YEVMİYE" sütunu da yazıya çevrildi
- Kullanıcı, kendi PDF'ini inceleyerek fark etti: 0.0.6.5–0.0.6.6'da `DURUM` sütunu simgeden yazıya çevrilmişti (`X` → `Tam`) ancak **`GÜN İÇİ ARTI` sütununa dokunulmamıştı**. Aynı tabloda iki farklı dil kalmıştı
- **Somut sorun** (kullanıcının PDF'inden): `15/08 · Tam · XX · 7.500 TL`. `gunIsaret()` artı yevmiyeyi `"X".repeat(tam) + (yarım ? "/" : "")` biçiminde kodluyor — içeride anlamlı ama raporu okuyan işveren için anlamsız. "XX"in neden 7.500 TL ürettiği anlaşılmıyordu (2.500 + 2×2.500)
- **İkinci karışıklık**: `"0"` hem `DURUM` sütununda "gelinmedi" hem `ARTI` sütununda "ek yok" anlamında kullanılıyordu
- ✅ **Yeni `gunArtiAdi()`**: `"XX"` → `"+2 yevmiye"`, `"X/"` → `"+1,5 yevmiye"`, `"/"` → `"+0,5 yevmiye"`, `"0"` → `"—"`. Ondalık ayracı Türkçe virgül. 7 senaryo test edildi, 7/7 doğru
- **Altı çıktıda birden uygulandı**: WhatsApp metni, PNG görseli, üç `autoTable` PDF'i ve HTML-tablo PDF'i. Kalan ham `.arti` kullanımı taranarak sıfırlandığı doğrulandı
- **Sütun başlığı** 4 yerde `GÜN İÇİ ARTI` → `EK YEVMİYE`; PNG başlığı `ARTI` → `EK YEVMİYE`; WhatsApp sütun genişliği 6→13 karakter
- WhatsApp lejantına ek açıklama: "+1 yevmiye = o gün fazladan bir yevmiye"
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.8.7`

## 0.0.8.6 — 🐞 Devre dışı düğme göstergesi + 22 erişilebilirlik etiketi
- Kullanıcı isteği: "harf harf incele, hata yoksa yeni özellik/tasarım ekle"
- **Kod mantığı denetimi — hata bulunamadı**: `if` içinde atama yok, boş koşul bloğu yok, erişilemez kod yok. `==` kullanılan 8 yer tek tek incelendi; hepsi `==null` deseni (null + undefined birlikte yakalar), bilinçli. `await`siz görünen 6 async çağrı incelendi; hepsi "başlat ve bekleme" niteliğinde
- 🐞 **BULUNAN HATA: `:disabled` için hiç CSS kuralı yoktu.** Kod 6 noktada düğmeyi geçici devre dışı bırakıyor (`btn.disabled = true` — gün kaydetme, PDF üretimi, OCR, tanı testi, ödeme kaydetme). Düğme devre dışıyken **görsel olarak hiç değişmiyordu**: kullanıcı basıyor, tepki alamıyor, işlemin sürdüğünü anlamadan tekrar basıyor
  - `button/​.btn/​input/​select:disabled` → `opacity:.45`, `cursor:not-allowed`, `pointer-events:none`; `.btn-sari:disabled` ayrıca sarı zeminini kaybediyor
- 🔊 **22 düğmede `aria-label` yoktu.** Yalnızca simge içeren düğmeler (`✕`, `−`, `＋`, `👁️`, `⌫`, `➤`, `‹`, `›`) ekran okuyucuda isimsiz okunuyordu. PIN tuşları (rakamlar) zaten anlamlı olduğu için hariç tutuldu. Hepsine eylem odaklı Türkçe etiket eklendi
- ⌨️ **Klavye odak halkası genişletildi**: mevcut 10 `:focus-visible` kuralı düğme/girdi/bağlantıların çoğunu kapsamıyordu. Genel bir kural eklendi (`outline:2px var(--sari)`). `:focus-visible` yalnızca klavye odağında devreye girdiği için dokunmatik kullanımı etkilemiyor
- Yeni CSS ölçek bloklarının ÜSTÜNE eklendi; sıralama doğrulandı (`disabled` < `buyuk` < girdi koruması)
- HTML dengesi korundu (button 231/231, div 571/571); `aria-label` sayısı 21 → 43
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.8.6`

## 0.0.8.5 — 🔍 Tam denetim + yeniden biriken ölü CSS temizliği
- Kullanıcı isteği: "dosyaları incele, sorun nerelerde var"
- **Denetim sonuçları — uygulamada hata bulunamadı:**
  - Söz dizimi: 5 JS dosyası ✓, `manifest.webmanifest` geçerli JSON ✓
  - Yapı: 16 HTML etiket türünde denge ✓, CSS parantez ve yorum dengesi ✓, sürüm tutarlılığı ✓
  - 594 `id` — tekrar eden yok; 137 düğme — ölü yok; 264 fonksiyon — tekrar tanımlanan yok
  - JS'in aradığı 3 id HTML'de yok (`ayar-kumbara`, `cuzdan-tarih` yorum satırında; `cekmece-surum-rozet` `createElement` ile üretiliyor) — yanlış alarm
  - JS'in ürettiği 4 sınıf CSS'te tanımsız (`imza`, `pdf-rapor` PDF belgesinin kendi stilinde; `secili-` dinamik birleştirme; `ozet` PDF içi) — yanlış alarm
  - Son 20 sürümde eklenen 10 bileşen (katlanır kartlar ×3, gün modalı detayı, takvim özeti, boş gün parası, sabit eylem çubuğu, tam ekran yenilik, tanı ekranı, ölçek seçici) — hepsi html/js/css üçlüsüyle bağlı ✓
  - Katlanır kartlarda iç içelik taraması: gerçek iç içe kart 0 ✓
  - Yedekleme 12 koleksiyon; dışarıdakiler bilinçli (3 fotoğraf koleksiyonu + `cihazlar`) ✓
  - Ölçek kural sıralaması: `kucuk` < `buyuk` < `normal` < girdi koruması ✓
- 🧹 **Bulunan gerçek sorun: gölgelenmiş CSS yeniden birikmiş.** `.ozet-kut` 6×, `.liste li` 6×, `.kart` 5×, `.banka-kart .bakiye` 5×, `main` ve `.topbar h1` 4× yeniden tanımlanmış. 0.0.6.1'de bir kez temizlenmişti; 0.0.7.5–0.0.8.4 arasındaki tasarım turlarında tekrar oluşmuş
  - **46 tamamen gölgelenmiş kural silindi** (yalnızca özellikleri sonraki tanımın alt kümesi olanlar; kısmi gölgelenmelere dokunulmadı). Ölçek blokları ve `@keyframes` korundu
  - **Doğrulama**: 1159 (seçici, özellik) çiftinin nihai değeri silme öncesi/sonrası karşılaştırıldı → **0 fark**. Görünüm birebir korundu
  - CSS 133 → 131 KB
- Yalnızca `style.css`; `app.js` ve `index.html` bir önceki sürümle aynı
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.8.5`

## 0.0.8.4 — 📏 İkinci küçültme turu + "Büyük" ölçek kurtarıldı
- Kullanıcı bildirimi (ikinci kez): "uygulamaya girdiğimde her şey kocaman çıkıyor, düzelt". 0.0.6.0'daki tur yetersiz kalmış
- **Önce doğrulandı**: 0.0.8.3'te `font-size`'a hiç dokunulmamıştı (yalnızca `border-radius`), yani büyüme olmamıştı — mevcut değerler zaten yetersizdi
- 📏 **Varsayılan (`kucuk`) ölçek bir kademe daha indirildi**: `body` 13.5→12.5, bakiye 36→32, `.kart h2` 15→14, `.liste .baslik` 13→12.5, `.liste .tutar` 15→14, `.ozet-kut .deger` 21→19, takvim rakamı 14.5→13.5, `.topbar h1` 18→16.5, `.ay-bar .ay-ad` 20→18, çekmece 13.5→12.5. Kart dolgusu 12→11, `main` 10→9, liste satır dolgusu 10→9px
- 👆 **Dokunma hedefleri korundu**: yalnızca yazı boyutları düştü; düğme yükseklikleri, `.yok-btn`, `.hamburger` gibi basılan alanlar değişmedi
- 🐞 **YAKALANAN HATA — "Büyük" ölçek sessizce bozuluyordu.** Yeni `html[data-olcek="kucuk"]` kuralları dosya sonuna eklenince mevcut `buyuk` kurallarının ALTINA düştü; aynı özgüllükte sonraki kural kazandığı için kullanıcı "Büyük" seçse bile küçük değerler geçerli kalacaktı
  - **Aynı hata 0.0.6.0'da da yapılmıştı** (orada da yayın öncesi yakalanmıştı). Bu kez de yayınlanmadan önce sıra kontrolü yapılıp `buyuk` ve `normal` blokları en sona yeniden yazıldı
  - Doğrulama: son kural konumları `kucuk` < `buyuk` < `normal`; bakiye değerleri 32 / 40 / 50px olarak üç ölçekte farklı
- Girdi alanları `@media (pointer: coarse)` altında her ölçekte 16px (iOS odaklanma yakınlaştırması)
- Yalnızca `style.css`; `app.js` ve `index.html` bir önceki sürümle aynı
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.8.4`

## 0.0.8.3 — 📐 Tasarım sistemi denetimi: köşe yarıçapları ölçeğe oturtuldu
- Kullanıcı isteği: "nasıl tasarım olmuş bak incele". Bu kadar sürümden sonra bütünün tutarlılığı ilk kez ölçüldü
- **Ölçüm sonuçları** (126 KB, 935 kural, 2925 satır):
  - `border-radius`: **24 farklı değer** — 13, 15, 17, 18, 19px gibi çoğu tek kullanımlık, yani tesadüfi
  - `font-size`: 42 farklı değer
  - Sabit renk kodu: 138 kullanım / 88 farklı renk; `var(--…)` 404 kullanım → %25 sabit
- 📐 **Köşe yarıçapları 24 → 10'a indirildi.** Ölçek: 2 / 3 / 6 / 10 / 12 / 16 / 20 (+ bilinçli istisnalar)
  - Kural: her değer en yakın basamağa yuvarlandı, ancak **sapma 2px'i aşıyorsa dokunulmadı** (o değer bilinçli seçilmiş demektir)
  - 26px ve 28px (alt sayfa üst köşeleri) ve 999px (hap biçimi) korundu; `border-radius:50%` kullanan 16 yuvarlak öğenin tamamı değişmedi
  - 51 değer güncellendi; ortalama sapma **1,3px**, en büyük sapma 2px
- **Doğrulama**: eski/yeni CSS'te `border-radius` değerleri maskelenerek karşılaştırıldı — başka hiçbir fark yok. `app.js` ve `index.html` de bir önceki sürümle aynı
- ❌ **Yazı boyutlarına bilinçli olarak dokunulmadı.** 42 farklı değerin 6'sı tek kullanımlık ama hepsi büyük başlık ölçüleri (29–52px), yani bilinçli. Ayrıca 0.0.6.0'da "her şey kocaman" şikayeti üzerine toptan küçültme yapılmıştı; boyutlara yeniden müdahale o sorunu geri getirebilirdi. Ölçüldü, kayda geçirildi, değiştirilmedi
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.8.3`

## 0.0.8.2 — ✏️ Başlık ve isimlendirme iyileştirmesi (22 isim)
- Gerekçe: 0.0.5.4 ve 0.0.8.1'de kartlar katlanınca **başlıklar arayüzün kendisi oldu** — kapalı kartta kullanıcının gördüğü tek şey isim. İsimlendirme kalitesi bu noktada görsel tasarım kadar belirleyici
- 🔍 **Çakışan/belirsiz başlıklar tespit edilip düzeltildi:**
  - `🌙 Görünüm` + `🎨 Uygulama teması` — iki kart aynı şey sanılıyordu. İçerikleri incelendi: ilki karanlık mod + yazı boyutu, ikincisi renk seçimi → `🌙 Karanlık mod ve yazı boyutu` / `🎨 Renk teması`
  - `🕌 Namaz Vakitleri` **iki ayrı araçta birebir aynı isimdeydi**. İçerikleri farklı (`vakit-il`/`vakit-liste` şehir bazlı liste; `btn-namaz`/`namaz-sonuc` sonraki vakit sayacı) → `🕌 Namaz vakitleri — şehrine göre` / `🕌 Sonraki vakte ne kadar var`
- ✏️ **Ne yaptığı anlaşılmayanlar açıldı**: `Depolama` → `Uygulama takılırsa — önbelleği temizle`; `Tutar onarımı` → `Eski kayıtlarda tutar düzeltme`; `Duyuru kutusu` → `Geliştiriciden duyurular`; `Hata günlüğü` → `Hata kayıtları (destek için)`; `Bağlantı testi` → `İnternet ve sunucu testi`; `Yedek` → `Yedek al / geri yükle`; `Hesap` → `Hesabım ve çıkış`; `SGK / Emeklilik` → `SGK gün sayım ve emeklilik`; `Mesai ücreti kontrolü` → `Mesai ücretin doğru mu?`; `İnşaat hesaplayıcıları` → `İnşaat hesapları (beton, boya, tuğla)`; `Emek karnem` → `Emek karnem — toplam emeğin`
- **Büyük/küçük harf tutarlılığı**: `Gürültü Ölçer`, `İş Güvenliği Köşesi`, `Su Terazisi`, `İş Kazası Defterim`, `Acil Durum Kartım`, `İşçi Kimlik Kartım`, `Tuğla Ustası` — Türkçede özel ad olmadıkları hâlde her kelime büyük harfle başlıyordu; cümle düzenine çevrildi
- Yalnızca `index.html` metinleri; hiçbir `id`, sınıf veya kod değişmedi. HTML dengesi doğrulandı (div 571/571, h2 85/85)
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.8.2`

## 0.0.8.1 — ⚙️ Ayarlar ekranı akordeona çevrildi
- Tasarım sırası devam: Puantaj → Para → Rapor → Sosyal/ekip → Araçlar-Ayarlar (bu sürüm)
- ⚙️ **Ayarlar ekranı 18.052 karakter, 18 kart, hepsi açıktı.** Araçlar ekranındaki (0.0.5.4) sorunun aynısı: aranan ayarı bulmak için sayfayı baştan sona taramak gerekiyordu
  - 14 kart `.ayar-kart.kapali` yapısına çevrildi; **Ücret ayarları açık bırakıldı** (en sık kullanılan ve tüm hesabı etkileyen bölüm)
  - Akordeon: bir bölüm açılınca diğerleri kapanıyor, açılan karta `scrollIntoView`
  - Klavye erişimi: `role="button"`, `tabindex="0"`, `Enter`/`Space`
  - HTML dengesi doğrulandı (div 571/571, h2 85/85)
- **Risk denetimi**:
  - Kapalı kart içindeki öğelere JS erişimi kontrol edildi — `display:none` öğeler okunabildiği için `ayar-hafif`, `ayar-yevmiye`, `bildirim-durum` gibi alanların okunması/yazılması etkilenmiyor
  - `scrollIntoView` / `focus()` / `getBoundingClientRect` çağrısı yapan ayar öğesi yok (bunlar kapalı öğede çalışmaz)
  - Ayarlara yönlendiren iki derin bağlantı (`btn-rehber-yevmiye` ve mesai ücreti uyarısı) incelendi; ikisi de Ücret ayarlarını hedefliyor, o kart açık kaldığı için yönlendirme boşa düşmüyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.8.1`

## 0.0.8.0 — 👥 Sosyal, ekip ve liste ekranları: görsel tasarım (yalnızca CSS)
- Tasarım sırası: Puantaj (0.0.7.5–7.7) → Para (0.0.7.8) → Rapor/analiz (0.0.7.9) → Sosyal/ekip (bu sürüm)
- **Yalnızca `style.css`**; `app.js` ve `index.html` bir önceki sürümle `diff` alınarak doğrulandı — fark yok
- **Tespit**: `#liste-isciler`, `#liste-ekip-ozet`, `#kisiler-liste`, `#liste-planlar`, `#isler-liste`, `#liste-maaslar`, `#kisi-gunler`, `#kisi-odemeler` — sekizinin de görsel tanımı yoktu, hepsi genel `.liste` stilindeydi. İşçi kaydı, plan bağlantısı ve maaş satırı aynı görünüyordu
- 👥 Yapılanlar:
  - Sekiz listenin tamamı kart ritmine alındı (`--girdi` zemin, 11px köşe, 7px aralık)
  - **Ekip**: asıl bilgi işçi adı → `.baslik` 14.5px/700; `#liste-ekip-ozet .tutar` 16px/800
  - **Kişiler**: `.rozet` yuvarlak (40px, `border-radius:50%`) — kişi listesi olduğu görsel olarak belli
  - **Kişi detayı**: `#kisi-gunler` / `#kisi-odemeler` satırları `--kart` zemin + kenarlık ile ayrıştırıldı; başkasının verisine bakıldığı belli olsun, kendi kayıtlarıyla karıştırılmasın
  - **İşlerim**: `.rozet` 40px/12px köşe, `.baslik` 14.5px/700
  - **Maaşlar**: para listesi olduğu için 0.0.7.8'deki dille hizalandı (`.tutar` 17px/800)
  - **Planlar**: uzun bağlantı metinleri `text-overflow:ellipsis` ile taşmıyor
  - Boş liste kutuları beş ekranda tutarlı (kesik çizgili çerçeve)
- Not: `#isler-liste` ilk taramada `is-liste` sanılmıştı; HTML'den gerçek id doğrulanarak düzeltildi — hedefsiz kural yazılmadı
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.8.0`

## 0.0.7.9 — 📊 Rapor ve analiz ekranları: görsel tasarım (yalnızca CSS)
- Tasarım sırası devam: Puantaj (0.0.7.5–7.7) → Para (0.0.7.8) → Rapor/analiz (bu sürüm)
- **Yalnızca `style.css` değişti**; `app.js` ve `index.html` bir önceki sürümle `diff` alınarak doğrulandı — fark yok
- **Tespit**: `#liste-santiye-ozet`, `#hedef-icerik`, `#yil-icerik`, `#grafik-karsi`, `#gg-kart` için görsel tanım yoktu. Sorun rakamların yanlışlığı değil, hepsinin aynı görsel ağırlıkta olması — kullanıcı neye bakacağını seçemiyor
- 📊 Yapılanlar:
  - `#liste-santiye-ozet` satırları kart biçimine alındı (para ekranlarıyla aynı dil), tutar 16px/800
  - `#grafik-karsi` (geçen aya göre karşılaştırma) kutuya alındı, sol renk şeridi eklendi
  - `#gg-grafik` köşeleri yumuşatıldı, `#gg-kart` başlık boşluğu düzenlendi
  - `.yil-tablo` satırlarına basma geri bildirimi
  - `#hedef-icerik` rakamları Saira Condensed'e alındı
  - **Yoğunluk**: Hesap özetinde 12, Yıl dökümünde 2 kart var; `#goruntu-ozet .kart` ve `#goruntu-yil .kart` alt boşluğu 11→9px, başlıklar 15.5→14.5px. Aynı bilgi, daha az kaydırma
- İncelenip **değiştirilmeyenler**: `#sim-sonuc` ve `#gg-grafik` satır içi stille zaten tanımlıydı; gereksiz kural yazılmadı
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.7.9`

## 0.0.7.8 — 💰 Para ekranları: görsel tasarım (yalnızca CSS)
- Kullanıcı uyarısı: "özelliklere dokunma, arayüz tasarımını yapacağız". Bu sürümde **yalnızca `style.css`** değişti; `app.js` ve `index.html` bir karakter bile değişmedi (bir önceki sürümle `diff` alınarak doğrulandı)
- **Geri alma**: bu turda önce ödeme listesine "ait ay" rozeti eklenmişti (FIFO'nun hangi aya yazdığını göstermek için). Bu bir içerik/özellik değişikliğiydi, kullanıcının istediği kapsamın dışındaydı — JS ve CSS tarafından tamamen kaldırıldı
- 💰 **`#liste-odemeler`, `#liste-masraflar`, `#liste-borclar`, `#liste-beklenen`** için hiç görsel tanım yoktu; dördü de genel `.liste` stilini kullanıyordu. Para listesi ile not listesi aynı görünüyordu
  - Satırlar kart hâline getirildi (`--girdi` zemin, 12px köşe, 8px aralık); alt çizgi kaldırıldı
  - Hiyerarşi: `.tutar` 17px/800 — bu ekranlarda asıl bilgi rakam; `.baslik` 13.5px/600 ikincil
  - Tarih rozeti 42×42, 11px köşe; `small` etiketi 8.5px
  - `#odeme-filtre` / `#masraf-filtre` yatay kaydırmaya alındı (dar ekranda alt satıra kırılıyordu)
  - `#odeme-toplam` / `#masraf-toplam` Saira Condensed + sarı vurgu
  - `.sil` düğmesi `opacity:.5` (kazara basmayı zorlaştırır), basılınca tam görünür
  - Boş liste kutusu kesik çizgili çerçeveye alındı
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.7.8`

## 0.0.7.7 — 📊 Takvim altına ay özeti (puantaj yeniden tasarımı tamamlandı)
- Maketteki son madde. Puantaj ekranında takvimden sonra doğrudan kayıt listesi geliyordu; ay toplamları yalnızca Hesap Özeti ekranındaydı
- 📊 **Yeni `#takvim-ozet`**: çalışılan gün / hakediş / mesai, takvimin hemen altında. Renk şeritleri uygulamanın diliyle tutarlı (yeşil = gün, sarı = para, mavi = mesai). Rakamlar `paraKisa()` ile kısaltılmış — dar alanda tam rakam gerekmiyor, o Hesap Özeti'nde mevcut
- **Yeni hesaplama yazılmadı**: mevcut `hesaplaAralik()` yeniden kullanılıyor. Böylece takvim altındaki rakam ile Hesap Özeti'ndeki rakamın ayrışması yapısal olarak imkânsız. İkinci bir hesap yazılsaydı ileride biri güncellenip diğeri kalabilirdi
- `gizliMod` desteği: rakamlar gizliyken "••••" gösteriliyor
- CSS ölçek bloğunun üstüne eklendi
- **Puantaj yeniden tasarımı tamamlandı**: 7 maddeden 3'ü zaten uygulanmıştı (kazanç önizlemesi, mesai rozeti, ileri tarih taraması), 4'ü bu üç sürümde yapıldı — modal sadeleştirme (0.0.7.5), parasal etki (0.0.7.6), ay özeti (0.0.7.7)
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.7.7`

## 0.0.7.6 — 💸 İşlenmemiş gün uyarısına parasal etki eklendi
- Puantaj yeniden tasarımının ikinci adımı. `eksikCiz()` zaten boş günleri çip olarak listeliyordu; eksik olan parasal karşılıktı
- 💸 **Yeni `#eksik-para` kutusu**: "Bu günlerde çalıştıysan **5.833 ₺** hesabında görünmüyor demektir." Boş günlerin bir kısmı gerçekten gelinmeyen gün, bir kısmı işaretlemesi unutulan gün — aradaki fark doğrudan kullanıcının parası. Soyut bir gün sayısı bunu hissettirmiyor
- **Tahmin yöntemi**: o ayki mevcut kayıtların kazanç ortalaması alınıyor (sabit yevmiye değil — ay içinde 2.500/3.750 gibi karışık günler varsa gerçek ortalama daha doğru). Kayıt yoksa `ayarlar.yevmiye`, o da 0 ise kutu hiç gösterilmiyor
- **Dil tercihi**: "kaybettin" değil "çalıştıysan". Uygulama o günlerde çalışılıp çalışılmadığını bilemez; kesin kayıp iddia etmek yerine kullanıcıyı kontrole yönlendiriyor. Birden fazla gün varsa günlük ortalama da parantez içinde gösteriliyor
- CSS ölçek bloğunun üstüne eklendi (0.0.6.0 sıralama kuralı)
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.7.6`

## 0.0.7.5 — 📅 Gün modalı sadeleştirildi: 10 alan → 6 + katlanır bölüm
- Puantaj sistemi yeniden tasarımının ilk uygulama adımı
- **Önce mevcut durum denetlendi**: maketteki 7 öneriden 3'ü zaten uygulanmıştı — kazanç önizlemesi (`modalKazancGuncelle`), takvimde mesai rozeti (`.mesai-rozet`), ileri tarih taraması (0.0.4.6). Bunlar tekrar yapılmadı
- 📅 **Modal 10 alanla açılıyordu.** Kullanıcının 49 kaydında saat aralığı, gece mesaisi, konum ve parça başı hiç doldurulmamış; buna rağmen her gün işlemede karşıya çıkıyorlardı
  - Bu dört alan yeni `#gun-detay-alanlar` bölümüne taşındı, `#btn-gun-detay` ile açılıyor. Üstte kalanlar: durum, kazanç önizlemesi, normal saat, mesai, gün içi artı, şantiye, not, fotoğraf
  - Hiçbir alan silinmedi, hiçbir ID değişmedi
- 🔢 **Gizlemenin riski iki koruma ile kapatıldı** — kullanıcının bir şey girdiğini unutması:
  1. `#gun-detay-rozet`: içeride dolu alan varsa düğmede "N dolu" sayısı görünüyor. Alanlara `input` dinleyicisi bağlı, anlık güncelleniyor
  2. `modalAc()` içinde: kaydedilmiş bir gün açılırken bu alanlardan biri doluysa (veya konum damgası varsa) bölüm **otomatik açılıyor**. Dolu içerik asla gizli kalmıyor
- HTML denge korundu (div 569/569), tüm ID'ler tek
- CSS bloğu, ölçek kurallarının ÜSTÜNE eklendi (0.0.6.0'daki sıralama kuralına uygun)
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.7.5`

## 0.0.7.4 — 💰 Para hesabı ve FIFO sınır testleri tanıya eklendi
- Çalışma-anı test yaklaşımı sürüyor. Bu turda uygulamanın çekirdeği: kazanç hesabı ve ödeme-ay eşleştirmesi
- 💰 **`girdiKazanc()` 6 senaryoyla test edildi** (tam, yarım, gelmedi, izin, artı yevmiye, mesai) — hepsi doğru. Testler geçici sahte kayıtlarla yapılıyor, gerçek veriye dokunulmuyor
- ⚠️ **Bir yanlış alarm ve nedeni**: ilk test "ücreti mühürlenmemiş gün 0 TL etmeli" varsayımıyla yazılmıştı, kod ise güncel yevmiyeye düşüyordu. `oranBul()` içindeki yorumda gerekçe belgelenmiş: *"Güne mühürlenmiş ücret 0 ise ayarlardaki güncel ücrete geri düş — kimse 0 liraya çalışmaz."* Yani yevmiye girilmeden önce işlenen günler kaybolmuyor. Test yanlıştı, kod doğru
  - Bu davranış artık bir kontrole bağlandı: mühürsüz gün güncel yevmiyeye düşmezse tanı uyarıyor. Sessizce değişirse eski günler 0 TL olur ve kullanıcı parasını kaybetmiş görünür
- 🤝 **`odemeAyi()` 5 senaryoyla test edildi**: `aitAy` önceliği, `aitAy` yokken tarihten türetme, boş `aitAy`, her ikisinin de olmaması, yılbaşı sınırı (`2027-01-01` → `2027-01`). Hepsi doğru. Bu mantık bozulursa avanslar yanlış aya yazılır ve bakiye sessizce kayar
- 🔁 Toplam 11 yeni kontrol; tanı kontrol sayısı 134 → 138. Testler her çalıştırmada yeniden koşuyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.7.4`

## 0.0.7.3 — 📅 Tarih sınır durumları test edildi ve tanıya eklendi
- 0.0.7.2'deki yöntem değişikliğinin devamı: statik taramanın bulamayacağı, yalnızca çalıştırınca ortaya çıkan hata sınıfları aranıyor. Bu turda tarih/saat hesapları
- **Önce iOS'ta çalışmayan web özellikleri tarandı**: `SpeechRecognition`, `navigator.vibrate`, `wakeLock`, `geolocation`, `Notification.requestPermission`. Beşi de varlık kontrolüyle korunmuş, çökme riski yok — değişiklik gerekmedi
- **Kronometre iddiası doğrulandı**: "Uygulamayı kapatsan da saymaya devam eder" mesajı doğru; `kronoBas` zaman damgası saklanıp fark üzerinden hesaplanıyor
- 📅 **Tarih sınır testleri (hepsi geçti)**: yaz saati geçişi (2027-03-28 03:00), yılbaşı gecesi (2026-12-31 23:59), artık yıl (2028-02-29), gece yarısı 00:00 ve 23:59. `tarihId()` ile üretilip geri okunduğunda gün/ay/yıl kayması yok. Bu sınıf bir hata olsaydı ilgili ayın tüm hesabı sessizce bozulurdu
- **Ay sorgu sınırı doğrulandı**: kod tüm aylar için `"-31"` üst sınırı kullanıyor. Metin karşılaştırması olduğu için Şubat'ın son günü dahil ediliyor (`"2026-02-28" <= "2026-02-31"` → true) ve komşu ay sızmıyor (`"2026-03-01" <= "2026-02-31"` → false)
- 🔁 **Testler tanıya kalıcı eklendi** (bölüm 15): her çalıştırmada 5 sınır durumu, artık yıl hesabı ve ay sorgu sınırı yeniden deneniyor. İleride bir değişiklik tarih mantığını bozarsa anında görünecek. Kontrol sayısı 121 → 134
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.7.3`

## 0.0.7.2 — 🔍 Tanıya platform uyumluluk bölümü (statik taramanın kör noktası)
- Bağlam: iOS'taki PDF paylaşım hatası (0.0.7.1) gerçek kullanıcıdan geldi, tanı ekranı bulamadı. Sebep bir eksiklik değil, **yöntemsel kör nokta**: tanının tüm kontrolleri statikti — eksik ayar, bağlanmamış fonksiyon, bozuk kayıt, veri tutarlılığı. iOS sorununda kodda hiçbir şey hatalı değildi; sorun yalnızca o platformda, çalışma anında ortaya çıkıyordu
- 🔍 **Yeni bölüm 11b — "BU CİHAZDA NE ÇALIŞIYOR"**: kodu değil, tanıyı çalıştıran cihazın yeteneklerini sorguluyor
  - Platform tespiti (iOS / Android / masaüstü)
  - `navigator.canShare({files})` ile gerçek dosya paylaşım desteği — PDF gönderilebiliyor mu
  - Dosya indirme desteği; iOS'ta İndirilenler klasörü olmadığı ayrıca belirtiliyor
  - iOS'a özel: PDF fontunun önceden yüklenip yüklenmediği (0.0.7.1'deki gecikme sorununun göstergesi)
  - Bildirim izni ve `periodicSync` desteği (uygulama kapalıyken hatırlatma)
  - `navigator.storage.persisted()` ile depolama kalıcılığı
- **Pratik faydası**: "PDF gönderemiyorum" diyen kullanıcıya tanıyı çalıştırıp rapor göndermesi söylenebiliyor; rapor o cihazda tam olarak neyin desteklenmediğini yazıyor
- Bölüm sayısı 17 → 18
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.7.2`

## 0.0.7.1 — 🍎 iOS'ta PDF paylaşılamıyordu (kullanıcı şikayeti)
- Kullanıcı bildirimi: "iOS telefon kullanıcıları PDF gönderemiyor, Android'de sorun yok"
- 🍎 **Sebep 1 — geçici kullanıcı izni (transient activation) tükeniyordu.** iOS Safari, `navigator.share()` çağrısının kullanıcı jestinden kısa süre içinde yapılmasını zorunlu kılıyor. `pdfPaylas()` akışı şöyleydi: `await pdfFontlariYukle()` (ilk kullanımda ~1 MB indirme) → `pdfBlobOlustur()` → sentetik `a.click()` indirme → `await navigator.share()`. Bu zincir saniyeler sürüyor; iOS izni geri alıp `NotAllowedError` fırlatıyordu. Android'in politikası gevşek olduğu için orada görünmüyordu
- 🍎 **Sebep 2 — `a.download` iOS'ta çalışmıyor.** iOS'ta İndirilenler klasörü kavramı yok, Safari blob URL'leri için `download` özniteliğini yok sayıyor. "PDF telefonuna kaydedildi (İndirilenler)" mesajı iPhone'da yanlış bilgiydi; ayrıca sentetik tıklama paylaşım akışını bozuyordu
- ✅ **Yeni ortak `pdfDosyaPaylas(blob, dosyaAdi, baslik)`** platforma göre ayrışıyor:
  - **iOS**: indirme adımı atlanıp doğrudan `navigator.share()`. `AbortError` (kullanıcı iptali) sessiz geçiliyor; `NotAllowedError` durumunda "düğmeye bir kez daha bas" yönlendirmesi. Paylaşım hiç desteklenmiyorsa PDF yeni sekmede açılıyor, kullanıcı iOS'un kendi paylaş düğmesini kullanabiliyor
  - **Android/masaüstü**: önceki davranış korundu (önce kalıcı indirme, sonra paylaşım) — orada indirme gerçekten çalışıyor ve zayıf bağlantıda WhatsApp yüklemesi yarıda kalırsa yedek sağlıyor
- ⚡ **iOS'ta fontlar önceden yükleniyor**: açılıştan 12 sn sonra arka planda `pdfFontlariYukle()`. Paylaşım anındaki en büyük gecikme kaynağı bu indirmeydi. Yalnızca iOS'ta yapılıyor (Android'de gereksiz veri harcamamak için)
- Üç PDF yolu da (`pdfPaylas`, `isPdfPaylas`, `yilPdfPaylas`) aynı hataya sahipti; üçü de ortak fonksiyona bağlandı
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.7.1`

## 0.0.7.0 — 📴 Çevrimdışı: dış kütüphaneler önbelleğe alındı + gerçek eşitleme onayı
- Yeni inceleme alanı: çevrimdışı davranış. `enablePersistence` ve çevrimdışı bandı mevcuttu, ancak iki temel eksik bulundu
- 📴 **Dış kütüphaneler hiç önbelleğe alınmıyordu.** `sw.js` içindeki `if (!ayniKok) return;` satırı, farklı kökenli TÜM istekleri service worker'ın dışında bırakıyordu. Uygulama 10 dış kütüphaneye bağımlı (Firebase SDK ×5, jsPDF, jsPDF-autoTable, SheetJS, html2canvas, Tesseract) — internet yokken bunların hiçbiri yüklenemiyordu. Çevrimdışı açılış çalışıyor görünse de Firebase yüklenemediği için işlevsizdi; PDF/Excel üretimi de mümkün değildi
  - Yeni `KUTUPHANE` deseni: sürüm numaralı sabit CDN adresleri (gstatic/firebasejs, cdn.sheetjs.com, cdnjs.cloudflare.com, jsdelivr/tesseract, Google Fonts) cache-first sunuluyor. İçerikleri değişmediği için güvenli
  - **API çağrıları bilinçli olarak dışarıda**: hava durumu, haber, kur, namaz vakti, Firestore — bunların taze olması gerekiyor
  - Yalnızca `y.ok || y.type === "opaque"` yanıtlar saklanıyor; hatalı yanıtın kalıcı önbelleğe girip kütüphaneyi bozması önlendi
  - Desen 9 örnek adresle test edildi: 5 kütüphane önbelleğe alınıyor, 4 API geçiyor — 9/9 doğru
- 🔄 **"Eşitleniyor" mesajı doğrulanmıyordu.** `online` olayında toast gösterilip geçiliyordu; bekleyen yazmaların sunucuya ulaşıp ulaşmadığı kontrol edilmiyordu. Kullanıcı mesaja güvenip uygulamayı kapatabilir, yazmalar beklemede kalabilirdi
  - `db.waitForPendingWrites()` ile gerçek onay: başarılıysa "✅ Tüm kayıtların sunucuya ulaştı", değilse "⚠️ Bazı kayıtlar hâlâ gönderilemedi. Uygulamayı açık tut."
  - 20 saniyelik zaman sınırı: sunucu yanıtsız kalırsa kullanıcı süresiz "gönderiliyor" durumunda bırakılmıyor
  - Metot varlığı (`db.waitForPendingWrites`) kontrol ediliyor; hata `hataKaydet()` ile günlüğe yazılıyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.7.0`

## 0.0.6.9 — 🛡️ Girdi sınırları: yazım hatası artık hesabı bozmuyor
- Yeni inceleme alanı: girdi doğrulama. `sayi()` çevirici doğru çalışıyor ancak değerin MAKUL olup olmadığına bakılmıyordu. Test edildi: `999` saat mesai, `-50` saat, `999999999` TL — hepsi kabul ediliyor ve doğrudan hakedişe yansıyordu
- **Somut risk**: mesai alanına yanlışlıkla 999 yazılması (tuşa basılı kalması) o güne 999 saat mesai kaydediyor, bakiye milyonlara çıkıyordu. Hata aylar sonra fark edilse bile kaynağını bulmak zordu
- 🛡️ **Yeni `SINIR` sabiti ve `sinirla()` yardımcısı**: mesai 18 sa/gün, çalışma 24 sa/gün, gün içi artı 5, tek kalem tutar 1.000.000 TL, ücret ayarları 100.000 TL. Sınırlar bilinçli olarak geniş — amaç gerçek kullanımı engellemek değil, açıkça hatalı girişi yakalamak
- **Davranış**: kayıt reddedilmiyor, değer kırpılıyor ve kullanıcı bilgilendiriliyor ("⚠️ Mesai çok yüksek görünüyor (999 saat). 18 saat olarak kaydedildi — yanlışsa düzelt."). Negatif değerler 0'a çekiliyor. İş akışı durmuyor ama sessiz bozulma engelleniyor
- **Uygulandığı alanlar**: gün kaydı (mesai, gün içi artı, saatlik çalışma, gece mesaisi), dört tutar alanı (borç, beklenen, masraf, ödeme) ve ücret ayarları (yevmiye, mesai ücreti, ek günlük, saat ücreti, günlük saat)
- Ücret ayarları özellikle kritik: yanlış girilen yevmiye, `guncelOranlar()` ile o günden sonraki tüm kayıtlara mühürleniyor
- **Test**: 5 senaryo (aşırı yüksek, negatif, normal değer, aşırı tutar, normal tutar) — 5/5 doğru; normal değerlerde uyarı üretilmiyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.6.9`

## 0.0.6.8 — 💬 Hata mesajları: ham İngilizce sızıntısı kapatıldı
- Yeni inceleme alanı: uygulamanın kullanıcıyla konuştuğu dil. İki çevirici mevcuttu — `hataCevir` (giriş/kayıt) ve `hataCeviriGenel` (Firestore) — ancak ikisi de bilinmeyen durumda **ham İngilizce Firebase mesajını** ekrana basıyordu ("Bir sorun oldu: Firebase: Error (auth/too-many-requests)")
- 🔐 **Giriş çeviricisine 7 durum eklendi**, en önemlisi `too-many-requests`: Firebase art arda hatalı denemede hesabı geçici kilitliyor; kullanıcı bunu "hesabım gitti" diye okuyabiliyordu. Yeni mesaj bekleme süresini ve alternatifi (şifre sıfırlama) söylüyor. Ayrıca `user-disabled`, `operation-not-allowed`, `missing-password`, `invalid-login-credentials`, `requires-recent-login`, `internal-error`
- 🌐 **Genel çeviriciye 6 durum eklendi**: `failed-precondition`, `aborted`, `invalid-argument`, `out-of-range` ve çevrimdışı belirtileri (`offline`, `Failed to fetch`). Çevrimdışı mesajı verinin kaybolmadığını açıkça söylüyor
- 🚫 **Ham mesaj sızıntısı kapatıldı**: her iki çeviricinin de son çaresi artık anlaşılır Türkçe. Teknik ayrıntı `hataKaydet()` ile günlüğe yazılıyor ve tanı ekranından okunabiliyor — bilgi kaybolmuyor, yalnızca kullanıcıya gösterilmiyor
- Doğrulama: `toast()` çağrılarında `e.message` doğrudan kullanan başka nokta kalmadı
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.6.8`

## 0.0.6.7 — 🤝 PDF: mutabakat özeti, sayfa numarası, imza tarihi
- Belge kalitesi incelemesi sürüyor. `pdfBlobOlustur()` çıktısı, altında İşçi/İşveren imza alanı bulunduğu için mutabakat belgesi niteliğinde; bu gözle üç eksik giderildi
- 🤝 **Mutabakat özeti**: toplamlar `autoTable` `foot` satırındaydı, yani tablonun sonunda. Uzun aylarda tablo birden fazla sayfa sürdüğü için imzalayan kişi neyi onayladığını görmeden imzalayabiliyordu. İmzanın hemen üstüne vurgulu bir kutu eklendi: dönem, gün sayısı, hakediş, alınan ve **kalan alacak** tek cümlede
- 📄 **Sayfa numarası**: çok sayfalı imzalı belgeden sayfa çıkarılması fark edilemiyordu. Tüm sayfalara `doc.setPage()` döngüsüyle "Sayfa N / Toplam" ve sol alta "Puantaj Defterim" eklendi
- ✍️ **İmza tarihi alanı**: her iki imza bloğuna "Tarih: ..../..../......" satırı. Düzenleme tarihi 0.0.6.6'da eklenmişti; imza tarihi ondan ayrı ve mutabakat açısından gerekli
- 📐 **Taşma denetimi**: yeni bloklar sayfa sonuna denk gelirse kırpılma riski vardı. Senaryolar hesaplandı — mutabakat eşiği `y2>690`, imza eşiği `y2>720`; en kötü durumda içerik 744pt'de bitiyor, alt bilgi 820pt'de (A4 = 842pt). Çakışma yok, sığmayan durumda otomatik sayfa geçişi mevcut
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.6.7`

## 0.0.6.6 — 📋 PDF çizelgesi: üç yolda daha "X" düzeltildi + belge künyesi
- ⚠️ **0.0.6.5 eksik kalmış**: uygulamada **beş ayrı rapor üretim yolu** var, o sürümde yalnızca ikisi (WhatsApp metni, HTML-tablo PDF'i) düzeltilmişti. Atlanan üç yol `autoTable` tabanlıydı ve bunlardan biri **altında İşçi/İşveren imza alanı bulunan asıl puantaj çizelgesi**
  - Beş yol da tarandı; `gunDurumAdi()` 8 noktada uygulanıyor. Ham `i.yev` kullanımı **0**, `"TARİH","YEVMİYE"` başlığı **0** (dördü de `"DURUM"` oldu)
- 📋 **Belge künyesi eklendi.** İmza alanı taşıyan bu PDF, ödeme anlaşmazlığında delil niteliği taşıyor ancak iki temel bilgi eksikti:
  - **Düzenlenme tarihi** — imzalanan bir belgede ne zaman hazırlandığı yazmalı
  - **Uygulanan ücret** — anlaşmazlığın konusu genelde tam olarak budur. Tabloda yalnızca sonuç tutarları vardı, hangi yevmiye/saat ücretinden hesaplandığı belirtilmiyordu. Artık başlık altında "Günlük yevmiye: X · Saat ücreti: Y · Mesai saati: Z" yazıyor (yalnızca tanımlı olanlar). Belge kendi kendini açıklıyor, karşı taraf hesabı doğrulayabiliyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.6.6`

## 0.0.6.5 — 🚨 Paylaşılan raporda anlam belirsizliği (patron ters okuyabilirdi)
- Yeni inceleme alanı: uygulamanın dış çıktısı — patrona/ustabaşına gönderilen rapor içeriği. Şimdiye kadar yalnızca teknik tarafı (font, çökme, eksik ödeme) ele alınmıştı, METİN hiç okunmamıştı
- 🚨 **BULGU: çalışılan gün "X" ile gösteriliyordu.** İçeride bu "çalışıldı" demek, ancak raporu okuyan kişi için "X" günlük dilde "olmadı / gelmedi" anlamına gelir — anlam tam tersine dönüyordu. Ek olarak "0" hem "gelinmedi" hem "sıfır artı" için kullanılıyordu ve işaretleri açıklayan bir lejant yoktu. Ödeme anlaşmazlığında işçi aleyhine yorumlanabilecek bir belirsizlik
- ✅ **Düzeltme**: yeni `gunDurumAdi()` yardımcısı kısa işaretleri açık kelimelere çeviriyor — `X`→"Tam", `/`→"Yarım", `İ`→"İzin", `0`→"—", saatlik gösterim ("7s") olduğu gibi kalıyor
  - **Dört çıktıda birden uygulandı**: WhatsApp metni (`raporPaylas`), PNG görseli (`gorselPaylas`), PDF tablosu (`pdfBlobOlustur`), asistan özeti
  - WhatsApp metnine lejant satırı eklendi: "_Tam = tam yevmiye · Yarım = yarım gün · — = gelinmedi_"
  - Sütun başlıkları "YEVMİYE" → "DURUM" (PNG ve PDF); başlık artık içerikle uyumlu
- 📉 **Rapor kısaldı**: `raporPaylas` ayın tüm günlerini listeliyordu (hiç işlenmemiş boş günler dahil). Artık yalnızca kaydı olan günler yazılıyor; kayıt yoksa "(bu aralıkta işlenmiş gün yok)" satırı
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.6.5`

## 0.0.6.4 — 🐞 Korumasız async fonksiyonlar: sessiz çökme noktaları kapatıldı
- Tarama: `await` kullanan ama `try/catch`'i olmayan async fonksiyonlar çıkarıldı → 6 aday
  - 3'ü çağıran tarafında korunduğu doğrulanarak elendi (`bildirimJetonKaydet`, `haberCek`, `asistanSor`)
- 🐞 **`odemeAitAySecDoldur()` — en kritik.** `await enEskiOdenmemisAy()` çağrısı korumasızdı. Ağ kopması veya izin hatasında fonksiyon yakalanmayan bir promise reddiyle sonlanıyor, `#odeme-ait-ay` seçicisi **boş kalıyor** ve kullanıcı ödeme kaydedemiyordu — üstelik ekranda hiçbir hata görünmüyordu
  - Düzeltme: `let enEski = null` + `try/catch`. Hata durumunda FIFO önerisi atlanıyor ama seçenekler yine dolduruluyor; kullanıcı ayı elle seçebiliyor. Hata `hataKaydet()` ile günlüğe düşüyor
- 📊 **`tumOdemeleriGetir()`** CSV/Excel/PDF raporlarını besliyor; `kokRef().collection("odemeler").get()` korumasızdı. Hata durumunda rapor üretimi komple çöküyordu. Artık boş liste dönüp rapor üretilebiliyor
- 💱 **`kurSatirYaz()`** dış kur servisine gidiyor; erişilemezse yakalanmayan reddi vardı. Artık satır sessizce boşalıyor
- Not: kodda 150 tamamen boş `catch` bloğu var. Çoğu bilinçli (localStorage, titreşim gibi kritik olmayan işlemler); toptan değiştirmek yerine kritik olanlar tek tek ele alınıyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.6.4`

## 0.0.6.3 — 👆 Form etiketleri girdilere bağlandı (102 adet)
- 112 `<label>`'ın yalnızca 5'i girdisiyle ilişkiliydi; etikete dokunmak hiçbir şey yapmıyordu. 102 etikete `for=` eklendi, dokunma alanı iki katına çıktı
- ⚠️ İlk deneme dosyayı bozdu: regex girdiyi de yeniden yazıp **85 girdinin `type` özniteliğini sildi** (`password`, `date` dahil). Yedekten geri alındı; ikinci yöntem yalnızca `<label>` etiketini değiştiriyor. Doğrulama: öznitelik kaybı 0, `type=` 106 (değişmedi), kırık/çakışan bağ 0
- `#ayar-maas` `type="number"` → `text` + `inputmode="numeric"` (mobil artırma okları kazara değer değiştiriyordu)

## 0.0.3.0 – 0.0.6.2 — TOPLU ÖZET (girişler kaybolmuştu, aşağıda özetlendi)

> ⚠️ **Kayıt hatası**: 0.0.3.0'dan itibaren CHANGELOG girişleri, ekleme
> yönteminin çapa metnini bulamaması yüzünden sessizce yazılmadı. Hata
> 0.0.6.3'te fark edildi. Bu aralık aşağıda özetlenmiştir; ayrıntılar
> her sürümün "Neler yeni" kartında mevcuttur.

**Üretim kalitesi ve uyum (0.0.3.0)**
- iOS'ta girdi alanına dokununca ekranın zorla yakınlaşması düzeltildi (16px kuralı)
- Türkçe harf çevirimi 17 yerde düzeltildi ("HAZIRAN"→"HAZİRAN"; "İbrahim" araması)
- Service worker güncellemesi kullanıcı onayına bağlandı (form doldururken veri kaybı riski)
- Firestore dinleyicileri arka planda kapatılıyor (30 dk yeniden faturalama tuzağı)
- Manifest tamamlandı; `KVKK-VE-GIZLILIK.md` ve `YAYIN-KONTROL-LISTESI.md` eklendi

**Ana ekran ve İşlerim (0.0.3.1 – 0.0.3.9)**
- Para kartı en üste alındı; "bugün kazancı" satırında tutar kırpılması düzeltildi
- Günlük akışa animasyonlar eklendi; hafif modun ucuz animasyonları da kapattığı fark edilip düzeltildi
- Tanı/test ekranı eklendi (yetkili giriş), tam ekran güncelleme penceresi, sabit eylem çubuğu
- İşlerim ay ay kartlara ayrıldı; aylar kapalı açılıyor, günler tıklanabilir, paylaş üste sabitlendi

**Tanı motoru (0.0.4.0 – 0.0.4.5)**
- Motor baştan yazıldı: 17 bölüm, 121 kontrol; üç köprü testi; çökme günlüğü okuma
- Motorun IIFE dışında kaldığı ve hiç çalışmadığı bulundu (`$ is not defined`) — içeri alındı
- Sahte alarm üreten yanlış alan/anahtar adları düzeltildi (iş kayıtları, PIN, güvenlik testi)

**Tasarım (0.0.4.6 – 0.0.5.9)**
- Çekmece menüsü, giriş ekranı, yıl tablosu, ısı haritası, rozetler, notlar yenilendi
- Degradeli metin yedeği dört ekranda garantiye alındı (desteklenmeyen tarayıcıda yazı görünmüyordu)
- Grafikler: "son 6 ay hakediş" grafiğinin hiç çizilmediği bulundu; ödeme dağılımı ve şantiye kırılımı metinden görsele çevrildi
- Ekip yoklamasında stilsiz sınıflar bulundu, dokunma hedefi ve yerleşim düzeltildi

**Ölçek ve temizlik (0.0.6.0 – 0.0.6.2)**
- Kullanıcı şikayeti üzerine toptan küçültme; varsayılan ölçek `kucuk` yapıldı
- Aynı seçicinin 3-5 kez yeniden tanımlandığı bulundu; 25 etkisiz kural silindi (585 ölçü karşılaştırıldı, 0 fark)
- Hiç çalışmayan PIN başarı animasyonu bağlandı; ödeme filtresinde seçim göstergesinin bozuk olduğu bulundu

## 0.0.2.9 — 🔒 EKRAN KİLİDİ: yakınlaştırma engeli + yatay kayma düzeltmesi
- Kullanıcı isteği: "ekran büyüyüp küçülmesin, sağa sola kesinlikle kaymasın"
- 🔒 **Yakınlaştırma kilidi.** `<meta viewport>` zaten `user-scalable=no, maximum-scale=1.0` içeriyordu ama iki boşluk vardı:
  1. **iOS Safari 10'dan beri `user-scalable=no`'yu bilerek yok sayar** (erişilebilirlik gerekçesiyle) → iPhone'da çimdik yakınlaştırma hep mümkündü. Çözüm: `gesturestart`/`gesturechange`/`gestureend` olayları `preventDefault` ile engellendi (bu olaylar yalnızca Safari'de var)
  2. `touch-action` CSS'te **hiç tanımlı değildi** → çift dokunma yakınlaştırması hiçbir tarayıcıda engellenmiyordu. `html, body{touch-action:pan-x pan-y}` eklendi — `manipulation` yerine `pan-x pan-y` seçildi çünkü `manipulation` çimdik yakınlaştırmayı KESMEZ
  - Ek: masaüstünde Ctrl/⌘ + tekerlek engellendi; eski Android WebView'ler için `touchstart`'ta `touches.length > 1` engeli (tek parmağa dokunmuyor)
- ↔️ **Yatay kayma: kuralın kendisi sebepmiş.** Mevcut `html, body{max-width:100vw}` kuralı taşmayı ÖNLEMEK için yazılmıştı ama `100vw` dikey kaydırma çubuğunun genişliğini de kapsar → sayfa, görüntü alanından tam çubuk genişliği kadar geniş olur, yani kural taşmanın kaynağıydı. `max-width:100%` ile değiştirildi (üstteki tanımda `!important` olmadığı için sonraki kural geçerli)
  - Ek: `overscroll-behavior:none` (yatay lastik bant), ve son güvenlik ağı olarak `scroll` dinleyicisinde `scrollX !== 0` ise `scrollTo(0, scrollY)`
- ✅ **Bozulmadığı doğrulanan davranışlar**: takvimde tek parmakla sağa/sola kaydırıp ay değiştirme (`#takvim` touchstart/touchend, tek parmak olduğu için engellenmiyor); `#asistan-cipler` yatay kaydırması (`pan-x` izin veriyor); uygulamada iki parmak gerektiren başka jest bulunmadığı taranarak doğrulandı
- ↩️ **Denenip GERİ ALINAN iki değişiklik**:
  1. `body{user-select:none}` — büyüteç balonunu engellemek için yazılmıştı. İstenen şey yakınlaştırma kilidiydi; metin seçimini kapatmak not/tutar/e-posta kopyalama yeteneğini kaldırırdı. Yakınlaştırma zaten `touch-action` + jest engeliyle çözülüyor
  2. `*{min-width:0}` — özgüllük sayesinde mevcut `min-width` kurallarını bozmuyordu, ama evrensel seçicilerle esneklik davranışını değiştirmek sonradan izlenemeyen yerleşim hatalarının klasik kaynağı. Var olan `main, section, .kart{min-width:0}` zaten kapsıyor
- Erişilebilirlik notu: iOS'un bu viewport ayarını yok sayması bilinçli bir tercihtir. Kilit uygulandı ancak sistem genelindeki Büyüteç ve uygulama içindeki "Büyük yazı" ayarı çalışmaya devam ediyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.2.9`

## 0.0.2.8 — 🎨 TASARIM: hafta şeridi, çipler, ay gezgini + iki görünürlük hatası
- Kullanıcı isteği: "kaldığımız yerden devam et" — tasarım sıralamasında sıradaki bileşenler
- 🐞 **HATA: `.hs-gun.pzr{opacity:.45}` bilgi taşıyan pazarları da soluklaştırıyordu.** `anaHaftaCiz()` aynı öğeye `pzr` ile birlikte `bugun` ve `dolu`/`yok` sınıflarını da ekleyebiliyor. İki sonuç:
  1. Bugün pazara denk geldiğinde sarı çerçeve %45'e soluyor → haftada bir gün "bugün" işareti kayboluyordu
  2. Çalışılmış bir pazar (inşaatta sık, genelde mesaili) yeşil dolgusuyla soluk görünüyordu — anlamın tersi
  - Düzeltme: `.hs-gun.pzr.bugun`, `.hs-gun.pzr.dolu`, `.hs-gun.pzr.yok` için `opacity:1`. Soluklaştırma yalnızca boş pazarlarda kalıyor
  - Desen taraması: takvimdeki pazar hücresi `opacity` değil `background:var(--pazar)` kullandığı için aynı hata orada YOK; `.rozet-kut.kilitli` 0.0.2.6'da düzeltilmişti. Tek örnek buymuş
- 🐞 **HATA: `.eksik-cip:active` kontrastı.** Basılıyken zemin `var(--sari)` oluyor ama metin rengine dokunulmuyordu; koyu temada metin `#ECEDF1` olduğu için sarı üstüne beyaz yazı çıkıyor, basılı anda okunmuyordu. `color:#1a1200` eklendi (kategori çiplerinde zaten doğru olan koyu metin yaklaşımı)
- 📅 `.ay-bar .ay-ad` 24→26px + harf aralığı; ok düğmeleri `opacity:.9`, basılınca sarı kenar
- 👋 `.selam-blok` başlık 27→28px, alt satır 13→13.5px ve opaklık artırıldı
- 📊 `.hedef-bar` 22→24px, dolguya iç gölge ile sınır netliği
- 🔒 **PIN ekranı bilinçli olarak DEĞİŞTİRİLMEDİ**: 72px tuşlar, hatalı girişte kırmızı titreme animasyonu, avatar/selam akışı — zaten iyi tasarlanmış. Değişiklik için değişiklik yapılmadı
- ⚡ Yeni iç gölge hafif modda kapatılıyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.2.8`

## 0.0.2.7 — 💰 FIFO doğrulaması + beklenen-tahsil akışındaki FIFO atlaması düzeltildi
- Kullanıcı sorusu: "avans aldığımda geçen ay alacağım varsa geçen aya, yoksa çalıştığım aya yazıyor değil mi — bozmadın inşallah"
- ✅ **DOĞRULAMA: FIFO çekirdeği el değmemiş.** `odemeAitAySecDoldur`, `enEskiOdenmemisAy`, `odemeAyi`, `odemeTarihiAyaGoreAyarla`, `odemeleriAyaGoreDoldur` fonksiyonları orijinal 0.0.1.6 dosyasıyla MD5 karşılaştırmasıyla denetlendi — beşi de birebir aynı
- ✅ **Para hesabının tamamı da denetlendi**: `girdiKazanc`, `oranBul`, `guncelOranlar`, `hesaplaAralik`, `sayi`, `borcKalan`, `hesapla` — yedisi de orijinalle birebir aynı
- 🐞 **BULUNAN HATA (0.0.1.7'de kendi eklediğim özellikte): beklenen-tahsil akışı FIFO'yu atlıyordu.** `beklenenCiz()` içindeki "✔ Tahsil edildi" işleyicisi `aitAy`'ı sabit olarak `bugun.slice(0,7)` yazıyordu. Normal ödeme akışı ise `enEskiOdenmemisAy()` sonucunu kullanıyor. Sonuç: aynı para, hangi düğmeyle kaydedildiğine göre farklı aya yazılabiliyordu — geçen aydan ödenmemiş bakiye varken beklenen listesinden tahsil edilen avans yanlışlıkla bu aya sayılıyordu
  - Düzeltme: tahsil öncesi `await enEskiOdenmemisAy()` çağrılıyor, sonuç varsa `aitAy` olarak kullanılıyor
  - FIFO sorgusu hata verirse bugünün ayına düşülüyor (try/catch) — kayıt hiçbir durumda kaybolmuyor
  - Bildirim metni artık hangi aya yazıldığını açıkça söylüyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.2.7`

## 0.0.2.6 — 🎨 TASARIM: her ekranda görünen bileşenler + degrade metin hatası
- Kullanıcı isteği: "sen sırala onlara göre devam edelim"
- Sıralama gerekçesi: üst bar ve çekmece HER ekranda görünüyor; toast 43 yerden çağrılıyor; PIN her açılışta zorunlu. Bunlar bugüne dek hiç elden geçmemişti
- 🚨 **HATA: `.topbar h1` degrade metni desteklenmeyen tarayıcıda GÖRÜNMEZ.** `background-clip:text` + `color:transparent` deseni kullanılıyordu; `background-clip:text` desteklenmeyen eski Android WebView'de degrade uygulanmaz ama saydamlık kalır → uygulama adı bomboş görünür. Düz `var(--sari)` taban rengi verilip degrade `@supports ((-webkit-background-clip:text) or (background-clip:text))` içine alındı
  - Aynı desen 0.0.2.2'de `.banka-kart .bakiye` için düzeltilmişti; bu ikinci örnekti
- 🐞 **HATA: `.cekmece li a.aktif` kuralı yoktu.** `.cekmece li button.aktif` tanımlıydı ama bağlantı türü menü satırları için karşılığı eksikti → seçiliyken hiçbir işaret vermiyorlardı. Ortak kurala alındı; ayrıca seçili satıra `::before` ile sol kenar işareti eklendi
- 👆 **Dokunma hedefi**: `.hamburger` 42×42 → 44×44 px (erişilebilirlik tabanı)
- 📌 **Üst bar**: alt kenar çizgisi + gölge (yapışkan başlığın sınırı belirsizdi); `h1 small` kontrastı artırıldı (#B9BAC1 → #C6C7CE)
- 💬 **Toast**: kenarlık + belirgin gölge (alt navigasyonla aynı koyu tonda olup birbirine yapışıyordu), 14→14.5px, ağırlık 500→600
- 🏅 **Rozetler**: `.rozet-kut.kilitli` üzerinde `opacity:.35` ve `grayscale(1)` birlikte uygulanınca rozet okunamaz hale geliyordu — kilitli rozetin amacı hedef göstermek olduğu için opaklık .5'e çıkarıldı, gri filtre korundu. `.acildi` durumu vurgu zeminiyle güçlendirildi
- Doğrulamalar: `--vurgu-zemin` ve `--asfalt2` değişkenlerinin tanımlı olduğu; çekmecede gerçekten `<a>` bulunduğu (kural hedefsiz değil); açık temada `--asfalt` override EDİLMEDİĞİ, dolayısıyla çekmece/üst bardaki sabit kodlu renklerin güvenli olduğu
- ⚡ Yeni gölgeler hafif moda eklendi
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.2.6`

## 0.0.2.5 — 🎨 TASARIM: dokunulmamış bileşenler + iki görünürlük hatası
- Kullanıcı sorusu: "neyimiz kaldı tasarım yapmadığımız"
- Sayım yapıldı: CSS'te 29 bileşen bölümü var, 0.0.2.2'de yalnızca 6'sına dokunulmuştu. Kullanım yoğunluğuna göre öncelik verildi — listeler (kodda 145 kullanım) ve alt sayfa/modal (120) en çok görülüp hiç dokunulmamış iki bileşendi
- 🐞 **GÖRÜNÜRLÜK HATASI: `.tutamak` açık temada kayboluyordu.** Rengi `#CFCDC6` olarak sabit kodlanmıştı; açık tema zemini `#F3F2EE`. İki ton neredeyse aynı olduğundan modal sürükleme tutamağı açık temada görünmüyor, "bu panel sürüklenebilir" ipucu tamamen kayboluyordu. `var(--soluk)` + opaklığa çevrildi
- 🐞 **GÖRÜNÜRLÜK HATASI: `.durum-secim button` seçilmemişken `var(--soluk)`.** Bu dört düğme (Tam gün / Yarım gün / Gelmedim / İzinli) uygulamanın birincil kontrolü; en önemli kontrol en düşük kontrastla duruyordu. `var(--metin)` + `opacity:.78`, seçilince `opacity:1`
  - Seçici güvenliği doğrulandı: `[class*="secili-"]` deseni `.durum-secim button` ile sınırlandı; `.eksik-cip.secili-f` (başka bileşen) yanlışlıkla eşleşmiyor. JS `b.className=""` ile sınıfları sıfırlayıp `"secili-"+durum` eklediği için desen doğru
- 📋 **Listeler**: satır dolgusu 12→14px, başlık 14.5px/600 → 15px/700, tutar 18→19px, rozet köşesi 11→12px (takvim hücreleriyle aynı dil), alt yazıya satır yüksekliği
- 📄 **Alt sayfa/modal**: üst kenar çizgisi + yukarı gölge (`0 -8px 28px`), başlık 22→23px
- ↩️ **Denenip GERİ ALINAN**: panelin zemini `--beton`'dan `--kart`'a çevrilmişti. Panelin içindeki `.kart` blokları, `.durum-secim button` ve `.sayac` kontrolleri zaten `--kart` zemin kullandığı için bu, kontrollerin kenarlarını kaybetmesine yol açacaktı. Zemin `--beton` bırakıldı; ayrım perde + gölge ile sağlanıyor
- Ayrıca: boş liste mesajları (dolgu/satır yüksekliği), `.sayac` girdisi 30→32px ve kenar kalınlığı, `.sayac` düğmeleri geri çekildi
- ⚡ Yeni panel gölgesi hafif moda da eklendi (0.0.2.3'teki hafif mod bu kuralı bilmiyordu)
- CSS sıra denetimi: yeni kuralların hepsi eski tanımlardan SONRA geliyor (eşit özgüllükte sonraki kazanır) — 535→1085, 530→1073, 494→1100
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.2.5`

## 0.0.2.4 — 🔬 DENETİM SÜRÜMÜ: 0.0.1.7–0.0.2.3 arası tüm değişikliklerin doğrulanması
- Kullanıcı isteği: "devam et, hiçbir sorun hata olmasın"
- Yeni özellik EKLENMEDİ. Amaç: son yedi sürümde biriken değişiklikleri (yeni özellikler, kritik hata düzeltmeleri, arayüz yenilemesi, performans işi) sistematik doğrulamak
- ✅ **Söz dizimi**: `app.js`, `sw.js`, `sabitler.js`, `worker.js`, `firebase-config.js` — hepsi temiz
- ✅ **Yapısal denge**: HTML (div 546/546, section 21/21, ul 26/26, label 111/111, select 12/12, button 221/221, script 13/13) ve CSS (459/459). Script sayımı ilk bakışta 14/13 görünüp incelendi — fazlalık, 0.0.2.3'te yazılan yorum metninin içindeki `<script>` kelimesiydi; yorumlar hariç tutulunca dengeli
- ✅ **Çapraz bağlantı**: JS'in `$("#…")`/`getElementById` ile aradığı tüm kimlikler HTML ile karşılaştırıldı. Eşleşmeyen 2 kimlik (`ayar-kumbara`, `cuzdan-tarih`) incelendi — ikisi de kaldırılmış Cüzdan özelliğinden kalan yorum satırlarında, çalışan kodda değil
- ✅ **Yeni fonksiyonlar**: 0.0.1.7+ eklenen 10 fonksiyonun (`masrafKategoriCizGoster`, `masrafKategoriOzetiCiz`, `masrafFiltreCiz`, `beklenenDinle`, `beklenenCiz`, `tumOdemeleriGetir`, `tumOdemeOnbellegiHazirla`, `pdfFontlariYukle`, `hafifModOtomatikMi`, `hafifModUygula`) tümü tanımlı ve tek. `MASRAF_KATEGORI`/`masrafKategoriBul` bağımlılığı için `sabitler.js` (satır 48) → `app.js` (satır 1914) yükleme sırası doğrulandı
- ✅ **Dinleyici yaşam döngüsü**: `beklenenDinle` girişte `birKezBaslat` ile başlıyor, `dinleyicileriKapat()` içinde kapanıyor. `dinleyiciTumG`/`dinleyiciTumO` bu listede olmadığı fark edilip araştırıldı — ayrı `tumVeriBirak()` fonksiyonuyla ve hesap değişiminde de temizlendikleri doğrulandı (hesaplar arası veri sızıntısı yok)
- ✅ **CSS hedef denetimi**: 0.0.2.2–0.0.2.3'te eklenen 12 seçicinin hepsinin HTML/JS'te gerçek hedefi olduğu doğrulandı (ölü kural yok)
- ✅ **`pdfFontlariYukle()` davranış testi**: eşzamanlı 3 çağrıda tek indirme; ikinci çağrı 0 ms (bellekten); yükleme hatasında çökme yok ve söz sıfırlanarak tekrar denenebiliyor. CSP `script-src 'self'` içerdiği için aynı-kök font yüklemesi engellenmiyor
  - Not: ilk test düzeneği senkron `appendChild` kullandığı için yanlış negatif verdi; gerçek tarayıcı davranışını taklit eden asenkron düzenekle tekrarlanıp doğrulandı
- ✅ **Hafif mod karar mantığı, 8/8 senaryo**: eski/orta/yeni telefon, zayıf işlemci, API'siz cihaz (iOS), yalnız-çekirdek bilgisi, kullanıcı elle açtı, kullanıcı elle kapattı. Kullanıcı tercihi her durumda otomatik algılamayı geçersiz kılıyor
  - Not: ilk test Node'un yerleşik `navigator.hardwareConcurrency` değerinin sızması yüzünden 2 yanlış hata verdi; mantık `navigator`dan izole edilerek tekrar test edildi
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.2.4`

## 0.0.2.3 — ⚡ PERFORMANS: eski cihazlarda açılış donması ve kaydırma takılması
- Kullanıcı bildirimi: "eski cihazlarda kasma sorunu olduğu söylendi"
- Tahmin yerine ölçüm yapıldı: dosya boyutları, senkron yükleme sırası ve pahalı CSS özellikleri tarandı
- ⚡ **KÖK SEBEP 1 — 1,05 MB font açılışta senkron yükleniyordu.** `font-liberationsans-regular.js` (535 KB) ve `-bold.js` (540 KB), `index.html`'de normal `<script>` etiketleriyle duruyordu; tarayıcı her açılışta bu base64 metni indirip JS olarak ayrıştırmak zorundaydı ve bu render'ı bloklıyordu. Fontlar yalnızca PDF üretiminde kullanılıyor
  - `<script>` etiketleri kaldırıldı; yeni `pdfFontlariYukle()` fontları ilk PDF üretiminde talep üzerine enjekte ediyor (tek uçuş: eşzamanlı çağrılarda tek indirme; başarısızlıkta söz sıfırlanıp tekrar denenebiliyor)
  - Üç async PDF giriş noktasına `await pdfFontlariYukle()` eklendi: `pdfPaylas()`, `isPdfPaylas()`, `yilPdfPaylas()`. `raporPaylas()` düz metin ürettiği için kapsam dışı
  - Yükleme başarısız olursa mevcut `helvetica` yedeği zaten devrede — PDF üretimi hiç durmuyor
  - **Açılışta ayrıştırılan JS: 1.518 KB → 443 KB (%71 azalma)**
- ⚡ **KÖK SEBEP 2 — `.alt-nav` üzerindeki `backdrop-filter:blur(14px)`.** Sabit konumlu, sürekli görünen ve altından içerik kayan bir öğede bulanıklık, eski GPU'larda her kaydırma karesinde yeniden hesaplanır; kaydırma takılmasının ana kaynağıydı
  - Yeni **hafif mod**: `<html data-hafif="1">` ile `.alt-nav`, `.perde`, `.modal-perde`, `.pin-tus-takimi` üzerindeki backdrop-filter kapatılıyor; kart/banka-kart gölgeleri ucuzlatılıyor; hücre degradeleri, `kart-parla` ve `para-pop` animasyonları devre dışı
  - **Bilgi taşıyan hiçbir görsel kapatılmıyor** — bugünün sarı halkası, durum renkleri, uyarılar korunuyor
  - Karar sırası: kullanıcı tercihi (`localStorage.hafifMod`) varsa daima o; yoksa otomatik algılama (`navigator.deviceMemory <= 4` veya `hardwareConcurrency <= 4`). API'ler yoksa otomatik açma yapılmıyor (yanlış pozitif riski)
  - Ayarlar → Uygulama teması altına açıklamalı anahtar eklendi; `DOMContentLoaded` başında da uygulanıyor ki ilk boyamadan önce geçerli olsun
- 📴 **YAN FAYDA — çevrimdışı kurulum güvenilirliği.** `sw.js` içindeki `cache.addAll()` atomiktir ve listede o 1 MB'lık fontlar da vardı; zayıf bağlantıda font indirmesi yarıda kalınca TÜM çevrimdışı kurulum sessizce başarısız oluyordu. Fontlar `EK_DOSYALAR` olarak ayrıldı ve `waitUntil` zincirine bağlanmadan, hata toleranslı biçimde arka planda önbelleğe alınıyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.2.3`

## 0.0.2.2 — 🎨 Arayüz yenilemesi: "Şantiye işareti"
- Kullanıcı isteği: "arayüz idare eder gibi, bunu daha iyi yapalım — arayüzü geliştir, tasarımı geliştir"
- **Tasarım yönü**: Bu bir ofis uygulaması değil; kullanıcı onu şantiyede, öğle güneşinde, tozlu parmakla, çoğu zaman tek elle açıyor. Görsel dil şantiyenin kendi diliyle kuruldu (tebeşir işareti, kalıp üstü şablon rakam, ikaz bandı sarısı) — sarı SADECE bir şey ifade ettiği yerde kullanıldı, süs olarak dağıtılmadı
- Uygulama biçimi: yenileme, mevcut 839 satırlık çalışan CSS'in sırasını bozmamak için dosya sonuna numaralandırılmış ve gerekçelendirilmiş bir blok olarak eklendi (geri alınabilir, izlenebilir)
- 🎯 **GÖRSEL HATA: bugünün hücresi görünmezdi.** `.hucre.bugun{border-color:var(--asfalt)}` → `--asfalt` (#0E0F13) normal hücre kenarlığından (`--cizgi` #262933) daha koyu; takvimin en önemli hücresi sıradan bir günden az görünüyordu. Artık sarı halka + köşe noktası ile işaretleniyor; hücre doluysa (d-tam/d-yarim/d-gelmedi) halka dolgunun üstünde kalacak ayrı kural var. `color-mix` desteklemeyen eski WebView'ler için rgba yedeği eklendi
- 🔢 **Takvim rakamları Saira Condensed'e geçti**: Uygulamadaki tüm rakamlar bu yüzü kullanıyordu, takvim tek istisnaydı (Rubik). 19px/800, `tabular-nums` ile sabit genişlik
- ☀️ **Dış mekân okunurluğu**: `--soluk` koyu temada #8B8E99 → #9CA0AC, açık temada #6B6D76 → #5D6069. Gün adı şeridi kalınlaştırıldı (700→800), harf aralığı .1em
- 💰 **Bakiye**: 46px → 52px, `letter-spacing:-.015em`. Degrade korundu ama alt uçtaki koyu durak kaldırıldı; degrade metin desteklenmeyen ortam için taban `color` eklendi
- 🎨 Kart başlığı vurgusu `border-left` yerine kartın iç kenarına oturan `::before` işaretine dönüştürüldü; işlenmiş gün dolgularına ince iç ışık + metin gölgesi
- ♿ `:focus-visible` odak halkası eklendi; `prefers-reduced-motion` altında hücre animasyonu kapatıldı
- ↩️ **Bilinçli geri alma**: İlk denemede `.btn-sari` yumuşak gölgeye çevrilmişti. Mevcut tasarımda `box-shadow:0 3px 0 var(--sari-koyu)` + `:active{translateY(2px)}` ile fiziksel "basılan tuş" metaforu vardı — karakterli bir tercih. Jenerik gölgeye çevirmek gerileme olurdu; metafor korunup sadece kalınlık (3px→4px) ve yazı ağırlığı artırıldı
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.2.2`

## 0.0.2.1 — 🚨 İKİ KRİTİK VERİ KAYBI: kronometre saatleri + geri alınamayan fotoğraflar
- Kullanıcı isteği: "hataları bulmaya devam et" — kronometre, geri alma ve silme zincirleri tarandı
- 🚨 **KRİTİK: `kronoDurdur()` saatleri onaydan ÖNCE siliyordu.** İşlem sırası hatalıydı: (1) `localStorage.removeItem("kronoBas")`, (2) `confirm()`, (3) `ayKilitli()` kontrolü. Kullanıcı onay kutusunda "İptal"e bassa veya ay kilitli olsa, kronometre çoktan silinmiş oluyor, tutulan mesai saatleri geri dönüşsüz kayboluyordu — kaç saat olduğu bile bir daha görülemiyordu
  - Yeni sıra: kilit kontrolü → onay → yazma → **ancak başarılı yazmadan sonra** kronometreyi sıfırla. Ağ hatasında da kronometre korunuyor, kullanıcı tekrar deneyebiliyor. Kilitli ay mesajı artık saat bilgisini de veriyor
- 🚨 **KRİTİK: Geri alma, bağlı fotoğrafları kurtarmıyordu.** `toastGeriAlVeri()` ve `toastGeriAl()` yalnızca ana kaydı geri yazıyordu; oysa silme sırasında bağlı fotoğraf (fiş/dekont/gün fotoğrafı) da siliniyordu. Kullanıcı "GERİ AL"a bastığında kayıt `fisli:true` bayrağıyla geri geliyor ama fotoğraf yok — 🧾 düğmesi görünüyor, basınca "bulunamadı" diyordu. Sessiz ve kalıcı fotoğraf kaybı
  - Her iki geri alma fonksiyonu isteğe bağlı ek-dosya parametresi alacak şekilde genişletildi (eski 4 argümanlı çağrılar geriye dönük uyumlu)
  - Silme akışları fotoğrafı silmeden önce belleğe alacak şekilde düzeltildi: masraf fişi (`fisler`), ödeme dekontu (`dekontlar`, 2 ayrı yerde), gün fotoğrafı (`fotolar`)
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.2.1`

## 0.0.2.0 — 🚨 İKİ KRİTİK HATA: raporlarda eksik ödeme + donan ana ekran bakiyesi
- Kullanıcı isteği: "tüm kritik hataları bul" — veri kaybı / para hesabı / sessiz başarısızlık önceliğiyle sistematik tarama
- 🚨 **KRİTİK 1: Dışa aktarımlar ödemeleri sessizce atlıyordu.** `tumOdemelerQS` önbelleği 7 yerde `if(tumOdemelerQS)` deseniyle okunuyordu; önbellek boşsa (dinleyici henüz kurulmamış ya da düşmüş) ödeme listesi sessizce BOŞ kalıyor, CSV/Excel/PDF raporları alınan tüm avanslar eksik olarak üretiliyordu. Bu raporlar işverene/muhasebeciye verilen belgeler olduğu için etkisi ciddi
  - Yeni `tumOdemeleriGetir()` (async, önbellek yoksa sunucudan çeker) → `csvIndir()` ve `excelIndir()` buna geçirildi
  - Senkron jsPDF zincirleri için yeni `tumOdemeOnbellegiHazirla()` → `isPdfPaylas()` ve `yilPdfPaylas()` içinde, senkron üretim başlamadan önce `await` ediliyor
- 🚨 **KRİTİK 2: `tumVeriDinle()` hata yakalayıcıları tamamen boştu.** Firestore hatalı dinleyiciyi kalıcı koparır; `dinleyiciTumG` dolu kaldığından fonksiyon başındaki erken çıkış yeniden kurulmayı sonsuza dek engelliyordu. Dinleyici veri geldikten sonra düşerse önbellek donuyor → ana ekran para kartı eski rakamda kalıyor, sonraki hiçbir kayıt yansımıyor, kullanıcıya hiçbir uyarı gitmiyordu. Hata callback'leri artık önbelleği ve tutamacı sıfırlıyor, böylece dinleyici yeniden kurulabiliyor ve `anaYukle()` içindeki `get()` yedeği anlamlı hale geliyor
- 🔍 **Denetlenip TEMİZ çıkanlar** (hata bulunmadı, değişiklik yapılmadı):
  - `sayi()` para/saat çeviricisi — 19 kenar durum testi (binlik/ondalık ayrımı, "1,000" İngilizce alışkanlığı, saat modunda "2.500"→2.5) hepsi doğru
  - `oranBul()` / `girdiKazanc()` — ücretlerin güne mühürlenmesi (`uYevmiye`/`uMesai`) doğru; zam geçmişi geriye dönük bozmuyor
  - Tüm `db.batch()` kullanımları — 500 işlem sınırına karşı 400/450'lik parçalamalar yerinde
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.2.0`

## 0.0.1.9 — Borç defterinde hayalet uyarı hatası + beklenen ödemeye tür seçimi
- Kullanıcı isteği: "geliştirmeye devam et" — derin hata avı sürdürüldü
- 🐞 **BULUNAN HATA: `borcCiz()` içinde hayalet uyarı.** Ana ekran borç uyarısını gizleyen kod fonksiyonun sonundaydı, ama `if(!borclar.length){ ...; return; }` erken çıkışı ona hiç ulaşmıyordu — kullanıcı vadesi geçmiş son borcunu silince ana ekranda eski uyarı metni asılı kalıyor, dokununca boş bir defter açılıyordu. Uyarı hesabı erken çıkışın öncesine taşındı, fonksiyon sonundaki kopya kaldırıldı
  - Aynı desen `kartCiz()` içinde de denetlendi — orada erken `return` kullanılmadığı (sadece `if` bloğu) için uyarı koduna her durumda ulaşılıyor, hata yok, dokunulmadı
- 💵 **Beklenen ödemeye `tur` alanı eklendi**: Kayıt formuna Avans/Hakediş/Askeriye/Diğer seçimi eklendi. Önceden tahsil edilen her beklenen ödeme sabit olarak `tur:"avans"` ile işleniyordu — hakediş beklentisi yanlış türde kaydediliyor, FIFO/aitAy hesabını etkileyebiliyordu. Artık kayıttaki tür kullanılıyor (`b.tur || "avans"` ile 0.0.1.7-0.0.1.8'de oluşturulmuş eski kayıtlar geriye dönük uyumlu). Liste satırında da tür etiketi gösteriliyor
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.1.9`

## 0.0.1.8 — Beklenen ödemeler yedekleme hatası + ana ekran uyarısı + masraf filtresi
- Kullanıcı isteği: "geliştir işte en detaylı noktaya kadar" — derin hata avı + özellik tamamlama
- 🐞 **BULUNAN HATA (veri kaybı riski): `beklenenler` yedeklenmiyordu.** 0.0.1.7'de eklenen beklenen-ödeme kayıtları `yedekAl()` ve `yedekGeriYukle()` fonksiyonlarına eklenmemişti — yedekten geri dönen bir kullanıcı bu kayıtların tamamını sessizce kaybederdi. Her iki fonksiyona da eklendi, yedek biçim sürümü 3 → 4. Eski (sürüm ≤3) yedekler `||{}` sayesinde geriye dönük uyumlu kalıyor
- ⏳ **Beklenen ödemeler ana ekran uyarısı**: Vadesi geçmiş beklenen ödeme varsa ana ekrandaki bildirim kutusunda sayı + toplam tutar ile uyarı çıkıyor, dokununca Ödemeler ekranına gidiyor. Dinleyici (`beklenenDinle`) artık `birKezBaslat` ile ekran açılışında değil, `borclariDinle()` gibi GİRİŞTE başlatılıyor — aksi halde ana ekran uyarısı, kullanıcı Ödemeler ekranına girmeden hiç görünmezdi
  - `bildirimKutusuGuncelle()` içindeki `satirlar` dizisine `beklenen-uyari` eklendi (yoksa uyarı görünür olsa bile kapsayıcı kutu gizli kalabilirdi)
  - Uyarıyı gizleme mantığı `beklenenCiz()` içindeki erken `return`'ün ÖNCESİNE taşındı — son beklenen kayıt silindiğinde uyarının da kaybolması için (aksi halde ana ekranda hayalet uyarı asılı kalırdı)
- 🧾 **Masraf kategori filtresi**: Masraf listesinin üstüne kategori filtre düğmeleri eklendi. Sadece o ay gerçekten kaydı olan kategoriler gösteriliyor; tek kategori varsa filtre satırı hiç çizilmiyor; seçili kategorideki son kayıt silinirse filtre otomatik "Hepsi"ye dönüyor (boş listede takılı kalma sorunu önlendi)
- 🔍 **Ölü düğme taraması**: HTML'deki tüm `btn-*` id'leri JS'e bağlılık için tarandı. Tek şüpheli (`btn-profili-duzenle`) incelendi ve `data-goruntu` genel yönlendiricisi üzerinden düzgün çalıştığı (`cekmeceAc(false)` dahil) doğrulandı — gerçek ölü düğme yok
- Üç yerde sürüm güncellendi: `app.js`, `sw.js`, zip adı — hepsi `0.0.1.8`

## 0.0.1.7 — Masraf kategorileri + beklenen ödemeler + ekip/rapor/takvim/tasarım güncellemeleri
- Kullanıcı isteği: "devasa güncelleme" — takvim, avans/hakediş, ekip, raporlar, masraf/borç/cüzdan bölümlerine yeni özellik + tasarım yenileme + hata avı
- 🧾 **Masraf kategorileri**: Masraf eklerken Malzeme/Yakıt-Yol/Yemek/Alet-Ekipman/Diğer seçimi eklendi (`sabitler.js`'te `MASRAF_KATEGORI`). "İş masrafları" ekranının üstünde kategoriye göre toplam döküm rozetleri gösteriliyor. Eski kayıtlar (kategori alanı olmayan) otomatik "Diğer" sayılır, geriye dönük uyumlu
- ⏳ **Beklenen ödemeler (yeni özellik)**: "Aldığım paralar" ekranına yeni bir kart eklendi — sözü verilen ama henüz alınmamış parayı (tutar, beklenen tarih, not) `beklenenler` koleksiyonuna kaydediyor. Vadesi geçmişse kırmızı "(gecikti)" uyarısı çıkıyor. "✔ Tahsil edildi" tıklanınca otomatik olarak gerçek bir `odemeler` kaydına dönüştürülüp beklenen listeden siliniyor
- 🏆 **Ekip özetine "Ayın lideri" rozeti**: Aylık ekip özetinin en üstünde, o ay en çok gün çalışan ekip üyesini vurgulayan bir kart (2+ ekip üyesi varken görünür)
- 📊 **CSV/Excel dışa aktarıma masraflar eklendi**: Daha önce yıllık CSV ve Excel raporlarında masraf kayıtları HİÇ yer almıyordu (sadece puantaj + ödemeler vardı) — artık CSV'de kategorili masraf satırları kronolojik sırada, Excel'de ayrı bir "Masraflar" sayfası (tarih/kategori/açıklama/tutar/ödendi mi) olarak yer alıyor
- 📅 **Takvimde masraf günü göstergesi**: Masraf girilen günlerde takvim hücresinin sol üst köşesinde küçük bir 🧾 ikonu görünüyor (fotoğraf/tatil ikonlarıyla aynı desende, ayrı bir köşede — çakışma yok)
- 🎨 **Tasarım tazelendi**: Kart gölgeleri derinleştirildi (`0 2px 8px` + `0 1px 2px`), kart başlıklarına seçili temanın rengiyle solda ince bir vurgu çizgisi eklendi. Yeni tema rengi: 🧱 Kızıl tuğla (koyu ve açık mod için ayrı kontrast ayarlarıyla, mevcut mavi/yeşil/turuncu/amoled temalarla aynı desende)
- Otomatik hata taraması (TODO/FIXME/console.log/debugger, tekrar eden fonksiyon tanımı) tekrarlandı — proje zaten önceki turlarda kapsamlı taranmış olduğundan yeni bulgu çıkmadı; bu turda gerçek değer, yukarıdaki somut özellik eklemelerinde toplandı
- Üç yerde birden sürüm güncellendi (kural gereği): `app.js` (`YENILIK_SURUM`), `sw.js` (`KASA`), zip dosya adı — hepsi `0.0.1.7`

## 0.0.1.6 — Çift kayıt koruması: borç/masraf/ödeme
- "Devam et" isteği üzerine farklı bir hata sınıfı arandı: "çift gönderme" — aynı düğmeye hızlı art arda iki kez basınca kaydın iki kez oluşması
- Önce gün kaydı (`btn-gun-kaydet`) kontrol edildi: GÜVENLİ çıktı, çünkü `.doc(modalTarih).set(...)` kullanıyor — tarih zaten sabit bir doküman ID'si, çift tıklasa bile İKİNCİ yazma AYNI dokümanın üzerine yazıyor, yeni bir kayıt oluşturmuyor (idempotent)
- Asıl risk `.collection(X).add(...)` kullanan üç düğmede bulundu (her çağrıda YENİ, rastgele ID'li bir doküman oluşturuyor): Borç Ekle, Masraf Ekle, Ödeme/Avans Ekle — yavaş bağlantıda "basmadı mı" diye tekrar basmak gerçekçi bir senaryo, sonucu aynı borcun/masrafın/avansın iki kez kaydedilmesi olurdu
- Üçüne de aynı basit ve güvenilir koruma eklendi: işlem başlarken düğme `disabled=true` yapılıyor, `finally` bloğunda (başarılı/başarısız fark etmez) tekrar `disabled=false` yapılıyor — düğme zaten kilitliyken gelen ikinci tıklama fonksiyonun en başında sessizce yok sayılıyor

## 0.0.1.5 — Derin güncelleme devamı: ay kilidi + şantiye silme
- "Devam devam" isteği üzerine aynı yarış-durumu deseni için tarama genişletildi, 2 nokta daha bulundu
- `ayarlar.kapali` (ay kilitleme/açma): basit metin değerleri (örn. "2026-07") olduğundan `arrayUnion`/`arrayRemove` ile atomikleştirildi
- `ayarlar.santiyeler` silme işlemi: silinecek nesne (`s`) zaten yerel diziden birebir geldiğinden `arrayRemove(s)` ile tam nesne eşleşmesi güvenli şekilde çalışıyor
- Kod tabanında artık bilinen, düzeltilmemiş bir "oku-değiştir-yaz" yarış durumu deseni kalmadı (santiyeler ekle/sil, belgeler ekle, isler ekle, kapali ekle/çıkar — hepsi atomik)

## 0.0.1.4 — Derin güncelleme: sessiz veri kaybı riski (yarış durumu) kapatıldı
- Kullanıcı isteği: "uygulama için derin güncelleme yap" — bu sefer görsel değil, kodun senkronizasyon/async katmanında gerçek bir risk arandı
- Bulunan risk sınıfı: `[...(ayarlar.X||[]), yeni]` şeklindeki "yerel diziyi oku → üstüne ekle → TAMAMINI Firestore'a geri yaz" deseni, üç yerde (şantiye ekleme, belge ekleme, iş girişi) kullanılıyordu. Bu desen, kullanıcı ÇOK HIZLI art arda iki kayıt eklerse (örn. iki şantiyeyi peş peşe eklemek), klasik bir "kaybolan güncelleme" (lost update) yarış durumuna açık: ilk yazmanın sonucu yerel `ayarlar.X`'e Firestore'un `onSnapshot` dinleyicisi üzerinden yansımadan (bu birkaç yüz milisaniye sürebilir) ikinci yazma başlarsa, ikinci yazma hâlâ İLK KAYDI İÇERMEYEN eski diziyi baz alıp üzerine yazar — ilk eklenen kayıt HİÇBİR HATA MESAJI OLMADAN sessizce kaybolur
- Düzeltme: üç konumda da (`btn-santiye-ekle` yeni kayıt dalı, `btn-belge-ekle`, iş girişi) Firestore'un kendi atomik `firebase.firestore.FieldValue.arrayUnion(...)` işlemine geçildi — bu işlem sunucu tarafında çalışır, yerel diziye hiç bakmaz, dolayısıyla art arda gelen iki yazma birbirini asla ezemez, ikisi de korunur
- Bilinçli olarak kapsam dışı bırakılanlar: düzenleme (edit) ve silme (delete) işlemleri — bunlar `arrayUnion`/`arrayRemove` ile trivially atomikleştirilemiyor (bir dizinin İÇİNDEKİ bir nesnenin belirli bir alanını değiştirmek, basit ekle/çıkar değil) ve kullanıcı davranışı olarak zaten çok daha nadir/yavaş yapılan işlemler, bu yüzden gereksiz karmaşıklık/test riski almamak için dokunulmadı

## 0.0.1.3 — Yeni uygulama ikonu: gün batımı + vinç + baret
- Kullanıcı bir ilham fotoğrafı (vinç, gün batımı, baret, plan kağıtları) paylaşıp uygulamanın ana ekran ikonunun bu atmosferde olmasını istedi
- Önce (kullanıcının açıkça istediği "önce görsel göster, dosyayı verme" kuralına uyularak) Python/PIL ile bir ikon tasarımı çizilip hem büyük hem gerçek-boyut (96px) önizlemesi ayrı görseller olarak paylaşıldı, onay alındıktan SONRA gerçek dosyalara işlendi
- Tasarım: lacivertten turuncuya/sarıya geçen gün batımı gradyanı, bulanıklaştırılmış bir güneş parıltısı, iki kule vinç silüeti (biri belirgin, biri uzakta/soluk — derinlik hissi), alt kısımda bina/iskele hatları, odakta sarı bir baret — küçük ikon boyutunda (96px) test edilip hâlâ net okunduğu doğrulandı
- 3 boyut/varyant üretildi: 192×192, 512×512, ve Android'in "maskable" formatı için özel olarak ortaya küçültülüp güvenli-alan payı bırakılmış bir 512×512 varyant (kenarları kırpılsa da baret/vinç tam ortada kalıyor)
- `manifest.webmanifest`'teki (Python `json` modülüyle güvenli şekilde parse edilip yeniden yazıldı) 3 ikon girdisi VE `index.html`'deki 2 ayrı `apple-touch-icon` etiketindeki (iOS'un "Ana ekrana ekle" özelliği için ayrıca gerekiyor, manifest'ten bağımsız) gömülü base64 veriler yeni ikonla değiştirildi — hem Android hem iOS artık aynı yeni ikonu gösteriyor

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
