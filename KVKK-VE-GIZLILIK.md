# KVKK Uyumu ve Gizlilik Belgeleri — Şablonlar ve Yapılacaklar

> ⚠️ **ÖNEMLİ UYARI — BU HUKUKİ TAVSİYE DEĞİLDİR.**
> Bu dosya, araştırma bulgularına dayanan bir **taslak/kontrol listesidir**.
> Uygulama çalışan verisi (çalışma saati, ücret, ödeme) işliyor ve verileri
> yurt dışına (Google/Firebase sunucuları) aktarıyor. Yayına çıkmadan önce
> bir **KVKK uzmanı veya avukat** tarafından gözden geçirilmelidir.
> Aşağıdaki `[KÖŞELİ PARANTEZ]` alanlarını kendi bilgilerinizle doldurun.

---

## 1. NEDEN GEREKLİ?

Uygulama şunları tutuyor: kullanıcı adı/e-postası, çalışılan günler ve saatler,
yevmiye tutarı, alınan avanslar, hakedişler, masraflar, borç kayıtları, ekip
üyelerinin isimleri ve yoklamaları, fiş/dekont fotoğrafları.

Bunların **tamamı 6698 sayılı Kanun kapsamında kişisel veridir.** Uygulamayı
yayınlayan kişi/şirket **"veri sorumlusu"** sayılır.

Ayrıca: Google Play Store'a yayınlamak için **Gizlilik Politikası URL'si zorunludur.**

---

## 2. HUKUKİ SEBEP SEÇİMİ (kritik karar)

Yaygın bir hata, her şey için "açık rıza" almaya çalışmaktır. **Bu genelde yanlış
ve risklidir**, çünkü açık rıza her an geri çekilebilir — kullanıcı rızasını
çekince veriyi işlemeye devam edemezsiniz.

Doğru yaklaşım:

| Veri | Önerilen hukuki sebep |
|---|---|
| Puantaj, yevmiye, avans/hakediş kayıtları | Sözleşmenin ifası (m.5/2-c) veya meşru menfaat (m.5/2-f) |
| Hesap bilgisi (e-posta, ad) | Sözleşmenin ifası (m.5/2-c) |
| Fiş/dekont fotoğrafları | Sözleşmenin ifası / meşru menfaat |
| İsteğe bağlı özellikler (konum, bildirim) | **Açık rıza** (m.5/1) |

**Kural:** Açık rıza yalnızca gerçekten isteğe bağlı özellikler için alınmalı.

---

## 3. AYDINLATMA METNİ ŞABLONU

> Aydınlatma metni **her durumda zorunludur** (talebe bağlı değil) ve açık rıza
> metninden **AYRI** sunulmalıdır. KVK Kurulu kararları, ikisinin tek metin veya
> tek onay kutusu olarak sunulmasını açıkça yasaklamıştır. Önceden işaretli
> (pre-ticked) kutu kullanılamaz.

```
KİŞİSEL VERİLERİN KORUNMASI HAKKINDA AYDINLATMA METNİ

Veri Sorumlusu: [AD SOYAD / ŞİRKET ÜNVANI]
Adres: [ADRES]
İletişim: [E-POSTA] / [TELEFON]

1) İŞLENEN KİŞİSEL VERİLER
   - Kimlik ve iletişim: ad-soyad, e-posta adresi
   - Çalışma verileri: çalışılan günler, mesai saatleri, yevmiye tutarı,
     şantiye/proje bilgisi
   - Finansal veriler: alınan avanslar, hakedişler, masraf kayıtları,
     borç/alacak kayıtları
   - Görsel veriler: kullanıcının kendi yüklediği fiş, dekont ve şantiye
     fotoğrafları
   - Ekip verileri: kullanıcının eklediği ekip üyelerinin adları ve
     yoklama kayıtları

2) İŞLEME AMAÇLARI
   Kişisel verileriniz; uygulamanın temel işlevi olan puantaj (çalışma günü)
   takibi, hakediş ve avans hesabının yürütülmesi, masraf ve borç kaydının
   tutulması, talebiniz üzerine rapor (PDF/Excel) üretilmesi ve hesabınızın
   güvenliğinin sağlanması amaçlarıyla işlenmektedir.

3) TOPLAMA YÖNTEMİ VE HUKUKİ SEBEP
   Verileriniz, uygulamayı kullanırken doğrudan sizin tarafınızdan girilmek
   suretiyle, tamamen otomatik yollarla toplanmaktadır. İşleme faaliyetinin
   hukuki sebebi, 6698 sayılı Kanun'un 5/2-(c) maddesi uyarınca
   "sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması" ve
   5/2-(f) maddesi uyarınca "veri sorumlusunun meşru menfaati" dir.
   [Eğer isteğe bağlı özellik varsa: Bildirim gönderimi gibi isteğe bağlı
   özellikler için ayrıca açık rızanız alınmaktadır.]

4) AKTARIM
   Verileriniz, uygulamanın çalışması için kullanılan bulut altyapı
   hizmeti sağlayıcısı Google LLC'ye ait Firebase / Google Cloud
   sunucularında saklanmaktadır. Bu sunucular YURT DIŞINDA bulunmaktadır.
   Verileriniz bunun dışında üçüncü kişilerle paylaşılmamakta, satılmamakta
   ve reklam amacıyla kullanılmamaktadır.
   [Yurt dışına aktarım için Kanun m.9 kapsamında gerekli şartın
   sağlandığını belirtin — uzmanınıza danışın.]

5) SAKLAMA SÜRESİ
   Verileriniz, hesabınız aktif olduğu sürece ve ilgili mevzuatta öngörülen
   zamanaşımı süreleri boyunca saklanır. Hesabınızı sildiğinizde verileriniz
   [X] gün içinde silinir. Ayrıntı için Saklama ve İmha Politikası'na bakınız.

6) HAKLARINIZ (KVKK m.11)
   Kişisel verilerinizin işlenip işlenmediğini öğrenme; işlenmişse buna
   ilişkin bilgi talep etme; işlenme amacını ve amacına uygun kullanılıp
   kullanılmadığını öğrenme; yurt içinde/yurt dışında aktarıldığı üçüncü
   kişileri bilme; eksik veya yanlış işlenmiş olması hâlinde düzeltilmesini
   isteme; silinmesini veya yok edilmesini isteme; düzeltme/silme
   işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme; münhasıran
   otomatik sistemlerle analiz edilmesi suretiyle aleyhinize bir sonucun
   ortaya çıkmasına itiraz etme; kanuna aykırı işleme sebebiyle zarara
   uğramanız hâlinde zararın giderilmesini talep etme haklarına sahipsiniz.

   Taleplerinizi [E-POSTA] adresine iletebilirsiniz. Talebiniz en geç
   30 (otuz) gün içinde sonuçlandırılır.

Son güncelleme: [TARİH]
```

---

## 4. UYGULAMAYA EKLENMESİ GEREKENLER (yapılacak iş)

- [ ] Aydınlatma metnini uygulama içinde erişilebilir bir sayfaya koy
      (Ayarlar → "Gizlilik ve KVKK")
- [ ] Kayıt/giriş ekranında aydınlatma metnine **link** ver
- [ ] Gizlilik Politikası'nı **halka açık bir URL'de** yayınla
      (Play Store için zorunlu — örn. `https://[alanadi]/gizlilik`)
- [ ] "Verilerimi indir" — **zaten var** (JSON yedekleme). Bunu KVKK m.11
      erişim hakkı karşılığı olarak belgele.
- [ ] "Hesabımı ve tüm verilerimi sil" akışı ekle — şu an yok.
      Silme talebinde Firestore'daki tüm alt koleksiyonların da silinmesi
      gerekir (üst dökümanı silmek alt koleksiyonları SİLMEZ).
- [ ] Saklama ve İmha Politikası yaz (aşağıdaki nota bakınız)
- [ ] Veri ihlali müdahale planı hazırla (72 saat kuralı)

---

## 5. SAKLAMA VE İMHA POLİTİKASI — ÖZET KURALLAR

- Periyodik imha aralığı **her hâlükârda 6 ayı geçemez**.
- Saklama/imha politikası hazırlamakla yükümlü olmayanlar, imha yükümlülüğü
  doğduktan sonra **3 ay** içinde veriyi imha etmelidir.
- İmha kayıtları **en az 3 yıl** saklanır.

---

## 6. VERİ İHLALİ (SIZINTI) DURUMUNDA

- İhlali öğrendiğiniz andan itibaren **gecikmeksizin ve en geç 72 saat** içinde
  Kişisel Verileri Koruma Kurulu'na bildirin.
- Etkilenen kullanıcılara makul en kısa sürede bildirin (ulaşılabiliyorsa
  doğrudan; ulaşılamıyorsa web sitesinde duyuru).
- Bildirimde asgari olarak: ihlalin ne zaman gerçekleştiği, etkilenen veri
  kategorileri, olası sonuçları, alınan/alınacak tedbirler ve irtibat bilgileri
  yer almalıdır.

---

## 7. VERBİS KAYDI

Aşağıdakilerden biri geçerliyse VERBİS'e kayıt **zorunludur**:
- Yıllık çalışan sayısı 50'den çok, **veya** yıllık mali bilanço toplamı
  belirlenen eşiği aşıyor
- Ana faaliyeti özel nitelikli kişisel veri işleme olan
- Yurt dışında yerleşik veri sorumlusu
- Kamu kurum ve kuruluşları

Tek kişilik/küçük bir geliştirici için genellikle **istisna** kapsamındasınızdır,
ancak işletme büyürse kayıt gerekir.

> ⚠️ Bilanço eşiğinin **güncel tutarı** kaynaklar arasında farklılık gösteriyor
> (ilk dönem 25 milyon TL; sonraki kararlarla güncellendiği belirtiliyor).
> Güncel eşiği kvkk.gov.tr üzerinden veya bir uzmandan **teyit edin**.
