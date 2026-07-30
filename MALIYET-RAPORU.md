# Firestore Maliyet Raporu (Temmuz 2026)

Gerçek kullanım verine (billing/analytics) erişimim yok, bu yüzden aşağıdaki
rakamlar kodun sorgu desenlerinden çıkardığım **teorik tahmin**. Gerçek
sayıları görmek istersen: Firebase konsolu → **Usage and billing** sekmesi.

## Ücretsiz kota (Spark plan)
- 50.000 okuma / gün
- 20.000 yazma / gün
- 20.000 silme / gün
- 1 GiB depolama

## Bulduğum ve düzelttiğim gerçek sorun: Liderlik tablosu

**Önce:** "Bu ayın çalışkanları" (liderlik tablosu) her açıldığında, kayıtlı
en fazla 25 kişinin HER BİRİNİN o ayki tüm günlerini tek tek okuyordu.
25 kişi × ~31 gün = **ekranı her açışta 775 okumaya kadar**, hem de hiç
önbelleğe alınmadan — 10 kişi günde 3 kez bu ekranı açsa 23.000 okuma demek,
tek başına günlük kotanın neredeyse yarısı.

**Şimdi:** Aynı ay için sonuç 5 dakika önbelleğe alınıyor. Aynı ekranı
5 dakika içinde tekrar açan kimse yeni bir sorgu tetiklemiyor.

## Diğer okuma kalemleri (mevcut haliyle, kodda inceledim)

| Kalem | Ne zaman çalışır | Yaklaşık maliyet |
|---|---|---|
| Ana ekran "Şirket hesap kartı" | Girişte 1 kez, gerçek-zamanlı dinler | Kullanıcının **baştan beri** girdiği gün+ödeme sayısı kadar okuma (1 kere), sonrası sadece değişen kayıt kadar |
| Aylık takvim (Puantaj ekranı) | Ay değiştirildikçe | O ayki gün+ödeme sayısı (≤~40) |
| Yıl özeti | Ekran açıldıkça | O yıldaki gün+ödeme sayısı (≤~400) |
| Herkes / kişi karşılaştırma | Kişi seçildikçe | O kişinin o ayki verisi (≤~40) |
| Arama | Yazdıkça | **0 ek okuma** — zaten yüklü veride arıyor |
| CSV/Yedek dışa aktarım | Kullanıcı istediğinde | Tüm geçmiş (kullanıcı bilerek istiyor, tek seferlik) |

## En büyük büyüme kalemi: "Şirket hesap kartı" (tüm zamanlar toplamı)

Bu, kullanıcının **hiç silmediği sürece büyüyen** tek kalem — 5 yıl kullanan
biri için ~1800-2000 belge (gün+ödeme) demek. Kötü haber değil aslında:
- Firestore'da gerçek-zamanlı dinleyici (onSnapshot) kullanıyoruz, yani bu
  N belge sadece **ilk açılışta bir kere** okunuyor; sonraki her değişiklik
  sadece değişen belge kadar okuma yapıyor (tekrar tekrar N okumuyor).
- 5 yıllık ağır bir kullanıcı bile günde birkaç kez açtığında birkaç bin
  okumayı geçmiyor — tek kullanıcı için ücretsiz kotanın çok altında.

**Ne zaman gerçek sorun olur:** Aynı şirketin Firebase projesinde **çok
sayıda işçi** (50-100+) varsa ve hepsi aynı gün uygulamayı açarsa, toplam
okuma sayısı kotaya yaklaşabilir. Bunun gerçek çözümü (kalıcı bir "toplam"
sayaç alanı tutup her yazışta onu güncellemek) **Cloud Functions** gerektirir
— bu proje şu an sunucu kodu içermiyor, ben de bunu canlı test edemeden
riske atmak istemedim (yanlış yaparsam sessizce yanlış bakiye gösterebilir,
bu bir maaş/hakediş uygulamasında affedilmez bir hata olur). Şu an gerçek
bir sorun olduğuna dair kanıt yok; olursa ayrı bir oturumda ele alalım.

## Composite Index

Kodundaki 20+ sorgunun tamamı tek alan üzerinde aralık sorgusu
(`tarih >= X, <= Y` ya da `documentId() >= X, <= Y`) veya tek `orderBy`.
**Composite index'e hiç ihtiyaç yok**, otomatik indeksler yeterli.

## Batch Write

Toplu gün işleme, ekip yoklaması kaydı, yedek geri yükleme — üçü de zaten
`db.batch()` kullanıyor, 450 işlemde bir yeni batch açıyor (Firestore'un
500 sınırının altında, güvenli). Ek bir şey yapmaya gerek yoktu.

## Transaction

Bu uygulamada "aynı anda iki yazma birbirinin üstüne yazsın" riski taşıyan
bir sayaç/increment deseni yok (her kayıt kendi tarihine ait bağımsız bir
belge, üstüne yazma zaten kullanıcının kendi bilinçli işlemi). Transaction
gerektiren bir nokta bulmadım.

## Arşiv sistemi / Veri yaşam döngüsü

**Bilerek önermiyorum.** Bu bir yevmiye/hakediş defteri — kullanıcılar
muhtemelen yıllarca geriye dönük kayıtlarını (ileride ihtilaf çıkarsa kanıt
olarak, ya da SGK/vergi amaçlı) saklamak ister. Otomatik silme (TTL) ya da
zorla arşivleme, birinin parasıyla ilgili kanıtını kaybetmesine yol açabilir
— bu, "performans kazancı" için göze alınacak bir risk değil. İstersen
**isteğe bağlı, kullanıcının kendi seçtiği** bir "eski yılları dışa aktar
ve iste​rsen sil" özelliği ekleyebilirim (zaten CSV/yedek indirme var, onun
üstüne "ve şimdi silmek ister misin?" sorusu eklemek kolay) — ama otomatik
hiçbir şeyi silmem.

## Yazma maliyetleri

Her gün kaydı 1 yazma, her ödeme 1 yazma — standart, düşürülecek bir şey
yok. Tek dikkat: "hızlı işaretleme" (takvimde bir güne dokunup tam/yarım/
gelmedi arası döndürme) her dokunuşta 1 yazma yapıyor — bu zaten kullanıcının
bilinçli her tıklaması karşılığı, azaltılabilecek bir "gereksiz" yazma değil.
