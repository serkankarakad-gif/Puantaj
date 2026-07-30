# Versiyonlama Standardı

## Format
`0.0.0.X` — dört basamaklı, sondaki `X` her güncellemede **1 artan** bir sayaç.
Klasik semantik sürümleme (major.minor.patch) yerine, tek bir artan sayaç
tercih edildi çünkü bu proje tek geliştiricili (sen + Claude) ve her
güncelleme "bir sonraki teslimat" anlamına geliyor — kırılan/kırılmayan
değişiklik ayrımı şu an için gerekli değil.

## Kural: Üç yerde birden, HER ZAMAN birlikte değişir
1. **app.js** — `const YENILIK_SURUM = "0.0.0.X";` (uygulama içi, "Neler yeni" kartını tetikler)
2. **sw.js** — `const KASA = "puantaj-0.0.0.X";` (servis çalışanı önbelleği — değişmezse kullanıcılar eski dosyaları görmeye devam eder)
3. **Zip dosyasının adı** — `0.0.0.X.zip`

Üçü de birbirine **birebir eşit olmalı**. Biri unutulursa (özellikle sw.js'teki
KASA), kullanıcılar tarayıcıyı/uygulamayı kapatıp açsalar bile eski sürümde
takılı kalabilir.

## Ne zaman artırılır
Kullanıcıya giden HER teslimat (zip) öncesinde, yapılan değişiklik ister tek
satırlık bir hata düzeltmesi ister büyük bir özellik olsun, numara 1 artar.
"Küçük değişiklik, versiyon artırmaya değmez" diye bir istisna yok — çünkü
sw.js'nin önbelleği sürüm değişmeden tazelenmiyor.

## "Neler yeni" kartı
`index.html` içindeki `#yenilik-kart` her sürümde güncellenir; SADECE o
sürümdeki değişiklikleri gösterir (kümülatif değil — önceki sürümlerin
notları `CHANGELOG.md`'de kalıcı olarak tutulur, uygulama içinde değil).
