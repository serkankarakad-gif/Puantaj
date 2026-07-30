/* =========================================================
   SABİTLER — Puantaj Defterim
   Bu dosya, app.js'in her yerinde kullanılan ama neredeyse hiç
   değişmeyen (ay/gün adları, resmi tatiller, rozet tanımları, TV
   kanalları, haber kaynakları, namaz vakti adları) sabit verileri
   içerir. Kod okunurluğunu artırmak için app.js'ten ayrıldı.

   ÖNEMLİ: Bu dosya index.html'de app.js'ten ÖNCE yüklenmeli
   (script sırası önemli — app.js bu sabitleri kullanıyor).
   ========================================================= */

const AYLAR = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const GUNLER_KISA = ["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"];
const GUNLER = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];

/* ---------- 🎉 Resmi ve dini tatiller ---------- */
const TATIL_SABIT = {
  "01-01":"Yılbaşı","04-23":"23 Nisan","05-01":"1 Mayıs (Emek günü)",
  "05-19":"19 Mayıs","07-15":"15 Temmuz","08-30":"30 Ağustos Zafer Bayramı","10-29":"Cumhuriyet Bayramı"
};
const TATIL_DINI = {
  "2025-03-30":"Ramazan Bayramı","2025-03-31":"Ramazan Bayramı","2025-04-01":"Ramazan Bayramı",
  "2025-06-06":"Kurban Bayramı","2025-06-07":"Kurban Bayramı","2025-06-08":"Kurban Bayramı","2025-06-09":"Kurban Bayramı",
  "2026-03-20":"Ramazan Bayramı","2026-03-21":"Ramazan Bayramı","2026-03-22":"Ramazan Bayramı",
  "2026-05-27":"Kurban Bayramı","2026-05-28":"Kurban Bayramı","2026-05-29":"Kurban Bayramı","2026-05-30":"Kurban Bayramı",
  "2027-03-09":"Ramazan Bayramı","2027-03-10":"Ramazan Bayramı","2027-03-11":"Ramazan Bayramı",
  "2027-05-16":"Kurban Bayramı","2027-05-17":"Kurban Bayramı","2027-05-18":"Kurban Bayramı","2027-05-19":"Kurban Bayramı",
  "2028-02-27":"Ramazan Bayramı","2028-02-28":"Ramazan Bayramı","2028-02-29":"Ramazan Bayramı",
  "2028-05-05":"Kurban Bayramı","2028-05-06":"Kurban Bayramı","2028-05-07":"Kurban Bayramı","2028-05-08":"Kurban Bayramı"
};
const tatilAdi = id => TATIL_DINI[id] || TATIL_SABIT[id.slice(5)] || null;

/* ---------- 🏆 Rozet tanımları ---------- */
const ROZETLER = [
  {ikon:"🥇", ad:"İlk Adım",          sart:"İlk gününü işle",           d: i=> i.gunToplam,     h:1,       t: i=> i.gunToplam>=1},
  {ikon:"🔟", ad:"Onluk",             sart:"10 gün çalış",              d: i=> i.gunToplam,     h:10,      t: i=> i.gunToplam>=10},
  {ikon:"💪", ad:"Ellilik",           sart:"50 gün çalış",              d: i=> i.gunToplam,     h:50,      t: i=> i.gunToplam>=50},
  {ikon:"💯", ad:"Yüzler Kulübü",     sart:"100 gün çalış",             d: i=> i.gunToplam,     h:100,     t: i=> i.gunToplam>=100},
  {ikon:"🏗️", ad:"Demirbaş",          sart:"250 gün çalış",             d: i=> i.gunToplam,     h:250,     t: i=> i.gunToplam>=250},
  {ikon:"🗿", ad:"Şantiyenin Direği", sart:"500 gün çalış",             d: i=> i.gunToplam,     h:500,     t: i=> i.gunToplam>=500},
  {ikon:"⏰", ad:"İlk Mesai",         sart:"İlk mesaini yap",           d: i=> i.mesaiToplam,   h:1,       t: i=> i.mesaiToplam>=1},
  {ikon:"🌙", ad:"Gece Kuşu",         sart:"50 saat mesai",             d: i=> i.mesaiToplam,   h:50,      t: i=> i.mesaiToplam>=50},
  {ikon:"🔥", ad:"Mesai Canavarı",    sart:"150 saat mesai",            d: i=> i.mesaiToplam,   h:150,     t: i=> i.mesaiToplam>=150},
  {ikon:"➕", ad:"Artı Avcısı",       sart:"Toplam 5 gün içi artı",     d: i=> i.artiToplam,    h:5,       t: i=> i.artiToplam>=5},
  {ikon:"🛐", ad:"Pazar Fedaisi",     sart:"1 pazar günü çalış",        d: i=> i.pazarToplam,   h:1,       t: i=> i.pazarToplam>=1},
  {ikon:"🦸", ad:"Pazar Kahramanı",   sart:"10 pazar günü çalış",       d: i=> i.pazarToplam,   h:10,      t: i=> i.pazarToplam>=10},
  {ikon:"💵", ad:"İlk Hakediş",       sart:"İlk para girişini kaydet",  d: i=> i.odemeSayisi,   h:1,       t: i=> i.odemeSayisi>=1},
  {ikon:"💰", ad:"Çeyrek Milyon",     sart:"250.000 ₺ hakediş",         d: i=> i.hakedisToplam, h:250000,  t: i=> i.hakedisToplam>=250000},
  {ikon:"🏆", ad:"Milyoner Usta",     sart:"1.000.000 ₺ hakediş",       d: i=> i.hakedisToplam, h:1000000, t: i=> i.hakedisToplam>=1000000}
];

/* ---------- 📺 TV kanalları ---------- */
const TV_KANALLAR = [
  {grup:"HABER KANALLARI", liste:[
    {ad:"Habertürk", kisa:"HT",    renk:"#0D47A1", url:"https://www.haberturk.com/canliyayin", ytId:"UCn6dNfiRE_Xunu7iMyvD7AA", ytVid:"RNVNlJSUFoE"},
    {ad:"CNN Türk",  kisa:"CNN",   renk:"#B71C1C", url:"https://www.cnnturk.com/canli-yayin",  ytId:"UCV6zcRug6Hqp1UX_FdyUeBg", ytVid:"6N8_r2uwLEc"},
    {ad:"TRT Haber", kisa:"TRT H", renk:"#1565C0", url:"https://www.trthaber.com/canli-yayin", ytLive:"https://www.youtube.com/user/trthaber/live", ytVid:"vjNZVmImcxg"},
    {ad:"TGRT Haber", kisa:"TGRT", renk:"#00838F", url:"https://www.tgrthaber.com/canli-yayin", ytVid:"0SAUIyvNA5s"},
    {ad:"Haber Global", kisa:"HG", renk:"#5E35B1", url:"https://haberglobal.com/canli-yayin", ytId:"UCtc-a9ZUIg0_5HpsPxEO7Qg", ytVid:"EqoCJ8BPxtE"}
  ]},
  {grup:"SPOR", liste:[
    {ad:"A Spor",    kisa:"A S",   renk:"#1B5E20", url:"https://www.aspor.com.tr/webtv/canli-yayin", ytId:"UCJElRTCNEmLemgirqvsW63Q"}
  ]}
];

/* ---------- 📰 Haber kaynakları (RSS) ---------- */
const HABER_KAYNAK = {
  gundem:  "https://news.google.com/rss?hl=tr&gl=TR&ceid=TR:tr",
  dunya:   "https://news.google.com/rss/headlines/section/topic/WORLD?hl=tr&gl=TR&ceid=TR:tr",
  ekonomi: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=tr&gl=TR&ceid=TR:tr",
  spor:    "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=tr&gl=TR&ceid=TR:tr"
};

/* ---------- 🕌 Namaz vakti adları ---------- */
const VAKIT_ADLAR = [["Fajr","İmsak"],["Sunrise","Güneş"],["Dhuhr","Öğle"],["Asr","İkindi"],["Maghrib","Akşam"],["Isha","Yatsı"]];
