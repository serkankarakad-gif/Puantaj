/* =========================================================
   PUANTAJ DEFTERİM — uygulama mantığı
   ========================================================= */
(function(){
"use strict";

const $ = s => document.querySelector(s);
/* Titreşim ayarına uyan ortak haptic feedback yardımcısı */
/* ---------- ✨ Günlük akış animasyonları ----------
   Hepsi yalnızca transform/opacity kullanır (GPU'da çalışır, kaydırmayı
   takmaz). Hareket azaltma tercihi açıksa CSS tarafında zaten kapanırlar;
   burada ayrıca kontrol etmeye gerek yok. */

/* Ay ileri/geri giderken takvimin yönlü kayması */
function takvimYonAnimasyon(yon){
  const t = document.getElementById("takvim");
  if(!t) return;
  t.classList.remove("ay-ileri","ay-geri");
  void t.offsetWidth;                       /* animasyonu yeniden tetiklemek için */
  t.classList.add(yon==="ileri" ? "ay-ileri" : "ay-geri");
}

/* Bir gün işlendiğinde o hücreyi vurgula — hangi hücrenin değiştiği
   gözle takip edilebilsin. Takvim yeniden çizildikten SONRA çağrılmalı. */
function gunHucreVurgula(id){
  requestAnimationFrame(()=>{
    const h = document.querySelector('.hucre[data-id="'+id+'"]');
    if(!h) return;
    h.classList.remove("yeni-islendi");
    void h.offsetWidth;
    h.classList.add("yeni-islendi");
    setTimeout(()=> h.classList.remove("yeni-islendi"), 400);
  });
}

/* Kaydetme onayı: ekranın ortasında kısa bir yeşil tik damgası */
function kayitTikGoster(){
  const d = document.createElement("div");
  d.className = "kayit-tik";
  d.textContent = "✓";
  d.setAttribute("aria-hidden","true");
  document.body.appendChild(d);
  setTimeout(()=> d.remove(), 900);
}

/* ---------- 🛡️ Girdi sınırları ----------
   Neden gerekli: `sayi()` çeviriciyi doğru yapıyor ama MAKUL olup olmadığına
   bakmıyordu. Kullanıcı yanlışlıkla "999" yazsa (mesela 9'a basılı kalsa)
   999 saat mesai kaydediliyor ve hakediş milyonlara çıkıyordu. Eksi değer de
   kabul ediliyordu — negatif mesai kazancı düşürüyordu.
   Bu sınırlar veriyi reddetmiyor, KIRPIYOR ve kullanıcıyı uyarıyor; böylece
   bir yazım hatası aylarca fark edilmeyen yanlış bir bakiyeye dönüşmüyor.

   Sınırlar bilinçli olarak GENİŞ: amaç gerçek kullanımı engellemek değil,
   açıkça hatalı girişi yakalamak. Bir günde 18 saatten fazla mesai, tek
   kalemde 1 milyon TL'nin üstünde ödeme gerçekçi değil. */
const SINIR = {
  mesaiSaat: 18,        /* bir günde en fazla mesai saati */
  calismaSaat: 24,      /* saatlik çalışmada bir günün tamamı */
  artiGun: 5,           /* gün içi "artı yevmiye" adedi */
  tutar: 1000000,       /* tek kalemde tutar (TL) */
  yevmiye: 100000       /* günlük yevmiye / saat ücreti üst sınırı */
};
/* Değeri 0 ile üst sınır arasına kırpar. Kırpma olduysa kullanıcıya söyler. */
function sinirla(deger, ust, ad, birim){
  let d = Number(deger)||0;
  if(d < 0){
    toast("⚠️ " + ad + " eksi olamaz, 0 kabul edildi");
    return 0;
  }
  if(d > ust){
    toast("⚠️ " + ad + " çok yüksek görünüyor (" + d + " " + (birim||"") + "). " +
          ust + " " + (birim||"") + " olarak kaydedildi — yanlışsa düzelt.");
    return ust;
  }
  return d;
}

function titret(desen){
  try{
    if(!navigator.vibrate) return;
    if(localStorage.getItem("titresim")==="0") return;
    navigator.vibrate(desen);
  }catch(e){}
}
/* Liste yüklenirken "Yükleniyor..." yerine gerçek satırların hatlarını taklit eden iskelet göster */
function iskeletGoster(kap, adet){
  if(!kap) return;
  let h = "";
  for(let i=0;i<(adet||4);i++){
    h += '<div class="iskelet-satir">'+
      '<div class="iskelet iskelet-rozet"></div>'+
      '<div class="iskelet-metin"><div class="iskelet iskelet-satir-1"></div><div class="iskelet iskelet-satir-2"></div></div>'+
      '</div>';
  }
  kap.innerHTML = h;
}
const $$ = s => document.querySelectorAll(s);

/* AYLAR, GUNLER_KISA, GUNLER → sabitler.js'e taşındı */

const paraFmt = n => new Intl.NumberFormat("tr-TR",{maximumFractionDigits:0}).format(n||0) + " ₺";
const pad = n => String(n).padStart(2,"0");
/* Kullanıcı metnini (not, açıklama, isim, şantiye vb.) HTML'e basmadan önce
   kaçış (escape) et — başka birinin notu/ismi ekrana zararlı kod olarak
   basılmasın diye (örn. "Herkes" ekranında başka bir hesabın verisi). */
const esc = v => String(v==null ? "" : v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
/* Bir ödemenin "hangi ayın hesabına sayıldığını" bulur. Yeni kayıtlarda
   ayrı bir "aitAy" alanı tutulur (gerçek alım tarihinden BAĞIMSIZ) — çünkü
   parayı bugün alsan bile o, geçen ayın borcunun karşılığı olabilir. Eski
   kayıtlarda bu alan yoksa, geriye dönük uyumluluk için tarih'in ayına
   düşer (eskiden zaten öyle davranıyordu). */
function odemeAyi(v){
  if(!v) return "";
  return v.aitAy || String(v.tarih||"").slice(0,7);
}
/* Ana ekrandaki tekil uyarı satırlarını (tatil/dün/eşik/kapanış/maaş/kart/borç/belge)
   TEK bir "Bildirimler" kutusu içinde birleştirdik — her satır kendi
   göster/gizle mantığını korur, bu fonksiyon sadece dıştaki kutunun en az
   bir satır aktifse görünmesini sağlar. Her satırı gösteren/gizleyen kod
   kendi işini bitirince bunu çağırır. */
function bildirimKutusuGuncelle(){
  const kutu = document.querySelector("#bildirim-kutusu"); if(!kutu) return;
  const satirlar = ["tatil-kart","dun-kart","esik-uyari","kapanis-uyari","maas-kart","kart-uyari","borc-uyari","beklenen-uyari","belge-uyari-kart"];
  const varMi = satirlar.some(id=>{
    const el = document.getElementById(id);
    return el && !el.classList.contains("gizli");
  });
  kutu.classList.toggle("gizli", !varMi);
}

/* iOS/Türkçe klavye dostu sayı okuma:
   "2,5" → 2.5 · "1.250,75" → 1250.75 · "5.000" → 5000 (binlik nokta!)
   "1.234.567" → 1234567 · "2.5" → 2.5 · "5.000 TL" → 5000
   iPhone klavyesinde nokta olduğu için işçiler "2.500" diye binlik yazıyor;
   eskiden bu 2,5 TL sanılıyordu. Artık: nokta + tam 3 hane = binlik ayraç. */
function sayi(v, saatMiktarModu){
  let s = String(v==null ? "" : v).trim();
  if(!s) return 0;
  s = s.replace(/[^0-9.,-]/g, "");                 /* ₺, TL, boşluk vb. temizle */
  if(!s) return 0;
  if(saatMiktarModu){
    /* Saat/miktar alanlarında (mesai, artı, parça, gece mesaisi) "2.500" gibi
       bir yazım HER ZAMAN "2,5" demektir — kimse 2500 saat mesai yapmaz.
       Binlik ayracı varsayımı burada YAPILMAZ, nokta/virgül direkt ondalık sayılır. */
    s = s.replace(",", ".");
    const n2 = Number(s);
    return isFinite(n2) ? n2 : 0;
  }
  if(s.indexOf(",") > -1){
    const vParca = s.split(",");
    if(s.indexOf(".") === -1 && vParca.length === 2 && vParca[1].length === 3 && vParca[0] !== "0" && vParca[0] !== ""){
      s = vParca.join("");                         /* "1,000" → 1000 (İngilizce binlik alışkanlığı) */
    }else{
      s = s.split(".").join("").replace(",", "."); /* virgül = ondalık, nokta = binlik */
    }
  }else{
    const parcalar = s.split(".");
    if(parcalar.length > 2){
      s = parcalar.join("");                       /* 1.234.567 → binlik */
    }else if(parcalar.length === 2 && parcalar[1].length === 3 && parcalar[0] !== "0" && parcalar[0] !== ""){
      s = parcalar.join("");                       /* 5.000 → 5000 (0.500 gibi gerçek ondalıklar korunur) */
    }
  }
  const n = Number(s);
  return isFinite(n) ? n : 0;
}
const tarihId = d => d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate());

/* Resmi tatiller (sabit) + dini bayramlar (2025-2027, Diyanet takvimine göre) */
/* TATIL_SABIT, TATIL_DINI, tatilAdi → sabitler.js'e taşındı */

let db=null, auth=null, kullanici=null;
let aktifYil, aktifAy;                 // gösterilen ay
let ayarlar = { yevmiye:0, mesaiUcret:0, ekGunluk:0, saatUcret:0, gunlukSaat:8,
                calismaTipi:"yevmiye", hedef:0, kapali:[], santiye:"", santiyeler:[],
                pazarZam:0, tatilZam:0, parcaBirim:"adet", parcaFiyat:0, belgeler:[], geceZam:0, isler:[], profilFoto:"" };
let girdiler = {};                     // { "2026-07-08": {...} }
let odemeler = [];                     // bu ayın ödemeleri
let borclar = [];                      // tüm borç kayıtları
let kartlar = [], dinleyiciKart = null, duzenlenenKart = null; // 💳 kredi kartları
let planlar = [], dinleyiciPlan = null; // 📐 plan/proje linkleri
/* let cuzdan kaldırıldı — Cüzdan özelliği tamamen kaldırıldı */
let masraflar = [];                    // bu ayın iş masrafları
let ekipListe = [];                    // ekipteki işçiler
let masrafSeciliKategori = "malzeme";  // masraf ekleme formunda seçili kategori
let masrafFiltre = "hepsi";            // masraf listesinde gösterilen kategori ("hepsi" = filtre yok)
let beklenenler = [], dinleyiciBeklenen = null;  // ⏳ henüz eline geçmemiş, sözü verilen ödemeler
let yoklama = {};                      // seçili günün yoklaması {iscId:{durum,mesai}}
let gunKonum = null;                   // modaldaki konum damgası
let seciliKisi = null;                 // Herkes sayfasında seçilen kişi
let kisiAyarlar = null;                // seçilen kişinin ücret ayarları
let notlar = [];                       // not defteri
let gizliMod = false;                  // bakiye gizleme
let odemeFiltre = "";                  // ödeme tür filtresi
let duzenlenenOdeme = null;            // düzenlenen ödeme kaydı
let duzenlenenSantiyeId = null;        // düzenlenen şantiye
let takvimPara = false;                // takvimde kazanç göster
let seciciYil = null;                  // ay seçici yılı
let kayitSirala = "yeni";              // kayıt listesi sıralaması
let duzenlenenIsciId = null;           // düzenlenen ekip işçisi
let ekipOzetSon = null;                // son ekip özeti (toplu rapor için)
let yilSon = null;                     // son yüklenen yıl özeti (paylaşım için)
let sirketOzet = null;                 // tüm zamanlar {hakedis, alinan}
let maaslarVeri = null;                // "Maaşlar" ekranı için ay bazlı veri {ay: {hak, alinan, gun, mesai, odemeler}}
let havaVeriSon = null;                // en son çekilen hava durumu verisi (tam ekran için)
let dinleyiciGirdi=null, dinleyiciOdeme=null, dinleyiciAyar=null, dinleyiciBorc=null, dinleyiciCuzdan=null, dinleyiciNot=null, dinleyiciMasraf=null, dinleyiciEkip=null;
let modalTarih=null, modalDurum=null;
let aktifGoruntu="puantaj";

/* ---------- Başlat ---------- */
function basla(){
  if(!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("BURAYA")){
    $("#ekran-yukleniyor").classList.add("gizli");
    $("#ekran-kurulum").classList.remove("gizli");
    return;
  }
  firebase.initializeApp(firebaseConfig);
  /* App Check: sadece gerçek bir site key girilmişse devreye girer.
     Girilmemişse (placeholder ise) sessizce atlanır, hiçbir şeyi bozmaz. */
  try{
    if(typeof RECAPTCHA_SITE_KEY==="string" && RECAPTCHA_SITE_KEY && !RECAPTCHA_SITE_KEY.startsWith("BURAYA") && firebase.appCheck){
      firebase.appCheck().activate(RECAPTCHA_SITE_KEY, true);
    }
  }catch(e){ console.warn("App Check başlatılamadı:", e); }
  auth = firebase.auth();
  db = firebase.firestore();

  /* MUTABAKAT MODU (0.1.1.4)
     Bağlantıda ?mutabakat=ANAHTAR varsa işveren geldi demektir.
     Bu kişi hesap açmıyor — giriş akışı hiç başlatılmıyor, yalnızca
     onay ekranı gösteriliyor. Uygulamanın geri kalanı yüklenmiyor,
     dinleyici kurulmuyor, kişisel veri okunmuyor. */
  try{
    const mutAnahtar = new URLSearchParams(location.search).get("mutabakat");
    if(mutAnahtar){ mutabakatGoster(mutAnahtar); return; }
  }catch(e){}
  db.enablePersistence({synchronizeTabs:true}).catch(()=>{ /* çevrimdışı desteklenmiyorsa sorun değil */ });

  const bugun = new Date();
  aktifYil = bugun.getFullYear();
  aktifAy = bugun.getMonth();

  auth.onAuthStateChanged(u=>{
    /* Çıkış VEYA farklı bir hesaba geçiş (aynı cihazda ara çıkış yapılmadan
       doğrudan başka hesaba giriş) — her iki durumda da ESKİ hesabın TÜM
       dinleyicilerini (sadece "tüm veri" değil, hepsini) kapat; yoksa iki
       hesabın verisi aynı anda karışabilir. */
    if(!u || (kullanici && kullanici.uid !== u.uid)){
      tumVeriBirak();
      dinleyicileriKapat();
    }
    kullanici = u;
    $("#ekran-yukleniyor").classList.add("gizli");
    if(u){
      $("#ekran-giris").classList.add("gizli");
      $("#ekran-uygulama").classList.remove("gizli");
      kullaniciBilgiYaz();
      /* PIN kilidi ZORUNLU: PIN yoksa oluşturma, varsa girme ekranı — uygulama
         her açılışta (bu satır her onAuthStateChanged tetiklenişinde çalışır,
         yani kapat-aç yapınca da) bunu göstermeden hiçbir ekran görünmüyor. */
      if(window.pinEkraniHazirla) window.pinEkraniHazirla();
      else setTimeout(()=>{ if(window.pinEkraniHazirla) window.pinEkraniHazirla(); }, 300);
      kokRef().set({ad: u.displayName||""},{merge:true}).catch(()=>{});
      /* Derin link: #kisi=uid ile gelindiyse o kişiyi aç */
      setTimeout(()=>{
        const hk = location.hash||"";
        if(hk==="#bugun"){
          history.replaceState(null,"",location.pathname);
          document.querySelector('[data-goruntu="puantaj"]').click();
          modalAc(tarihId(new Date()));
          return;
        }
        if(hk==="#avans"){
          history.replaceState(null,"",location.pathname);
          document.querySelector('[data-goruntu="odemeler"]').click();
          setTimeout(()=> formuAcVeOdaklan("#odeme-tutar"), 400);
          return;
        }
        const m = hk.match(/kisi=([A-Za-z0-9]+)/);
        if(m){
          const dBtn = document.querySelector('[data-goruntu="kisiler"]');
          if(dBtn) dBtn.click();
          db.collection("kullanicilar").doc(m[1]).get()
            .then(doc=> kisiSec(m[1], (doc.exists && (doc.data().ad||"").trim()) || "Kullanıcı"))
            .catch(()=>{});
        }
      }, 800);
      hepsiniCiz();        /* takvim hemen çizilsin, veri sonra dolar */
      ayarlariDinle();
      ayiYukle();
      borclariDinle();     /* Ana ekrandaki kart/borç vade uyarı kutuları buna bağlı, ertelenemez */
      /* Beklenen ödemeler de ana ekranda bir uyarı kutusu besliyor ("sözü verilip gelmeyen para"),
         bu yüzden Ödemeler ekranı hiç açılmasa bile girişte başlaması gerekiyor — ertelenemez. */
      birKezBaslat("beklenen", beklenenDinle);
      /* cuzdaniDinle() kaldırıldı — Cüzdan özelliği tamamen kaldırıldı */
      anaYukle();
      havaYukle();
      yedekHatirlat();
      const anaBtn = document.querySelector('[data-goruntu="ana"]');
      if(anaBtn) anaBtn.click();
    }else{
      $("#ekran-uygulama").classList.add("gizli");
      $("#ekran-giris").classList.remove("gizli");
    }
  });
}

function dinleyicileriKapat(){
  if(dinleyiciKart) dinleyiciKart();
  if(dinleyiciGirdi) dinleyiciGirdi();
  if(dinleyiciOdeme) dinleyiciOdeme();
  if(dinleyiciAyar) dinleyiciAyar();
  if(dinleyiciBorc) dinleyiciBorc();
  if(dinleyiciCuzdan) dinleyiciCuzdan();
  if(dinleyiciNot) dinleyiciNot();
  if(dinleyiciMasraf) dinleyiciMasraf();
  if(dinleyiciEkip) dinleyiciEkip();
  if(dinleyiciPlan) dinleyiciPlan();
  if(dinleyiciBeklenen) dinleyiciBeklenen();
  dinleyiciKart=dinleyiciGirdi=dinleyiciOdeme=dinleyiciAyar=dinleyiciBorc=dinleyiciCuzdan=dinleyiciNot=dinleyiciMasraf=dinleyiciEkip=dinleyiciPlan=dinleyiciBeklenen=null;
  baslatmalariSifirla();  /* ertelenen dinleyiciler bir sonraki girişte tekrar başlayabilsin */
}

function kullaniciBilgiYaz(){
  const ad = kullanici.displayName || "İşçi kardeşim";
  $("#menu-ad").textContent = ad;
  $("#menu-eposta").textContent = kullanici.email || "";
  /* 0.0.3.8: Tanı menüsü artık HERKESE AÇIK.
     Önceden `TANI_YETKILI` listesindeki e-postaya göre gizleniyordu ama bu
     sadece sorun çıkardı: e-posta yazılmadığında menü görünmüyor, hiçbir
     uyarı da çıkmıyordu. Kilidin gerçek bir faydası da yoktu — tanı ekranı
     yalnızca giriş yapmış kullanıcının KENDİ verisini okur, hiçbir şey
     yazmaz, başkasının verisine erişemez. Yani birinin görmesi zararsız.
     Kilit kaldırıldı; kurulum adımı da ortadan kalktı. */
  $("#ayar-ad").value = kullanici.displayName || "";
  avatarCiz();
}

/* ---------- 📷 Profil fotoğrafı: kendi ad harfimizin yerine gerçek fotoğraf ----------
   Firebase Storage kurmak yerine (ekstra kurulum gerektirir), küçük/sıkıştırılmış bir
   kare fotoğrafı base64 olarak doğrudan Firestore'daki ayarlar belgesine kaydediyoruz
   — 200x200 JPEG %75 kalite genelde 15-30 KB civarı kalıyor, Firestore'un 1 MB belge
   sınırının çok altında, ekstra bir kurulum/masraf gerektirmiyor. */
function avatarCiz(){
  /* Uygulamadaki HER avatar görüntüsünü (hamburger menü, Ayarlar önizlemesi,
     PIN ekranı) tek bir yerden, aynı mantıkla günceller — fotoğraf değiştirme
     artık SADECE Ayarlar'dan yapılabiliyor ama sonucu her yerde görünmeli. */
  const adHarfi = ()=>{
    const ad = (kullanici && kullanici.displayName) || "";
    return trBuyuk(ad.trim().charAt(0)) || "?";
  };
  ["#menu-avatar", "#ayar-avatar-onizle", "#pin-avatar"].forEach(secici=>{
    const el = $(secici);
    if(!el) return;
    if(ayarlar.profilFoto){
      el.style.backgroundImage = "url("+ayarlar.profilFoto+")";
      el.textContent = "";
    }else{
      el.style.backgroundImage = "";
      el.textContent = adHarfi();
    }
  });
}

function profilFotoSecildi(dosya){
  if(!dosya || !dosya.type.startsWith("image/")){ toast("Bu bir resim dosyası değil"); return; }
  const okuyucu = new FileReader();
  okuyucu.onload = e=>{
    const img = new Image();
    img.onload = async ()=>{
      /* Kare kırp + 200x200'e küçült, dosya boyutunu makul tutmak için */
      const boyut = 200;
      const cv = document.createElement("canvas");
      cv.width = boyut; cv.height = boyut;
      const c = cv.getContext("2d");
      const kenar = Math.min(img.width, img.height);
      const sx = (img.width-kenar)/2, sy = (img.height-kenar)/2;
      c.drawImage(img, sx, sy, kenar, kenar, 0, 0, boyut, boyut);
      const base64 = cv.toDataURL("image/jpeg", 0.8);
      try{
        await kokRef().set({profilFoto: base64}, {merge:true});
        toast("📷 Profil fotoğrafı güncellendi");
      }catch(e2){ hataGoster(e2); }
    };
    img.src = e.target.result;
  };
  okuyucu.readAsDataURL(dosya);
}

/* ---------- Firestore yolları ---------- */
const kokRef = () => db.collection("kullanicilar").doc(kullanici.uid);

function ayarlariDinle(){
  dinleyiciAyar = kokRef().onSnapshot(doc=>{
    const d = doc.data() || {};
    ayarlar.yevmiye   = Number(d.yevmiye)||0;
    ayarlar.mesaiUcret= Number(d.mesaiUcret)||0;
    ayarlar.ekGunluk  = Number(d.ekGunluk)||0;
    ayarlar.saatUcret = Number(d.saatUcret)||0;
    ayarlar.gunlukSaat= Number(d.gunlukSaat)||8;
    ayarlar.calismaTipi = d.calismaTipi==="saatlik" ? "saatlik" : "yevmiye";
    ayarlar.hedef     = Number(d.hedef)||0;
    ayarlar.kapali    = Array.isArray(d.kapali) ? d.kapali : [];
    ayarlar.sgkGun    = Number(d.sgkGun)||0;
    ayarlar.sgkHedef  = Number(d.sgkHedef)||0;
    ayarlar.uyariEsik = Number(d.uyariEsik)||0;
    /* ayarlar.kumbara kaldırıldı — Cüzdan özelliği tamamen kaldırıldı */
    ayarlar.notCipler = Array.isArray(d.notCipler)&&d.notCipler.length ? d.notCipler : ["🌧 Yağmur","📦 Malzeme gelmedi","🕐 Erken paydos","🚚 Başka şantiye"];
    ayarlar.santiye   = d.santiye||"";
    ayarlar.santiyeler= Array.isArray(d.santiyeler) ? d.santiyeler : [];
    ayarlar.pazarZam  = Number(d.pazarZam)||0;
    ayarlar.tatilZam  = Number(d.tatilZam)||0;
    ayarlar.geceZam   = Number(d.geceZam)||0;
    ayarlar.parcaBirim = d.parcaBirim || "adet";
    ayarlar.parcaFiyat = Number(d.parcaFiyat)||0;
    ayarlar.belgeler = Array.isArray(d.belgeler) ? d.belgeler : [];
    /* 💼 İşlerim: her işten girişi/çıkışı ayrı ayrı bir kayıt — birden fazla
       şantiye/patron değişince eski işin adı/ücreti kaybolmasın diye */
    ayarlar.isler = Array.isArray(d.isler) ? d.isler : [];
    ayarlar.profilFoto = d.profilFoto || "";
    avatarCiz();   /* artık #pin-avatar dahil TÜM avatarları tek seferde günceller */
    $("#ayar-yevmiye").value = ayarlar.yevmiye||"";
    $("#ayar-mesai").value   = ayarlar.mesaiUcret||"";
    $("#ayar-ek").value      = ayarlar.ekGunluk||"";
    $("#ayar-saat").value    = ayarlar.saatUcret||"";
    $("#ayar-gunsaat").value = ayarlar.gunlukSaat||"";
    $("#ayar-tip").value     = ayarlar.calismaTipi;
    /* Saat ücreti ve standart gün alanları yalnızca SAATLİK modda anlamlı.
       Yevmiyeli çalışan (kullanıcıların çoğu) bunları görüp kafası
       karışıyordu — özellikle mesai artık yevmiyeden hesaplandığı için.
       Mod değiştikçe grup açılıp kapanıyor. */
    try{
      const saatlikGrup = document.getElementById("alan-saatlik-grup");
      if(saatlikGrup) saatlikGrup.classList.toggle("gizli", ayarlar.calismaTipi !== "saatlik");
    }catch(e){}
    /* Saat ücreti ve standart gün alanları yalnızca SAATLİK modda anlamlı.
       Yevmiyeli çalışan (kullanıcıların çoğu) bunları görüp kafası
       karışıyordu — özellikle mesai artık yevmiyeden hesaplandığı için.
       Mod değiştikçe grup açılıp kapanıyor. */
    const saatlikGrup = $("#alan-saatlik-grup");
    if(saatlikGrup) saatlikGrup.classList.toggle("gizli", ayarlar.calismaTipi !== "saatlik");
    $("#ayar-hedef").value   = ayarlar.hedef||"";
    $("#ayar-santiye").value = ayarlar.santiye;
    $("#ayar-giris").value   = ayarlar.iseGiris||"";
    $("#ayar-maas").value    = ayarlar.maasGunu>0 ? ayarlar.maasGunu : "";
    if(ayarlar.iseGiris && !$("#kidem-giris").value) $("#kidem-giris").value = ayarlar.iseGiris;
    $("#ayar-sgk").value = ayarlar.sgkGun||"";
    $("#ayar-sgk-hedef").value = ayarlar.sgkHedef||"";
    $("#ayar-esik").value = ayarlar.uyariEsik||"";
    /* $("#ayar-kumbara") kaldırıldı — element artık HTML'de yok */
    $("#ayar-cipler").value = ayarlar.notCipler.join(", ");
    $("#ayar-pazar-zam").value = ayarlar.pazarZam||"";
    $("#ayar-tatil-zam").value = ayarlar.tatilZam||"";
    $("#ayar-gece-zam").value = ayarlar.geceZam||"";
    $("#ayar-parca-birim").value = ayarlar.parcaBirim||"adet";
    $("#ayar-parca-fiyat").value = ayarlar.parcaFiyat||"";
    notCipCiz();
    sgkCiz();
    santiyeListCiz();
    islerListCiz();
    planListCiz();
    belgeListCiz();
    belgeDurt();
    hepsiniCiz();
  }, hataGoster);
}

/* ---------- Ay kilidi ---------- */
const ayAnahtar = id => String(id).slice(0,7);          // "2026-07-15" -> "2026-07"
const aktifAyAnahtar = () => aktifYil+"-"+pad(aktifAy+1);
const ayKilitli = id => ayarlar.kapali.includes(ayAnahtar(id));

/* ---------- ⚡ Performans: nadiren kullanılan Firestore dinleyicilerini
   sadece o ekran ilk açıldığında başlat (girişte hepsini birden açmak yerine) ---------- */
const baslatilanlar = new Set();
function birKezBaslat(anahtar, fn){
  if(baslatilanlar.has(anahtar)) return;
  baslatilanlar.add(anahtar);
  fn();
}
function baslatmalariSifirla(){ baslatilanlar.clear(); }

/* ---------- Borç defteri ---------- */
function borclariDinle(){
  dinleyiciKart = kokRef().collection("kartlar").onSnapshot(qs=>{
    kartlar = [];
    qs.forEach(doc=> kartlar.push({id:doc.id, ...doc.data()}));
    kartlar.sort((a,b)=> kartGunKalan(a.gun) - kartGunKalan(b.gun));
    kartCiz();
  }, ()=>{
    /* Aynı kritik hata (0.1.0.6): boş hata callback'i. Bağlantı koptuğunda
       kredi kartları ekranı sessizce donuyor, borç ve son ödeme günü
       güncellenmiyordu — kullanıcı ödeme gününü kaçırabilirdi. */
    dinleyiciKart = null;
  });;
  dinleyiciBorc = kokRef().collection("borclar").onSnapshot(qs=>{
    borclar = [];
    qs.forEach(doc=> borclar.push({id:doc.id, ...doc.data()}));
    borclar.sort((a,b)=>{
      if(!!a.odendi !== !!b.odendi) return a.odendi ? 1 : -1;
      return a.tarih < b.tarih ? 1 : -1;
    });
    borcCiz();
  }, hataGoster);
}

/* ---------- 📐 Plan / proje linkleri (WhatsApp/Drive'dan gelen PDF ve fotoğraflar) ---------- */
function linkGuvenliMi(u){
  /* Sadece http/https linklerine izin ver — javascript: gibi zararlı adresleri reddet */
  try{ const p = new URL(u); return p.protocol==="http:" || p.protocol==="https:"; }catch(e){ return false; }
}
function planlariDinle(){
  dinleyiciPlan = kokRef().collection("planlar").onSnapshot(qs=>{
    planlar = [];
    qs.forEach(doc=> planlar.push({id:doc.id, ...doc.data()}));
    planlar.sort((a,b)=> (b.eklenme||0) - (a.eklenme||0));
    planListCiz();
  }, ()=>{
    /* KRİTİK: hata callback'i eskiden BOŞTU (0.1.0.6'da bulundu).
       Firestore bir dinleyici hata alınca onu KALICI olarak koparıyor —
       kendi kendine yeniden bağlanmıyor. Tutamaç (`dinleyiciPlan`) dolu
       kaldığı için kod "zaten dinliyorum" sanıp yeniden kurmuyordu.
       Sonuç: bağlantı bir kez koptuktan sonra planlar ekranı SESSİZCE
       donuyor, yeni eklenen plan hiç görünmüyordu.
       Tutamaç sıfırlanınca bir sonraki çağrı dinleyiciyi yeniden kuruyor. */
    dinleyiciPlan = null;
  });;
}
function planListCiz(){
  const ul = $("#liste-planlar"); if(!ul) return;
  if(!planlar.length){
    ul.innerHTML = '<div class="bos-mesaj" style="padding:14px">Henüz plan eklemedin. WhatsApp\'tan gelen PDF/fotoğrafı Drive\'a atıp linkini buraya yapıştır.</div>';
    return;
  }
  ul.innerHTML = "";
  planlar.forEach(p=>{
    const santiye = (ayarlar.santiyeler||[]).find(s=>s.id===p.santiyeId);
    const li = document.createElement("li");
    li.innerHTML =
      '<div class="rozet" style="background:var(--mesai)">📐</div>'+
      '<div class="orta" style="cursor:pointer"><div class="baslik">'+esc(p.ad||"Plan")+'</div>'+
      '<div class="alt-yazi">'+(santiye ? "🏗️ "+esc(santiye.ad)+" · " : "")+"Açmak için dokun ›"+'</div></div>'+
      '<button class="sil" aria-label="Sil">🗑️</button>';
    li.querySelector(".orta").addEventListener("click", ()=>{
      if(!linkGuvenliMi(p.link)){ toast("Bu link güvenli görünmüyor, açılamadı ⚠️"); return; }
      window.open(p.link, "_blank", "noopener,noreferrer");
    });
    li.querySelector(".sil").addEventListener("click", async ()=>{
      if(!confirm('"'+p.ad+'" planı listeden silinsin mi? (Drive\'daki dosyaya dokunulmaz)')) return;
      try{
        await kokRef().collection("planlar").doc(p.id).delete();
        toast("Plan silindi");
      }catch(e){ hataGoster(e); }
    });
    ul.appendChild(li);
  });
}
function planSantiyeSecDoldur(){
  const secAlan = $("#alan-plan-santiye-sec"), sec = $("#plan-santiye-sec");
  if(!secAlan || !sec) return;
  if((ayarlar.santiyeler||[]).length){
    secAlan.classList.remove("gizli");
    sec.innerHTML = '<option value="">Şantiye seçme (genel)</option>' +
      ayarlar.santiyeler.map(s=> '<option value="'+s.id+'">'+esc(s.ad)+'</option>').join("");
  }else{
    secAlan.classList.add("gizli");
    sec.innerHTML = "";
  }
}

/* ---------- 💳 Kredi kartı takibi ---------- */
function kartGunKalan(sonGun){
  /* Ayın kaçında son ödeme? Bugünden kaç gün kaldığını hesapla (31 çeken aylarda ay sonuna kırp) */
  sonGun = Math.min(31, Math.max(1, Number(sonGun)||1));
  const simdi = new Date();
  const buAySon = new Date(simdi.getFullYear(), simdi.getMonth()+1, 0).getDate();
  const hedefBuAy = Math.min(sonGun, buAySon);
  if(simdi.getDate() <= hedefBuAy) return hedefBuAy - simdi.getDate();
  const sonrakiAySon = new Date(simdi.getFullYear(), simdi.getMonth()+2, 0).getDate();
  return (buAySon - simdi.getDate()) + Math.min(sonGun, sonrakiAySon);
}
function kartCiz(){
  const ul = $("#liste-kartlar");
  if(ul){
    const toplamB = kartlar.reduce((t,k)=> t + (Number(k.borc)||0), 0);
    const tEl = $("#kart-toplam");
    if(tEl) tEl.textContent = kartlar.length
      ? "Toplam kart borcun: " + (gizliMod ? "••••" : paraFmt(toplamB))
      : "";
    ul.innerHTML = "";
    if(!kartlar.length){
      ul.innerHTML = '<div class="bos-mesaj"><span class="buyuk">💳</span>Kayıtlı kart yok. Üstten ekle, son ödeme gününü kaçırma.</div>';
    }
    kartlar.forEach(k=>{
      const kalanG = kartGunKalan(k.gun);
      const borc = Number(k.borc)||0;
      const li = document.createElement("li");
      let etiket, renk;
      if(borc <= 0){ etiket = "borç yok ✨"; renk = "var(--soluk)"; }
      else if(kalanG === 0){ etiket = "SON ÖDEME BUGÜN!"; renk = "var(--gelmedi)"; li.style.borderLeft = "3px solid var(--gelmedi)"; }
      else if(kalanG <= 2){ etiket = "son ödemeye "+kalanG+" gün!"; renk = "var(--sari)"; li.style.borderLeft = "3px solid var(--sari)"; }
      else { etiket = "son ödeme: ayın "+k.gun+"'i ("+kalanG+" gün)"; renk = "var(--soluk)"; }
      li.innerHTML =
        '<div class="rozet" style="background:var(--mesai)">💳</div>'+
        '<div class="orta" style="cursor:pointer"><div class="baslik">'+String(k.ad||"Kart").replace(/</g,"&lt;")+'</div>'+
        '<div class="alt-yazi" style="color:'+renk+'">'+(k.banka?esc(k.banka)+" · ":"")+etiket+'</div></div>'+
        '<div class="tutar">'+(gizliMod ? "••••" : paraFmt(borc))+'</div>'+
        '<span style="color:var(--soluk);font-size:16px;padding:0 4px">›</span>';
      li.addEventListener("click", ()=> kartDetayAc(k));
      ul.appendChild(li);
    });
  }
  /* ⏰ Ana ekran uyarısı: 2 gün içinde son ödemesi olan borçlu kart */
  const uy = $("#kart-uyari");
  if(uy){
    const yakin = kartlar.filter(k=> (Number(k.borc)||0) > 0 && kartGunKalan(k.gun) <= 2);
    if(yakin.length){
      const enYakin = yakin[0];
      const g = kartGunKalan(enYakin.gun);
      uy.innerHTML = "💳 <b>"+String(enYakin.ad||"Kart").replace(/</g,"&lt;")+"</b> kartının son ödemesi" +
        (g === 0 ? " <b style='color:var(--gelmedi)'>BUGÜN!</b>" : "ne <b>"+g+" gün</b> kaldı!") +
        (yakin.length > 1 ? " (+"+(yakin.length-1)+" kart daha)" : "") + " — dokun ›";
      uy.classList.remove("gizli");
    }else uy.classList.add("gizli");
    bildirimKutusuGuncelle();
  }
}

/* ---------- 💳 Kart detay modalı: banka, borç, ödeme geçmişi ---------- */
let aktifKartDetay = null;
function kartDetayAc(k){
  aktifKartDetay = k;
  const borc = Number(k.borc)||0;
  const kalanG = kartGunKalan(k.gun);
  $("#kd-baslik").textContent = k.ad||"Kart";
  $("#kd-banka").textContent = "🏦 " + (k.banka||"Banka belirtilmemiş");
  $("#kd-borc").textContent = gizliMod ? "••••" : paraFmt(borc);
  $("#kd-vade").textContent = borc<=0 ? "Borç yok ✨" :
    (kalanG===0 ? "Son ödeme BUGÜN!" : "Son ödeme: ayın "+k.gun+"'i · "+kalanG+" gün kaldı");
  $("#kd-odeme-form").classList.add("gizli");
  $("#kd-odeme-tutar").value = "";
  const liste = $("#kd-odeme-liste");
  const odemeler2 = [...(k.odemeler||[])].sort((a,b)=> (b.zaman||0)-(a.zaman||0));
  if(!odemeler2.length){
    liste.innerHTML = '<div class="bos-mesaj" style="padding:14px 0">Henüz ödeme kaydı yok.</div>';
  }else{
    liste.innerHTML = odemeler2.map(o=>{
      const t = o.zaman ? new Date(o.zaman) : null;
      const tarihYazi = t ? t.getDate()+" "+AYLAR[t.getMonth()]+" "+t.getFullYear() : "";
      return '<li><div class="rozet" style="background:var(--tam)">💰</div>'+
        '<div class="orta"><div class="baslik">Ödeme yapıldı</div><div class="alt-yazi">'+esc(tarihYazi)+'</div></div>'+
        '<div class="tutar">'+paraFmt(o.tutar)+'</div></li>';
    }).join("");
  }
  $("#modal-perde").classList.add("acik");
  $("#kart-detay-modal").classList.add("acik");
}
function kartDetayKapat(){
  $("#modal-perde").classList.remove("acik");
  $("#kart-detay-modal").classList.remove("acik");
}

function borcKalan(b){ return Math.max(0, (Number(b.tutar)||0) - (Number(b.odenen)||0)); }
function vadeEtiket(b, bugunId){
  if(b.odendi || !b.vade) return "";
  if(b.vade < bugunId){
    const gun = Math.round((new Date(bugunId+"T12:00:00") - new Date(b.vade+"T12:00:00"))/86400000);
    return ' · <b style="color:var(--gelmedi)">⚠️ '+gun+' gün gecikti</b>';
  }
  if(b.vade === bugunId) return ' · <b style="color:var(--sari)">vade bugün!</b>';
  const gun = Math.round((new Date(b.vade+"T12:00:00") - new Date(bugunId+"T12:00:00"))/86400000);
  const t = new Date(b.vade+"T12:00:00");
  return ' · vade: '+t.getDate()+' '+AYLAR[t.getMonth()].slice(0,3)+' ('+gun+' gün)';
}
function borcCiz(){
  const acikVerdim = borclar.filter(b=> b.yon==="verdim" && !b.odendi).reduce((s,b)=> s+borcKalan(b), 0);
  const acikAldim  = borclar.filter(b=> b.yon==="aldim"  && !b.odendi).reduce((s,b)=> s+borcKalan(b), 0);
  const net = acikVerdim - acikAldim;
  $("#borc-ozet").innerHTML =
    '<div class="ozet-kut tam-r"><div class="et">Alacağım (verdim)</div><div class="deger">'+paraFmt(acikVerdim)+'</div></div>'+
    '<div class="ozet-kut eksi"><div class="et">Borcum (aldım)</div><div class="deger">'+paraFmt(acikAldim)+'</div></div>'+
    '<div class="ozet-kut '+(net>=0?'vurgu':'eksi')+'" style="grid-column:1/-1"><div class="et">Net durum</div><div class="deger">'+(net>=0?'+':'')+paraFmt(net)+'</div></div>';
  const ul = $("#liste-borclar");
  const bugunId = tarihId(new Date());
  /* ⚠️ Ana ekran uyarısı: vadesi geçen açık kayıtlar.
     DÜZELTME: bu blok eskiden fonksiyonun SONUNDAYDI, ama hemen aşağıdaki
     "kayıt yok" erken çıkışı ona hiç ulaşmıyordu — kullanıcı vadesi geçmiş son
     borcunu silince ana ekranda "Vadesi geçen 2 kayıt var" hayalet uyarısı
     asılı kalıyordu (dokununca da bomboş bir borç defteri açılıyordu).
     Artık erken çıkıştan ÖNCE hesaplanıyor, liste boşalınca uyarı da kayboluyor. */
  const uy = $("#borc-uyari");
  if(uy){
    const gecikenler = borclar.filter(b=> !b.odendi && b.vade && b.vade < bugunId);
    if(gecikenler.length){
      const alacak = gecikenler.filter(b=> b.yon==="verdim").length;
      uy.innerHTML = "⚠️ Vadesi geçen <b>"+gecikenler.length+"</b> kayıt var"+
        (alacak ? " ("+alacak+" alacağın gecikmiş!)" : "")+" — dokun, borç defterine git ›";
      uy.classList.remove("gizli");
    }else uy.classList.add("gizli");
    bildirimKutusuGuncelle();
  }
  if(!borclar.length){
    ul.innerHTML = '<div class="bos-mesaj"><span class="buyuk">🤝</span>Borç kaydın yok, temizsin 👍</div>';
    return;
  }
  ul.innerHTML = "";
  /* Vadesi geçenler en üstte, sonra vadesi yaklaşanlar, kapananlar en altta */
  const sirali = borclar.slice().sort((a,b)=>{
    if(!!a.odendi !== !!b.odendi) return a.odendi ? 1 : -1;
    const aG = !a.odendi && a.vade && a.vade < bugunId, bG = !b.odendi && b.vade && b.vade < bugunId;
    if(aG !== bG) return aG ? -1 : 1;
    return (a.tarih||"") < (b.tarih||"") ? 1 : -1;
  });
  sirali.forEach(b=>{
    const t = new Date(b.tarih+"T12:00:00");
    const li = document.createElement("li");
    if(b.odendi) li.style.opacity = ".45";
    const gecikti = !b.odendi && b.vade && b.vade < bugunId;
    if(gecikti) li.style.borderLeft = "3px solid var(--gelmedi)";
    const kalan = borcKalan(b);
    const odenen = Number(b.odenen)||0;
    li.innerHTML =
      '<div class="rozet" style="background:'+(b.yon==="verdim"?"var(--tam)":"var(--gelmedi)")+'">'+(b.yon==="verdim"?"↗":"↘")+'<small>'+t.getDate()+' '+AYLAR[t.getMonth()].slice(0,3)+'</small></div>'+
      '<div class="orta"><div class="baslik">'+esc(b.kisi||"?")+(b.odendi?" ✔ kapandı":"")+'</div>'+
      '<div class="alt-yazi">'+(b.yon==="verdim"?"Ona verdim":"Ondan aldım")+(b.not?" — "+esc(b.not):"")+vadeEtiket(b, bugunId)+'</div></div>'+
      '<div class="tutar">'+paraFmt(b.odendi ? b.tutar : kalan)+
        (odenen>0 && !b.odendi ? '<div style="font-size:10px;color:var(--tam);font-weight:600">'+paraFmt(odenen)+' ödendi</div>' : '')+'</div>'+
      '<button class="sil" aria-label="Paylaş" style="color:var(--mesai)">📤</button>'+
      (!b.odendi ? '<button class="sil" aria-label="Kismi" style="color:var(--sari)">💰</button>' : '')+
      '<button class="sil" aria-label="Kapat" style="color:var(--tam)">'+(b.odendi?"↩️":"✔")+'</button>'+
      '<button class="sil" aria-label="Sil">🗑️</button>';
    const kismiBtn = li.querySelector('[aria-label="Kismi"]');
    if(kismiBtn) kismiBtn.addEventListener("click", async ()=>{
      const ham = prompt((b.kisi||"")+" ne kadar ödedi? (kalan: "+paraFmt(kalan)+")");
      if(ham===null) return;
      const x = sayi(ham);
      if(!(x>0)){ toast("Geçerli bir tutar yaz kanka"); return; }
      const yeniOdenen = Math.min(Number(b.tutar)||0, odenen + x);
      const kapandi = yeniOdenen >= (Number(b.tutar)||0);
      try{
        await kokRef().collection("borclar").doc(b.id).update({odenen: yeniOdenen, odendi: kapandi});
        toast(kapandi ? "Borç tamamen kapandı ✔ Helal!" : paraFmt(x)+" işlendi, kalan "+paraFmt((Number(b.tutar)||0)-yeniOdenen));
      }catch(e){ hataGoster(e); }
    });
    li.querySelector('[aria-label="Paylaş"]').addEventListener("click", async ()=>{
      const t2 = new Date(b.tarih+"T12:00:00");
      const kalanM = borcKalan(b);
      const gecikmis = !b.odendi && b.vade && b.vade < tarihId(new Date());
      const metin = b.yon==="verdim"
        ? "Selam "+(b.kisi||"")+" 👋 "+t2.getDate()+" "+AYLAR[t2.getMonth()]+"'de sana "+paraFmt(b.tutar)+" vermiştim"+
          ((Number(b.odenen)||0)>0 ? ", "+paraFmt(b.odenen)+" ödedin, kalan "+paraFmt(kalanM) : "")+
          (gecikmis ? ". Söz verdiğin gün de geçti, hatırlatayım dedim 🙏" : ", hatırlatayım dedim 🙏")+(b.not?" ("+b.not+")":"")
        : "Selam "+(b.kisi||"")+" 👋 "+t2.getDate()+" "+AYLAR[t2.getMonth()]+"'de senden "+paraFmt(b.tutar)+" almıştım, unutmadım, en kısa zamanda ödeyeceğim 🤝"+(b.not?" ("+b.not+")":"");
      try{
        if(navigator.share) await navigator.share({text:metin});
        else{ await navigator.clipboard.writeText(metin); toast("Mesaj kopyalandı 📋"); }
      }catch(e){}
    });
    li.querySelector('[aria-label="Kapat"]').addEventListener("click", ()=>{
      kokRef().collection("borclar").doc(b.id).update({odendi: !b.odendi})
        .then(()=> toast(b.odendi ? "Borç tekrar açıldı" : "Borç kapandı ✔")).catch(hataGoster);
    });
    li.querySelector('[aria-label="Sil"]').addEventListener("click", ()=>{
      if(confirm("Bu borç kaydını tamamen silmek istiyor musun?"))
        kokRef().collection("borclar").doc(b.id).delete().then(()=>toast("Silindi")).catch(hataGoster);
    });
    ul.appendChild(li);
  });
}

function santiyeListCiz(){
  const ul = $("#liste-santiyeler");
  if(!ayarlar.santiyeler.length){
    ul.innerHTML = '<div class="bos-mesaj" style="padding:14px">Henüz şantiye eklemedin. Tek yerde çalışıyorsan gerek de yok.</div>';
    return;
  }
  ul.innerHTML = "";
  ayarlar.santiyeler.forEach(s=>{
    const li = document.createElement("li");
    li.innerHTML =
      '<div class="rozet" style="background:var(--mesai)">🏗️</div>'+
      '<div class="orta" style="cursor:pointer"><div class="baslik">'+esc(s.ad)+' <span style="font-size:11px;color:var(--soluk)">✏️</span></div>'+
      '<div class="alt-yazi">Yevmiye '+paraFmt(s.yevmiye)+' · Mesai '+paraFmt(s.mesaiUcret)+'/saat</div></div>'+
      '<button class="sil" aria-label="Sil">🗑️</button>';
    li.querySelector(".orta").addEventListener("click", ()=>{
      duzenlenenSantiyeId = s.id;
      $("#yeni-santiye-ad").value = s.ad;
      $("#yeni-santiye-yevmiye").value = s.yevmiye;
      $("#yeni-santiye-mesai").value = s.mesaiUcret;
      $("#btn-santiye-ekle").textContent = "✏️ Şantiyeyi güncelle";
      toast("Düzenleme modu: ücreti değiştir, güncelle'ye bas");
    });
    li.querySelector(".sil").addEventListener("click", async ()=>{
      if(!confirm('"'+s.ad+'" silinsin mi? (Eski günlerin hesabı bozulmaz, ücretler günlere işlendi)')) return;
      try{
        /* Aynı yarış durumu düzeltmesi: arrayRemove tam nesne eşleşmesiyle
           çalışıyor, "s" zaten ayarlar.santiyeler'den birebir geldiği için
           güvenli. */
        await kokRef().set({santiyeler: firebase.firestore.FieldValue.arrayRemove(s)},{merge:true});
        toast("Şantiye silindi");
      }catch(e){ hataGoster(e); }
    });
    ul.appendChild(li);
  });
}

/* ---------- 📄 Belge / sertifika süre takibi (ehliyet, SRC, MYK vb.) ---------- */
function belgeGunKalan(tarih){
  const bugun = new Date(); bugun.setHours(12,0,0,0);
  const t = new Date(tarih+"T12:00:00");
  return Math.round((t - bugun) / 86400000);
}
function belgeListCiz(){
  const ul = $("#liste-belgeler"); if(!ul) return;
  const belgeler = ayarlar.belgeler||[];
  const kart = $("#belge-uyari-kart");
  if(!belgeler.length){
    ul.innerHTML = '<div class="bos-mesaj" style="padding:14px">Henüz belge eklemedin (ehliyet, SRC, MYK ustalık belgesi vb.)</div>';
    if(kart){ kart.classList.add("gizli"); bildirimKutusuGuncelle(); }
    return;
  }
  const sirali = [...belgeler].sort((a,b)=> (a.tarih||"").localeCompare(b.tarih||""));
  ul.innerHTML = "";
  sirali.forEach(bl=>{
    const kalan = belgeGunKalan(bl.tarih);
    const durumRenk = kalan<0 ? "var(--gelmedi)" : (kalan<=30 ? "var(--sari)" : "var(--tam)");
    const durumYazi = kalan<0 ? ("⚠️ "+Math.abs(kalan)+" gün önce doldu") : (kalan===0 ? "⚠️ Bugün doluyor" : kalan+" gün kaldı");
    const li = document.createElement("li");
    li.innerHTML =
      '<div class="rozet" style="background:'+durumRenk+'">📄</div>'+
      '<div class="orta"><div class="baslik">'+esc(bl.ad)+'</div>'+
      '<div class="alt-yazi">Son geçerlilik: '+bl.tarih+' · '+durumYazi+'</div></div>'+
      '<button class="sil" aria-label="Sil">🗑️</button>';
    li.querySelector(".sil").addEventListener("click", async ()=>{
      if(!confirm('"'+bl.ad+'" belgesi silinsin mi?')) return;
      try{
        await kokRef().set({belgeler: (ayarlar.belgeler||[]).filter(x=>x.id!==bl.id)},{merge:true});
        toast("Belge silindi");
      }catch(e){ hataGoster(e); }
    });
    ul.appendChild(li);
  });
  /* Ana ekran / ayarlar üstü uyarı: 30 gün içinde dolacak veya dolmuş belgeler */
  if(kart){
    const kritik = sirali.filter(bl=> belgeGunKalan(bl.tarih) <= 30);
    if(kritik.length){
      kart.innerHTML = "📄 <b>"+kritik.length+"</b> belgenin süresi "+(kritik.some(b=>belgeGunKalan(b.tarih)<0) ? "doldu / " : "")+"yakında doluyor: "+
        kritik.map(b=> esc(b.ad)+" ("+(belgeGunKalan(b.tarih)<0 ? "doldu" : belgeGunKalan(b.tarih)+" gün")+")").join(", ");
      kart.classList.remove("gizli");
    }else kart.classList.add("gizli");
    bildirimKutusuGuncelle();
  }
}
/* Belge süresi yaklaşınca günde 1 kez yerel bildirimle hatırlat */
async function belgeDurt(){
  try{
    const belgeler = (ayarlar.belgeler||[]).filter(bl=> bl.tarih && belgeGunKalan(bl.tarih) <= 30);
    if(!belgeler.length) return;
    const izinVar = "Notification" in window && Notification.permission === "granted";
    const acik = localStorage.getItem("bildirimAcik") === "1";
    if(!izinVar || !acik) return;
    const bugun = tarihId(new Date());
    for(const bl of belgeler){
      const anahtar = "belgedurt:"+bl.id+":"+bugun;
      if(localStorage.getItem(anahtar) === "1") continue;
      const kalan = belgeGunKalan(bl.tarih);
      const kayit = await navigator.serviceWorker.ready;
      await kayit.showNotification("📄 Belge süresi uyarısı", {
        body: kalan<0 ? (bl.ad+" belgesinin süresi doldu!") : (bl.ad+" belgesinin süresine "+kalan+" gün kaldı"),
        tag: "belge-durt-"+bl.id,
        vibrate: [80,40,80]
      });
      localStorage.setItem(anahtar, "1");
    }
  }catch(e){}
}

/* 💵 Ödeme tarihi kutusunun varsayılanı: görüntülediğin aya göre ayarla.
   Bugünkü ayı görüntülüyorsan bugünü öner; geçmiş bir ayı (henüz kilitlemediğin
   için hâlâ açık olan bir ayı) görüntülüyorsan, o ayın SON GÜNÜNÜ öner —
   böylece "bugün" tarihiyle kaydedip ödemeyi yanlış aya yazma hatası önlenir. */
/* 🧾 Masraf tarihi kutusunun varsayılanı: ödeme tarihiyle aynı mantık —
   görüntülediğin aya göre ayarla, geçmiş bir ayı incelerken o ayın son
   gününü öner (yoksa masraf yanlış aya kaydolur, aynı ödeme hatası gibi). */
function masrafTarihVarsayilaniAyarla(){
  const el = $("#masraf-tarih"); if(!el) return;
  const simdi = new Date();
  if(aktifYil === simdi.getFullYear() && aktifAy === simdi.getMonth()){
    el.value = tarihId(simdi);
  }else{
    const ayinSonGunu = new Date(aktifYil, aktifAy+1, 0).getDate();
    el.value = aktifYil+"-"+pad(aktifAy+1)+"-"+pad(ayinSonGunu);
  }
}
/* 💵 "Bu ödeme hangi ayın hesabına yazılsın?" seçicisi.
   Parayı fiilen ne zaman aldığın değil, hangi ayın alacağını kapattığı önemli —
   bu yüzden kullanıcıya doğrudan ay seçtiriyoruz, "tarih"i biz arkada ayarlıyoruz. */
/* İnşaatta (ve çoğu sektörde) işveren "ay kapandı, hesap sıfırlandı" demez —
   yeni gelen her avans/askeriye/maaş, ÖNCE en eski ödenmemiş ayın borcuna
   yazılır. Bu fonksiyon, tüm aylar arasında (Maaşlar ekranındaki mantığın
   aynısıyla) en eski "kalanı olan" ayı bulur. Hiçbiri yoksa null döner
   (yani her şey ödenmiş, yeni gelen para bu ayın hesabına yazılabilir). */
async function enEskiOdenmemisAy(){
  let gSnap = tumGirdilerQS, oSnap = tumOdemelerQS;
  if(!gSnap || !oSnap){
    /* Dinleyiciler henüz ilk veriyi getirmediyse (ör. uygulamayı yeni açtın,
       hemen Avans'a bastın) — anaYukle()'deki gibi tek seferlik bir çekme
       yaparak "boş veriyle yanlış aya düşme" riskini ortadan kaldırıyoruz. */
    try{
      const r = await Promise.all([
        kokRef().collection("girdiler").get(),
        kokRef().collection("odemeler").get()
      ]);
      gSnap = tumGirdilerQS || r[0];
      oSnap = tumOdemelerQS || r[1];
    }catch(e){ return null; }
  }
  const aylar = {};
  gSnap.forEach(doc=>{
    const v = doc.data(), ay = doc.id.slice(0,7);
    if(!aylar[ay]) aylar[ay] = {hak:0, alinan:0};
    aylar[ay].hak += girdiKazanc(v);
  });
  oSnap.forEach(doc=>{
    const v = doc.data(), ay = odemeAyi(v);
    if(!ay) return;
    if(!aylar[ay]) aylar[ay] = {hak:0, alinan:0};
    aylar[ay].alinan += Number(v.tutar)||0;
  });
  const enEskiler = Object.keys(aylar).filter(ay=> (aylar[ay].hak - aylar[ay].alinan) > 50).sort();
  return enEskiler.length ? enEskiler[0] : null;
}
async function odemeAitAySecDoldur(){
  const sel = $("#odeme-ait-ay"); if(!sel || duzenlenenOdeme) return;
  const simdi = new Date();
  const secenekler = [];
  for(let i=0;i<12;i++){
    const d = new Date(simdi.getFullYear(), simdi.getMonth()-i, 1);
    secenekler.push(d.getFullYear()+"-"+pad(d.getMonth()+1)+"|"+AYLAR[d.getMonth()]+" "+d.getFullYear());
  }
  sel.innerHTML = secenekler.map(s=>{
    const [deger, etiket] = s.split("|");
    return '<option value="'+deger+'">'+etiket+'</option>';
  }).join("");
  /* Önce makul bir varsayılanla başla (aktif ay), veri gelince aşağıda düzeltilecek */
  sel.value = aktifYil+"-"+pad(aktifAy+1);
  odemeTarihiAyaGoreAyarla();
  /* Varsayılan: bulunduğun ay değil, EN ESKİ ödenmemiş ay (FIFO) — hepsi
     ödenmişse bulunduğun aya (ya da bugüne) düş. Veri az sonra gelirse
     (async), kullanıcı henüz formu değiştirmediyse üzerine yazarız. */
  /* enEskiOdenmemisAy() Firestore'a gidiyor; ağ koparsa ya da izin
     reddedilirse bu fonksiyon yakalanmayan bir söz reddiyle ölüyordu.
     Sonucu: "Hangi ayın hesabına yazılsın?" seçicisi BOŞ kalıyor,
     kullanıcı ödeme kaydedemiyor ve ekranda hiçbir hata görünmüyordu.
     Artık hata olursa FIFO önerisi atlanıyor ama seçici yine doluyor —
     kullanıcı ayı elle seçip devam edebiliyor. */
  let enEski = null;
  try{ enEski = await enEskiOdenmemisAy(); }
  catch(e){ try{ hataKaydet("odemeAitAySecDoldur", e); }catch(_){} }
  if(duzenlenenOdeme) return;   /* bu arada bir kaydı düzenlemeye başlamışsa dokunma */
  let hedefAy = enEski || (aktifYil+"-"+pad(aktifAy+1));
  if(enEski && ![...sel.options].some(o=>o.value===enEski)){
    const [yy,aa] = enEski.split("-").map(Number);
    const op = document.createElement("option");
    op.value = enEski; op.textContent = AYLAR[aa-1]+" "+yy+" (en eski, ödenmemiş)";
    sel.insertBefore(op, sel.firstChild);
  }
  sel.value = hedefAy;
  if(sel.value !== hedefAy) sel.value = simdi.getFullYear()+"-"+pad(simdi.getMonth()+1); /* olmayan bir değerse bugüne düş */
  if(enEski) toast("💡 "+AYLAR[Number(enEski.split("-")[1])-1]+" ayının ödenmemiş bakiyesi var — bu ödeme oraya yazılacak şekilde ayarlandı");
  odemeTarihiAyaGoreAyarla();
}
function odemeTarihiAyaGoreAyarla(){
  const sel = $("#odeme-ait-ay"), el = $("#odeme-tarih");
  if(!sel || !el || duzenlenenOdeme || !sel.value) return;
  const [y,a] = sel.value.split("-").map(Number);
  const simdi = new Date();
  if(y===simdi.getFullYear() && (a-1)===simdi.getMonth()){
    el.value = tarihId(simdi);
  }else{
    const ayinSonGunu = new Date(y, a, 0).getDate();
    el.value = y+"-"+pad(a)+"-"+pad(ayinSonGunu);
  }
}
/* "Paralar" ekranındaki (o an görüntülenen ay) ödeme listesini, ağa yeni bir
   sorgu atmadan — zaten yüklü olan tumOdemelerQS'ten, "aitAy" alanına göre
   süzerek doldurur. Eskiden burada "tarih" alanına göre ayrı bir Firestore
   sorgusu vardı; bu, bir ödeme (FIFO gereği) farklı bir aya sayılınca o ayı
   HİÇ görememesine yol açıyordu — artık ikisi (görüntü ve hesaplama) aynı
   kaynaktan, aynı mantıkla besleniyor. */
function odemeleriAyaGoreDoldur(){
  if(!tumOdemelerQS) return;
  const hedefAy = aktifYil + "-" + pad(aktifAy+1);
  odemeler = [];
  tumOdemelerQS.forEach(doc=>{
    const v = doc.data();
    if(odemeAyi(v) === hedefAy) odemeler.push({id:doc.id, ...v});
  });
  odemeler.sort((a,b)=> a.tarih < b.tarih ? 1 : -1);
  hepsiniCiz();
}
function ayiYukle(){
  if(dinleyiciGirdi) dinleyiciGirdi();
  odemeAitAySecDoldur();
  masrafTarihVarsayilaniAyarla();

  const bas = aktifYil + "-" + pad(aktifAy+1) + "-01";
  const son = aktifYil + "-" + pad(aktifAy+1) + "-31";

  dinleyiciGirdi = kokRef().collection("girdiler")
    .where(firebase.firestore.FieldPath.documentId(), ">=", bas)
    .where(firebase.firestore.FieldPath.documentId(), "<=", son)
    .onSnapshot(qs=>{
      girdiler = {};
      qs.forEach(doc=> girdiler[doc.id] = doc.data());
      $("#izin-uyari").classList.add("gizli");
      hepsiniCiz();
      anaTazele();   /* gün işlenince ana ekrandaki para da anında güncellensin */
    }, hataGoster);

  if(dinleyiciMasraf) dinleyiciMasraf();
  dinleyiciMasraf = kokRef().collection("masraflar")
    .where("tarih", ">=", bas).where("tarih", "<=", son)
    .onSnapshot(qs=>{
      masraflar = [];
      qs.forEach(doc=> masraflar.push({id:doc.id, ...doc.data()}));
      masraflar.sort((a,b)=> a.tarih < b.tarih ? 1 : -1);
      masrafCiz();
      hepsiniCiz();
    }, hataGoster);

  if(aktifGoruntu==="ekip") ekipOzetYukle();
  if(aktifGoruntu==="kisiler" && seciliKisi) kisiVeriYukle();

  /* Ödemeler artık ayrı bir ağ sorgusuyla değil, zaten yüklü olan
     tumOdemelerQS'ten "aitAy"a göre süzülerek doldurulur (yukarıdaki not) */
  if(tumOdemelerQS){
    odemeleriAyaGoreDoldur();
  }else{
    kokRef().collection("odemeler").get().then(qs=>{
      if(!tumOdemelerQS){ tumOdemelerQS = qs; }
      odemeleriAyaGoreDoldur();
    }).catch(hataGoster);
  }
}
/* 💸 Maaş gününe kaç gün kaldı? (kısa aylarda ay sonuna çekilir, geçtiyse gelecek ay) */
function maasKacGun(maasGunu, simdi){
  const mg = Number(maasGunu)||0;
  if(mg < 1) return null;
  const bugun = simdi.getDate();
  const buAySon = new Date(simdi.getFullYear(), simdi.getMonth()+1, 0).getDate();
  const hedef = Math.min(mg, buAySon);
  if(bugun < hedef) return hedef - bugun;
  if(bugun === hedef) return 0;
  const sonrakiSon = new Date(simdi.getFullYear(), simdi.getMonth()+2, 0).getDate();
  return (buAySon - bugun) + Math.min(mg, sonrakiSon);
}

/* Ana ekran kartını kısa gecikmeyle tazele (art arda kayıtlarda tek sefer çalışsın) */
let anaTazeleZ = null;
function anaTazele(){
  clearTimeout(anaTazeleZ);
  anaTazeleZ = setTimeout(()=>{
    if(aktifGoruntu==="ana") anaYukle();
    else if(aktifGoruntu==="ozet") ozetDetayYukle();
  }, 300);
}

/* ---------- 🩺 Hata günlüğü + kullanıcı dostu hata çevirisi ---------- */
function hataKaydet(kaynak, e){
  try{
    const kayit = {
      z: Date.now(),
      kaynak,
      mesaj: (e && (e.message||String(e))) || "bilinmeyen hata",
      kod: (e && e.code) || "",
      yigin: (e && e.stack) ? String(e.stack).slice(0,400) : ""
    };
    const gunluk = JSON.parse(localStorage.getItem("hataGunlugu")||"[]");
    gunluk.push(kayit);
    while(gunluk.length > 30) gunluk.shift();   /* sadece son 30 hatayı tut */
    localStorage.setItem("hataGunlugu", JSON.stringify(gunluk));
  }catch(err){}
}
/* Firestore/Auth hata kodlarını okunaklı Türkçeye çevirir (login ekranındaki
   hataCevir'in genel/global hali — her yerde tutarlı mesaj için) */
function hataCeviriGenel(e){
  const k = (e && e.code) || "";
  const m = (e && e.message) || "";
  if(k.includes("permission-denied")) return "Bu işlem için yetkin yok — oturumun düşmüş olabilir, çıkıp tekrar giriş yap.";
  if(k.includes("unavailable") || k.includes("network")) return "Sunucuya ulaşılamıyor. İnternetini kontrol et, kayıtların telefonda bekliyor.";
  if(k.includes("deadline-exceeded")) return "Sunucu cevap vermedi (zaman aşımı). Tekrar dener misin?";
  if(k.includes("resource-exhausted")) return "Sunucu şu an çok yoğun, birazdan tekrar dene.";
  if(k.includes("unauthenticated")) return "Oturumun kapanmış görünüyor, tekrar giriş yapman gerekebilir.";
  if(k.includes("already-exists")) return "Bu kayıt zaten var.";
  if(k.includes("not-found")) return "Aradığın kayıt bulunamadı, silinmiş olabilir.";
  if(k.includes("cancelled")) return "İşlem iptal edildi.";
  if(m.includes("quota")) return "Günlük kullanım sınırına yaklaşıldı, birazdan tekrar dene.";
  if(k.includes("failed-precondition")) return "Bu işlem için gereken bir ayar eksik. Geliştiriciye haber ver.";
  if(k.includes("aborted")) return "İşlem yarıda kaldı, tekrar dener misin?";
  if(k.includes("invalid-argument")) return "Girilen bilgide bir sorun var, kontrol edip tekrar dene.";
  if(k.includes("out-of-range")) return "Girilen değer beklenen aralığın dışında.";
  if(m.includes("offline") || m.includes("Failed to fetch"))
    return "İnternet yok gibi görünüyor. Kayıtların telefonda bekliyor, bağlanınca gönderilecek.";
  return "";
}
function hataGunluguCiz(){
  const kap = $("#hata-gunlugu-sonuc"); if(!kap) return;
  let gunluk = [];
  try{ gunluk = JSON.parse(localStorage.getItem("hataGunlugu")||"[]"); }catch(e){}
  if(!gunluk.length){ kap.innerHTML = '<span style="color:var(--tam)">✓ Kayıtlı hata yok, her şey temiz görünüyor.</span>'; return; }
  kap.innerHTML = gunluk.slice().reverse().map(k=>{
    const t = new Date(k.z);
    const saat = pad(t.getHours())+":"+pad(t.getMinutes());
    return "<div style='margin-bottom:6px;padding-bottom:6px;border-bottom:1px dashed var(--cizgi)'>"+
      "<b>"+saat+"</b> · "+esc(k.kaynak)+(k.kod?" ("+esc(k.kod)+")":"")+"<br>"+esc(k.mesaj)+"</div>";
  }).join("");
}
function hataGunluguMetin(){
  let gunluk = [];
  try{ gunluk = JSON.parse(localStorage.getItem("hataGunlugu")||"[]"); }catch(e){}
  if(!gunluk.length) return "Kayıtlı hata yok.";
  return gunluk.map(k=>{
    const t = new Date(k.z).toLocaleString("tr-TR");
    return t+" | "+k.kaynak+(k.kod?" ("+k.kod+")":"")+" | "+k.mesaj;
  }).join("\n");
}

function hataGoster(e, kaynak){
  console.error(kaynak||"", e);
  hataKaydet(kaynak||"?", e);
  if(e && (e.code==="permission-denied" || String(e.message||"").includes("permission"))){
    $("#izin-uyari").classList.remove("gizli");
    toast("Veritabanı izni yok — üstteki kırmızı kutuya bak 👆");
    return;
  }
  const dostMesaj = hataCeviriGenel(e);
  /* Bilinmeyen hatada bile kullanıcıya HAM İNGİLİZCE mesaj gösterilmiyor.
     Eskiden "Hata: FirebaseError: Missing or insufficient permissions" gibi
     bir metin çıkıyordu — işçi için hiçbir anlamı yok, üstelik korkutucu.
     Teknik ayrıntı zaten hataKaydet() ile günlüğe yazıldı; tanı ekranından
     okunabiliyor. Kullanıcıya ne yapacağını söylüyoruz. */
  toast(dostMesaj ? dostMesaj
      : "Bir sorun oldu, işlem tamamlanamadı. İnternetini kontrol edip tekrar dene.");
}

/* ---------- 🚨 Global hata yakalayıcı: try/catch dışında kalan her şeyi
   (beklenmedik JS hataları + yakalanmamış Promise reddleri) burada tutup
   kullanıcıya nazik bir mesaj gösteririz, sessizce çökmesin. ---------- */
window.addEventListener("error", (ev)=>{
  hataKaydet("global-js", ev.error || {message: ev.message});
  console.error("Global hata:", ev.error || ev.message);
});
window.addEventListener("unhandledrejection", (ev)=>{
  hataKaydet("global-promise", ev.reason);
  console.error("Yakalanmamış Promise hatası:", ev.reason);
  /* Kullanıcıyı gereksiz yere ürkütmeyelim — sadece günlüğe yaz, sessiz kalsın.
     Zaten kritik olan yerlerde (Firestore işlemleri) hataGoster() ayrıca
     toast gösteriyor. Bu sadece "hiç yakalanmamış" olanlar için son çare. */
});

/* ---------- Çizimler ---------- */
/* Not: Cüzdan (Cebimdeki Para) özelliği tamamen kaldırıldı — sadece Şirket
   Hesap Kartı ve onun avans hareketleri kaldı. */

const gizliPara = n => gizliMod ? "•••• ₺" : paraFmt(n);

/* ---------- Not defteri ---------- */
function notlariDinle(){
  dinleyiciNot = kokRef().collection("notlar").onSnapshot(qs=>{
    notlar = [];
    qs.forEach(doc=> notlar.push({id:doc.id, ...doc.data()}));
    notlar.sort((a,b)=> a.tarih < b.tarih ? 1 : -1);
    notCiz();
  }, hataGoster);
}
const NOT_RENKLER = {sari:"#FFC400", yesil:"#35D07F", mavi:"#4C9AFF", kirmizi:"#FF5B52"};
let seciliNotRenk = "", duzenlenenNot = null;
function notRenkSec(renk){
  seciliNotRenk = renk||"";
  document.querySelectorAll("#not-renk-secim button").forEach(b=>{
    const secili = (b.dataset.renk||"") === seciliNotRenk;
    b.style.transform = secili ? "scale(1.15)" : "";
    b.style.boxShadow = secili ? "0 0 0 2.5px #fff" : "";
  });
}
function notCiz(){
  const ul = $("#liste-notlar");
  const ara = trKucuk(($("#not-ara")&&$("#not-ara").value)||"").trim();
  let liste = [...notlar];
  liste.sort((a,b)=>{
    if(!!b.sabit !== !!a.sabit) return b.sabit ? 1 : -1;
    return a.tarih < b.tarih ? 1 : -1;
  });
  if(ara) liste = liste.filter(n=> trKucuk(n.metin||"").includes(ara));
  if(!liste.length){
    ul.innerHTML = '<div class="bos-mesaj"><span class="buyuk">📝</span>'+(ara?'Eşleşen not yok.':'Henüz not yok.')+'</div>';
    return;
  }
  ul.innerHTML = "";
  liste.forEach(n=>{
    const t = new Date((n.tarih||"2000-01-01")+"T12:00:00");
    const li = document.createElement("li");
    const rk = NOT_RENKLER[n.renk];
    if(rk) li.style.borderLeft = "4px solid "+rk;
    li.innerHTML =
      '<div class="rozet" style="background:'+(n.sabit?'var(--sari)':'var(--asfalt2)')+';color:'+(n.sabit?'#111':'#fff')+'">'+t.getDate()+'<small>'+AYLAR[t.getMonth()].slice(0,3)+'</small></div>'+
      '<div class="orta" style="cursor:pointer"><div class="baslik" style="white-space:pre-wrap;font-weight:500">'+(n.sabit?'📌 ':'')+
      String(n.metin||"").replace(/</g,"&lt;")+
      ' <span style="font-size:11px;color:var(--soluk)">✏️</span></div></div>'+
      '<button class="sil" aria-label="Sabitle" style="color:var(--sari)">📌</button>'+
      '<button class="sil" aria-label="Sil">🗑️</button>';
    /* 📝 Dokun → düzenle: metin ve renk yukarı yüklenir */
    li.querySelector(".orta").addEventListener("click", ()=>{
      duzenlenenNot = n;
      $("#yeni-not").value = n.metin||"";
      notRenkSec(n.renk||"");
      $("#btn-not-ekle").textContent = "✏️ Güncelle";
      $("#btn-not-vazgec").classList.remove("gizli");
      window.scrollTo({top:0, behavior:"smooth"});
      toast("Düzenleme modu: değiştir, Güncelle'ye bas");
    });
    const btnler = li.querySelectorAll(".sil");
    btnler[0].addEventListener("click", ()=>{
      kokRef().collection("notlar").doc(n.id).update({sabit: !n.sabit})
        .then(()=> toast(n.sabit ? "Sabitleme kaldırıldı" : "Not sabitlendi 📌")).catch(hataGoster);
    });
    btnler[1].addEventListener("click", ()=>{
      if(confirm("Bu notu silmek istiyor musun?"))
        kokRef().collection("notlar").doc(n.id).delete().then(()=>toast("Not silindi")).catch(hataGoster);
    });
    ul.appendChild(li);
  });
}

/* Not: "Günün sözü" havuzu (eski SOZLER dizisi ve gununSozCiz()) kaldırıldı —
   içeriği aşağıdaki GUNUN_ICERIK havuzuna taşındı, artık gununIpucuEkle() tek
   noktadan (daha zengin: söz + fıkra + bilgi karışık) besleniyor. */
/* Eskiden ayrı bir "gunun-karti" kartında (fıkra/ipucu/söz karışık, daha zengin
   bir havuz) gösteriliyordu — selam-blok'taki gunun-soz ile aynı işi iki kere
   yapıyordu. Artık tek yerde, zengin havuzdan. */
function gununIpucuEkle(){
  const el = $("#gunun-soz"); if(!el) return;
  const simdi = new Date();
  const yilBasi = new Date(simdi.getFullYear(), 0, 1);
  const gunNo = Math.floor((simdi - yilBasi) / 86400000);
  const ic2 = GUNUN_ICERIK[gunNo % GUNUN_ICERIK.length];
  el.textContent = ic2.t + ": " + ic2.m;
}

/* ---------- Usta seviyesi ---------- */
const SEVIYELER = [
  {ad:"Çırak",    ikon:"🧹", min:0},
  {ad:"Kalfa",    ikon:"🔨", min:50},
  {ad:"Usta",     ikon:"👷", min:150},
  {ad:"Ustabaşı", ikon:"⛑️", min:400},
  {ad:"Duayen",   ikon:"👑", min:800}
];
function seviyeBul(gun){
  let s = SEVIYELER[0], sonraki = null;
  for(let i=0;i<SEVIYELER.length;i++){
    if(gun >= SEVIYELER[i].min){ s = SEVIYELER[i]; sonraki = SEVIYELER[i+1]||null; }
  }
  return {s, sonraki};
}
let tumIstatistik = null; // anaYukle doldurur

function seviyeCiz(){
  if(!tumIstatistik) return;
  const cekAd = document.querySelector(".cekmece-bas .alt-yazi, #cekmece-eposta");
  if(cekAd){
    const s2 = seviyeBul(Math.floor(tumIstatistik.gunToplam)).s;
    cekAd.textContent = s2.ikon+" "+s2.ad+" · "+Math.floor(tumIstatistik.gunToplam)+" gün";
  }
  const gun = Math.floor(tumIstatistik.gunToplam);
  const {s, sonraki} = seviyeBul(gun);
  const skr = $("#seviye-kart-rozet"); if(skr) skr.classList.remove("gizli");
  $("#seviye-ikon").textContent = s.ikon;
  $("#seviye-ad").textContent = s.ad + " · " + gun + " gün";
  if(sonraki){
    const onceki = s.min;
    const yuzde = Math.min(100, Math.round((gun-onceki)/(sonraki.min-onceki)*100));
    $("#seviye-dolu").style.width = yuzde+"%";
    $("#seviye-alt").textContent = sonraki.ad + " seviyesine " + (sonraki.min-gun) + " gün kaldı 💪";
  }else{
    $("#seviye-dolu").style.width = "100%";
    $("#seviye-alt").textContent = "Zirvedesin usta, senden büyüğü yok 👑";
  }
}

/* ---------- Başarım rozetleri ---------- */
/* ROZETLER → sabitler.js'e taşındı */
async function rozetYukle(){
  if(!tumIstatistik) await anaYukle();
  if(!tumIstatistik) return;
  const kap = $("#rozet-grid");
  kap.innerHTML = "";
  let acilan = 0;
  ROZETLER.forEach(r=>{
    const acik = r.t(tumIstatistik);
    if(acik) acilan++;
    const d = document.createElement("div");
    d.className = "rozet-kut " + (acik ? "acildi" : "kilitli");
    let ilerleme = "";
    if(!acik && r.d && r.h){
      const su = Math.max(0, r.d(tumIstatistik)||0);
      const y = Math.min(99, Math.round(su/r.h*100));
      const goster = v => v>=1000 ? paraKisa(v) : (Math.round(v*10)/10).toLocaleString("tr-TR");
      ilerleme = '<div class="rz-bar"><div class="rz-dolu" style="width:'+y+'%"></div></div>'+
        '<div class="rz-sayi">'+goster(su)+' / '+goster(r.h)+'</div>';
    }
    d.innerHTML = '<span class="rikon">'+r.ikon+'</span><div class="rad">'+r.ad+'</div><div class="rsart">'+r.sart+'</div>'+ilerleme;
    kap.appendChild(d);
  });
  $("#rozet-sayac").textContent = acilan + "/" + ROZETLER.length + " açıldı";
  /* Yeni rozet kutlaması */
  try{
    const acikAdlar = ROZETLER.filter(r=> r.t(tumIstatistik)).map(r=> r.ad);
    const eski = JSON.parse(localStorage.getItem("rozetler")||"[]");
    const yeni = acikAdlar.filter(a=> !eski.includes(a));
    if(eski.length && yeni.length){
      toast("🎉 Yeni rozet" + (yeni.length>1?"ler":"") + ": " + yeni.join(", ") + " — helal usta!");
      titret([60,40,60]);
    }
    localStorage.setItem("rozetler", JSON.stringify(acikAdlar));
  }catch(e){}
}

/* ---------- SGK emeklilik sayacı ---------- */
function sgkCiz(){
  if(!tumIstatistik) return;
  const kart = $("#sgk-satir");
  const hedef = ayarlar.sgkHedef||0;
  if(!(hedef>0)){ kart.classList.add("gizli"); return; }
  const prim = (ayarlar.sgkGun||0) + Math.floor(tumIstatistik.gunToplam);
  const yuzde = Math.min(100, Math.round(prim/hedef*100));
  kart.classList.remove("gizli");
  const dolu = $("#sgk-dolu");
  dolu.style.width = yuzde+"%";
  dolu.classList.toggle("tamamlandi", yuzde>=100);
  const kalan = Math.max(0, hedef - prim);
  $("#sgk-yazi").innerHTML = "<b>"+prim.toLocaleString("tr-TR")+"</b> / "+hedef.toLocaleString("tr-TR")+" prim günü (%"+yuzde+")"+
    (kalan>0 ? " · Emekliliğe ~"+kalan.toLocaleString("tr-TR")+" gün (yaklaşık "+Math.ceil(kalan/300)+" yıl çalışma) 🏖️" : " · Hayırlı olsun usta, gün doldu! 🎉");
}

/* ---------- ⚖️ Yıllık fazla mesai sınırı (İş Kanunu m.41: yılda en fazla 270 saat) ---------- */
function mesaiSinirCiz(buYilMesai){
  const kart = $("#mesai-sinir-satir"); if(!kart) return;
  const SINIR = 270;
  /* Henüz mesai girilmemişse veya sınırdan çok uzaksa kartı gösterme, gereksiz kalabalık yapmasın */
  if(!(buYilMesai>0) || buYilMesai < SINIR*0.7){ kart.classList.add("gizli"); return; }
  kart.classList.remove("gizli");
  const yuzde = Math.min(100, Math.round(buYilMesai/SINIR*100));
  const dolu = $("#mesai-sinir-dolu");
  dolu.style.width = yuzde+"%";
  dolu.classList.toggle("tamamlandi", buYilMesai>=SINIR);
  const kalan = Math.max(0, SINIR - buYilMesai);
  $("#mesai-sinir-yazi").innerHTML = "<b>"+Math.round(buYilMesai)+"</b> / "+SINIR+" saat (bu yıl, %"+yuzde+")"+
    (buYilMesai>=SINIR
      ? " · ⚠️ İş Kanunu'ndaki yıllık 270 saatlik fazla mesai sınırını aştın — bu durum patronunla konuşmak için haklı bir gerekçe olabilir"
      : " · Yıllık yasal sınıra <b>"+Math.round(kalan)+" saat</b> kaldı");
}

/* ---------- 🌤️ Hava durumu (tam ekran, zengin) ---------- */
const HAVA_KOD = {
  0:{g:["☀️","Açık"], n:["🌙","Açık (gece)"]},
  1:{g:["🌤️","Az bulutlu"], n:["🌙","Az bulutlu (gece)"]},
  2:{g:["⛅","Parçalı bulutlu"], n:["☁️","Parçalı bulutlu (gece)"]},
  3:{g:["☁️","Kapalı"], n:["☁️","Kapalı"]},
  45:{g:["🌫️","Sisli"], n:["🌫️","Sisli"]}, 48:{g:["🌫️","Kırağı sisi"], n:["🌫️","Kırağı sisi"]},
  51:{g:["🌦️","Hafif çisenti"], n:["🌧️","Hafif çisenti"]}, 53:{g:["🌦️","Çisenti"], n:["🌧️","Çisenti"]}, 55:{g:["🌦️","Yoğun çisenti"], n:["🌧️","Yoğun çisenti"]},
  61:{g:["🌧️","Hafif yağmur"], n:["🌧️","Hafif yağmur"]}, 63:{g:["🌧️","Yağmur"], n:["🌧️","Yağmur"]}, 65:{g:["🌧️","Kuvvetli yağmur"], n:["🌧️","Kuvvetli yağmur"]},
  71:{g:["🌨️","Hafif kar"], n:["🌨️","Hafif kar"]}, 73:{g:["🌨️","Kar"], n:["🌨️","Kar"]}, 75:{g:["❄️","Yoğun kar"], n:["❄️","Yoğun kar"]},
  80:{g:["🌦️","Sağanak"], n:["🌧️","Sağanak"]}, 81:{g:["🌧️","Kuvvetli sağanak"], n:["🌧️","Kuvvetli sağanak"]}, 82:{g:["⛈️","Şiddetli sağanak"], n:["⛈️","Şiddetli sağanak"]},
  95:{g:["⛈️","Gök gürültülü fırtına"], n:["⛈️","Gök gürültülü fırtına"]}, 96:{g:["⛈️","Dolu ile fırtına"], n:["⛈️","Dolu ile fırtına"]}, 99:{g:["⛈️","Şiddetli fırtına"], n:["⛈️","Şiddetli fırtına"]}
};
function havaKodEtiket(kod, gunduzMu){
  const k = HAVA_KOD[kod] || {g:["🌡️","Hava durumu"], n:["🌡️","Hava durumu"]};
  return (gunduzMu===false) ? k.n : k.g;
}

function havaYukle(){
  if(!navigator.geolocation) return;
  try{
    navigator.geolocation.getCurrentPosition(async p=>{
      try{
        const u = "https://api.open-meteo.com/v1/forecast?latitude="+p.coords.latitude.toFixed(3)+
          "&longitude="+p.coords.longitude.toFixed(3)+
          "&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,is_day"+
          "&hourly=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset"+
          "&timezone=auto&forecast_days=4";
        const r = await fetch(u);
        const d = await r.json();
        havaVeriSon = d;
        havaOzetGoster(d);
      }catch(e){}
    }, ()=>{}, {timeout:8000, maximumAge:3600000});
  }catch(e){}
}
/* Ana ekranda, uygulamaya her girişte görünen hava satırı: güncel sıcaklık +
   ikon her zaman gösterilir; yarın yağmur ihtimali yüksekse (>=%50) onun
   yerine uyarı metni gösterilir (dokununca yine tam ekran detay açılır). */
function havaOzetGoster(d){
  const el = $("#hava-uyari-satir"); if(!el || !d.current) return;
  const gunduzMu = d.current.is_day===1;
  const [ikon] = havaKodEtiket(d.current.weather_code, gunduzMu);
  const sicaklik = Math.round(d.current.temperature_2m);
  const yagmur = d.daily && d.daily.precipitation_probability_max ? d.daily.precipitation_probability_max[1] : null;
  if(yagmur!=null && yagmur>=50){
    el.innerHTML = "🌧️ Yarın <b>%"+yagmur+" yağmur ihtimali</b> — şantiye belli olmaz, ustaya sor. <span style='text-decoration:underline'>Detay ›</span>";
  }else{
    el.innerHTML = ikon+" Şu an <b>"+sicaklik+"°</b> <span style='text-decoration:underline'>Detay ›</span>";
  }
  el.classList.remove("gizli");
  havaHatirlatTamEkran(d);
}
/* Güne ilk giriş: tam ekran hava durumunu göster (günde 1 kez), X ile kapanır */
function havaHatirlatTamEkran(d){
  try{
    const bugun = tarihId(new Date());
    if(localStorage.getItem("havaGosterildiGun") === bugun) return;
    localStorage.setItem("havaGosterildiGun", bugun);
    havaTamEkranDoldur(d);
    $("#hava-tam-ekran").classList.remove("gizli");
  }catch(e){}
}
function havaTamEkranAc(){
  if(havaVeriSon){ havaTamEkranDoldur(havaVeriSon); $("#hava-tam-ekran").classList.remove("gizli"); }
  else{
    toast("Hava durumu yükleniyor...");
    if(!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async p=>{
      try{
        const u = "https://api.open-meteo.com/v1/forecast?latitude="+p.coords.latitude.toFixed(3)+
          "&longitude="+p.coords.longitude.toFixed(3)+
          "&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,is_day"+
          "&hourly=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset"+
          "&timezone=auto&forecast_days=4";
        const r = await fetch(u);
        const d = await r.json();
        havaVeriSon = d;
        havaTamEkranDoldur(d);
        $("#hava-tam-ekran").classList.remove("gizli");
      }catch(e){ toast("Hava durumu alınamadı, internete bak 📡"); }
    }, ()=> toast("Konum izni gerekiyor 📍"), {timeout:8000, maximumAge:3600000});
  }
}
function havaTamEkranDoldur(d){
  if(!d || !d.current) return;
  const simdi = d.current;
  const gunduzMu = simdi.is_day===1;
  const [ikon, aciklama] = havaKodEtiket(simdi.weather_code, gunduzMu);
  $("#hte-ikon").textContent = ikon;
  $("#hte-sicaklik").textContent = Math.round(simdi.temperature_2m)+"°";
  $("#hte-aciklama").textContent = aciklama;
  /* Gündüz mavi gökyüzü, gece koyu/yıldızlı gradyan — gerçek saate göre değişir */
  $("#hava-tam-ekran").style.background = gunduzMu
    ? "linear-gradient(160deg,#1B4B91,#2F6FCB 45%,#5B93DD)"
    : "linear-gradient(160deg,#050914,#0E1B33 45%,#1B2C4D)";
  $("#hte-yildizlar").innerHTML = gunduzMu ? "" : "✨ ⭐ 🌟 ⭐ ✨ ⭐ 🌟 ⭐ ✨";
  const bugunMin = d.daily ? Math.round(d.daily.temperature_2m_min[0]) : null;
  const bugunMax = d.daily ? Math.round(d.daily.temperature_2m_max[0]) : null;
  $("#hte-minmax").textContent = (bugunMin!=null ? bugunMin+"° / "+bugunMax+"°" : "");
  $("#hte-detay").textContent = "💧 Nem %"+Math.round(simdi.relative_humidity_2m||0)+" · 💨 Rüzgar "+Math.round(simdi.wind_speed_10m||0)+" km/s";
  /* Saatlik şerit: şu andan sonraki 6 saat — her saatin kendi gündüz/gece bilgisiyle */
  const saatKap = $("#hte-saatlik");
  saatKap.innerHTML = "";
  if(d.hourly && d.hourly.time){
    const suankiSaat = new Date();
    let baslangic = d.hourly.time.findIndex(t=> new Date(t) > suankiSaat);
    if(baslangic<0) baslangic = 0;
    for(let i=baslangic; i<baslangic+6 && i<d.hourly.time.length; i++){
      const t = new Date(d.hourly.time[i]);
      const saatGunduzMu = d.hourly.is_day ? d.hourly.is_day[i]===1 : true;
      const [ik] = havaKodEtiket(d.hourly.weather_code[i], saatGunduzMu);
      const kutu = document.createElement("div");
      kutu.style.cssText = "flex:1;text-align:center;display:flex;flex-direction:column;gap:4px;align-items:center";
      kutu.innerHTML = "<div style='font-size:11px;color:rgba(255,255,255,.7)'>"+pad(t.getHours())+":00</div>"+
        "<div style='font-size:20px'>"+ik+"</div>"+
        "<div style='font-size:13px;font-weight:700'>"+Math.round(d.hourly.temperature_2m[i])+"°</div>";
      saatKap.appendChild(kutu);
    }
  }
  /* Günlük liste: bugün + sonraki 3 gün */
  const gunKap = $("#hte-gunluk");
  gunKap.innerHTML = "";
  if(d.daily && d.daily.time){
    d.daily.time.forEach((t,i)=>{
      const tarih = new Date(t+"T12:00:00");
      const [ik, ac] = havaKodEtiket(d.daily.weather_code[i]);
      const etiket = i===0 ? "Bugün" : i===1 ? "Yarın" : GUNLER[tarih.getDay()];
      const satir = document.createElement("div");
      satir.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.12)";
      satir.innerHTML =
        "<span style='flex:1;font-weight:600'>"+etiket+"</span>"+
        "<span style='flex:1;text-align:center'>"+ik+" "+ac+"</span>"+
        "<span style='flex:1;text-align:right'>"+Math.round(d.daily.temperature_2m_min[i])+"° / "+Math.round(d.daily.temperature_2m_max[i])+"°</span>";
      gunKap.appendChild(satir);
    });
  }
}

/* ---------- İş masrafları ---------- */
/* Masraf ekleme formundaki kategori kutucuklarını çizer + tıklama olayını bağlar.
   Tek seferlik çağrılır (başlangıçta); seçim değiştiğinde sadece .secili sınıfı oynar. */
function masrafKategoriCizGoster(){
  const kap = $("#masraf-kategori-cipler");
  if(!kap) return;
  kap.innerHTML = MASRAF_KATEGORI.map(k=>
    '<button type="button" data-kod="'+k.kod+'" class="'+(k.kod===masrafSeciliKategori?"secili":"")+'">'+k.ikon+' '+k.ad+'</button>'
  ).join("");
  kap.querySelectorAll("button").forEach(b=>{
    b.addEventListener("click", ()=>{
      masrafSeciliKategori = b.dataset.kod;
      kap.querySelectorAll("button").forEach(x=> x.classList.toggle("secili", x===b));
      titret(10);
    });
  });
}
/* Bu ayki masrafları kategoriye göre toplayıp "Malzeme: 1.200 ₺ · Yakıt: 400 ₺" gibi
   kısa bir döküm satırı üretir — hangi kalemin bütçeyi yediğini bir bakışta gösterir. */
function masrafKategoriOzetiCiz(){
  const kap = $("#masraf-kategori-ozet");
  if(!kap) return;
  if(!masraflar.length){ kap.innerHTML = ""; return; }
  const toplamlar = {};
  masraflar.forEach(m=>{
    const kod = m.kategori || "diger";
    toplamlar[kod] = (toplamlar[kod]||0) + (Number(m.tutar)||0);
  });
  const parcalar = Object.keys(toplamlar)
    .sort((a,b)=> toplamlar[b]-toplamlar[a])
    .map(kod=>{
      const k = masrafKategoriBul(kod);
      return '<span class="masraf-kat-rozet">'+k.ikon+' '+k.ad+': '+paraFmt(toplamlar[kod])+'</span>';
    });
  kap.innerHTML = parcalar.join("");
}
/* Masraf listesinin üstündeki kategori filtresi. Sadece o ay GERÇEKTEN kaydı olan
   kategoriler gösterilir — boş kategoriye tıklatıp kullanıcıyı boş listeyle
   karşılaştırmanın anlamı yok. Tek kategori varsa filtre satırı hiç çizilmez. */
function masrafFiltreCiz(){
  const kap = $("#masraf-filtre");
  if(!kap) return;
  const varOlanlar = [...new Set(masraflar.map(m=> m.kategori || "diger"))];
  /* Seçili filtrenin kategorisindeki son masraf silindiyse (ya da ay değişip o kategori
     kalmadıysa) filtre boş bir listede takılı kalırdı — böyle bir durumda "Hepsi"ne dön. */
  if(masrafFiltre!=="hepsi" && !varOlanlar.includes(masrafFiltre)) masrafFiltre = "hepsi";
  if(varOlanlar.length < 2){ kap.innerHTML = ""; masrafFiltre = "hepsi"; return; }
  const secenekler = [{kod:"hepsi", ad:"Hepsi", ikon:"📋"}]
    .concat(MASRAF_KATEGORI.filter(k=> varOlanlar.includes(k.kod)));
  kap.innerHTML = secenekler.map(k=>
    '<button type="button" data-kod="'+k.kod+'" class="'+(k.kod===masrafFiltre?"secili":"")+'">'+k.ikon+' '+k.ad+'</button>'
  ).join("");
  kap.querySelectorAll("button").forEach(b=>{
    b.addEventListener("click", ()=>{
      masrafFiltre = b.dataset.kod;
      titret(10);
      masrafCiz();
    });
  });
}
/* ═══════════════════════════════════════════════════════════════════
   🧾 MASRAF RAPORU PDF (0.1.1.3)
   ───────────────────────────────────────────────────────────────────
   Masraflar kaydediliyordu ama toplu bir belge çıkarılamıyordu. Ay
   sonunda patrona veya muhasebeye "şu ay şunları harcadım" diye tek
   dosya vermek gerekiyor; tek tek fotoğraf göndermek pratik değil.

   Rapor mevcut PDF altyapısını kullanıyor (jsPDF + autoTable + Türkçe
   font), böylece görünüm diğer raporlarla aynı ve tek kaynak korunuyor.
   Fiş fotoğrafları da isteğe bağlı olarak eklenebiliyor.
   ═══════════════════════════════════════════════════════════════════ */
async function masrafPdfPaylas(fotolarDahil){
  try{
    if(!masraflar.length){ toast("Bu ayda masraf kaydı yok"); return; }
    toast("Rapor hazırlanıyor...");
    await Promise.all([kutuphaneYukle("jspdf"), pdfFontlariYukle()]);
    if(!window.jspdf || !window.jspdf.jsPDF){
      toast("PDF motoru yüklenemedi, internetini kontrol et 📡"); return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({unit:"pt", format:"a4"});
    const yaziTipi = pdfTurkceFontKur(doc);
    const solX = 40, sagX = 555;
    let y = 52;

    doc.setFont(yaziTipi,"bold"); doc.setFontSize(16);
    doc.text("MASRAF RAPORU — "+AYLAR[aktifAy]+" "+aktifYil, solX, y);
    doc.setDrawColor(217,166,0); doc.setLineWidth(2);
    doc.line(solX, y+6, sagX, y+6);
    y += 24;

    doc.setFont(yaziTipi,"normal"); doc.setFontSize(9.5); doc.setTextColor(60);
    const ad = (kullanici && kullanici.displayName) || "";
    if(ad){ doc.text("İşçi: "+ad, solX, y); y += 12; }
    doc.text("Belge düzenlenme tarihi: "+new Date().toLocaleDateString("tr-TR"), solX, y);
    doc.setTextColor(0); y += 10;

    /* Kategoriye göre topla — muhasebe genelde böyle istiyor */
    const katToplam = {};
    masraflar.forEach(m=>{
      const k = m.kategori || "Diğer";
      katToplam[k] = (katToplam[k]||0) + (Number(m.tutar)||0);
    });

    const satirlar = masraflar
      .slice().sort((a,b)=> String(a.tarih)<String(b.tarih)?-1:1)
      .map(m=>[
        tarihFormatla(m.tarih),
        m.kategori || "Diğer",
        (m.aciklama || "—"),
        m.fisli ? "Var" : "—",
        m.odendi ? "Ödendi" : "Bekliyor",
        paraFmt(Number(m.tutar)||0)
      ]);

    const toplam = masraflar.reduce((t,m)=> t+(Number(m.tutar)||0), 0);
    const bekleyen = masraflar.filter(m=>!m.odendi).reduce((t,m)=> t+(Number(m.tutar)||0), 0);

    doc.autoTable({
      startY: y+8, margin:{left:solX, right: 595-sagX},
      head: [["TARİH","KATEGORİ","AÇIKLAMA","FİŞ","DURUM","TUTAR"]],
      body: satirlar,
      foot: [["TOPLAM: "+masraflar.length+" masraf","","","","",paraFmt(toplam)],
             ["","","","","BEKLEYEN",paraFmt(bekleyen)]],
      styles:{font:yaziTipi, fontSize:8.5, cellPadding:4},
      headStyles:{fillColor:[35,35,40], textColor:255, fontStyle:"bold"},
      footStyles:{fillColor:[255,247,220], textColor:20, fontStyle:"bold"},
      columnStyles:{5:{halign:"right"}, 3:{halign:"center"}, 4:{halign:"center"}}
    });
    let y2 = doc.lastAutoTable.finalY + 20;

    /* Kategori özeti */
    const katlar = Object.keys(katToplam).sort((a,b)=> katToplam[b]-katToplam[a]);
    if(katlar.length > 1){
      doc.setFont(yaziTipi,"bold"); doc.setFontSize(10);
      doc.text("KATEGORİ DAĞILIMI", solX, y2); y2 += 14;
      doc.setFont(yaziTipi,"normal"); doc.setFontSize(9);
      katlar.forEach(k=>{
        if(y2 > 760){ doc.addPage(); y2 = 60; }
        doc.text(k, solX+6, y2);
        doc.text(paraFmt(katToplam[k]), sagX-6, y2, {align:"right"});
        y2 += 13;
      });
    }

    /* Fiş fotoğrafları — her biri yeni sayfada */
    if(fotolarDahil){
      const fisliler = masraflar.filter(m=>m.fisli);
      if(fisliler.length){
        toast("Fişler ekleniyor ("+fisliler.length+" adet)...");
        for(const m of fisliler){
          let veri = null;
          try{
            const fd = await kokRef().collection("fisler").doc(m.id).get();
            if(fd.exists) veri = fd.data().veri;
          }catch(e){ /* okunamayan fiş atlanıyor, rapor yine çıkıyor */ }
          if(!veri) continue;
          doc.addPage();
          doc.setFont(yaziTipi,"bold"); doc.setFontSize(11);
          doc.text(tarihFormatla(m.tarih)+" · "+(m.kategori||"Diğer")+" · "+paraFmt(Number(m.tutar)||0), solX, 45);
          if(m.aciklama){
            doc.setFont(yaziTipi,"normal"); doc.setFontSize(9); doc.setTextColor(80);
            doc.text(String(m.aciklama).slice(0,90), solX, 60);
            doc.setTextColor(0);
          }
          try{
            /* Oran korunarak sayfaya sığdır */
            doc.addImage(veri, "JPEG", solX, 72, sagX-solX, 0);
          }catch(e){ /* bozuk görsel — sayfa boş kalır, rapor bozulmaz */ }
        }
      }
    }

    /* Sayfa numaraları */
    const toplamSayfa = doc.internal.getNumberOfPages();
    for(let sf=1; sf<=toplamSayfa; sf++){
      doc.setPage(sf);
      doc.setFont(yaziTipi,"normal"); doc.setFontSize(8); doc.setTextColor(120);
      doc.text("Sayfa "+sf+" / "+toplamSayfa, sagX-60, 820);
      doc.text("Puantaj Defterim", solX, 820);
      doc.setTextColor(0);
    }

    const dosyaAdi = "Masraf-"+AYLAR[aktifAy]+"-"+aktifYil+".pdf";
    await pdfDosyaPaylas(doc.output("blob"), dosyaAdi,
      "Masraf Raporu — "+AYLAR[aktifAy]+" "+aktifYil);
  }catch(e){
    toast("Masraf raporu hazırlanamadı — internetini kontrol edip tekrar dene 📡");
    try{ hataKaydet("masrafPdfPaylas", e); }catch(_){}
  }
}

/* ═══════════════════════════════════════════════════════════════════
   🤝 MUTABAKAT — İŞVEREN ONAYI (0.1.1.4)
   ───────────────────────────────────────────────────────────────────
   Uygulama bugüne kadar TEK TARAFLI kayıt tutuyordu. Bir anlaşmazlıkta
   "ben uygulamama yazmıştım" zayıf bir dayanak. Bu sistem kaydı
   karşılıklı belgeye dönüştürüyor:

     1. İşçi ay sonunda bağlantı üretir
     2. İşverene WhatsApp'tan gönderir
     3. İşveren HESAP AÇMADAN açar, özeti görür
     4. "Onaylıyorum" der → tarih ve saatle kaydedilir

   Güvenlik (firestore.rules ile birlikte):
     • Belge kimliği tahmin edilemez (rastgele 24 karakter)
     • Belgede yalnızca o ayın ÖZETİ var — başka veriye erişim yok
     • İşveren yalnızca onay alanlarını yazabilir; rakamlara
       kural düzeyinde dokunamaz
   ═══════════════════════════════════════════════════════════════════ */
/* İşverenin gördüğü ekran. Giriş yok, dinleyici yok — tek belge okunuyor. */
async function mutabakatGoster(anahtar){
  const ekran = document.getElementById("mutabakat-ekran");
  const govde = document.getElementById("mut-govde");
  try{
    document.getElementById("ekran-yukleniyor").classList.add("gizli");
  }catch(e){}
  if(!ekran || !govde) return;
  ekran.classList.remove("gizli");
  govde.innerHTML = '<div class="bos-mesaj">⏳ Yükleniyor...</div>';

  try{
    const d = await db.collection("mutabakat").doc(anahtar).get();
    if(!d.exists){
      govde.innerHTML = '<div class="bos-mesaj"><span class="buyuk">🔍</span>' +
        'Bu bağlantı bulunamadı.<br>Bağlantının tamamını kopyaladığınızdan emin olun.</div>';
      return;
    }
    const m = d.data();
    document.getElementById("mut-donem").textContent =
      (m.donemAd || "") + (m.santiye ? " · " + m.santiye : "");

    const satir = (et, dg, vurgu) =>
      '<div style="display:flex;justify-content:space-between;align-items:baseline;padding:11px 0;border-bottom:1px solid var(--cizgi)">' +
        '<span style="font-size:13px;color:var(--soluk)">' + et + '</span>' +
        '<span style="font-family:\'Saira Condensed\';font-size:' + (vurgu?'22px':'17px') +
        ';font-weight:800' + (vurgu?';color:var(--sari)':'') + '">' + dg + '</span></div>';

    govde.innerHTML =
      '<div class="kart">' +
        (m.isciAd ? '<div style="font-size:15px;font-weight:700;margin-bottom:10px">👷 ' + esc(m.isciAd) + '</div>' : '') +
        satir("Çalışılan gün", (m.gunSayisi||0) + " gün") +
        /* Ayın tamamı görünsün (0.1.3.3) — işveren "kaç gün geldi,
           kaç gün gelmedi" sorusunun cevabını burada buluyor. */
        ((m.gelmediGun||0) > 0 ? satir("Gelinmeyen gün", m.gelmediGun + " gün") : "") +
        ((m.izinliGun||0) > 0 ? satir("İzinli gün", m.izinliGun + " gün") : "") +
        (m.artiToplam > 0 ? satir("Ek yevmiye", m.artiToplam) : "") +
        (m.mesaiToplam > 0 ? satir("Mesai", m.mesaiToplam + " saat") : "") +
        (m.yevmiye > 0 ? satir("Günlük yevmiye", paraFmt(m.yevmiye)) : "") +
        satir("Hakediş", paraFmt(m.hakedis||0)) +
        satir("Alınan (avans/ödeme)", paraFmt(m.alinan||0)) +
        satir("KALAN ALACAK", paraFmt(m.kalan||0), true) +
      '</div>' +
      /* Önceki aylardan alacak varsa ayrı kartta göster (0.1.3.3).
         Belgenin konusu bu ay ama işverenin toplam borcu görmesi
         gerekiyor — aksi hâlde eski aylar unutulup gidiyor. */
      ((m.oncekiKalan||0) > 0
        ? '<div class="kart" style="border-color:var(--yarim);background:rgba(201,138,46,.08)">' +
            '<div style="font-size:13px;font-weight:700;color:var(--yarim);margin-bottom:8px">⏳ Önceki aylardan</div>' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;padding:6px 0">' +
              '<span style="font-size:13px;color:var(--soluk)">Eski dönem alacağı</span>' +
              '<span style="font-family:\'Saira Condensed\';font-size:18px;font-weight:800;color:var(--yarim)">' + paraFmt(m.oncekiKalan) + '</span>' +
            '</div>' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;padding:10px 0 0;margin-top:6px;border-top:1px solid var(--cizgi2)">' +
              '<span style="font-size:13.5px;font-weight:700">GENEL TOPLAM</span>' +
              '<span style="font-family:\'Saira Condensed\';font-size:24px;font-weight:800;color:var(--sari)">' + paraFmt(m.genelKalan||0) + '</span>' +
            '</div>' +
          '</div>'
        : '');

    /* GÜN GÜN DÖKÜM (0.1.2.6)
       İşveren "27,5 gün" rakamını doğrulayabilmeli — hangi günlerde
       çalışıldığını görsün. Yalnızca çalışılan günler listeleniyor;
       gelinmeyen günler belgeye hiç girmiyor. */
    if(Array.isArray(m.gunler) && m.gunler.length){
      const satirlar = m.gunler.map(g=>
        '<tr>' +
          '<td style="padding:7px 4px;border-bottom:1px solid var(--cizgi);font-family:\'Saira Condensed\';font-size:14px;font-weight:700">' + g.g + '</td>' +
          '<td style="padding:7px 4px;border-bottom:1px solid var(--cizgi);text-align:center;font-family:\'Saira Condensed\';font-size:14px;font-weight:800;color:var(--tam-ac)">' + esc(g.d||"") + '</td>' +
          '<td style="padding:7px 4px;border-bottom:1px solid var(--cizgi);text-align:center;font-family:\'Saira Condensed\';font-size:13px;color:var(--sari)">' + esc(g.a||"—") + '</td>' +
          '<td style="padding:7px 4px;border-bottom:1px solid var(--cizgi);text-align:center;font-family:\'Saira Condensed\';font-size:13px;color:var(--mesai)">' + esc(g.m||"—") + '</td>' +
          '<td style="padding:7px 4px;border-bottom:1px solid var(--cizgi);text-align:right;font-family:\'Saira Condensed\';font-size:14px;font-weight:700">' + paraFmt(g.k||0) + '</td>' +
        '</tr>').join("");
      govde.innerHTML +=
        '<div class="kart">' +
          '<div style="font-size:14px;font-weight:700;margin-bottom:4px">📋 Gün gün döküm</div>' +
          '<div style="font-size:11.5px;color:var(--soluk);margin-bottom:10px;line-height:1.5">' +
            'Yalnızca çalışılan günler · X = tam yevmiye, / = yarım</div>' +
          '<table style="width:100%;border-collapse:collapse">' +
            '<thead><tr>' +
              '<th style="text-align:left;font-size:10px;color:var(--soluk2);letter-spacing:.5px;padding-bottom:6px">GÜN</th>' +
              '<th style="text-align:center;font-size:10px;color:var(--soluk2);letter-spacing:.5px;padding-bottom:6px">YEVMİYE</th>' +
              '<th style="text-align:center;font-size:10px;color:var(--soluk2);letter-spacing:.5px;padding-bottom:6px">ARTI</th>' +
              '<th style="text-align:center;font-size:10px;color:var(--soluk2);letter-spacing:.5px;padding-bottom:6px">MESAİ</th>' +
              '<th style="text-align:right;font-size:10px;color:var(--soluk2);letter-spacing:.5px;padding-bottom:6px">KAZANÇ</th>' +
            '</tr></thead><tbody>' + satirlar + '</tbody></table>' +
        '</div>';
    }

    if(m.onay){
      const t = m.onayTarih && m.onayTarih.toDate ? m.onayTarih.toDate() : null;
      govde.innerHTML +=
        '<div class="kart" style="border-color:var(--tam);background:rgba(31,168,124,.1)">' +
          '<div style="font-size:16px;font-weight:700;color:var(--tam-ac)">✅ Onaylandı</div>' +
          '<div style="font-size:13px;color:var(--soluk);margin-top:6px;line-height:1.6">' +
            (m.onaylayanAd ? esc(m.onaylayanAd) + "<br>" : "") +
            (t ? t.toLocaleDateString("tr-TR") + " " + t.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}) : "") +
            (m.onaylayanNot ? "<br><i>" + esc(m.onaylayanNot) + "</i>" : "") +
          '</div></div>';
    }else{
      document.getElementById("mut-onay-alan").classList.remove("gizli");
      const btn = document.getElementById("btn-mut-onayla");
      if(btn) btn.addEventListener("click", ()=> mutabakatOnayla(anahtar));
    }
  }catch(e){
    govde.innerHTML = '<div class="bos-mesaj"><span class="buyuk">📡</span>' +
      'Bilgiler yüklenemedi. İnternet bağlantınızı kontrol edip sayfayı yenileyin.</div>';
  }
}

async function mutabakatOnayla(anahtar){
  const btn = document.getElementById("btn-mut-onayla");
  const ad = (document.getElementById("mut-ad").value || "").trim();
  if(!ad){ alert("Lütfen adınızı yazın."); return; }
  if(!confirm("Bu puantajı onaylıyor musunuz?\n\nOnayınız tarih ve saatle kaydedilecek.")) return;
  if(btn) btn.disabled = true;
  try{
    /* Kurallar gereği YALNIZCA bu dört alan yazılabiliyor —
       rakamlara dokunmak kural düzeyinde engelli. */
    await db.collection("mutabakat").doc(anahtar).update({
      onay: true,
      onayTarih: firebase.firestore.FieldValue.serverTimestamp(),
      onaylayanAd: ad.slice(0, 60),
      onaylayanNot: (document.getElementById("mut-not").value || "").trim().slice(0, 200)
    });
    document.getElementById("mut-onay-alan").classList.add("gizli");
    mutabakatGoster(anahtar);
  }catch(e){
    if(btn) btn.disabled = false;
    alert("Onay kaydedilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.");
  }
}

/* TÜM DÖNEM ÖZETİ (0.1.2.7)
   İşçi yalnızca bu ayın değil, TOPLAM alacağının onaylanmasını isteyebilir.
   Örnek: Temmuz'dan 18.500, Ağustos'tan 71.250 alacağı varsa patronun
   tamamını görüp onaylaması gerekiyor.
   `enEskiOdenmemisAy()` ile aynı veri kaynağını kullanıyor — tek doğru
   kaynak korunuyor, iki ayrı hesap çıkmıyor. */
async function tumDonemOzeti(){
  let gSnap = tumGirdilerQS, oSnap = tumOdemelerQS;
  if(!gSnap || !oSnap){
    const r = await Promise.all([
      kokRef().collection("girdiler").get(),
      kokRef().collection("odemeler").get()
    ]);
    gSnap = tumGirdilerQS || r[0];
    oSnap = tumOdemelerQS || r[1];
  }
  const aylar = {};
  gSnap.forEach(doc=>{
    const v = doc.data(), ay = doc.id.slice(0,7);
    if(!aylar[ay]) aylar[ay] = {hak:0, alinan:0, gun:0, mesai:0, arti:0};
    aylar[ay].hak    += girdiKazanc(v);
    aylar[ay].gun    += girdiGun(v);
    aylar[ay].mesai  += mesaiSaatMik(v);
    aylar[ay].arti   += mesaiYevMik(v);
  });
  oSnap.forEach(doc=>{
    const v = doc.data(), ay = odemeAyi(v);
    if(!ay) return;
    if(!aylar[ay]) aylar[ay] = {hak:0, alinan:0, gun:0, mesai:0, arti:0};
    aylar[ay].alinan += Number(v.tutar)||0;
  });
  /* Yalnızca gerçekten kayıt olan aylar, eskiden yeniye */
  const liste = Object.keys(aylar).sort()
    .filter(a=> aylar[a].hak > 0 || aylar[a].alinan > 0)
    .map(a=>{
      const [yy, mm] = a.split("-").map(Number);
      return {
        ay: a,
        ad: AYLAR[mm-1] + " " + yy,
        gun: Math.round(aylar[a].gun * 100) / 100,
        hak: Math.round(aylar[a].hak),
        alinan: Math.round(aylar[a].alinan),
        /* Kalan, ham farktan değil YUVARLANMIŞ hakediş ve alınandan
           hesaplanıyor — satırın kendi içinde tutması için (0.1.3.0) */
        kalan: Math.round(aylar[a].hak) - Math.round(aylar[a].alinan)
      };
    });
  /* YUVARLAMA TUTARLILIĞI (0.1.3.0)
     Her ay ayrı yuvarlandığı için toplamda 1-2 ₺ kayma oluşabiliyordu:
     tabloda ay ay "kalan" değerlerini toplayan işveren, en alttaki
     genel toplamla tutmadığını görüyordu. Bir mutabakat belgesinde
     kendi içinde toplanmayan rakam güvensizlik yaratır.
     Çözüm: toplam, ayların YUVARLANMIŞ değerlerinden hesaplanıyor —
     ham değerlerden değil. Böylece tablo her zaman kendi içinde
     tutuyor: Σ hakediş − Σ alınan = Σ kalan. */
  const toplam = liste.reduce((t,a)=>({
    gun: t.gun + a.gun, hak: t.hak + a.hak,
    alinan: t.alinan + a.alinan, kalan: t.kalan + a.kalan
  }), {gun:0, hak:0, alinan:0, kalan:0});
  toplam.gun = Math.round(toplam.gun * 100) / 100;
  /* Kalan, hakediş−alınan ile birebir aynı olmalı */
  toplam.kalan = toplam.hak - toplam.alinan;
  return {aylar: liste, toplam};
}

/* Mutabakat için gün gün döküm hazırlar. Yalnızca çalışılan günler. */
function mutabakatGunListesi(){
  const liste = [];
  try{
    Object.keys(girdiler).sort().forEach(id=>{
      const v = girdiler[id];
      if(!v || !girdiGun(v)) return;              /* gelinmeyen gün yazılmıyor */
      const i = gunIsaret(v);
      liste.push({
        g: Number(id.slice(8,10)),                /* ayın kaçı */
        d: i.yev,                                 /* X / yarım / saatlik */
        a: (i.arti && i.arti !== "0") ? i.arti : "",
        m: (i.mesai && i.mesai !== "0") ? i.mesai : "",
        k: Math.round(girdiKazanc(v))
      });
    });
  }catch(e){}
  return liste;
}

/* Bu ay için daha önce gönderilmiş mutabakatı bulur.
   Aynı ay tekrar gönderilirse yeni kayıt üretmek yerine mevcut
   bağlantı yenileniyor — yoksa patronun elinde birden fazla
   bağlantı olur ve hangisinin geçerli olduğu karışır. */
/* Ay değişince onay durumunu göster — işçi patronun onaylayıp
   onaylamadığını görebilsin (0.1.1.5). Bağlantıyı gönderip sonucunu
   bilmemek büyük eksikti. */
async function mutabakatDurumCiz(){
  const el = document.getElementById("mutabakat-durum");
  if(!el || !kullanici){ if(el) el.classList.add("gizli"); return; }
  try{
    /* Hem bu ayın hem TÜM DÖNEM mutabakatı aranıyor (0.1.2.8).
       Kullanıcı tüm dönem gönderdiyse durum kartı görünmüyordu —
       gönderdiği belgenin onaylanıp onaylanmadığını takip edemiyordu. */
    const donem = aktifYil + "-" + pad(aktifAy+1);
    let m = await mutabakatBul(donem);
    if(!m) m = await mutabakatBul("tum");
    if(!m){ el.classList.add("gizli"); return; }

    /* ONAYLANMAMIŞ MUTABAKAT KENDİLİĞİNDEN GÜNCELLENİYOR (0.1.2.5)
       Bağlantı, gönderildiği andaki rakamların fotoğrafı. Sonradan gün
       eklenirse ya da yevmiye değişirse patronun elindeki link ESKİ
       rakamları göstermeye devam ediyordu — kullanıcı bunu bildirdi.
       Artık ay ekranı her açıldığında, HENÜZ ONAYLANMAMIŞ mutabakat
       güncel rakamlarla tazeleniyor. Patron aynı linke tıklasa bile
       doğru rakamları görüyor.
       Onaylanmış mutabakata DOKUNULMUYOR — imza atılmış belge sonradan
       değişmemeli. */
    /* ONAYLANMAMIŞ MUTABAKAT KENDİLİĞİNDEN TAZELENİYOR (0.1.2.5 / 0.1.2.8)
       Bağlantı, gönderildiği andaki rakamların fotoğrafı. Sonradan gün
       eklenirse ya da yevmiye değişirse işverenin elindeki link eski
       rakamları göstermeye devam ediyordu.
       Kapsama göre doğru kaynak kullanılıyor: "tum" ise tüm dönem özeti,
       "ay" ise görüntülenen ayın hesabı. Karıştırılırsa toplam bozulur.
       Onaylanmış belgeye DOKUNULMUYOR — imzalanmış belge değişmemeli. */
    if(!m.onay){
      try{
        if(m.kapsam === "tum"){
          const dz = await tumDonemOzeti();
          if(m.hakedis !== dz.toplam.hak || m.alinan !== dz.toplam.alinan || m.gunSayisi !== dz.toplam.gun){
            await db.collection("mutabakat").doc(m.id).update({
              aylar: dz.aylar,
              gunSayisi: dz.toplam.gun,
              yevmiye: Number(ayarlar.yevmiye) || 0,
              hakedis: dz.toplam.hak,
              alinan: dz.toplam.alinan,
              kalan: dz.toplam.kalan
            });
            m.aylar = dz.aylar; m.gunSayisi = dz.toplam.gun;
            m.hakedis = dz.toplam.hak; m.alinan = dz.toplam.alinan; m.kalan = dz.toplam.kalan;
          }
        }else{
          const t = hesapla();
          const yeniHak = Math.round(t.hakedis), yeniAlinan = Math.round(t.alinan);
          if(m.hakedis !== yeniHak || m.alinan !== yeniAlinan || m.gunSayisi !== t.gunSayisi){
            await db.collection("mutabakat").doc(m.id).update({
              gunSayisi: t.gunSayisi,
              mesaiToplam: t.mesaiToplam || 0,
              artiToplam: t.artiToplam || 0,
              yevmiye: Number(ayarlar.yevmiye) || 0,
              hakedis: yeniHak,
              alinan: yeniAlinan,
              kalan: Math.round(t.kalan),
              gunler: mutabakatGunListesi()
            });
            m.gunSayisi = t.gunSayisi; m.hakedis = yeniHak;
            m.alinan = yeniAlinan; m.kalan = Math.round(t.kalan);
          }
        }
      }catch(e){ /* tazelenemezse eski rakamlarla devam, çökme yok */ }
    }

    if(m.onay){
      const t = m.onayTarih && m.onayTarih.toDate ? m.onayTarih.toDate() : null;
      el.innerHTML =
        '<div class="kart" style="border-color:var(--tam);background:rgba(31,168,124,.09);margin-bottom:0">' +
          '<div style="display:flex;align-items:center;gap:9px">' +
            '<span style="font-size:20px">✅</span>' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-size:14px;font-weight:700;color:var(--tam-ac)">Patron onayladı' +
                (m.kapsam === "tum" ? ' <span style="font-size:11px;font-weight:600;color:var(--soluk)">(tüm dönem)</span>' : '') + '</div>' +
              '<div style="font-size:11.5px;color:var(--soluk);margin-top:2px">' +
                (m.onaylayanAd ? esc(m.onaylayanAd) : "") +
                (t ? " · " + t.toLocaleDateString("tr-TR") + " " + t.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}) : "") +
              '</div>' +
              (m.onaylayanNot ? '<div style="font-size:11.5px;color:var(--soluk);margin-top:3px;font-style:italic">' + esc(m.onaylayanNot) + '</div>' : '') +
              /* Onaydan sonra rakamlar değiştiyse uyar — patron eski rakamları
                 onayladı, yeni durumu bilmiyor (0.1.2.5). */
              (function(){
                try{
                  const t2 = hesapla();
                  if(Math.round(t2.hakedis) !== m.hakedis || t2.gunSayisi !== m.gunSayisi){
                    return '<div style="font-size:11.5px;color:var(--yarim);margin-top:6px;line-height:1.5">' +
                      '⚠️ Onaydan sonra bu ay değişti (' + paraFmt(m.hakedis) + ' → ' + paraFmt(t2.hakedis) + '). ' +
                      'Yeni hâlini onaylatmak istersen tekrar gönder.</div>';
                  }
                }catch(e){}
                return "";
              })() +
            '</div>' +
          '</div>' +
        '</div>';
    }else{
      el.innerHTML =
        '<div class="kart" style="border-color:var(--yarim);background:rgba(201,138,46,.08);margin-bottom:0">' +
          '<div style="display:flex;align-items:center;gap:9px">' +
            '<span style="font-size:20px">⏳</span>' +
            '<div style="flex:1">' +
              '<div style="font-size:14px;font-weight:700;color:var(--yarim)">Onay bekleniyor' +
                (m.kapsam === "tum" ? ' <span style="font-size:11px;font-weight:600;color:var(--soluk)">(tüm dönem)</span>' : '') + '</div>' +
              '<div style="font-size:11.5px;color:var(--soluk);margin-top:2px">Bağlantı gönderildi, patron henüz onaylamadı</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    }
    el.classList.remove("gizli");
  }catch(e){ el.classList.add("gizli"); }
}

/* MUTABAKAT ADRESİ — DETERMİNİSTİK (0.1.3.1)
   ─────────────────────────────────────────────────────────────────
   Adres eskiden RASTGELE üretiliyordu; uygulama "bu dönem için daha
   önce bağlantı ürettim mi?" diye aramak zorundaydı (önce telefon
   hafızası, sonra bulut). Bulamazsa YENİ belge oluşturuyordu —
   işverenin elindeki eski bağlantı eski belgeyi göstermeye devam
   ediyordu. Kullanıcı uygulamada 71.250 ₺ görürken linkte 50.000 ₺
   görmesinin sebebi buydu: İKİ AYRI BELGE.

   Artık adres hesaplanıyor: {kullanıcı kimliği}_{dönem}
     • Aramaya gerek yok, adres her zaman aynı
     • APK'dan da tarayıcıdan da aynı belge bulunuyor
     • İkinci belge oluşması yapısal olarak imkânsız
     • Güvenlik: kullanıcı kimliği 28 rastgele karakter; kurallarda
       koleksiyon listeleme zaten kapalı
   ───────────────────────────────────────────────────────────────── */
function mutabakatAdresi(donem){
  return kullanici.uid + "_" + donem;
}

async function mutabakatBul(donem){
  try{
    const d = await db.collection("mutabakat").doc(mutabakatAdresi(donem)).get();
    if(d.exists && d.data().sahipId === kullanici.uid) return {id: d.id, ...d.data()};
  }catch(e){}
  return null;
}

async function mutabakatBulYerel(donem){
  /* İKİ ALANLI SORGU KULLANILMIYOR (0.1.1.5)
     `where(sahipId) + where(donem)` Firestore'da bileşik indeks
     gerektiriyor. Kullanıcıya Firebase konsolunda ek kurulum
     yaptırmamak için bağlantı anahtarı yerel olarak saklanıyor:
     her dönem için üretilen anahtar localStorage'da tutuluyor,
     sorgu tek belge okumasına iniyor (indeks gerekmez).
     Yerel kayıt silinirse (uygulama verisi temizlenirse) yeni
     bağlantı üretiliyor — eskisi çalışmaya devam eder, sadece
     durum gösterimi o dönem için sıfırlanır. */
  try{
    let anahtar = null;
    try{ anahtar = localStorage.getItem("mutabakat:" + donem); }catch(e){}
    if(!anahtar) return null;
    const d = await db.collection("mutabakat").doc(anahtar).get();
    if(!d.exists) return null;
    const veri = d.data();
    /* Başkasının belgesi olmadığını doğrula */
    if(veri.sahipId !== kullanici.uid) return null;
    return {id: d.id, ...veri};
  }catch(e){ return null; }
}

async function mutabakatOlustur(){
  /* ÇİFT TIKLAMA KORUMASI (0.1.2.9)
     Bu akış birden çok onay penceresi açıyor ve arada ağ işlemi yapıyor.
     Kullanıcı beklerken tekrar basarsa iki ayrı belge oluşup patrona
     hangisinin geçerli olduğu belirsiz iki bağlantı gidebilirdi. */
  const _mbtn = document.getElementById("btn-mutabakat");
  if(_mbtn && _mbtn.disabled) return;
  if(_mbtn) _mbtn.disabled = true;
  try{
    if(!kullanici){ toast("Önce giriş yap"); return; }
    const t = hesapla();
    if(!t || t.gunSayisi <= 0){ toast("Bu ayda kayıt yok — önce günlerini işle"); return; }

    /* HANGİ AY GÖRÜNTÜLENİYORSA O GÖNDERİLİYOR (0.1.3.2)
       0.1.2.7'de eklenen "tüm dönemi mi gönderelim?" sorusu kaldırıldı.
       Kullanıcı hangi ayı açtıysa onu göndermek istiyor; araya soru
       girmesi hem kafa karıştırıyor hem de paylaşım penceresinin
       açılmasını engelliyordu (aşağıdaki nota bakınız). */
    const donem = aktifYil + "-" + pad(aktifAy+1);
    const mevcut = await mutabakatBul(donem);

    /* Zaten onaylanmışsa yeni bağlantı üretme — onay kaybolmasın */
    if(mevcut && mevcut.onay){
      const t2 = mevcut.onayTarih && mevcut.onayTarih.toDate ? mevcut.onayTarih.toDate() : null;
      const devam = confirm(
        "Bu ay" + " ZATEN ONAYLANMIŞ.\n\n" +
        (mevcut.onaylayanAd ? "Onaylayan: " + mevcut.onaylayanAd + "\n" : "") +
        (t2 ? "Tarih: " + t2.toLocaleDateString("tr-TR") + " " + t2.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}) + "\n" : "") +
        "\nYeniden gönderirsen mevcut onay SİLİNİR ve patronun tekrar onaylaması gerekir.\n\nDevam edilsin mi?");
      if(!devam) return;
    }

    toast("Onay bağlantısı hazırlanıyor...");
    /* Mevcut kayıt varsa aynı anahtarı koru — patronun elindeki
       bağlantı çalışmaya devam etsin, rakamlar güncellensin. */
    /* Adres hesaplanıyor, rastgele üretilmiyor (0.1.3.1) —
       aynı dönem için her zaman AYNI belge kullanılıyor. */
    const anahtar = mutabakatAdresi(donem);
    const ayAd = AYLAR[aktifAy] + " " + aktifYil;

    /* Önceki ayların ödenmemiş bakiyesi (0.1.3.3) */
    let oncekiKalanTutar = 0;
    try{
      const dz = await tumDonemOzeti();
      oncekiKalanTutar = dz.aylar
        .filter(a=> a.ay < donem && a.kalan > 0)
        .reduce((x,a)=> x + a.kalan, 0);
    }catch(e){ /* alınamazsa 0 kalır, belge yine üretilir */ }

    /* GÖNDERİM ONAYI (0.1.2.7 · 0.1.2.9'da öne alındı)
       Kullanıcı defalarca "linkte yanlış rakam görünüyor" dedi. Artık
       ne gideceği gönderilmeden ÖNCE ekranda gösteriliyor — yanlışsa
       kullanıcı gönderimi iptal edip düzeltebiliyor.

       0.1.2.9 — SIRA DÜZELTİLDİ: bu onay eskiden belge YAZILDIKTAN
       sonra soruluyordu. Kullanıcı "İptal" dese bile belge çoktan
       güncellenmiş oluyordu; daha kötüsü, patron o belgeyi ONAYLAMIŞSA
       `set()` işlemi `onay:false` yazarak onayı SİLİYORDU ve kullanıcının
       haberi olmuyordu. Artık hiçbir yazma yapılmadan önce soruluyor. */
    {
      const gy = Number(ayarlar.yevmiye) || 0;
      const gs = t.gunSayisi;
      const gh = Math.round(t.hakedis);
      const ga = Math.round(t.alinan);
      const gk = Math.round(t.kalan);
      const gonder = confirm(
        "PATRONA GİDECEK RAKAMLAR\n" +
        (ayAd) + "\n" +
        "──────────────────────\n" +
        "Çalışılan gün : " + gs + "\n" +
        ((t.gelmedi||0) > 0 ? "Gelinmeyen gün: " + t.gelmedi + "\n" : "") +
        "Günlük yevmiye: " + paraFmt(gy) + "\n" +
        "Hakediş       : " + paraFmt(gh) + "\n" +
        "Alınan        : " + paraFmt(ga) + "\n" +
        "KALAN         : " + paraFmt(gk) + "\n" +
        (oncekiKalanTutar > 0
          ? "Önceki aylardan: " + paraFmt(oncekiKalanTutar) + "\n" +
            "GENEL TOPLAM  : " + paraFmt(gk + oncekiKalanTutar) + "\n"
          : "") +
        "──────────────────────\n" +
        "Kontrol: " + gs + " × " + paraFmt(gy) + " = " + paraFmt(gs * gy) + "\n\n" +
        "Doğruysa TAMAM'a bas, gönderilsin.");
      if(!gonder) return;
    }

    /* Belgede YALNIZCA özet — kişisel veri veya gün gün döküm yok */
    await db.collection("mutabakat").doc(anahtar).set({
      sahipId: kullanici.uid,
      isciAd: (kullanici.displayName || "").slice(0, 60),
      donem: donem,
      donemAd: ayAd,
      kapsam: "ay",
      aylar: [],
      santiye: String(ayarlar.santiye || "").slice(0, 80),
      gunSayisi: t.gunSayisi,
      /* Ayın TAMAMI görünsün (0.1.3.3): işveren yalnızca çalışılan günü
         değil, gelinmeyen ve izinli günü de görmeli — ay hesabı böyle
         kapanıyor ve "kaç gün çalıştı" sorusu tam cevaplanıyor. */
      tamGun: t.tam || 0,
      yarimGun: t.yarim || 0,
      gelmediGun: t.gelmedi || 0,
      izinliGun: t.izinli || 0,
      mesaiToplam: t.mesaiToplam || 0,
      artiToplam: t.artiToplam || 0,
      /* YEVMİYE — bugünkü ayar DEĞİL, o dönemde gerçekten uygulanan (0.1.2.1)
         Uygulama her günü kaydedildiği andaki ücretle mühürlüyor. Yevmiye
         sonradan yükseltilirse eski günler eski ücretten kalıyor — doğru
         davranış, ama mutabakatta BUGÜNKÜ yevmiye yazılıyordu.
         Sonuç: işveren "28,5 gün × 2.500 = 71.250 olmalı, neden 52.500?"
         diye haklı olarak tutarsızlık görüyordu.
         Artık dönemin gerçek ortalaması yazılıyor ve ücretler farklıysa
         bu ayrıca belirtiliyor. */
      yevmiye: Number(ayarlar.yevmiye) || 0,
      hakedis: Math.round(t.hakedis),
      alinan: Math.round(t.alinan),
      kalan: Math.round(t.kalan),
      /* Önceki aylardan birikmiş alacak (0.1.3.3). Belgenin konusu bu ay
         ama işveren toplam borcu da görmeli: "bu ay 71.250 ₺, ayrıca
         önceki aylardan 18.500 ₺ daha var" demek gerekiyor. */
      oncekiKalan: oncekiKalanTutar,
      genelKalan: Math.round(t.kalan) + oncekiKalanTutar,
      /* GÜN GÜN DÖKÜM (0.1.2.6)
         İşveren yalnızca toplamı değil, hangi günlerin çalışıldığını da
         görebilmeli — "27,5 gün" demek yetmiyor, hangi günler olduğu
         sorulabilir. Yalnızca çalışılan günler yazılıyor; gelinmeyen
         günler belgeye girmiyor (gereksiz yer kaplamasın).
         Alan adları kısa tutuldu: g=gün, d=durum, a=artı, m=mesai, k=kazanç */
      gunler: mutabakatGunListesi(),
      olusturma: firebase.firestore.FieldValue.serverTimestamp(),
      onay: false
    });

    /* Anahtarı HEM buluta HEM yerele yaz.
       Bulut: hangi cihazdan girilirse girilsin aynı bağlantı bulunur.
       Yerel: bulut okunamazsa (çevrimdışı) yedek olarak kullanılır. */
    /* Gönderim sonrası durumu tazele — "onay bekleniyor" görünsün */
    try{ mutabakatDurumCiz(); }catch(e){}

    const url = location.origin + location.pathname + "?mutabakat=" + anahtar;
    const metin =
      "📋 *PUANTAJ MUTABAKATI — " + ayAd + "*\n" +
      (kullanici.displayName ? "👷 " + kullanici.displayName + "\n" : "") +
      "\n✅ Çalışılan: " + t.gunSayisi + " gün" +
      "\n💰 Hakediş: " + paraFmt(t.hakedis) +
      "\n💵 Alınan: " + paraFmt(t.alinan) +
      "\n🔸 Kalan: " + paraFmt(t.kalan) +
      "\n\nAşağıdaki bağlantıdan inceleyip onaylayabilirsiniz:\n" + url;

    /* PAYLAŞIM (0.1.3.2 — yeniden yazıldı)
       Sorun: tarayıcılar paylaşım penceresini yalnızca kullanıcı
       dokunuşundan HEMEN SONRA açmaya izin veriyor. Bu akışta araya
       onay pencereleri ve internet işlemleri girdiği için izin
       düşüyordu ve WhatsApp hiç açılmıyordu.
       Çözüm: üç kademeli yedek. Biri olmazsa diğeri devreye giriyor,
       en kötü durumda bağlantı ekranda gösterilip kopyalanabiliyor —
       kullanıcı hiçbir zaman eli boş kalmıyor. */
    let paylasildi = false;

    /* 1) Cihazın kendi paylaşım penceresi */
    try{
      if(navigator.share){
        await navigator.share({title: "Puantaj Mutabakatı — " + ayAd, text: metin});
        paylasildi = true;
      }
    }catch(e){
      if(e && e.name === "AbortError"){ return; }   /* kullanıcı bilerek kapattı */
    }

    /* 2) Doğrudan WhatsApp bağlantısı */
    if(!paylasildi){
      try{
        const pencere = window.open("https://wa.me/?text=" + encodeURIComponent(metin), "_blank");
        if(pencere) paylasildi = true;
      }catch(e){}
    }

    /* 3) Hiçbiri açılmadıysa bağlantıyı ekranda göster ve panoya kopyala */
    if(!paylasildi){
      try{ await navigator.clipboard.writeText(metin); }catch(e){}
      const gorunum = document.getElementById("mutabakat-durum");
      if(gorunum){
        gorunum.innerHTML =
          '<div class="kart" style="border-color:var(--sari)">' +
            '<div style="font-size:14px;font-weight:700;color:var(--sari);margin-bottom:6px">📋 Bağlantı hazır — kopyalandı</div>' +
            '<div style="font-size:11.5px;color:var(--soluk);margin-bottom:8px;line-height:1.5">' +
              'Paylaşım penceresi açılmadı. Aşağıdaki bağlantıyı patronuna gönder:</div>' +
            '<div style="font-size:11px;background:var(--girdi);padding:9px;border-radius:8px;' +
              'word-break:break-all;font-family:monospace;line-height:1.5">' + esc(url) + '</div>' +
            '<a class="btn btn-cizgili" style="display:block;text-align:center;text-decoration:none;margin-top:9px" ' +
              'href="https://wa.me/?text=' + encodeURIComponent(metin) + '" target="_blank" rel="noopener noreferrer">' +
              '📲 WhatsApp\'ta aç</a>' +
          '</div>';
        gorunum.classList.remove("gizli");
      }
      toast("Bağlantı panoya kopyalandı 📋");
    }
  }catch(e){
    toast("Onay bağlantısı oluşturulamadı — internetini kontrol et 📡");
    try{ hataKaydet("mutabakatOlustur", e); }catch(_){}
  }finally{
    if(_mbtn) _mbtn.disabled = false;
  }
}

function masrafCiz(){
  const ul = $("#liste-masraflar");
  if(!ul) return;
  const bekleyen = masraflar.filter(m=>!m.odendi).reduce((s,m)=> s+(Number(m.tutar)||0), 0);
  const tEl = $("#masraf-toplam");
  if(tEl) tEl.textContent = masraflar.length ? "Bekleyen: "+paraFmt(bekleyen) : "";
  /* Rapor düğmeleri yalnızca masraf varken anlamlı */
  const rapSatir = $("#masraf-rapor-satir");
  if(rapSatir) rapSatir.classList.toggle("gizli", !masraflar.length);
  masrafKategoriOzetiCiz();
  masrafFiltreCiz();
  if(!masraflar.length){
    ul.innerHTML = '<div class="bos-mesaj"><span class="buyuk">🧾</span>Bu ay masraf yok.</div>';
    return;
  }
  /* Filtre uygulanmış liste. Filtre "hepsi" ise hiçbir şey elenmiyor. */
  const gosterilecek = masrafFiltre==="hepsi"
    ? masraflar
    : masraflar.filter(m=> (m.kategori||"diger") === masrafFiltre);
  if(!gosterilecek.length){
    ul.innerHTML = '<div class="bos-mesaj"><span class="buyuk">🧾</span>Bu kategoride masraf yok.</div>';
    return;
  }
  ul.innerHTML = "";
  gosterilecek.forEach(m=>{
    const t = new Date(m.tarih+"T12:00:00");
    const kat = masrafKategoriBul(m.kategori);
    const li = document.createElement("li");
    if(m.odendi) li.style.opacity = ".45";
    li.innerHTML =
      '<div class="rozet" style="background:var(--yarim)">'+t.getDate()+'<small>'+AYLAR[t.getMonth()].slice(0,3)+'</small></div>'+
      '<div class="orta"><div class="baslik">'+kat.ikon+' '+esc(m.aciklama||"Masraf")+(m.odendi?" ✔ ödendi":"")+'</div>'+
      '<div class="alt-yazi">'+t.getDate()+' '+AYLAR[t.getMonth()]+' · '+kat.ad+'</div></div>'+
      '<div class="tutar">'+paraFmt(m.tutar)+'</div>'+
      (m.fisli ? '<button class="sil" aria-label="Fis" style="color:var(--sari)">🧾</button>' : '')+
      '<button class="sil" aria-label="Ödendi" style="color:var(--tam)">'+(m.odendi?"↩️":"✔")+'</button>'+
      '<button class="sil" aria-label="Sil">🗑️</button>';
    const fisBtn = li.querySelector('[aria-label="Fis"]');
    if(fisBtn) fisBtn.addEventListener("click", async ()=>{
      fisBtn.textContent = "⏳";
      try{
        const d = await kokRef().collection("fisler").doc(m.id).get();
        fisBtn.textContent = "🧾";
        const f = d.exists ? d.data().veri : null;
        if(!f){ toast("Fiş fotoğrafı bulunamadı"); return; }
        geriKaydet();
        const b = $("#foto-buyuk");
        b.querySelector("img").src = f;
        b.style.display = "flex";
      }catch(e){ fisBtn.textContent = "🧾"; toast("Fiş yüklenemedi, internete bak"); }
    });
    const btnler = li.querySelectorAll('[aria-label="Ödendi"], [aria-label="Sil"]');
    btnler[0].addEventListener("click", ()=>{
      kokRef().collection("masraflar").doc(m.id).update({odendi: !m.odendi})
        .then(()=> toast(m.odendi ? "Masraf tekrar açıldı" : "Masraf ödendi olarak işaretlendi ✔")).catch(hataGoster);
    });
    btnler[1].addEventListener("click", async ()=>{
      const kopya = {...m}; delete kopya.id;
      /* Fişi silmeden ÖNCE belleğe al ki "GERİ AL" onu da geri getirebilsin */
      let fisYedek = null;
      let fisOkunamadi = false;
      if(m.fisli){
        try{
          const fd = await kokRef().collection("fisler").doc(m.id).get();
          if(fd.exists) fisYedek = fd.data();
        }catch(e){
          /* KRİTİK (0.1.0.7): eskiden bu hata sessizce yutuluyor, fiş YİNE DE
             siliniyordu. Yedek alınamadığı için "GERİ AL" fişi geri getiremiyor,
             fotoğraf KALICI olarak kayboluyordu — kullanıcı bunu fark etmiyordu
             çünkü masraf kaydı geri geliyordu.
             Artık yedek alınamazsa fiş SİLİNMİYOR. */
          fisOkunamadi = true;
          try{ hataKaydet("fisYedek", e); }catch(_){}
        }
        if(fisOkunamadi){
          toast("⚠️ Fiş fotoğrafı okunamadı — masraf silinmedi. İnternetini kontrol et.");
          return;
        }
        kokRef().collection("fisler").doc(m.id).delete().catch(()=>{});
      }
      try{
        await kokRef().collection("masraflar").doc(m.id).delete();
        toastGeriAlVeri("Masraf silindi", "masraflar", m.id, kopya,
                        fisYedek ? {koleksiyon:"fisler", veri:fisYedek} : null);
      }catch(e){ hataGoster(e); }
    });
    ul.appendChild(li);
  });
}

/* ---------- ⏳ Beklenen ödemeler (sözü verilen, henüz eline geçmemiş para) ---------- */
function beklenenDinle(){
  dinleyiciBeklenen = kokRef().collection("beklenenler").onSnapshot(qs=>{
    beklenenler = [];
    qs.forEach(doc=> beklenenler.push({id:doc.id, ...doc.data()}));
    beklenenler.sort((a,b)=> (a.tarih||"") < (b.tarih||"") ? -1 : 1);
    beklenenCiz();
  }, ()=>{
    /* Aynı kritik hata: boş hata callback'i. Bağlantı koptuğunda
       beklenen ödemeler ekranı sessizce donuyor, yeni kayıt görünmüyordu. */
    dinleyiciBeklenen = null;
  });;
}
function beklenenCiz(){
  const ul = $("#liste-beklenen");
  const bugunId = tarihId(new Date());
  /* ⚠️ Ana ekran uyarısı: vadesi geçmiş beklenen ödemeler (söz verilip gelmeyen para).
     Erken çıkıştan ÖNCE yapılıyor — liste boşaldığında uyarının da gizlenmesi gerekiyor,
     yoksa son beklenen kayıt silinse bile ana ekranda hayalet uyarı asılı kalırdı. */
  const uy = $("#beklenen-uyari");
  if(uy){
    const gecikmis = beklenenler.filter(b=> b.tarih && b.tarih < bugunId);
    if(gecikmis.length){
      const tp = gecikmis.reduce((s,b)=> s+(Number(b.tutar)||0), 0);
      uy.innerHTML = "⏳ Sözü verilip gelmeyen <b>"+gecikmis.length+"</b> ödeme var ("+paraFmt(tp)+") — dokun, listeye git ›";
      uy.classList.remove("gizli");
    }else uy.classList.add("gizli");
    bildirimKutusuGuncelle();
  }
  if(!ul) return;
  if(!beklenenler.length){
    ul.innerHTML = '<div class="bos-mesaj" style="padding:10px 4px;font-size:13px">Beklenen ödemen yok 👍</div>';
    return;
  }
  ul.innerHTML = "";
  beklenenler.forEach(b=>{
    const gecikti = b.tarih && b.tarih < bugunId;
    const t = b.tarih ? new Date(b.tarih+"T12:00:00") : null;
    const li = document.createElement("li");
    li.innerHTML =
      '<div class="rozet" style="background:'+(gecikti?"var(--gelmedi)":"var(--mesai)")+'">'+(t?t.getDate():"?")+(t?'<small>'+AYLAR[t.getMonth()].slice(0,3)+'</small>':'')+'</div>'+
      '<div class="orta"><div class="baslik">'+esc(b.not||"Beklenen ödeme")+(gecikti?' <span style="color:var(--gelmedi)">(gecikti)</span>':'')+'</div>'+
      '<div class="alt-yazi">'+paraFmt(b.tutar)+' · '+odemeTurEtiket(b.tur||"avans")+'</div></div>'+
      '<button class="sil" aria-label="Tahsil edildi" style="color:var(--tam)">✔</button>'+
      '<button class="sil" aria-label="Sil">🗑️</button>';
    const btnler = li.querySelectorAll("[aria-label]");
    btnler[0].addEventListener("click", async ()=>{
      /* Tahsil edildi: gerçek bir ödeme kaydına dönüştürülür.

         DÜZELTME (0.0.2.7): burada `aitAy` körü körüne bugünün ayına yazılıyordu.
         Bu, uygulamanın çekirdek FIFO kuralını ATLIYORDU — normal ödeme ekranında
         `enEskiOdenmemisAy()` çalışır ve geçen aydan ödenmemiş bakiyen varsa avans
         ORAYA sayılır, yoksa bulunduğun aya düşer. Beklenen ödemeden tahsil edilen
         para bu kuralın dışında kalıyordu, yani aynı para hangi düğmeyle
         kaydedildiğine göre farklı aya yazılabiliyordu.
         Artık normal akışla birebir aynı: önce en eski ödenmemiş ay sorulur. */
      try{
        const bugun = tarihId(new Date());
        let aitAy = bugun.slice(0,7);
        try{
          const enEski = await enEskiOdenmemisAy();
          if(enEski) aitAy = enEski;
        }catch(e){}   /* FIFO sorgusu başarısız olursa bugünün ayına düş (veri kaybı yok) */
        await kokRef().collection("odemeler").add({
          tarih: bugun, aitAy, tutar: Number(b.tutar)||0,
          tur: b.tur || "avans",
          not: (b.not||"") + " (beklenenden tahsil edildi)",
          olusturma: firebase.firestore.FieldValue.serverTimestamp()
        });
        await kokRef().collection("beklenenler").doc(b.id).delete();
        const [yy,aa] = aitAy.split("-").map(Number);
        toast("💵 Tahsil edildi → "+AYLAR[aa-1]+" "+yy+" hesabına yazıldı ✓");
      }catch(e){ hataGoster(e); }
    });
    btnler[1].addEventListener("click", async ()=>{
      const kopya = {...b}; delete kopya.id;
      try{
        await kokRef().collection("beklenenler").doc(b.id).delete();
        toastGeriAlVeri("Beklenen ödeme silindi", "beklenenler", b.id, kopya);
      }catch(e){ hataGoster(e); }
    });
    ul.appendChild(li);
  });
}

/* ---------- Ekip modu ---------- */
function ekipDinle(){
  dinleyiciEkip = kokRef().collection("ekip").onSnapshot(qs=>{
    ekipListe = [];
    qs.forEach(d=> ekipListe.push({id:d.id, ...d.data()}));
    ekipListe.sort((a,b)=> String(a.ad).localeCompare(String(b.ad),"tr"));
    isciListeCiz();
    ekipYoklamaCiz();
  }, hataGoster);
}

function isciListeCiz(){
  const ul = $("#liste-isciler");
  if(!ul) return;
  if(!ekipListe.length){ ul.innerHTML = ""; return; }
  ul.innerHTML = "";
  ekipListe.forEach(i=>{
    const li = document.createElement("li");
    li.innerHTML =
      '<div class="rozet" style="background:var(--mesai)">'+esc(trBuyuk(String(i.ad||"?").charAt(0)))+'</div>'+
      '<div class="orta"><div class="baslik">'+esc(i.ad)+'</div>'+
      '<div class="alt-yazi">Yevmiye '+paraFmt(i.yevmiye)+' · Mesai '+paraFmt(i.mesaiUcret)+'/saat</div></div>'+
      '<button class="sil" aria-label="Sil">🗑️</button>';
    li.querySelector(".orta").style.cursor = "pointer";
    li.querySelector(".orta").addEventListener("click", ()=>{
      duzenlenenIsciId = i.id;
      $("#isci-ad").value = i.ad;
      $("#isci-yevmiye").value = i.yevmiye;
      $("#isci-mesai").value = i.mesaiUcret;
      $("#btn-isci-ekle").textContent = "✏️ İşçiyi güncelle";
      toast("Düzenleme modu: ücreti değiştir, güncelle'ye bas");
    });
    li.querySelector(".sil").addEventListener("click", ()=>{
      if(confirm(i.ad+" ekipten silinsin mi? (Geçmiş gün kayıtları durur, hesabı bozulmaz)"))
        kokRef().collection("ekip").doc(i.id).delete().then(()=>toast("İşçi silindi")).catch(hataGoster);
    });
    ul.appendChild(li);
  });
}

/* TOPLU YOKLAMA İŞARETLEME (0.1.1.2)
   Ustabaşı her gün 8-10 kişiyi tek tek işaretliyordu. Çoğu gün herkes
   tam çalışıyor — tek dokunuşla hepsini işaretleyip yalnızca eksikleri
   düzeltmek çok daha hızlı.
   Kaydetmiyor, sadece ekrandaki seçimi dolduruyor: kullanıcı düzeltme
   yapıp "Yoklamayı kaydet"e basana kadar hiçbir şey yazılmıyor. */
function yoklamaTopluIsaretle(durum){
  if(!ekipListe.length) return;
  ekipListe.forEach(i=>{
    const mevcut = yoklama[i.id] || {};
    yoklama[i.id] = { durum: durum, mesai: Number(mevcut.mesai)||0 };
  });
  ekipYoklamaCiz();
  titret(12);
  toast(durum==="yok" ? "Yoklama temizlendi ↺"
      : durum==="tam" ? "Hepsi tam işaretlendi ✅ — eksikleri düzelt, sonra kaydet"
      : "Hepsi yarım işaretlendi 🌗 — eksikleri düzelt, sonra kaydet");
}

function ekipYoklamaCiz(){
  const kap = $("#ekip-yoklama");
  if(!kap) return;
  if(!ekipListe.length){
    kap.innerHTML = '<div class="bos-mesaj">Önce aşağıdan işçi ekle 👇</div>';
    $("#btn-yoklama-kaydet").classList.add("gizli");
    const tk = $("#yoklama-toplu");
    if(tk) tk.classList.add("gizli");
    return;
  }
  $("#btn-yoklama-kaydet").classList.remove("gizli");
  /* Toplu işaretleme yalnızca işçi varken anlamlı */
  const topluKap = $("#yoklama-toplu");
  if(topluKap) topluKap.classList.remove("gizli");
  kap.innerHTML = "";
  ekipListe.forEach(i=>{
    const y = yoklama[i.id] || {durum:"yok", mesai:0};
    const sat = document.createElement("div");
    /* TEK SATIR. Bir önceki sürümde iki kata bölünmüştü (düğmeler 44px
       olsun diye) ama bu, ekip listesini iki katına çıkarıp ekranı
       şişirdi — kullanıcılardan "her şey kocaman" şikayeti geldi.
       Düğmeler 38px'e döndü, satır tek kata indi. 38px, WCAG'ın asgari
       24px sınırının fazlasıyla üstünde; ideal 44 değil ama sahadaki
       tercih yoğunluktan yana. */
    sat.className = "yok-satir";
    sat.innerHTML =
      '<div class="yok-ad">'+esc(i.ad)+'</div>'+
      '<div class="yok-kontrol">'+
      '<div style="display:flex;gap:6px">'+
        ['tam|T','yarim|Y','yok|0'].map(x=>{
          const [d,et]=x.split("|");
          const aktif = y.durum===d;
          const renk = d==="tam"?"var(--tam)":d==="yarim"?"var(--yarim)":"var(--gelmedi)";
          /* Boyut/görünüm artık CSS'te (.yok-btn) — burada yalnızca duruma
             göre değişen renk kalıyor. Düğme 38→44px büyütüldü: bu ekran her
             gün kullanılıyor ve tozlu/eldivenli parmakla 38px küçük kalıyordu. */
          return '<button class="yok-btn'+(aktif?' aktif':'')+'" data-isc="'+i.id+'" data-d="'+d+'"'+
            (aktif?' style="border-color:'+renk+';background:'+renk+'"':'')+'>'+et+'</button>';
        }).join("")+
      '</div>'+
      '<label class="yok-mesai-sar"><span>mesai</span>'+
        '<input type="text" class="yok-mesai" data-isc="'+i.id+'" value="'+(y.mesai||0)+'" min="0" step="0.5" inputmode="decimal" title="Mesai saat">'+
      '</label>'+
      '</div>';
    kap.appendChild(sat);
  });
  $(".yok-btn").forEach(b=>{
    b.addEventListener("click", ()=>{
      const id = b.dataset.isc;
      if(!yoklama[id]) yoklama[id] = {durum:"yok", mesai:0};
      yoklama[id].durum = b.dataset.d;
      const mesaiEl = document.querySelector('.yok-mesai[data-isc="'+id+'"]');
      if(mesaiEl) yoklama[id].mesai = sayi(mesaiEl.value)||0;
      ekipYoklamaCiz();
    });
  });
  $(".yok-mesai").forEach(inp=>{
    inp.addEventListener("input", ()=>{
      const id = inp.dataset.isc;
      if(!yoklama[id]) yoklama[id] = {durum:"yok", mesai:0};
      yoklama[id].mesai = sayi(inp.value)||0;
    });
  });
}

async function ekipYoklamaYukle(){
  const inp = $("#ekip-tarih");
  if(!inp) return;
  if(!inp.value) inp.value = tarihId(new Date());
  try{
    const qs = await kokRef().collection("ekipGun").where("tarih","==",inp.value).get();
    yoklama = {};
    qs.forEach(d=>{ const v=d.data(); yoklama[v.iscId] = {durum:v.durum, mesai:Number(v.mesai)||0}; });
  }catch(e){ hataGoster(e); }
  ekipYoklamaCiz();
}

async function ekipOzetYukle(){
  const ul = $("#liste-ekip-ozet");
  if(!ul) return;
  const bas = aktifYil+"-"+pad(aktifAy+1)+"-01";
  const son = aktifYil+"-"+pad(aktifAy+1)+"-31";
  try{
    const qs = await kokRef().collection("ekipGun")
      .where("tarih",">=",bas).where("tarih","<=",son).get();
    const grup = {};
    qs.forEach(d=>{
      const v = d.data();
      if(!grup[v.iscId]) grup[v.iscId] = {gun:0, mesai:0, hak:0, gunler:[]};
      const g = grup[v.iscId];
      const yev = Number(v.uYevmiye)||0, mesU = Number(v.uMesai)||0;
      if(v.durum==="tam"){ g.gun+=1; g.hak+=yev; }
      else if(v.durum==="yarim"){ g.gun+=0.5; g.hak+=yev/2; }
      /* Ekip yoklamasında mesai (0.1.1.0): yoklama kaydı hâlâ SAAT
         tutuyor (`yok-mesai` alanı saat girişi). Bu ekran kendi içinde
         tutarlı — ustabaşı ekip için saat giriyor, kendi puantajı için
         yevmiye katı. İkisi ayrı akış olduğu için karışmıyor.
         Yine de yeni alan gelirse diye ikisi de okunuyor. */
      const mYev = Number(v.mesaiYev)||0;
      const m = mYev > 0 ? 0 : (Number(v.mesai)||0);
      g.mesai += m;
      g.mesaiYev = (g.mesaiYev||0) + mYev;
      g.hak += mYev > 0 ? mYev*yev : m*mesU;
      if(v.durum!=="yok" || m>0 || mYev>0) g.gunler.push(Number(v.tarih.slice(8,10)));
    });
    const idler = Object.keys(grup);
    ekipOzetSon = {grup, idler};
    if(!idler.length){
      ul.innerHTML = '<div class="bos-mesaj">Bu ay ekip kaydı yok. Yukarıdan yoklama al 👆</div>';
      return;
    }
    ul.innerHTML = "";
    /* 🏆 Ayın lideri: en çok gün çalışan ekip üyesini üstte vurgula (2+ kişi varsa anlamlı) */
    if(idler.length>1){
      let liderId = idler[0];
      idler.forEach(id=>{ if(grup[id].gun > grup[liderId].gun) liderId = id; });
      const liderIsc = ekipListe.find(x=>x.id===liderId);
      if(liderIsc && grup[liderId].gun>0){
        const liderLi = document.createElement("li");
        liderLi.style.cssText = "background:var(--vurgu-zemin);border-radius:12px;margin-bottom:6px";
        liderLi.innerHTML =
          '<div class="rozet" style="background:var(--sari);color:#1a1200">🏆</div>'+
          '<div class="orta"><div class="baslik">Ayın lideri: '+esc(liderIsc.ad)+'</div>'+
          '<div class="alt-yazi">'+grup[liderId].gun+' gün ile ekipte en çok çalışan</div></div>';
        ul.appendChild(liderLi);
      }
    }
    idler.forEach(id=>{
      const isc = ekipListe.find(x=>x.id===id) || {ad:"(silinmiş işçi)"};
      const g = grup[id];
      g.gunler.sort((a,b)=>a-b);
      const li = document.createElement("li");
      li.innerHTML =
        '<div class="rozet" style="background:var(--asfalt2)">'+esc(trBuyuk(String(isc.ad||"?").charAt(0)))+'</div>'+
        '<div class="orta"><div class="baslik">'+esc(isc.ad)+'</div>'+
        '<div class="alt-yazi">'+g.gun+' gün · '+mesaiOzetMetni(g.mesai||0, g.mesaiYev||0)+'</div></div>'+
        '<div class="tutar">'+paraFmt(g.hak)+'</div>'+
        '<button class="sil" aria-label="Paylaş" style="color:var(--mesai)">📤</button>';
      li.querySelector(".sil").addEventListener("click", async ()=>{
        const metin = "📋 *"+isc.ad+" — "+AYLAR[aktifAy]+" "+aktifYil+"*\n"+
          "✅ "+g.gun+" gün · ⏱ "+g.mesai+" saat mesai\n"+
          "📅 Çalıştığı günler: "+g.gunler.join(", ")+"\n"+
          "💰 Hakediş: "+paraFmt(g.hak);
        try{
          if(navigator.share) await navigator.share({text:metin});
          else{ await navigator.clipboard.writeText(metin); toast("Kopyalandı 📋"); }
        }catch(e){}
      });
      ul.appendChild(li);
    });
    /* Ay toplam maliyeti */
    const toplamM = idler.reduce((s,id)=> s+grup[id].hak, 0);
    const tli = document.createElement("li");
    tli.innerHTML = '<div class="orta"><div class="baslik">TOPLAM EKİP MALİYETİ</div></div>'+
      '<div class="tutar" style="color:var(--sari)">'+paraFmt(toplamM)+'</div>';
    ul.appendChild(tli);
  }catch(e){ hataGoster(e); }
}

/* ---------- Herkes sayfası (salt okunur) ---------- */
async function kisilerYukle(){
  const kap = $("#kisiler-liste");
  kap.innerHTML = '<div class="bos-mesaj" style="width:100%">Yükleniyor...</div>';
  try{
    const qs = await db.collection("kullanicilar").get();
    kap.innerHTML = "";
    let sayi = 0;
    qs.forEach(doc=>{
      const d = doc.data()||{};
      const ad = (d.ad||"").trim() || "İsimsiz kullanıcı";
      const ben = doc.id===kullanici.uid;
      const b = document.createElement("button");
      b.className = "eksik-cip kisi-cip";
      b.dataset.ad = trKucuk(ad);
      b.textContent = "👤 " + ad + (ben ? " (sen)" : "");
      if(ben) b.style.borderColor = "var(--sari)";
      b.addEventListener("click", ()=> kisiSec(doc.id, ad));
      kap.appendChild(b);
      sayi++;
    });
    if(!sayi) kap.innerHTML = '<div class="bos-mesaj" style="width:100%">Henüz kimse yok.</div>';
  }catch(e){
    kap.innerHTML = '<div class="bos-mesaj" style="width:100%">Liste alınamadı. Firestore kurallarını yeni <b>firestore.rules</b> ile güncellemen gerekiyor (zip\'te).</div>';
    hataGoster(e);
  }
}

async function kisiSec(uid, ad){
  seciliKisi = {uid, ad};
  try{ history.replaceState(null, "", "#kisi="+uid); }catch(e){}
  $("#kisi-baslik").firstChild.textContent = "👤 " + ad + " ";
  $("#kisi-detay").classList.remove("gizli");
  try{
    const doc = await db.collection("kullanicilar").doc(uid).get();
    kisiAyarlar = doc.data()||{};
  }catch(e){ kisiAyarlar = {}; }
  kisiVeriYukle();
}

function kisiKazanc(v){
  if(!v) return 0;
  const ka = kisiAyarlar||{};
  let yev = Number(ka.yevmiye)||0, mes = Number(ka.mesaiUcret)||0,
      ek = Number(ka.ekGunluk)||0, sa = Number(ka.saatUcret)||0;
  if(v.santiyeId && Array.isArray(ka.santiyeler)){
    const s = ka.santiyeler.find(x=>x.id===v.santiyeId);
    if(s){ yev = Number(s.yevmiye)||yev; mes = Number(s.mesaiUcret)||mes; }
  }
  if(v.uYevmiye!=null) yev = Number(v.uYevmiye)||yev;
  if(v.uMesai!=null)   mes = Number(v.uMesai)||mes;
  if(v.uEk!=null)      ek  = Number(v.uEk)||0;
  if(v.uSaatU!=null)   sa  = Number(v.uSaatU)||sa;
  /* KRİTİK DÜZELTME (0.1.1.0)
     Bu fonksiyon BAŞKASININ puantajına bakarken kullanılıyor (Kişiler /
     Herkes ekranı, ekip özeti). 0.0.9.5'te mesai saatten yevmiye katına
     geçirildi ancak burası güncellenmemişti — yalnızca eski `mesai`
     (saat) alanını okuyordu.
     Sonuç: yeni sistemle girilen mesai HİÇ SAYILMIYORDU. Bir "XX mesai"
     gününde 5.000 ₺ eksik görünüyordu. Ustabaşı ekibinin puantajına
     bakarken herkesin parasını eksik görüyordu. */
  const mYev = Number(v.mesaiYev)||0;
  const m    = mYev > 0 ? 0 : (Number(v.mesai)||0);
  let k = mYev > 0 ? mYev*(yev + ek) : m*mes;
  if(v.durum==="tam") k += yev + ek;
  else if(v.durum==="yarim") k += (yev + ek)/2;
  else if(v.durum==="saatlik"){ const st = Number(v.saat)||0; k += st*sa + (st>0?ek:0); }
  k += (Number(v.arti)||0) * (yev + ek);
  k += (Number(v.parcaMiktar)||0) * (v.uParcaFiyat!=null ? Number(v.uParcaFiyat) : (Number(ka.parcaFiyat)||0));
  /* Gece mesaisi de yevmiye katına geçti (0.0.9.5) */
  const gYev = Number(v.geceYev)||0;
  const geceOran = v.uGeceUcret!=null ? Number(v.uGeceUcret) : mes*(1+(Number(ka.geceZam)||0)/100);
  k += gYev > 0 ? gYev*(yev + ek) : (Number(v.geceMesai)||0) * geceOran;
  return k;
}

async function kisiVeriYukle(){
  if(!seciliKisi) return;
  const ref = db.collection("kullanicilar").doc(seciliKisi.uid);
  const bas = aktifYil + "-" + pad(aktifAy+1) + "-01";
  const son = aktifYil + "-" + pad(aktifAy+1) + "-31";
  $("#kisi-ozet").innerHTML = '<div class="bos-mesaj" style="grid-column:1/-1">Yükleniyor...</div>';
  iskeletGoster($("#kisi-gunler"), 4);
  try{
    /* 0.0.5.1: Başkasının ÖDEMELERİ artık güvenlik kurallarıyla kapalı
       (avans tutarları ve notları kişisel bilgi). Kendi profiline
       bakıyorsan okunuyor, başkasınınkinde izin reddi geliyor.
       Bu yüzden ödeme okuması Promise.all'dan ÇIKARILDI: eskiden tek bir
       izin reddi tüm kişi detayını çökertiyordu — puantaj bile
       görünmüyordu. Artık ayrı ve hata toleranslı. */
    /* Ödemeler bilinçli olarak herkese açık (uygulama sahibinin kararı).
       Yine de okuma AYRI tutuluyor ve hata toleranslı: eskiden girdiler ve
       ödemeler tek Promise.all içindeydi ve ödeme okumasında herhangi bir
       sorun (izin, ağ, kota) çıkarsa TÜM kişi detayı çöküyor, puantaj bile
       görünmüyordu. Artık ödeme okunamasa da puantaj görünmeye devam eder. */
    const kendisiMi = seciliKisi.uid === kullanici.uid;
    const gSnap = await ref.collection("girdiler")
        .where(firebase.firestore.FieldPath.documentId(), ">=", bas)
        .where(firebase.firestore.FieldPath.documentId(), "<=", son).get();
    let oSnap = null;
    try{ oSnap = await ref.collection("odemeler").get(); }catch(e){ oSnap = null; }
    let gun=0, mesai=0, mesaiYevT=0, hak=0;
    const gunUl = $("#kisi-gunler"); gunUl.innerHTML = "";
    const kayitlar = [];
    gSnap.forEach(doc=> kayitlar.push({id:doc.id, ...doc.data()}));
    kayitlar.sort((a,b)=> a.id<b.id?1:-1);
    kayitlar.forEach(v=>{
      gun += girdiGun(v);
      /* İki birim ayrı toplanmalı (0.1.1.0): yeni kayıtlar yevmiye katı,
         eskiler saat. Aynı toplamda birleştirilirse anlamsız çıkar. */
      mesai += mesaiSaatMik(v);
      mesaiYevT += mesaiYevMik(v);
      hak += kisiKazanc(v);
      const t = new Date(v.id+"T12:00:00");
      const li = document.createElement("li");
      li.innerHTML =
        '<div class="rozet" style="background:'+durumRenk(v.durum)+'">'+t.getDate()+'<small>'+AYLAR[t.getMonth()].slice(0,3)+'</small></div>'+
        '<div class="orta"><div class="baslik">'+GUNLER[t.getDay()]+' · '+girisEtiket(v)+
        /* Mesai gösterimi (0.1.1.0): yeni kayıt yevmiye katı (X, /, XX),
           eski kayıt saat. Eskiden yalnızca saat okunuyordu ve yeni
           sistemle girilen mesai HİÇ GÖRÜNMÜYORDU. */
        (function(){
          const mY = Number(v.mesaiYev)||0;
          if(mY > 0){
            const tam = Math.floor(mY), buc = (mY-tam) >= 0.5;
            const isr = (tam <= 3 ? "X".repeat(tam) : tam+"X") + (buc ? "/" : "");
            return " · +"+(isr || "/")+" mesai";
          }
          return Number(v.mesai)>0 ? " · +"+String(v.mesai).replace(".",",")+" saat mesai" : "";
        })()+'</div>'+
        '<div class="alt-yazi">'+esc([v.santiye, v.not].filter(Boolean).join(" — ")||"—")+'</div></div>'+
        '<div class="tutar">'+paraFmt(kisiKazanc(v))+'</div>';
      gunUl.appendChild(li);
    });
    if(!kayitlar.length) gunUl.innerHTML = '<div class="bos-mesaj">Bu ay kaydı yok.</div>';
    let alinan = 0;
    const odUl = $("#kisi-odemeler"); odUl.innerHTML = "";
    if(!oSnap){
      odUl.innerHTML = '<div class="bos-mesaj" style="padding:14px 10px;font-size:12.5px">'+
        'Ödeme kayıtları okunamadı (bağlantı veya izin). Puantaj yukarıda.</div>';
    }
    const buAy = aktifYil + "-" + pad(aktifAy+1);
    const odListe = [];
    /* oSnap yalnızca KENDİ profiline bakarken dolu gelir; başkasınınkinde
       null olur (ödemeler artık kişisel). null'da forEach çağırmak
       çökertirdi — koruma eklendi. */
    if(oSnap) oSnap.forEach(doc=>{
      const d = doc.data();
      if(odemeAyi(d) === buAy) odListe.push(d);
    });
    odListe.sort((a,b)=> a.tarih<b.tarih?1:-1);
    odListe.forEach(o=>{
      alinan += Number(o.tutar)||0;
      const t = new Date(o.tarih+"T12:00:00");
      const li = document.createElement("li");
      li.innerHTML =
        '<div class="rozet" style="background:'+odemeTurRenk(o.tur)+(o.tur==="avans" ? ";color:#111" : "")+'">'+t.getDate()+'<small>'+AYLAR[t.getMonth()].slice(0,3)+'</small></div>'+
        '<div class="orta"><div class="baslik">'+odemeTurEtiket(o.tur)+'</div>'+
        '<div class="alt-yazi">'+esc(o.not||"—")+'</div></div>'+
        '<div class="tutar">'+paraFmt(o.tutar)+'</div>';
      odUl.appendChild(li);
    });
    if(!odListe.length) odUl.innerHTML = '<div class="bos-mesaj">Bu ay para girişi yok.</div>';
    $("#kisi-ozet").innerHTML =
      '<div class="ozet-kut tam-r"><div class="et">Gün</div><div class="deger">'+gun+'</div></div>'+
      '<div class="ozet-kut mesai-r"><div class="et">Mesai</div><div class="deger">'+
        (mesaiYevT > 0 ? String(mesaiYevT).replace(".",",")+" yev" : mesai+" saat")+'</div></div>'+
      '<div class="ozet-kut vurgu"><div class="et">Hakediş</div><div class="deger">'+paraFmt(hak)+'</div></div>'+
      '<div class="ozet-kut"><div class="et">Alınan</div><div class="deger">'+paraFmt(alinan)+'</div></div>'+
      '<div class="ozet-kut '+(hak-alinan>=0?'vurgu':'eksi')+'" style="grid-column:1/-1"><div class="et">Kalan</div><div class="deger">'+paraFmt(hak-alinan)+'</div></div>';
    /* Seninle kıyas */
    const kEl = $("#kisi-kiyas");
    if(kEl){
      if(seciliKisi.uid !== kullanici.uid){
        const ben = hesapla();
        const fark = ben.gunSayisi - gun;
        kEl.innerHTML = "⚖️ Sen bu ay <b>"+ben.gunSayisi+" gün</b>, o <b>"+gun+" gün</b> — "+
          (fark>0 ? "<b style='color:var(--tam)'>"+fark+" gün öndesin</b> 💪" :
           fark<0 ? "<b style='color:var(--gelmedi)'>"+Math.abs(fark)+" gün gerideysin</b>, gaza bas 🔥" :
           "berabersiniz 🤝");
      }else kEl.textContent = "";
    }
  }catch(e){
    $("#kisi-ozet").innerHTML = '<div class="bos-mesaj" style="grid-column:1/-1">Veri okunamadı — firestore.rules güncel mi?</div>';
    hataGoster(e);
  }
}

/* ---------- Dinamik not çipleri ---------- */
function notCipCiz(){
  const kap = $("#not-cipler");
  if(!kap) return;
  kap.innerHTML = "";
  (ayarlar.notCipler||[]).forEach(m=>{
    const b = document.createElement("button");
    b.className = "eksik-cip";
    b.style.cssText = "font-size:12px;padding:7px 10px";
    b.textContent = m;
    b.addEventListener("click", ()=>{
      const ta = $("#gun-not");
      ta.value = ta.value ? ta.value + ", " + m : m;
    });
    kap.appendChild(b);
  });
}

/* ---------- Liderlik tablosu (bu ayın çalışkanları) ---------- */
let liderOnbellek = null;  /* {anahtar, zaman, sonuclar} — pahalı N-kişi sorgusunu 5 dk önbelleğe al */
async function liderYukle(zorla){
  const ul = $("#lider-liste");
  const anahtar = aktifYil+"-"+pad(aktifAy+1);
  if(!zorla && liderOnbellek && liderOnbellek.anahtar===anahtar && (Date.now()-liderOnbellek.zaman < 5*60*1000)){
    liderCiz(liderOnbellek.sonuclar);
    return;
  }
  iskeletGoster(ul, 5);
  try{
    const bas = aktifYil+"-"+pad(aktifAy+1)+"-01";
    const son = aktifYil+"-"+pad(aktifAy+1)+"-31";
    const kSnap = await db.collection("kullanicilar").limit(25).get();
    const kisiler = [];
    kSnap.forEach(d=> kisiler.push({uid:d.id, ad:(d.data().ad||"").trim()||"İsimsiz"}));
    const sonuclar = await Promise.all(kisiler.map(async k=>{
      try{
        const qs = await db.collection("kullanicilar").doc(k.uid).collection("girdiler")
          .where(firebase.firestore.FieldPath.documentId(), ">=", bas)
          .where(firebase.firestore.FieldPath.documentId(), "<=", son).get();
        let gun=0, mesai=0;
        qs.forEach(doc=>{ const v=doc.data(); gun+=girdiGun(v); mesai+=Number(v.mesai)||0; });
        return {...k, gun, mesai};
      }catch(e){ return {...k, gun:0, mesai:0}; }
    }));
    sonuclar.sort((a,b)=> b.gun - a.gun || b.mesai - a.mesai);
    liderOnbellek = {anahtar, zaman: Date.now(), sonuclar};
    liderCiz(sonuclar);
  }catch(e){ ul.innerHTML=""; hataGoster(e); }
}
function liderCiz(sonuclar){
  const ul = $("#lider-liste");
  ul.innerHTML = "";
  const madalya = ["🥇","🥈","🥉"];
  sonuclar.filter(s=> s.gun>0 || s.mesai>0).forEach((s,i)=>{
    const li = document.createElement("li");
    li.innerHTML =
      '<div class="rozet" style="background:'+(i<3?"var(--sari)":"var(--asfalt2)")+';color:'+(i<3?"#111":"#fff")+'">'+(madalya[i]||("#"+(i+1)))+'</div>'+
      '<div class="orta"><div class="baslik">'+esc(s.ad)+(s.uid===kullanici.uid?" (sen)":"")+'</div>'+
      '<div class="alt-yazi">'+s.gun+' gün · '+s.mesai+' saat mesai</div></div>';
    ul.appendChild(li);
  });
  if(!ul.children.length) ul.innerHTML = '<div class="bos-mesaj">Bu ay kimse gün işlememiş 🤷</div>';
}

/* ---------- Görsel (PNG) patron raporu — 1. resim: özet çizelge ---------- */
function pngOzetBlobOlustur(gBas, gSon){
  const t = hesaplaAralik(gBas, gSon);
  const gunler = t.gSon - t.gBas + 1;
  const masrafSatiriVar = t.masrafToplam > 0;
  const W = 820, satirY = 34, ustH = 130, altH = 150 + (masrafSatiriVar ? 34 : 0);
  const H = ustH + (gunler+1)*satirY + altH;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  const koyu = "#17181C", sari = "#FFC400";
  c.fillStyle = "#FFFFFF"; c.fillRect(0,0,W,H);
  c.fillStyle = koyu; c.fillRect(0,0,W,86);
  c.fillStyle = sari; c.fillRect(0,86,W,8);
  c.fillStyle = sari; c.font = "bold 30px Arial";
  c.fillText("PUANTAJ — "+trBuyuk(AYLAR[aktifAy])+" "+aktifYil+t.etiket, 24, 42);
  c.fillStyle = "#DDD"; c.font = "16px Arial";
  c.fillText("👷 "+((kullanici&&kullanici.displayName)||""), 24, 70);
  /* başlık satırı */
  const kolX = [24, 330, 480, 620, 740];
  c.fillStyle = "#555"; c.font = "bold 15px Arial";
  /* Sütun başlığı "YEVMİYE" idi ama altındaki hücrelerde artık "Tam/Yarım"
     yazıyor — başlıkla içerik uyumsuzdu. "DURUM" daha doğru. */
  ["TARİH","YEVMİYE","ARTI","MESAİ"].forEach((k,i)=> c.fillText(k, kolX[i], ustH-8));
  c.strokeStyle = "#CCC";
  for(let g=t.gBas; g<=t.gSon; g++){
    const i = g - t.gBas;
    const y = ustH + i*satirY;
    const d = new Date(aktifYil, aktifAy, g);
    if(d.getDay()===0){ c.fillStyle="#F2F2F2"; c.fillRect(0,y,W,satirY); }
    else if(i%2){ c.fillStyle="#FAFAFA"; c.fillRect(0,y,W,satirY); }
    const isr = gunIsaret(girdiler[aktifYil+"-"+pad(aktifAy+1)+"-"+pad(g)]);
    c.fillStyle = d.getDay()===0 ? "#999" : "#222";
    c.font = "15px Arial";
    c.fillText(pad(g)+" / "+pad(aktifAy+1)+" — "+GUNLER[d.getDay()], kolX[0], y+23);
    c.font = "bold 17px Arial";
    c.fillText(isr.yev, kolX[1]+20, y+23);
    c.fillText(isr.arti, kolX[2]+8, y+23);
    c.fillText(isr.mesai, kolX[3]+8, y+23);
    c.beginPath(); c.moveTo(0,y+satirY); c.lineTo(W,y+satirY); c.stroke();
  }
  /* alt özet */
  const oy = ustH + gunler*satirY + 16;
  c.fillStyle = "#FFF7DC"; c.fillRect(0, oy, W, altH-26);
  c.fillStyle = "#222"; c.font = "bold 17px Arial";
  c.fillText("✅ "+t.gunSayisi+" gün · ⏱ "+t.mesaiToplam+" saat mesai"+(t.artiToplam>0?" · ➕ "+t.artiToplam+" artı":""), 24, oy+30);
  c.fillText("💰 Hakediş: "+paraFmt(t.hakedis)+"    💵 Alınan: "+paraFmt(t.alinan), 24, oy+62);
  if(masrafSatiriVar){
    c.fillStyle = "#7A5C00";
    c.fillText("🧾 Masraf alacağı: "+paraFmt(t.masrafToplam), 24, oy+90);
  }
  c.fillStyle = "#B3261E"; c.font = "bold 20px Arial";
  c.fillText("KALAN: "+paraFmt(t.kalan), 24, oy+(masrafSatiriVar ? 128 : 96));
  c.fillStyle = "#999"; c.font = "12px Arial";
  c.fillText("Puantaj Defterim ile hazırlandı", W-220, H-14);
  return new Promise(resolve=> cv.toBlob(b=> resolve(b), "image/png"));
}

/* ---------- Görsel (PNG) patron raporu — 2. resim: alınan avanslar, TARİH TARİH ----------
   Boş dönemde (hiç ödeme yoksa) null döner — o zaman ikinci resim hiç eklenmez. */
function pngAvansBlobOlustur(gBas, gSon){
  const t = hesaplaAralik(gBas, gSon);
  const donemOdeme = donemOdemeSec(t.bId, t.sId).sort((a,b)=> a.tarih<b.tarih?-1:1);
  if(!donemOdeme.length) return Promise.resolve(null);
  const W = 820, satirY = 40, ustH = 110, altH = 70;
  const H = ustH + donemOdeme.length*satirY + altH;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  const koyu = "#17181C", sari = "#FFC400";
  c.fillStyle = "#FFFFFF"; c.fillRect(0,0,W,H);
  c.fillStyle = koyu; c.fillRect(0,0,W,86);
  c.fillStyle = sari; c.fillRect(0,86,W,8);
  c.fillStyle = sari; c.font = "bold 26px Arial";
  c.fillText("ALINAN AVANSLAR — "+trBuyuk(AYLAR[aktifAy])+" "+aktifYil+t.etiket, 24, 42);
  c.fillStyle = "#DDD"; c.font = "16px Arial";
  c.fillText("👷 "+((kullanici&&kullanici.displayName)||""), 24, 70);
  /* başlık satırı */
  const kolX = [24, 300, 700];
  c.fillStyle = "#555"; c.font = "bold 15px Arial";
  ["TARİH","NOT","TUTAR"].forEach((k,i)=> c.fillText(k, kolX[i], ustH-8));
  c.strokeStyle = "#CCC";
  donemOdeme.forEach((o,i)=>{
    const y = ustH + i*satirY;
    if(i%2){ c.fillStyle="#FAFAFA"; c.fillRect(0,y,W,satirY); }
    const d2 = new Date(o.tarih+"T12:00:00");
    c.fillStyle = "#222"; c.font = "16px Arial";
    c.fillText(pad(d2.getDate())+" / "+pad(d2.getMonth()+1)+" / "+d2.getFullYear()+" — "+GUNLER[d2.getDay()], kolX[0], y+25);
    c.fillStyle = "#555"; c.font = "14px Arial";
    let notMetin = o.not || (o.tur==="avans"?"Avans":o.tur==="hakedis"?"Hakediş ödemesi":o.tur==="kesinti"?"Kesinti":"Ödeme");
    if(notMetin.length>36) notMetin = notMetin.slice(0,35)+"…";
    c.fillText(notMetin, kolX[1], y+25);
    c.fillStyle = "#B3261E"; c.font = "bold 17px Arial";
    c.fillText(paraFmt(o.tutar), kolX[2], y+25);
    c.beginPath(); c.moveTo(0,y+satirY); c.lineTo(W,y+satirY); c.stroke();
  });
  const oy = ustH + donemOdeme.length*satirY + 14;
  c.fillStyle = "#FFF7DC"; c.fillRect(0, oy, W, altH-20);
  c.fillStyle = "#222"; c.font = "bold 19px Arial";
  const toplam = donemOdeme.reduce((s,o)=> s+(Number(o.tutar)||0), 0);
  c.fillText("TOPLAM ("+donemOdeme.length+" işlem): "+paraFmt(toplam), 24, oy+30);
  c.fillStyle = "#999"; c.font = "12px Arial";
  c.fillText("Puantaj Defterim ile hazırlandı", W-220, H-14);
  return new Promise(resolve=> cv.toBlob(b=> resolve(b), "image/png"));
}

/* ---------- İkisini birden TEK paylaşımda gönderir (varsa avans resmi 2. sırada) ---------- */
async function gorselPaylas(gBas, gSon){
  const ozetBlob = await pngOzetBlobOlustur(gBas, gSon);
  if(!ozetBlob){ toast("Görsel oluşturulamadı"); return; }
  const avansBlob = await pngAvansBlobOlustur(gBas, gSon);
  const onEk = "puantaj-"+aktifYil+"-"+pad(aktifAy+1);
  const dosyalar = [ new File([ozetBlob], onEk+".png", {type:"image/png"}) ];
  if(avansBlob) dosyalar.push(new File([avansBlob], onEk+"-avanslar.png", {type:"image/png"}));
  try{
    if(navigator.canShare && navigator.canShare({files:dosyalar})){
      await navigator.share({files:dosyalar});
      return;
    }
  }catch(e){ if(e && e.name==="AbortError") return; }
  /* Çoklu dosya paylaşımı desteklenmiyor/başarısız oldu — hepsini teker teker indir */
  dosyalar.forEach((dosya, i)=>{
    setTimeout(()=>{
      const url = URL.createObjectURL(dosya);
      const a = document.createElement("a");
      a.href = url; a.download = dosya.name;
      document.body.appendChild(a); a.click();
      setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
    }, i*400);
  });
  toast(dosyalar.length>1 ? "Görseller indirildi 🖼️ Galerinden paylaşabilirsin" : "Görsel indirildi 🖼️ Galerinden paylaşabilirsin");
}

/* ---------- Mesai kronometresi ---------- */
let kronoZamanlayici = null;
function kronoYaz(){
  let bas = 0;
  try{ bas = Number(localStorage.getItem("kronoBas"))||0; }catch(e){}
  const el = $("#krono-yazi"), btn = $("#btn-krono");
  if(!el) return;
  if(!bas){
    el.textContent = "00:00:00";
    btn.textContent = "▶ Başlat";
    if(kronoZamanlayici){ clearInterval(kronoZamanlayici); kronoZamanlayici = null; }
    return;
  }
  btn.textContent = "⏹ Bitir";
  const s = Math.floor((Date.now()-bas)/1000);
  el.textContent = pad(Math.floor(s/3600))+":"+pad(Math.floor(s/60)%60)+":"+pad(s%60);
  if(!kronoZamanlayici) kronoZamanlayici = setInterval(kronoYaz, 1000);
}
async function kronoDurdur(bas){
  const saat = Math.max(0.5, Math.round(((Date.now()-bas)/3600000)*2)/2);
  const id = tarihId(new Date());
  /* KRİTİK DÜZELTME — çalışılan saatler geri dönüşsüz kaybolabiliyordu.
     Eskiden sıra şöyleydi: (1) localStorage'daki kronometre SİLİNİR,
     (2) kullanıcıya "eklensin mi?" diye sorulur, (3) ay kilidi kontrol edilir.
     Yani kullanıcı yanlışlıkla "İptal"e bassa YA DA ay kilitli olsa, kronometre
     çoktan silinmiş oluyordu — 5 saat mesai tutmuşsan hepsi yok oluyordu, geri
     getirmenin hiçbir yolu yoktu ve kaç saat olduğunu da bir daha göremiyordun.
     Artık önce kilit kontrolü + onay alınıyor, kronometre ancak kayıt yapılacağı
     kesinleşince siliniyor. Vazgeçilirse kronometre çalışmaya devam ediyor. */
  if(ayKilitli(id)){
    toast("Bu ay kilitli 🔒 Kronometre duruyor, ayı açınca tekrar bitir ("+saat+" saat)");
    return;
  }
  if(!confirm(saat+" saat mesai yaptın. Bugünün kaydına eklensin mi?\n\n(İptal dersen kronometre çalışmaya devam eder, saatlerin kaybolmaz.)")) return;
  try{
    const ref = kokRef().collection("girdiler").doc(id);
    const doc = await ref.get();
    const v = doc.exists ? doc.data() : null;
    const yeni = v ? {...v, mesai: (Number(v.mesai)||0) + saat}
                   : {durum:"tam", mesai:saat, arti:0, santiye:ayarlar.santiye||"", santiyeId:"", not:"",
                      ...guncelOranlar("", id), guncelleme: firebase.firestore.FieldValue.serverTimestamp()};
    await ref.set(yeni);
    /* Kayıt BAŞARILI olduktan sonra kronometreyi sıfırla — yazma hata verirse
       (internet yok vb.) kronometre duruyor, kullanıcı tekrar deneyebiliyor. */
    try{ if(window._kilit){ window._kilit.release(); window._kilit=null; } }catch(e){}
    try{ localStorage.removeItem("kronoBas"); }catch(e){}
    kronoYaz();
    toast("⏱ "+saat+" saat mesai bugüne eklendi ✅");
  }catch(e){ hataGoster(e); }
}

/* ---------- Bakiye sayaç animasyonu ---------- */
/* ---------- ⚡ Hafif mod: eski/yavaş cihazlarda akıcılık ----------
   Kaydırma takılmasının başlıca sebebi .alt-nav'daki backdrop-filter
   (sabit konumlu, sürekli görünen bulanık zemin) ve çok sayıda yumuşak
   gölge/degradedir. Hafif mod bunları sadeleştirir.

   Karar sırası:
     1) Kullanıcı Ayarlar'dan elle açıp kapattıysa DAİMA onun tercihi geçerli.
     2) Hiç dokunmadıysa cihaz otomatik değerlendirilir: 4 GB veya altı RAM,
        ya da 4 veya daha az işlemci çekirdeği → hafif mod açılır.
   deviceMemory/hardwareConcurrency her tarayıcıda yok; yoksa otomatik açma
   yapılmaz (yanlış pozitifle iyi cihazın görünümünü düşürmemek için). */
function hafifModOtomatikMi(){
  try{
    const ram = navigator.deviceMemory;             /* GB, Chrome/Android */
    const cekirdek = navigator.hardwareConcurrency; /* mantıksal çekirdek */
    /* DÜZELTME (0.0.3.2): eşikler çok genişti. `deviceMemory <= 4` neredeyse
       tüm orta seviye Android telefonları kapsıyor (birçoğu 4 GB bildirir) ve
       gayet akıcı çalışan cihazlarda bile hafif modu sessizce açıyordu —
       kullanıcı bu yüzden animasyonların hiç olmadığını sanıyordu.
       Eşikler gerçekten düşük donanımı yakalayacak şekilde daraltıldı. */
    if(typeof ram === "number" && ram <= 2) return true;
    if(typeof cekirdek === "number" && cekirdek <= 2) return true;
  }catch(e){}
  return false;
}
/* Görünüm ölçeği: kullanıcı "her şey kocaman" derse küçültebilsin.
   Varsayılan "normal". Girdi alanları bundan etkilenmez (iOS koruması). */
function olcekUygula(){
  let d="normal";
  /* VARSAYILAN ARTIK "kucuk" (0.0.6.0).
     Gerekçe: kullanıcılardan tekrar tekrar "her şey kocaman" şikayeti geldi.
     "Normal" ölçek benim dokunma hedefi / okunurluk kaygımla belirlenmişti;
     sahadaki kullanıcı ekrana daha çok bilgi sığmasını istiyor. Büyük
     görmek isteyen Ayarlar'dan tek dokunuşla değiştirebiliyor — ama
     varsayılan, çoğunluğun istediği yer olmalı. */
  try{ d = localStorage.getItem("olcek") || "kucuk"; }catch(e){}
  if(!["kucuk","normal","buyuk"].includes(d)) d="normal";
  document.documentElement.setAttribute("data-olcek", d);
  document.querySelectorAll("#olcek-secim button").forEach(b=>
    b.classList.toggle("secili", b.dataset.olcek===d));
}
function hafifModUygula(){
  let tercih = null;
  try{ tercih = localStorage.getItem("hafifMod"); }catch(e){}
  const acik = tercih === null ? hafifModOtomatikMi() : tercih === "1";
  document.documentElement.setAttribute("data-hafif", acik ? "1" : "0");
  const kutu = document.getElementById("ayar-hafif");
  if(kutu) kutu.checked = acik;
  return acik;
}
const AZ_HAREKET = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
function sayacAnim(el, hedef, ozelSure){
  if(gizliMod){ el.textContent = "•••• ₺"; el.dataset.deger = hedef; return; }
  const ilkSefer = el.dataset.deger === undefined;   /* uygulama yeni açıldı → 0'dan say */
  const eski = Number(el.dataset.deger)||0;
  el.dataset.deger = hedef;
  if(AZ_HAREKET || Math.abs(hedef-eski) < 0.5){ el.textContent = paraFmt(hedef); return; }
  const bas = performance.now();
  const sure = ozelSure || (ilkSefer ? 1300 : 600);  /* ilk açılışta daha uzun, keyifli sayım */
  function adim(t){
    const k = Math.min(1, (t-bas)/sure);
    el.textContent = paraFmt(eski + (hedef-eski)*(1-Math.pow(1-k,3)));
    if(k<1) requestAnimationFrame(adim);
    else{ el.classList.remove("para-pop"); void el.offsetWidth; el.classList.add("para-pop"); }
  }
  requestAnimationFrame(adim);
}
/* Özet kutularındaki paraları sırayla (kademeli) 0'dan saydır */
function paraKutulariCanlandir(kokSel){
  if(gizliMod) return;
  document.querySelectorAll(kokSel+" .deger[data-para]").forEach((el,i)=>{
    const hedef = Number(el.dataset.para)||0;
    if(AZ_HAREKET){ el.textContent = paraFmt(hedef); return; }
    setTimeout(()=> sayacAnim(el, hedef, 800), 60*i);
  });
}

/* ---------- Döviz/altın kurları (6 saatte bir yenilenir, çevrimdışı son bilineni kullanır) ---------- */
let kurVeri = null;
async function kurGetir(){
  try{
    const sakli = JSON.parse(localStorage.getItem("kurlar")||"null");
    if(sakli && sakli.t && Date.now()-sakli.t < 6*60*60*1000){ kurVeri = sakli; return sakli; }
    if(sakli) kurVeri = sakli;  /* süresi geçse de elde bulunsun (çevrimdışı yedek) */
  }catch(e){}
  /* 1. kaynak: truncgil (dolar + gram altın, Türkiye piyasası) */
  try{
    const r = await fetch("https://finans.truncgil.com/today.json");
    const j = await r.json();
    const al = o => o ? sayi(o["Alış"]||o["Satış"]||o["Buying"]||o["Selling"]) : 0;
    const usd = al(j["USD"]), gram = al(j["gram-altin"]||j["GRA"]);
    if(usd>0 || gram>0){
      kurVeri = {t:Date.now(), usd, gram};
      try{ localStorage.setItem("kurlar", JSON.stringify(kurVeri)); }catch(e){}
      return kurVeri;
    }
  }catch(e){}
  /* 2. kaynak: yalnız dolar (yedek) */
  try{
    const r = await fetch("https://open.er-api.com/v6/latest/USD");
    const j = await r.json();
    const usd = Number(j && j.rates && j.rates.TRY)||0;
    if(usd>0){
      kurVeri = {t:Date.now(), usd, gram:(kurVeri&&kurVeri.gram)||0};
      try{ localStorage.setItem("kurlar", JSON.stringify(kurVeri)); }catch(e){}
    }
  }catch(e){}
  return kurVeri;
}
async function kurSatirYaz(kalan){
  const el = $("#kur-satir"); if(!el) return;
  if(gizliMod || !(kalan>0)){ el.textContent = ""; return; }
  /* Kur servisi dış bir kaynak; erişilemezse burası yakalanmayan bir söz
     reddi üretiyordu. Ana ekranın "≈ X dolar · Y gram altın" satırı sessizce
     boş kalmalı, hata fırlatmamalı. */
  let k = null;
  try{ k = await kurGetir(); }catch(e){ el.textContent = ""; return; }
  if(!k || !(k.usd>0 || k.gram>0)){ el.textContent = ""; return; }
  /* kur beklerken kart değişmiş olabilir; güncel değeri esas al */
  const simdiki = Number($("#sirket-bakiye").dataset.deger);
  if(isFinite(simdiki)) kalan = simdiki;
  if(gizliMod || !(kalan>0)){ el.textContent = ""; return; }
  const parca = [];
  if(k.usd>0)  parca.push("≈ " + (kalan/k.usd).toLocaleString("tr-TR",{maximumFractionDigits:0}) + " dolar");
  if(k.gram>0) parca.push((kalan/k.gram).toLocaleString("tr-TR",{maximumFractionDigits:1}) + " gram altın");
  el.textContent = parca.length ? "💰 Alacağın " + parca.join(" · ") + " ediyor" : "";
}

/* ---------- 📺 CANLI TV: yalnızca resmi yayın sayfaları ---------- */
/* TV_KANALLAR → sabitler.js'e taşındı */
/* ---------- 🌉 KÖPRÜ: dış kaynaklara erişim ----------
   ÖNEMLİ: Haber/video/TV'nin sağlam çalışması için KOPRU-KURULUM.md
   rehberiyle kendi Cloudflare köprünü kur ve adresini aşağıya yapıştır.
   Boş bırakılırsa halka açık köprüler denenir (her zaman güvenilir değildir). */
const OZEL_KOPRU = "";   /* Köprü kurulunca adres buraya (KOPRU-KURULUM.md) */

async function koprudenGetir(hedefUrl){
  const kodlu = encodeURIComponent(hedefUrl);
  const koprular = [];
  if(OZEL_KOPRU) koprular.push(OZEL_KOPRU.replace(/\/$/,"") + "/?url=" + kodlu);
  koprular.push(
    "https://api.allorigins.win/raw?url=" + kodlu,
    "https://corsproxy.io/?url=" + kodlu,
    "https://api.codetabs.com/v1/proxy?quest=" + kodlu
  );
  for(const url of koprular){
    try{
      const r = await zamanAsimli(fetch(url), 8000);  /* 8 sn cevap yoksa sıradakine geç */
      if(!r || !r.ok) continue;
      const metin = await zamanAsimli(r.text(), 6000);
      if(metin && metin.length > 200) return metin;
    }catch(e){}
  }
  return null;
}

/* ---------- ▶️ VİDEO: uygulama içi YouTube arama + oynatma ---------- */
function ytSonuclariAyikla(ham){
  /* Sayfanın içindeki ytInitialData JSON'unu bul, ayrıştır, videoları topla */
  const bas = ham.indexOf("ytInitialData");
  if(bas < 0) return [];
  const kAc = ham.indexOf("{", bas);
  if(kAc < 0) return [];
  let son = ham.indexOf("};<" + "/script>", kAc);
  if(son < 0) son = ham.indexOf("};", kAc);
  if(son < 0) return [];
  let kok = null;
  try{ kok = JSON.parse(ham.slice(kAc, son+1)); }catch(e){ return []; }
  const liste = [];
  (function gez(o){
    if(!o || typeof o !== "object" || liste.length >= 20) return;
    if(o.videoRenderer && o.videoRenderer.videoId){
      const v = o.videoRenderer;
      const al = (x, yol) => { try{ return yol(x) || ""; }catch(e){ return ""; } };
      liste.push({
        id: v.videoId,
        b: al(v, x=> x.title.runs[0].text),
        k: al(v, x=> x.ownerText.runs[0].text),
        sure: al(v, x=> x.lengthText.simpleText)
      });
      return;
    }
    if(Array.isArray(o)){ o.forEach(gez); return; }
    for(const anahtar in o) gez(o[anahtar]);
  })(kok);
  return liste;
}
function sureBicim(sn){
  sn = Math.max(0, Math.round(Number(sn)||0));
  const sa = Math.floor(sn/3600), dk = Math.floor((sn%3600)/60), s2 = sn%60;
  return sa > 0 ? sa+":"+String(dk).padStart(2,"0")+":"+String(s2).padStart(2,"0") : dk+":"+String(s2).padStart(2,"0");
}
/* Piped: tarayıcıya doğrudan açık YouTube arama servisi — köprü gerektirmez */
async function videoAraDogrudan(q){
  const servisler = [
    "https://pipedapi.kavin.rocks",
    "https://api.piped.private.coffee",
    "https://pipedapi.adminforge.de"
  ];
  /* Yedek hat: Invidious tabanlı açık arama servisleri (farklı yapı, ayrı ayrıştırma) */
  const invServisler = ["https://inv.nadeko.net", "https://invidious.nerdvpn.de"];
  for(const kok of invServisler){
    try{
      const r = await zamanAsimli(fetch(kok + "/api/v1/search?q=" + encodeURIComponent(q) + "&type=video&region=TR"), 8000);
      if(!r || !r.ok) continue;
      const j = await r.json();
      if(!Array.isArray(j) || !j.length) continue;
      const liste = [];
      j.forEach(v=>{
        if(liste.length >= 20 || !v || !v.videoId) return;
        liste.push({
          id: String(v.videoId),
          b: String(v.title||""),
          k: String(v.author||""),
          sure: (Number(v.lengthSeconds)>0) ? sureBicim(v.lengthSeconds) : ""
        });
      });
      if(liste.length) return liste;
    }catch(e){}
  }
  for(const kok of servisler){
    try{
      const r = await zamanAsimli(fetch(kok+"/search?q="+encodeURIComponent(q)+"&filter=videos"), 8000);
      if(!r || !r.ok) continue;
      const j = await r.json();
      const kaynak = Array.isArray(j) ? j : (j && j.items);
      if(!Array.isArray(kaynak) || !kaynak.length) continue;
      const liste = [];
      kaynak.forEach(v=>{
        if(liste.length >= 20 || !v || !v.url) return;
        const m = String(v.url).match(/v=([\w-]{11})/);
        if(!m) return;
        liste.push({
          id: m[1],
          b: String(v.title||""),
          k: String(v.uploaderName||v.uploader||""),
          sure: (Number(v.duration)>0) ? sureBicim(v.duration) : ""
        });
      });
      if(liste.length) return liste;
    }catch(e){}
  }
  return null;
}
async function videoAra(q){
  const kap = $("#video-sonuclar");
  kap.innerHTML = '<div class="bos-mesaj">🔎 "'+q.replace(/</g,"&lt;")+'" aranıyor...</div>';
  /* 1. katman: doğrudan servisler · 2. katman: köprüyle YouTube */
  let liste = await videoAraDogrudan(q);
  if(!liste){
    const metin = await koprudenGetir("https://www.youtube.com/results?search_query="+encodeURIComponent(q)+"&hl=tr&gl=TR");
    liste = metin ? ytSonuclariAyikla(metin) : [];
  }
  if(!liste || !liste.length){
    kap.innerHTML = '<div class="bos-mesaj">Arama hatları şu an kapalı 📡 Birazdan tekrar dene.<br><br>' +
      '<a class="btn btn-cizgili" style="display:inline-block;text-decoration:none" ' +
      'href="https://m.youtube.com/results?search_query=' + encodeURIComponent(q) + '" target="_blank" rel="noopener">▶️ Aramayı YouTube\'da aç</a></div>';
    return;
  }
  if(!liste.length){
    kap.innerHTML = '<div class="bos-mesaj">Aramaya şu an ulaşılamadı 📡 İnternetini kontrol edip tekrar dene.</div>';
    return;
  }
  try{ localStorage.setItem("video:son", JSON.stringify({q, liste, t:Date.now()})); }catch(e){}
  videoSonucBas(liste);
}
function videoSonucBas(liste){
  const kap = $("#video-sonuclar");
  kap.innerHTML = "";
  liste.forEach(v=>{
    const b = document.createElement("button");
    b.className = "vid-kart";
    b.innerHTML =
      '<span class="vid-kapak-kap"><img class="vid-kapak" loading="lazy" alt="" src="https://i.ytimg.com/vi/'+v.id+'/mqdefault.jpg">'+
      (v.sure ? '<span class="vid-sure">'+v.sure.replace(/</g,"&lt;")+'</span>' : '<span class="vid-sure" style="background:#C62828">CANLI</span>')+'</span>'+
      '<span class="vid-bilgi"><span class="vid-baslik">'+v.b.replace(/</g,"&lt;")+'</span>'+
      '<span class="vid-kanal">'+v.k.replace(/</g,"&lt;")+'</span></span>';
    b.addEventListener("click", ()=> videoOynat(v));
    kap.appendChild(b);
  });
}
function videoOynat(v){
  tvAcikKanal = {ad: v.b.slice(0,60), kisa:"▶", renk:"#CC0000",
                 url: "https://www.youtube.com/watch?v="+v.id,
                 ytLive: "https://www.youtube.com/watch?v="+v.id, tur:"video"};
  geriKaydet();
  $("#tvo-ad").textContent = v.b.slice(0,60);
  const lg = $("#tvo-logo"); lg.textContent = "▶"; lg.style.background = "#CC0000";
  $("#tvo-durum").style.display = "none";
  $("#btn-tvo-site").style.display = "none";   /* videoda "resmi site" anlamsız */
  $("#tvo-iframe").src = "https://www.youtube.com/embed/"+v.id+"?autoplay=1&playsinline=1";
  $("#tv-oynatici").classList.remove("gizli");
}
function videoSayfaAc(){
  /* Hazır konu çipleri bir kez kurulur, son arama geri getirilir */
  const cipKap = $("#video-cipler");
  if(cipKap && !cipKap.childElementCount){
    ["⚽ Maç özetleri","🎵 Müzik","😂 Komik videolar","🎬 Belgesel","🍳 Yemek tarifleri","🔧 Tamir nasıl yapılır"].forEach(c=>{
      const b = document.createElement("button");
      b.textContent = c;
      b.addEventListener("click", ()=>{ $("#video-ara").value = c.slice(c.indexOf(" ")+1); videoAra($("#video-ara").value); });
      cipKap.appendChild(b);
    });
    try{
      const sakli = JSON.parse(localStorage.getItem("video:son")||"null");
      if(sakli && sakli.liste && sakli.liste.length){
        $("#video-ara").value = sakli.q || "";
        videoSonucBas(sakli.liste);
      }
    }catch(e){}
  }
}

/* Uygulama içi oynatma: kanalın RESMÎ YouTube canlı yayını gömülür (izinli embed).
   Yayın kimliği köprü üzerinden bulunur, 30 dk önbellenir. Bulunamazsa kanal kimliğiyle
   canlı-akış gömme denenir; o da olmazsa kullanıcı resmi kaynaklara yönlendirilir. */
let tvAcikKanal = null;
async function tvVideoBul(k){
  try{
    const c = JSON.parse(localStorage.getItem("tvvid:"+k.ad)||"null");
    if(c && c.v && Date.now()-c.t < 30*60*1000) return c.v;
  }catch(e){}
  const canliUrl = k.ytLive || (k.ytId ? "https://www.youtube.com/channel/"+k.ytId+"/live" : null);
  if(!canliUrl) return null;
  const metin = await koprudenGetir(canliUrl);
  if(metin){
    const m = metin.match(/"videoId":"([\w-]{11})"/);
    if(m){
      try{ localStorage.setItem("tvvid:"+k.ad, JSON.stringify({t:Date.now(), v:m[1]})); }catch(e){}
      return m[1];
    }
  }
  return null;
}
async function tvOynat(k){
  tvAcikKanal = k;
  geriKaydet();
  $("#tvo-ad").textContent = k.ad;
  const lg = $("#tvo-logo"); lg.textContent = k.kisa; lg.style.background = k.renk;
  $("#tvo-iframe").src = "about:blank";
  $("#btn-tvo-site").style.display = "";
  $("#tvo-durum").style.display = "flex";
  $("#tvo-durum").textContent = "📡 Yayın aranıyor...";
  $("#tv-oynatici").classList.remove("gizli");
  /* Doğrulanmış 7/24 yayın kimliği varsa köprü beklemeden ANINDA oynat */
  let vid = k.ytVid || null;
  try{
    /* Daha önce arkaplanda bulunmuş daha taze kimlik varsa onu tercih et */
    const c2 = JSON.parse(localStorage.getItem("tvvid:"+k.ad)||"null");
    if(c2 && c2.v) vid = c2.v;
  }catch(e){}
  if(!vid){
    vid = await tvVideoBul(k);
    if(tvAcikKanal !== k || $("#tv-oynatici").classList.contains("gizli")) return; /* bu arada kapatıldı */
  }else{
    /* 🔄 Kendi kendini iyileştirme: yayın açıkken arkada taze kimliği ara,
       farklıysa (eski gizlenmiş/bitmiş demektir) sessizce yenisine geç */
    tvVideoBul(k).then(taze=>{
      if(taze && taze !== vid && tvAcikKanal === k && !$("#tv-oynatici").classList.contains("gizli")){
        $("#tvo-iframe").src = "https://www.youtube.com/embed/"+taze+"?autoplay=1&playsinline=1";
      }
    }).catch(()=>{});
  }
  let src = null;
  if(vid) src = "https://www.youtube.com/embed/"+vid+"?autoplay=1&playsinline=1";
  else if(k.ytId) src = "https://www.youtube.com/embed/live_stream?channel="+k.ytId+"&autoplay=1&playsinline=1";
  if(src){
    $("#tvo-iframe").src = src;
    $("#tvo-durum").style.display = "none";
  }else{
    $("#tvo-durum").textContent = "Yayına içeriden ulaşılamadı — alttaki butonları kullan 👇";
  }
}
function tvKapat(){
  $("#tvo-iframe").src = "about:blank";  /* ses arkada kalmasın */
  $("#tv-oynatici").classList.add("gizli");
  tvAcikKanal = null;
}
let tvCizildi = false;
function tvCiz(){
  if(tvCizildi) return;
  const kap = $("#tv-liste"); if(!kap) return;
  tvCizildi = true;
  TV_KANALLAR.forEach(g=>{
    const baslik = document.createElement("div");
    baslik.className = "tv-grup";
    baslik.textContent = g.grup;
    kap.appendChild(baslik);
    const izgara = document.createElement("div");
    izgara.className = "tv-izgara";
    g.liste.forEach(k=>{
      const b = document.createElement("button");
      b.className = "tv-kanal";
      b.innerHTML = '<div class="tv-logo" style="background:'+k.renk+'">'+k.kisa+'</div>'+
        '<div class="tv-ad">'+k.ad+'</div>'+
        '<div class="tv-canli">● CANLI</div>';
      b.addEventListener("click", ()=> tvOynat(k));
      izgara.appendChild(b);
    });
    kap.appendChild(izgara);
  });
}

/* ---------- 📰 GÜNDEM: Google Haberler RSS (canlı, önbellekli) ---------- */
/* HABER_KAYNAK → sabitler.js'e taşındı */
let haberKat = "gundem", haberSayac = null;
function habercik(t){ /* göreli zaman */
  const dk = Math.floor((Date.now()-t)/60000);
  if(dk < 1) return "az önce";
  if(dk < 60) return dk+" dk önce";
  const sa = Math.floor(dk/60);
  return sa < 24 ? sa+" saat önce" : Math.floor(sa/24)+" gün önce";
}
function rssAyristir(xmlMetin){
  const dom = new DOMParser().parseFromString(xmlMetin, "text/xml");
  const liste = [];
  dom.querySelectorAll("item").forEach(it=>{
    const al = ad => { const e = it.querySelector(ad); return e ? e.textContent : ""; };
    let baslik = al("title");
    const kaynakEl = it.querySelector("source");
    const kaynak = kaynakEl ? kaynakEl.textContent : "";
    /* Google başlığa " - Kaynak" ekler, temizle */
    if(kaynak && baslik.endsWith(" - "+kaynak)) baslik = baslik.slice(0, -(" - "+kaynak).length);
    const z = new Date(al("pubDate"));
    /* Google, description içinde aynı haberi veren diğer kaynakları listeler */
    const ilgili = [];
    try{
      const dHtml = new DOMParser().parseFromString(al("description"), "text/html");
      dHtml.querySelectorAll("a").forEach(a=>{
        const ab = (a.textContent||"").trim();
        if(ab && ab !== baslik && ab.length > 15 && ilgili.length < 4 && a.href)
          ilgili.push({b: ab, l: a.href});
      });
    }catch(e){}
    liste.push({b: baslik, l: al("link"), k: kaynak, z: isFinite(z) ? z.getTime() : Date.now(), i: ilgili});
  });
  return liste.slice(0, 15);
}
/* rss2json: tarayıcıya doğrudan açık haber servisi — köprü gerektirmez */
async function haberCekDogrudan(kat){
  try{
    const r = await fetch("https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(HABER_KAYNAK[kat]));
    if(!r.ok) return null;
    const j = await r.json();
    if(!j || j.status !== "ok" || !Array.isArray(j.items) || !j.items.length) return null;
    return j.items.slice(0, 15).map(it=>{
      let b = String(it.title||"");
      let k = "";
      const tire = b.lastIndexOf(" - ");           /* Google başlık sonuna kaynağı ekler */
      if(tire > 10){ k = b.slice(tire+3); b = b.slice(0, tire); }
      const z = new Date(String(it.pubDate||"").replace(" ", "T"));
      return {b, l: it.link||"", k, z: isFinite(z) ? z.getTime() : Date.now(), i: []};
    });
  }catch(e){ return null; }
}
async function haberCek(kat){
  /* 1. katman: doğrudan servis · 2. katman: köprüler */
  const dogrudan = await haberCekDogrudan(kat);
  if(dogrudan && dogrudan.length) return dogrudan;
  const metin = await koprudenGetir(HABER_KAYNAK[kat]);
  if(!metin) return null;
  const liste = rssAyristir(metin);
  return liste.length ? liste : null;
}
function haberBas(liste, kaynakZamani){
  const kap = $("#haber-liste"); if(!kap) return;
  const simdi = new Date();
  $("#haber-tarih").textContent = simdi.getDate()+" "+AYLAR[simdi.getMonth()]+" "+simdi.getFullYear()+" "+GUNLER[simdi.getDay()];
  if(!liste || !liste.length){
    kap.innerHTML = '<div class="bos-mesaj" style="color:#5A5646">Haberlere şu an ulaşılamadı 📡 İnternetini kontrol edip 🔄 Yenile\'ye bas.</div>';
    return;
  }
  kap.innerHTML = "";
  /* 🔎 Arama filtresi */
  const aramaEl = $("#haber-ara");
  const arama = aramaEl ? aramaEl.value.trim().toLocaleLowerCase("tr") : "";
  const suzgec = arama ? liste.filter(h=> h.b.toLocaleLowerCase("tr").includes(arama)) : liste;
  if(!suzgec.length){
    kap.innerHTML = '<div class="bos-mesaj" style="color:#5A5646">"'+arama.replace(/</g,"&lt;")+'" ile ilgili haber yok. Başka kelime dene.</div>';
    return;
  }
  suzgec.forEach((h, i)=>{
    const d = document.createElement("div");
    d.className = i===0 ? "gz-manset" : "gz-haber";
    const kaynakSatir = '<div class="gz-kaynak">'+
      (h.k ? h.k.replace(/</g,"&lt;")+" · " : "")+habercik(h.z)+'</div>';
    d.innerHTML = i===0
      ? '<div style="font-size:10px;letter-spacing:2px;color:#A33;font-weight:800">MANŞET</div>'+
        '<div class="gz-baslik">'+h.b.replace(/</g,"&lt;")+'</div>'+kaynakSatir
      : '<div class="gz-no">'+(i+1)+'</div><div><div class="gz-baslik">'+h.b.replace(/</g,"&lt;")+'</div>'+kaynakSatir+'</div>';
    d.addEventListener("click", ()=> haberDetayAc(h));
    kap.appendChild(d);
  });
  $("#haber-zaman").textContent = "Son güncelleme: " + (kaynakZamani ? habercik(kaynakZamani) : "az önce");
}
let acikHaber = null;
function haberDetayAc(h){
  acikHaber = h;
  geriKaydet();
  $("#hd-baslik").textContent = h.b;
  $("#hd-kaynak").textContent = (h.k ? h.k+" · " : "") + habercik(h.z);
  const ilgiliKap = $("#hd-ilgili");
  if(h.i && h.i.length){
    ilgiliKap.innerHTML = '<div style="font-size:11px;letter-spacing:1.5px;color:#7A745E;font-weight:800;margin-top:12px">DİĞER GAZETELER NE DİYOR</div>'+
      h.i.map(x=> '<div class="gz-haber" data-link="'+x.l.replace(/"/g,"&quot;")+'" style="padding:9px 2px">'+
        '<div class="gz-no">›</div><div class="gz-baslik" style="font-size:14px">'+x.b.replace(/</g,"&lt;")+'</div></div>').join("");
    ilgiliKap.querySelectorAll("[data-link]").forEach(el=>
      el.addEventListener("click", ()=>{ try{ if(linkGuvenliMi(el.dataset.link)) window.open(el.dataset.link, "_blank"); }catch(e){} }));
  }else{
    ilgiliKap.innerHTML = "";
  }
  $("#haber-detay").classList.remove("gizli");
}
async function haberYukle(zorla){
  const kap = $("#haber-liste"); if(!kap) return;
  /* Önbellek: 5 dk taze, internetsizken de son gündem */
  let sakli = null;
  try{ sakli = JSON.parse(localStorage.getItem("haber:"+haberKat)||"null"); }catch(e){}
  if(sakli && sakli.liste && sakli.liste.length && !zorla && Date.now()-sakli.t < 5*60*1000){
    haberBas(sakli.liste, sakli.t);
  }else{
    if(!(sakli && sakli.liste && sakli.liste.length))
      kap.innerHTML = '<div class="bos-mesaj" style="color:#5A5646">Haberler yükleniyor...</div>';
    else haberBas(sakli.liste, sakli.t);  /* eskiyi göster, arkada tazele */
    const liste = await haberCek(haberKat);
    if(liste){
      try{ localStorage.setItem("haber:"+haberKat, JSON.stringify({t: Date.now(), liste})); }catch(e){}
      haberBas(liste, Date.now());
    }else if(!(sakli && sakli.liste && sakli.liste.length)){
      haberBas(null);
    }
  }
  /* Sayfa açık kaldıkça 5 dk'da bir kendini yeniler */
  clearInterval(haberSayac);
  haberSayac = setInterval(()=>{
    if(aktifGoruntu === "haber") haberYukle(true);
    else clearInterval(haberSayac);
  }, 5*60*1000);
}

/* ---------- 📊 Gelir-Gider grafiği (kütüphanesiz, tema uyumlu) ---------- */
function paraKisa(n){
  /* PARA KISALTMA (0.0.9.9)
     Eski hâli binleri TAM SAYIYA yuvarlıyordu: 2.500 ₺ → "3k", 3.750 ₺ → "4k".
     Yani bir günlük yevmiye özet kutusunda 500 ₺ fazla görünüyordu.
     Kullanıcı bunu yakaladı: üstte "3.750 ₺", altta "4k" yazıyordu —
     aynı gün, iki farklı rakam. Para uygulamasında kabul edilemez.

     Ayrıca takvim hücresi ayrı bir yerde "3.8K" üretiyordu; aynı tutar
     üç farklı biçimde görünüyordu. Artık tek kaynak burası.

     Yeni kural: binlerde bir ondalık basamak ve Türkçe kısaltma ("B").
     10.000'in üstünde ondalık gereksiz — orada tam sayı yeterli. */
  const t = Number(n)||0;
  const isaret = t < 0 ? "-" : "";
  const m = Math.abs(t);
  if(m >= 1000000) return isaret + (m/1000000).toLocaleString("tr-TR",{maximumFractionDigits:1}) + "M";
  if(m >= 10000)   return isaret + Math.round(m/1000) + "B";
  if(m >= 1000)    return isaret + (m/1000).toLocaleString("tr-TR",{maximumFractionDigits:1}) + "B";
  return isaret + String(Math.round(m));
}
function ggAylar(simdi){
  const d12 = [];
  for(let i=11;i>=0;i--){
    const d = new Date(simdi.getFullYear(), simdi.getMonth()-i, 1);
    d12.push({key: d.getFullYear()+"-"+pad(d.getMonth()+1), ad: AYLAR[d.getMonth()].slice(0,3)});
  }
  return d12;
}
function ggGrafikCiz(ayHak, ayAlinan){
  const c = $("#gg-grafik"), kart = $("#gg-kart");
  if(!c || !kart) return;
  const d12 = ggAylar(new Date());
  const maks = Math.max.apply(null, d12.map(a=> Math.max(ayHak[a.key]||0, ayAlinan[a.key]||0)));
  if(!(maks>0)){ kart.classList.add("gizli"); return; }
  kart.classList.remove("gizli");
  const stil = getComputedStyle(document.body);
  const renk = ad => (stil.getPropertyValue(ad)||"").trim();
  const sari = renk("--sari")||"#FFC400", mavi = renk("--mesai")||"#4C7DFF";
  const soluk = renk("--soluk")||"#8B8E99", cizgi = renk("--cizgi")||"#262933";
  const dpr = window.devicePixelRatio||1;
  const G = c.clientWidth||320, Y = 195, altPay = 22, ustPay = 14, solPay = 34;
  c.width = Math.round(G*dpr); c.height = Math.round(Y*dpr);
  const x = c.getContext("2d");
  x.scale(dpr, dpr);
  x.clearRect(0,0,G,Y);
  const cizimY = Y - altPay - ustPay;
  const olcek = v => (Y - altPay) - (v/maks)*cizimY;
  /* yatay kılavuz çizgileri */
  x.font = "10px sans-serif"; x.textAlign = "right";
  [0, .5, 1].forEach(o=>{
    const v = maks*o, yy = olcek(v);
    x.strokeStyle = cizgi; x.lineWidth = 1;
    x.beginPath(); x.moveTo(solPay, yy); x.lineTo(G-4, yy); x.stroke();
    x.fillStyle = soluk;
    x.fillText(paraKisa(v), solPay-5, yy+3);
  });
  /* Her ayın x konumu (nokta merkezleri) — bar grafiğiyle birebir aynı ölçek/matematik */
  const slot = (G - solPay - 6)/12;
  const xKonum = i => solPay + i*slot + slot/2;
  /* Bir seriyi (alan dolgusu + çizgi + noktalar) çiz. `veri` her ay için ham
     TL değeri; sadece >0 olan aylar bir noktaya sahip, aradaki boşluklar
     (hiç çalışılmamış/ödenmemiş ay) çizgiyi koparır, uydurma bir değer
     bağlanmaz. */
  function seriCiz(veri, renkKodu){
    const noktalar = d12.map((a,i)=> ({i, x:xKonum(i), y: olcek(veri[a.key]||0), v: veri[a.key]||0}));
    /* Alan dolgusu: sadece ardışık (boşluksuz) veri olan bölümlerde */
    let k = 0;
    while(k < noktalar.length){
      if(!(noktalar[k].v>0)){ k++; continue; }
      let j = k;
      while(j+1 < noktalar.length && noktalar[j+1].v>0) j++;
      if(j > k){
        x.beginPath();
        x.moveTo(noktalar[k].x, Y-altPay);
        for(let m=k;m<=j;m++) x.lineTo(noktalar[m].x, noktalar[m].y);
        x.lineTo(noktalar[j].x, Y-altPay);
        x.closePath();
        x.fillStyle = renkKodu + "22";  /* ~%13 opaklık, hex alfa */
        x.fill();
        x.strokeStyle = renkKodu; x.lineWidth = 2; x.lineJoin = "round";
        x.beginPath();
        for(let m=k;m<=j;m++){ if(m===k) x.moveTo(noktalar[m].x, noktalar[m].y); else x.lineTo(noktalar[m].x, noktalar[m].y); }
        x.stroke();
      }
      k = j+1;
    }
    /* Tek başına (öncesi/sonrası boş) bir ay varsa en azından bir nokta göster */
    noktalar.forEach(n=>{
      if(n.v>0){
        x.beginPath(); x.arc(n.x, n.y, 3, 0, Math.PI*2);
        x.fillStyle = renkKodu; x.fill();
      }
    });
  }
  seriCiz(ayAlinan, mavi);   /* önce alınan (arkada) */
  seriCiz(ayHak, sari);      /* sonra hakediş (önde) */
  /* Ay adları */
  x.textAlign = "center"; x.fillStyle = soluk;
  d12.forEach((a,i)=>{ if(i%2===1 || d12.length<=6) x.fillText(a.ad, xKonum(i), Y-7); });
}

/* ---------- 🏖️ Yıllık izin sayacı ---------- */
async function yillikIzinCiz(){
  const el = $("#izin-sonuc"); if(!el) return;
  const giris = ayarlar.iseGiris;
  if(!giris){ el.innerHTML = 'Hesaplamam için <b>Ayarlar → İşe giriş tarihin</b> alanını doldur, buraya gel.'; return; }
  const gT = new Date(giris+"T12:00:00");
  if(!isFinite(gT)){ el.textContent = "İşe giriş tarihi anlaşılamadı, Ayarlar'dan düzelt."; return; }
  const yilF = (Date.now() - gT.getTime()) / (365.25*24*3600*1000);
  if(yilF < 0){ el.textContent = "İşe giriş tarihi gelecekte olamaz 😄"; return; }
  if(yilF < 1){
    const kalanGun = Math.ceil((1-yilF)*365.25);
    el.innerHTML = "Kıdemin henüz <b>1 yılı doldurmadı</b>. Yıllık izin hakkı 1 yıl dolunca doğar — buna <b>"+kalanGun+" gün</b> kaldı, ondan sonra yılda <b>14 gün</b> ücretli iznin olacak. 🏖️";
    return;
  }
  const hak = yilF >= 15 ? 26 : (yilF > 5 ? 20 : 14);
  el.innerHTML = "⏳ Hesaplanıyor...";
  let kullanilan = 0;
  try{
    const yil = new Date().getFullYear();
    const snap = await kokRef().collection("girdiler")
      .where(firebase.firestore.FieldPath.documentId(), ">=", yil+"-01-01")
      .where(firebase.firestore.FieldPath.documentId(), "<=", yil+"-12-31").get();
    snap.forEach(d=>{ if(d.data().durum==="izin") kullanilan++; });
  }catch(e){ /* sayamazsak sadece hakkı gösteririz */ }
  const kidemYil = Math.floor(yilF);
  const kalan = hak - kullanilan;
  el.innerHTML =
    "Kıdemin: <b>"+kidemYil+" yıl</b><br>"+
    "Yıllık iznin: <b>"+hak+" gün</b><br>"+
    "Bu yıl işlediğin izinli/raporlu gün: <b>"+kullanilan+"</b><br>"+
    (kalan>=0
      ? "Kalan iznin: <b style='color:var(--sari)'>"+kalan+" gün</b> 🏖️"
      : "⚠️ Bu yıl hakkından <b>"+Math.abs(kalan)+" gün fazla</b> izin görünüyor (raporlu günler dahil olduğu için normal olabilir).");
}

/* ---------- 📤 Gün paylaşımı ---------- */
function gunPaylasMetni(){
  const t = new Date(modalTarih+"T12:00:00");
  const tarihYazi = t.getDate()+" "+AYLAR[t.getMonth()]+" "+GUNLER[t.getDay()];
  const durumAd = {tam:"Tam yevmiye ✅", yarim:"Yarım yevmiye 🌗", gelmedi:"Gelmedim 🚫", izin:"İzinli 🏖️", saatlik:"Saatlik çalışma ⏱️"};
  const parcalar = [tarihYazi, durumAd[modalDurum] || modalDurum];
  const mesai = sayi($("#mesai-saat").value, true);
  if(mesai > 0) parcalar.push("+ "+mesai+" saat mesai");
  const arti = sayi($("#gun-arti").value, true);
  if(arti > 0) parcalar.push("+ "+arti+" gün içi artı");
  const santiye = $("#gun-santiye").value.trim();
  if(santiye) parcalar.push("📍 "+santiye);
  if(!gizliMod){
    const kazanc = $("#gun-kazanc-tutar").textContent;
    if(kazanc && kazanc !== "—") parcalar.push("Kazanç: "+kazanc);
  }
  const not = $("#gun-not").value.trim();
  if(not) parcalar.push("Not: "+not);
  return "📋 " + parcalar.join(" · ") + "\n— Puantaj Defterim 📲";
}

/* ---------- 🧱 İnşaat hesaplayıcıları ---------- */
function betonHesap(en, boy, yuk){
  const m3 = en*boy*yuk;
  return m3 > 0 ? {m3, fireli: m3*1.1} : null;
}
function duvarHesap(m2){
  return m2 > 0 ? {tugla: Math.ceil(m2*55), gazbeton: Math.ceil(m2*8.5)} : null;
}
function boyaHesap(m2){
  return m2 > 0 ? {litre: Math.ceil(m2*2/5)} : null;
}
function insaatHesaplaKur(){
  const bagla = (idler, fn)=> idler.forEach(id=> {
    const el = $("#"+id); if(el) el.addEventListener("input", fn);
  });
  bagla(["bet-en","bet-boy","bet-yuk"], ()=>{
    const r = betonHesap(sayi($("#bet-en").value), sayi($("#bet-boy").value), sayi($("#bet-yuk").value));
    $("#bet-sonuc").innerHTML = r
      ? "≈ <b>"+r.m3.toLocaleString("tr-TR",{maximumFractionDigits:2})+" m³</b> beton · fireli sipariş: <b style='color:var(--sari)'>"+r.fireli.toLocaleString("tr-TR",{maximumFractionDigits:2})+" m³</b>"
      : "";
  });
  bagla(["duv-m2"], ()=>{
    const r = duvarHesap(sayi($("#duv-m2").value));
    $("#duv-sonuc").innerHTML = r
      ? "≈ <b>"+r.tugla.toLocaleString("tr-TR")+" tuğla</b> ya da <b>"+r.gazbeton.toLocaleString("tr-TR")+" gazbeton</b>"
      : "";
  });
  bagla(["boy-m2"], ()=>{
    const r = boyaHesap(sayi($("#boy-m2").value));
    $("#boy-sonuc").innerHTML = r ? "2 kat için ≈ <b>"+r.litre+" litre</b> boya" : "";
  });
}
/* ---------- 🚑 İş Kazası Defteri ---------- */
function kazaTutanakMetni(k){
  const t = new Date((k.tarih||"2000-01-01")+"T12:00:00");
  const kt = k.kayitZamani ? new Date(k.kayitZamani) : null;
  const sgkYazi = {evet:"SGK'ya bildirildiği söylendi", hayir:"SGK'ya BİLDİRİLMEDİ", bilmiyorum:"SGK bildirimi belirsiz"};
  return "🚑 İŞ KAZASI KAYDI\n" +
    "─────────────────\n" +
    "Kaza tarihi: " + t.getDate() + " " + AYLAR[t.getMonth()] + " " + t.getFullYear() + " " + GUNLER[t.getDay()] + "\n" +
    "Olay: " + (k.aciklama||"-") + "\n" +
    (k.tanik ? "Tanıklar: " + k.tanik + "\n" : "") +
    (k.rapor ? "Hastane/rapor: " + k.rapor + "\n" : "") +
    "Durum: " + (sgkYazi[k.sgk]||"-") + "\n" +
    (k.foto ? "Fotoğraf: kayıtta mevcut 📷\n" : "") +
    (kt ? "Bu kayıt " + kt.getDate() + " " + AYLAR[kt.getMonth()] + " " + kt.getFullYear() + " tarihinde işçi tarafından tutulmuştur.\n" : "") +
    "— Puantaj Defterim kayıt sistemi";
}
async function kazaListeYukle(){
  const ul = $("#liste-kaza"); if(!ul) return;
  try{
    const snap = await kokRef().collection("kazalar").orderBy("tarih","desc").limit(20).get();
    ul.innerHTML = "";
    if(snap.empty){
      ul.innerHTML = '<li class="bos-mesaj" style="font-size:12.5px">Kayıtlı kaza yok — dileriz hiç olmaz 🙏</li>';
      return;
    }
    snap.forEach(doc=>{
      const k = doc.data();
      const t = new Date((k.tarih||"2000-01-01")+"T12:00:00");
      const li = document.createElement("li");
      li.innerHTML =
        '<div class="rozet" style="background:var(--gelmedi)">🚑<small>'+t.getDate()+' '+AYLAR[t.getMonth()].slice(0,3)+'</small></div>'+
        '<div class="orta"><div class="baslik">'+String(k.aciklama||"").slice(0,60).replace(/</g,"&lt;")+'</div>'+
        '<div class="alt-yazi">'+(k.tanik ? "Tanık: "+String(k.tanik).replace(/</g,"&lt;") : "Tanık yazılmamış")+
        (k.sgk==="hayir" ? ' · <b style="color:var(--gelmedi)">SGK bildirilmedi!</b>' : '')+'</div></div>'+
        (k.foto ? '<button class="sil" aria-label="KazaFoto" style="color:var(--sari)">📷</button>' : '')+
        '<button class="sil" aria-label="Tutanak" style="color:var(--mesai)">📄</button>'+
        '<button class="sil" aria-label="Sil">🗑️</button>';
      const fBtn = li.querySelector('[aria-label="KazaFoto"]');
      if(fBtn) fBtn.addEventListener("click", ()=>{
        geriKaydet();
        const b = $("#foto-buyuk");
        b.querySelector("img").src = k.foto;
        b.style.display = "flex";
      });
      li.querySelector('[aria-label="Tutanak"]').addEventListener("click", async ()=>{
        const m = kazaTutanakMetni(k);
        try{
          if(navigator.share) await navigator.share({text:m});
          else{ await navigator.clipboard.writeText(m); toast("Tutanak kopyalandı 📄"); }
        }catch(e){}
      });
      li.querySelector('[aria-label="Sil"]').addEventListener("click", ()=>{
        if(!confirm("Bu kaza kaydı silinsin mi? Delil niteliği taşıyabilir, emin misin?")) return;
        kokRef().collection("kazalar").doc(doc.id).delete().then(kazaListeYukle).catch(hataGoster);
      });
      ul.appendChild(li);
    });
  }catch(e){ ul.innerHTML = '<li class="bos-mesaj">Liste yüklenemedi, tekrar dene</li>'; }
}
/* ---------- 🆘 Acil Durum Kartı ---------- */
function acilFormDoldur(){
  const a = ayarlar.acil || {};
  if($("#acil-kan"))  $("#acil-kan").value  = a.kan||"";
  if($("#acil-kisi")) $("#acil-kisi").value = a.kisi||"";
  if($("#acil-not"))  $("#acil-not").value  = a.not||"";
}

/* ---------- 🪪 İşçi Kimlik Kartı (işçinin kontrolünde) ---------- */
function kimlikKodu(uid){
  /* Hesaba özel, değişmeyen, okunaklı kimlik: PD-XXXX-XXXX */
  const t = String(uid||"").replace(/[^a-zA-Z0-9]/g,"").toUpperCase();
  if(t.length < 8) return "PD-0000-0000";
  return "PD-" + t.slice(0,4) + "-" + t.slice(-4);
}
function kimlikOzetCiz(){
  const el = $("#kimlik-ozet"); if(!el) return;
  const i = tumIstatistik || {};
  const kod = kimlikKodu(kullanici && kullanici.uid);
  const ad = (kullanici && kullanici.displayName) || "İsimsiz Usta";
  if(!(i.gunToplam >= 0)){
    el.innerHTML = "🪪 Kimlik No: <b>"+kod+"</b><br>İstatistikler için önce Ana ekranı bir aç, sonra buraya dön.";
    return;
  }
  let kidem = "";
  if(ayarlar.iseGiris){
    const y = (Date.now() - new Date(ayarlar.iseGiris+"T12:00:00").getTime()) / (365.25*86400000);
    if(isFinite(y) && y > 0) kidem = y >= 1 ? Math.floor(y) + " yıl" : Math.floor(y*12) + " ay";
  }
  el.innerHTML =
    "👷 <b>" + ad + "</b><br>" +
    "🪪 Kimlik No: <b>" + kod + "</b><br>" +
    (kidem ? "📅 Kıdem: <b>" + kidem + "</b><br>" : "") +
    "🏗️ Toplam: <b>" + (i.gunToplam||0) + " yevmiye</b> · <b>" + (i.mesaiToplam||0) + " saat mesai</b>" +
    ((i.pazarToplam||0) > 0 ? " · <b>" + i.pazarToplam + " pazar</b>" : "");
}
async function kimlikKartOlustur(){
  try{
    const i = tumIstatistik || {};
    const kod = kimlikKodu(kullanici && kullanici.uid);
    const ad = (kullanici && kullanici.displayName) || "İsimsiz Usta";
    const c = document.createElement("canvas");
    c.width = 1200; c.height = 760;
    const x = c.getContext("2d");
    const stil = getComputedStyle(document.body);
    const sari = (stil.getPropertyValue("--sari")||"#FFC400").trim();
    /* Zemin + şeritler */
    const g = x.createLinearGradient(0,0,1200,760);
    g.addColorStop(0,"#1A1B21"); g.addColorStop(1,"#0D0E12");
    x.fillStyle = g; x.fillRect(0,0,1200,760);
    x.fillStyle = sari; x.fillRect(0,0,1200,16); x.fillRect(0,744,1200,16);
    /* Başlık */
    x.fillStyle = sari; x.font = "800 40px 'Saira Condensed', sans-serif";
    x.fillText("🪪 İŞÇİ KARNESİ", 60, 96);
    x.fillStyle = "#8B8E99"; x.font = "600 26px sans-serif";
    x.textAlign = "right"; x.fillText("Puantaj Defterim", 1140, 96); x.textAlign = "left";
    /* Ad + kimlik */
    x.fillStyle = "#fff"; x.font = "800 66px 'Saira Condensed', sans-serif";
    x.fillText(ad.slice(0,24), 60, 200);
    x.fillStyle = sari; x.font = "700 34px monospace";
    x.fillText(kod, 60, 252);
    let kidem = "";
    if(ayarlar.iseGiris){
      const y = (Date.now() - new Date(ayarlar.iseGiris+"T12:00:00").getTime()) / (365.25*86400000);
      if(isFinite(y) && y > 0) kidem = y >= 1 ? Math.floor(y)+" YIL KIDEM" : Math.floor(y*12)+" AY KIDEM";
    }
    if(kidem){ x.fillStyle = "#8B8E99"; x.font = "700 28px sans-serif"; x.fillText(kidem, 60, 300); }
    /* Rakam kutuları */
    function kutu(kx, etiket, deger){
      x.fillStyle = "rgba(255,255,255,.06)";
      x.fillRect(kx, 360, 340, 200);
      x.textAlign = "center";
      x.fillStyle = "#8B8E99"; x.font = "700 26px sans-serif";
      x.fillText(etiket, kx+170, 415);
      x.fillStyle = "#fff"; x.font = "800 72px 'Saira Condensed', sans-serif";
      x.fillText(deger, kx+170, 512);
      x.textAlign = "left";
    }
    kutu(60,  "TOPLAM YEVMİYE", String(i.gunToplam||0));
    kutu(430, "MESAİ (SAAT)",   String(i.mesaiToplam||0));
    kutu(800, "PAZAR MESAİSİ",  String(i.pazarToplam||0));
    /* Dip not */
    x.fillStyle = "#8B8E99"; x.font = "600 24px sans-serif";
    x.fillText("Bu karne, işçinin kendi puantaj kayıtlarından üretilmiştir ve işçinin izniyle paylaşılır.", 60, 660);
    x.fillText("Emeğin belgesi, işçinin cebinde 💪", 60, 700);
    c.toBlob(async blob=>{
      if(!blob){ toast("Kart oluşturulamadı"); return; }
      const dosya = new File([blob], "isci-karnem.png", {type:"image/png"});
      try{
        if(navigator.canShare && navigator.canShare({files:[dosya]})){
          await navigator.share({files:[dosya]});
          return;
        }
      }catch(e){ if(e && e.name==="AbortError") return; }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "isci-karnem.png";
      a.click();
      toast("Karnen indirildi 🪪 Galeriden paylaşabilirsin");
    }, "image/png");
  }catch(e){ hataGoster(e); }
}

/* ---------- 📸 Ay Karnesi Story Kartı ---------- */
function karneIstat(t, gizli){
  const satir = [
    ["ÇALIŞILAN GÜN", String(t.gunSayisi||0)],
    ["MESAİ (SAAT)", String(t.mesaiToplam||0)]
  ];
  if(!gizli){
    satir.push(["HAKEDİŞ", paraFmt(t.hakedis||0)]);
    satir.push(["KALAN ALACAK", paraFmt(t.kalan||0)]);
  }else{
    satir.push(["HAKEDİŞ", "••••"]);
    satir.push(["KALAN ALACAK", "••••"]);
  }
  return satir;
}
async function karneKartOlustur(){
  try{
    const t = hesapla();
    if(!(Number(t.gunSayisi) > 0)){ toast("Bu ayda işlenmiş gün yok — önce günleri işle 📅"); return; }
    const c = document.createElement("canvas");
    c.width = 1080; c.height = 1350;
    const x = c.getContext("2d");
    const stil = getComputedStyle(document.body);
    const SARI = (stil.getPropertyValue("--sari")||"#FFC400").trim();
    const g = x.createLinearGradient(0,0,1080,1350);
    g.addColorStop(0,"#191A20"); g.addColorStop(1,"#0C0D11");
    x.fillStyle = g; x.fillRect(0,0,1080,1350);
    x.fillStyle = SARI; x.fillRect(0,0,1080,20); x.fillRect(0,1330,1080,20);
    x.fillStyle = SARI; x.font = "800 46px 'Saira Condensed', sans-serif";
    x.fillText("🏗️ AYLIK KARNEM", 70, 120);
    x.fillStyle = "#fff"; x.font = "800 92px 'Saira Condensed', sans-serif";
    x.fillText(AYLAR[aktifAy].toLocaleUpperCase("tr") + " " + aktifYil, 70, 235);
    const ad = (kullanici && kullanici.displayName) || "";
    if(ad){ x.fillStyle = "#8B8E99"; x.font = "700 34px sans-serif"; x.fillText("👷 " + ad.slice(0,26), 70, 295); }
    const satirlar = karneIstat(t, gizliMod);
    satirlar.forEach((st, i)=>{
      const kx = 70 + (i % 2) * 490, ky = 380 + Math.floor(i / 2) * 300;
      x.fillStyle = "rgba(255,255,255,.06)";
      x.fillRect(kx, ky, 450, 250);
      x.fillStyle = "#8B8E99"; x.font = "700 30px sans-serif";
      x.fillText(st[0], kx + 34, ky + 62);
      x.fillStyle = i < 2 ? "#fff" : SARI;
      x.font = "800 84px 'Saira Condensed', sans-serif";
      x.fillText(st[1], kx + 34, ky + 175);
    });
    x.fillStyle = "#8B8E99"; x.font = "600 30px sans-serif";
    x.fillText("Alın terinin hesabı — Puantaj Defterim 📲", 70, 1160);
    x.fillStyle = SARI; x.font = "800 36px 'Saira Condensed', sans-serif";
    x.fillText("Emeğine sağlık usta 💪", 70, 1230);
    c.toBlob(async blob=>{
      if(!blob){ toast("Karne oluşturulamadı"); return; }
      const dosya = new File([blob], "ay-karnem.png", {type:"image/png"});
      try{
        if(navigator.canShare && navigator.canShare({files:[dosya]})){
          await navigator.share({files:[dosya]});
          return;
        }
      }catch(e){ if(e && e.name === "AbortError") return; }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "ay-karnem.png";
      a.click();
      toast("Karnen indirildi 📸 Galeriden paylaşabilirsin");
    }, "image/png");
  }catch(e){ hataGoster(e); }
}

/* ---------- 🎙️ Sesle gün işleme ---------- */
function sesKomutCoz(m){
  m = String(m||"").toLocaleLowerCase("tr");
  if(!(m.includes("bugün") || m.includes("bugun"))) return null;         /* sadece "bugün..." cümleleri */
  if(m.includes(" mi") || m.includes(" mı") || m.includes("kaç") || m.includes("kac")) return null;  /* soru cümlesi: yazma! */
  const mesaiM = m.match(/(\d+(?:[.,]\d+)?)\s*saat/);
  const mesai = mesaiM ? Number(mesaiM[1].replace(",", ".")) : 0;
  let durum = null;
  if(m.includes("gelmedim") || m.includes("gitmedim")) durum = "gelmedi";
  else if(m.includes("yarım") || m.includes("yarim")) durum = "yarim";
  else if(m.includes("izinli") || m.includes("izin")) durum = "izin";
  else if(m.includes("tam") || m.includes("çalıştım") || m.includes("calistim") || mesai > 0) durum = "tam";
  if(!durum) return null;
  return { durum, mesai: durum === "tam" ? mesai : 0 };
}

/* ---------- 🔊 Gürültü Ölçer ---------- */
function dbHesapla(rms){
  if(!(rms > 0)) return 30;
  const db = Math.round(20 * Math.log10(rms) + 94);   /* kaba kalibrasyon */
  return Math.max(30, Math.min(110, db));
}
function dbDurum(db){
  if(db >= 85) return {m:"⚠️ TEHLİKELİ — kulak koruyucu TAK!", r:"var(--gelmedi)"};
  if(db >= 70) return {m:"Gürültülü — uzun süre kalma", r:"var(--sari)"};
  return {m:"Güvenli seviye ✓", r:"var(--tam)"};
}
let sesAkis = null, sesCtx = null;
async function sesBaslat(){
  try{
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      toast("Bu telefonda mikrofon ölçümü desteklenmiyor 😕"); return;
    }
    sesAkis = await navigator.mediaDevices.getUserMedia({audio: true});
    sesCtx = new (window.AudioContext || window.webkitAudioContext)();
    const kaynak = sesCtx.createMediaStreamSource(sesAkis);
    const coz = sesCtx.createAnalyser();
    coz.fftSize = 2048;
    kaynak.connect(coz);
    const veri = new Float32Array(coz.fftSize);
    $("#ses-alan").classList.remove("gizli");
    (function olc(){
      if(!sesAkis) return;
      coz.getFloatTimeDomainData(veri);
      let kare = 0;
      for(let i = 0; i < veri.length; i++) kare += veri[i] * veri[i];
      const rms = Math.sqrt(kare / veri.length);
      const db = dbHesapla(rms);
      const d = dbDurum(db);
      $("#ses-db").textContent = db + " dB";
      $("#ses-db").style.color = d.r;
      $("#ses-durum").textContent = d.m;
      $("#ses-durum").style.color = d.r;
      const b = $("#ses-bar");
      b.style.width = Math.min(100, (db - 30) / 80 * 100) + "%";
      b.style.background = d.r;
      requestAnimationFrame(olc);
    })();
  }catch(e){
    toast("Mikrofon izni verilmedi ya da açılamadı 🎙️");
  }
}
function sesDurdur(){
  try{ if(sesAkis){ sesAkis.getTracks().forEach(t=> t.stop()); sesAkis = null; } }catch(e){}
  try{ if(sesCtx){ sesCtx.close(); sesCtx = null; } }catch(e){}
  const sa = $("#ses-alan"); if(sa) sa.classList.add("gizli");
}

/* ---------- 🧱 Tuğla Ustası ---------- */
function tuglaKesisim(oncekiX, oncekiW, yeniX, yeniW){
  const sol = Math.max(oncekiX, yeniX);
  const sag = Math.min(oncekiX + oncekiW, yeniX + yeniW);
  return sag > sol ? {x: sol, w: sag - sol} : null;
}
let oyun = null;
function oyunBaslat(){
  $("#oyun-alan").classList.remove("gizli");
  const c = $("#oyun-cnv"), x = c.getContext("2d");
  const W = 300, H = 380, KAT = 26;
  const stil = getComputedStyle(document.body);
  const SARI = (stil.getPropertyValue("--sari")||"#FFC400").trim();
  let rekor = 0;
  try{ rekor = Number(localStorage.getItem("tuglaRekor"))||0; }catch(e){}
  oyun = {
    kule: [{x: 75, w: 150}],       /* taban */
    hx: 0, hw: 150, yon: 1, hiz: 2.2,
    kat: 0, bitti: false
  };
  function ciz(){
    x.fillStyle = "#15161B"; x.fillRect(0, 0, W, H);
    /* kule (en fazla son 11 kat görünür, aşağı kaydır) */
    const gorunur = oyun.kule.slice(-11);
    gorunur.forEach((t, i)=>{
      const y = H - 30 - i * KAT;
      x.fillStyle = i === gorunur.length - 1 ? SARI : "#C89A18";
      x.fillRect(t.x, y, t.w, KAT - 3);
      x.strokeStyle = "#15161B"; x.strokeRect(t.x, y, t.w, KAT - 3);
    });
    if(!oyun.bitti){
      /* kayan tuğla */
      const y = H - 30 - gorunur.length * KAT;
      x.fillStyle = SARI;
      x.fillRect(oyun.hx, y, oyun.hw, KAT - 3);
    }
    x.fillStyle = "#fff"; x.font = "800 18px 'Saira Condensed'";
    x.fillText("KAT: " + oyun.kat, 10, 24);
    if(rekor) { x.textAlign = "right"; x.fillText("REKOR: " + rekor, W - 10, 24); x.textAlign = "left"; }
  }
  function adim(){
    if(!oyun || oyun.bitti) return;
    oyun.hx += oyun.hiz * oyun.yon;
    if(oyun.hx <= 0){ oyun.hx = 0; oyun.yon = 1; }
    if(oyun.hx + oyun.hw >= W){ oyun.hx = W - oyun.hw; oyun.yon = -1; }
    ciz();
    requestAnimationFrame(adim);
  }
  function koy(){
    if(!oyun) return;
    if(oyun.bitti){ oyunBaslat(); return; }  /* yeniden başlat */
    const son = oyun.kule[oyun.kule.length - 1];
    const kes = tuglaKesisim(son.x, son.w, oyun.hx, oyun.hw);
    if(!kes){
      oyun.bitti = true;
      if(oyun.kat > rekor){
        rekor = oyun.kat;
        try{ localStorage.setItem("tuglaRekor", String(rekor)); }catch(e){}
        $("#oyun-skor").textContent = "🏆 YENİ REKOR: " + oyun.kat + " kat! Helal usta!";
      }else{
        $("#oyun-skor").textContent = "Kule devrildi! " + oyun.kat + " kat çıktın — dokun, yeniden dene 💪";
      }
      ciz();
      return;
    }
    oyun.kule.push(kes);
    oyun.kat++;
    oyun.hw = kes.w;
    oyun.hiz = Math.min(6, 2.2 + oyun.kat * 0.18);   /* her katta hızlanır */
    oyun.hx = 0; oyun.yon = 1;
    titret(15);
    $("#oyun-skor").textContent = "";
  }
  c.onpointerdown = koy;
  $("#oyun-skor").textContent = "";
  ciz();
  requestAnimationFrame(adim);
}

/* ---------- 📐 Su Terazisi ---------- */
let teraziAcik = false;
function teraziCiz(beta, gamma){
  const c = $("#terazi-cnv"); if(!c) return;
  const x = c.getContext("2d");
  const M = 130, R = 110;
  x.clearRect(0,0,260,260);
  const stil = getComputedStyle(document.body);
  /* Daire + hedef halkaları */
  x.strokeStyle = (stil.getPropertyValue("--cizgi")||"#333").trim();
  x.lineWidth = 2;
  [R, R*0.55, R*0.18].forEach(r=>{ x.beginPath(); x.arc(M,M,r,0,Math.PI*2); x.stroke(); });
  x.beginPath(); x.moveTo(M-R,M); x.lineTo(M+R,M); x.moveTo(M,M-R); x.lineTo(M,M+R); x.stroke();
  /* Baloncuk */
  const kx = Math.max(-30, Math.min(30, gamma)) / 30 * (R-18);
  const ky = Math.max(-30, Math.min(30, beta))  / 30 * (R-18);
  const egik = Math.sqrt(beta*beta + gamma*gamma);
  const duz = egik <= 0.5;
  x.beginPath();
  x.arc(M + kx, M + ky, 16, 0, Math.PI*2);
  x.fillStyle = duz ? "#35D07F" : (stil.getPropertyValue("--sari")||"#FFC400").trim();
  x.fill();
  const dEl = $("#terazi-derece");
  if(dEl){
    dEl.textContent = egik.toFixed(1) + "°" + (duz ? " ✓ TERAZİDE" : "");
    dEl.style.color = duz ? "#35D07F" : "";
  }
}
function teraziDinle(e){
  if(!teraziAcik) return;
  teraziCiz(Number(e.beta)||0, Number(e.gamma)||0);
}
async function teraziBaslat(){
  if(!window.DeviceOrientationEvent){ toast("Bu telefonda eğim sensörü yok 😕"); return; }
  try{
    if(typeof DeviceOrientationEvent.requestPermission === "function"){
      const izin = await DeviceOrientationEvent.requestPermission();  /* iPhone izni */
      if(izin !== "granted"){ toast("Sensör izni verilmedi"); return; }
    }
  }catch(e){}
  teraziAcik = true;
  $("#terazi-alan").classList.remove("gizli");
  window.removeEventListener("deviceorientation", teraziDinle);
  window.addEventListener("deviceorientation", teraziDinle);
  teraziCiz(0,0);
}

/* ---------- 🕌 Namaz Vakitleri ---------- */
/* VAKIT_ADLAR → sabitler.js'e taşındı */
function vakitSiradaki(timings, simdi){
  const su = simdi.getHours()*60 + simdi.getMinutes();
  for(const [k, ad] of VAKIT_ADLAR){
    if(k === "Sunrise") continue;  /* güneş doğuşu namaz vakti değil */
    const p = String(timings[k]||"").slice(0,5).split(":");
    const dk = Number(p[0])*60 + Number(p[1]);
    if(isFinite(dk) && dk > su) return {ad, kalanDk: dk - su};
  }
  return {ad: "İmsak (yarın)", kalanDk: null};
}
async function vakitYukle(){
  const kap = $("#vakit-liste"); if(!kap) return;
  const il = $("#vakit-il").value || "Istanbul";
  const bugun = tarihId(new Date());
  let sakli = null;
  try{ sakli = JSON.parse(localStorage.getItem("vakit:"+il)||"null"); }catch(e){}
  let timings = (sakli && sakli.tarih === bugun) ? sakli.t : null;
  if(!timings){
    kap.innerHTML = '<div class="bos-mesaj" style="font-size:12.5px">Vakitler alınıyor... 🕌</div>';
    try{
      const r = await zamanAsimli(fetch("https://api.aladhan.com/v1/timingsByCity?city="+encodeURIComponent(il)+"&country=Turkey&method=13"), 9000);
      const j = r && r.ok ? await r.json() : null;
      if(j && j.data && j.data.timings){
        timings = j.data.timings;
        try{ localStorage.setItem("vakit:"+il, JSON.stringify({tarih: bugun, t: timings})); }catch(e){}
      }
    }catch(e){}
    if(!timings && sakli) timings = sakli.t;  /* internetsiz: eski günün saatleri yine fikir verir */
  }
  if(!timings){ kap.innerHTML = '<div class="bos-mesaj" style="font-size:12.5px">Vakitlere ulaşılamadı 📡 İnternetini kontrol edip ili tekrar seç.</div>'; return; }
  const sira = vakitSiradaki(timings, new Date());
  kap.innerHTML = VAKIT_ADLAR.map(([k, ad])=>{
    const saat = String(timings[k]||"").slice(0,5);
    const bu = sira.ad === ad;
    return '<div style="display:flex;justify-content:space-between'+(bu ? ';color:var(--sari);font-weight:800' : '')+'">'+
      '<span>'+(bu ? "▶ " : "")+ad+'</span><b>'+saat+'</b></div>';
  }).join("") +
  (sira.kalanDk !== null
    ? '<div style="margin-top:8px;font-size:13px;color:var(--soluk)">Sıradaki: <b style="color:var(--sari)">'+sira.ad+'</b> — '+
      (sira.kalanDk >= 60 ? Math.floor(sira.kalanDk/60)+" sa "+(sira.kalanDk%60)+" dk" : sira.kalanDk+" dk")+' kaldı</div>'
    : '<div style="margin-top:8px;font-size:13px;color:var(--soluk)">Bugünün vakitleri tamamlandı 🌙</div>');
}
function vakitIlKur(){
  const sec = $("#vakit-il");
  if(!sec || sec.childElementCount) return;
  "Adana,Adıyaman,Afyonkarahisar,Ağrı,Aksaray,Amasya,Ankara,Antalya,Ardahan,Artvin,Aydın,Balıkesir,Bartın,Batman,Bayburt,Bilecik,Bingöl,Bitlis,Bolu,Burdur,Bursa,Çanakkale,Çankırı,Çorum,Denizli,Diyarbakır,Düzce,Edirne,Elazığ,Erzincan,Erzurum,Eskişehir,Gaziantep,Giresun,Gümüşhane,Hakkari,Hatay,Iğdır,Isparta,İstanbul,İzmir,Kahramanmaraş,Karabük,Karaman,Kars,Kastamonu,Kayseri,Kırıkkale,Kırklareli,Kırşehir,Kilis,Kocaeli,Konya,Kütahya,Malatya,Manisa,Mardin,Mersin,Muğla,Muş,Nevşehir,Niğde,Ordu,Osmaniye,Rize,Sakarya,Samsun,Siirt,Sinop,Sivas,Şanlıurfa,Şırnak,Tekirdağ,Tokat,Trabzon,Tunceli,Uşak,Van,Yalova,Yozgat,Zonguldak".split(",").forEach(il=>{
    const o = document.createElement("option");
    o.value = il; o.textContent = il;
    sec.appendChild(o);
  });
  let kayitli = "İstanbul";
  try{ kayitli = localStorage.getItem("vakitIl") || "İstanbul"; }catch(e){}
  sec.value = kayitli;
  sec.addEventListener("change", ()=>{
    try{ localStorage.setItem("vakitIl", sec.value); }catch(e){}
    vakitYukle();
  });
}

/* ---------- 💪 Emek karnesi ---------- */
function emekKarneCiz(){
  const el = $("#emek-karne"); if(!el) return;
  const i = tumIstatistik;
  if(!i || !(i.gunToplam > 0)){ el.textContent = "Günlerini işledikçe burada emek karnen oluşacak 🏗️"; return; }
  const ay = (i.gunToplam/26).toLocaleString("tr-TR",{maximumFractionDigits:1});
  const mesaiGun = (Number(i.mesaiToplam||0)/9).toLocaleString("tr-TR",{maximumFractionDigits:1});
  el.innerHTML =
    "Bu defterde toplam <b>"+i.gunToplam+" yevmiye</b> emeğin var — bu, yaklaşık <b>"+ay+" ay</b> kesintisiz çalışmak demek 🏗️<br>"+
    (Number(i.mesaiToplam)>0 ? "Üstüne <b>"+i.mesaiToplam+" saat mesai</b> — yani <b>"+mesaiGun+" günlük</b> ekstra emek ⏰<br>" : "")+
    (Number(i.pazarToplam)>0 ? "<b>"+i.pazarToplam+" pazar günü</b> herkes yatarken sen çalıştın 🛐<br>" : "")+
    "Helal olsun usta. Bu defter senin emeğinin senedi 📜";
}

/* ---------- 🌅 Günün kartı: selam + dönen içerik ---------- */
const GUNUN_ICERIK = [
  {t:"💬 Günün sözü", m:"Alın teri en helal paradır — döktüğünün hesabını tut, karşılığını sonuna kadar iste."},
  {t:"😄 Günün fıkrası", m:"Usta çırağa: \"Su terazisini getir.\" Çırak: \"Usta su bitti, kola terazisi olur mu?\" 🧱"},
  {t:"💡 Günün bilgisi", m:"Resmi tatilde çalışırsan kanunen 1 günlük ücretine ek olarak zamlı ücret hakkın doğar — patronla konuşurken bil."},
  {t:"💬 Günün sözü", m:"Koca binalar tuğla tuğla, koca birikimler gün gün yükselir. Bugünü de işle 🏗️"},
  {t:"😄 Günün fıkrası", m:"Patron: \"Bu iş yarına biter mi?\" Usta: \"Biter patron, hangi yarına olduğunu sen seç\" 😅"},
  {t:"💡 Günün bilgisi", m:"Yıllık izin hakkı 1 yılı doldurunca başlar: 5 yıla kadar 14, 15 yıla kadar 20, sonrası 26 gün. Araçlar'da sayacın var."},
  {t:"💬 Günün sözü", m:"Mesaiyi yazmayan, emeğini bağışlamış olur. Sen yaz, biz sayarız ⏰"},
  {t:"😄 Günün fıkrası", m:"Şantiyede en uzun mesafe nedir? Yemek molasıyla iş arasındaki son 5 dakika 🍲"},
  {t:"💡 Günün bilgisi", m:"Avans alırken tarihi ve tutarı hemen işle — ay sonu hesap tartışmasının ilacı kayıttır 📲"},
  {t:"💬 Günün sözü", m:"Bugün kimse görmese de sen gördün: emeğini deftere yaz, defter unutmaz."},
  {t:"😄 Günün fıkrası", m:"Kalfa: \"Bu duvar terazisinde mi?\" Çırak: \"Terazide usta ama kefesi hangisi bilmiyorum\" ⚖️"},
  {t:"💡 Günün bilgisi", m:"Kıdem tazminatı her tam yıl için yaklaşık 30 günlük brüt ücrettir — Araçlar'daki hesaplayıcıya yıllarını yaz, gör."},
  {t:"💬 Günün sözü", m:"Bugün döktüğün ter, yarın cebindeki paradır."},
  {t:"💬 Günün sözü", m:"Duvar tuğla tuğla, servet gün gün örülür."},
  {t:"💬 Günün sözü", m:"Beton bekler, hesap beklemez."},
  {t:"💬 Günün sözü", m:"İskele kurulur, iş biter; emek asla boşa gitmez."},
  {t:"💬 Günün sözü", m:"Çalışan demir pas tutmaz."},
  {t:"💬 Günün sözü", m:"Sabır ve mala, ikisi de düz duvar örer."},
  {t:"💬 Günün sözü", m:"Vinç yükü kaldırır, azim adamı kaldırır."},
  {t:"💬 Günün sözü", m:"Erken kalkan yol alır, puantaj tutan hakkını alır."}
];
/* gununKartiCiz kaldırıldı — anaSelamCiz() zaten aynı zaman-bazlı selamı
   veriyor, gunun-karti tamamen tekrardı. İçeriği gununIpucuEkle()'ye taşındı.
   Eski SOZLER dizisi/gununSozCiz() de kaldırıldı — benzersiz sözler yukarıdaki
   havuza taşındı, artık tek yerden (daha zengin) rotasyon dönüyor. */
/* ---------- 🎊 Konfeti (kütüphanesiz) ---------- */
function konfetiPatlat(){
  if(AZ_HAREKET) return;
  const c = document.createElement("canvas");
  c.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9500";
  document.body.appendChild(c);
  const dpr = window.devicePixelRatio||1;
  c.width = innerWidth*dpr; c.height = innerHeight*dpr;
  const x = c.getContext("2d"); x.scale(dpr,dpr);
  const renkler = ["#FFC400","#35D07F","#4C9AFF","#FF5B52","#B388FF","#FFFFFF"];
  const parcalar = Array.from({length:120}, ()=>({
    px: Math.random()*innerWidth, py: -20 - Math.random()*innerHeight*0.4,
    hy: 2 + Math.random()*3.5, hx: (Math.random()-0.5)*2.2,
    b: 5 + Math.random()*6, r: renkler[Math.floor(Math.random()*renkler.length)],
    d: Math.random()*Math.PI*2, dh: (Math.random()-0.5)*0.25
  }));
  const bas = performance.now();
  (function adim(t){
    const gecen = t - bas;
    x.clearRect(0,0,innerWidth,innerHeight);
    parcalar.forEach(p=>{
      p.py += p.hy; p.px += p.hx; p.d += p.dh;
      x.save(); x.translate(p.px, p.py); x.rotate(p.d);
      x.fillStyle = p.r; x.fillRect(-p.b/2, -p.b/3, p.b, p.b*0.66);
      x.restore();
    });
    if(gecen < 3200) requestAnimationFrame(adim);
    else c.remove();
  })(bas);
}

/* ---------- 🗓️ Resmi tatiller (2026 tam liste + 2027 sabitler) ---------- */
/* TATILLER/tatilAd (eksik, 2025 ve 2028'i kapsamıyordu) kaldırıldı —
   artık her yerde sabitler.js'teki tam liste (tatilAdi) kullanılıyor. */
/* ---------- 🔍 Genel Arama ---------- */
function aramaEslesme(q, metinler){
  q = q.toLocaleLowerCase("tr");   /* Türkçe İ→i, I→ı doğru insin */
  return metinler.some(m2=> String(m2||"").toLocaleLowerCase("tr").includes(q));
}
let aramaTazeSayac = 0;
function aramaCalistir(){
  const kap = $("#arama-sonuclar"); if(!kap) return;
  const q = ($("#arama-kutu").value||"").trim();
  /* Önbellek hazırsa sayacı sıfırla — sonraki aramalar tekrar deneyebilsin */
  if(tumGirdilerQS || tumOdemelerQS) aramaTazeSayac = 0;
  if(q.length < 2){
    kap.innerHTML = '<div class="bos-mesaj"><span class="buyuk">🔍</span>En az 2 harf yaz usta.</div>';
    return;
  }
  const sonuc = [];
  /* 📅 Günler: not + şantiye (tüm zamanlar önbelleğinden) */
  try{
    if(tumGirdilerQS) tumGirdilerQS.forEach(doc=>{
      if(sonuc.length >= 60) return;
      const v = doc.data();
      if(aramaEslesme(q, [v.not, v.santiye])){
        const t = new Date(doc.id+"T12:00:00");
        sonuc.push({
          ikon:"📅", renk:"var(--mesai)",
          b: t.getDate()+" "+AYLAR[t.getMonth()]+" "+t.getFullYear(),
          a: (v.santiye ? "📍 "+v.santiye+" · " : "") + (v.not ? String(v.not).slice(0,50) : durumEtiket(v.durum)),
          git: async ()=>{
            /* Önce veriyi getir, SONRA modalı aç — yoksa boş açılıyordu */
            await ayaGecVeBekle(t.getFullYear(), t.getMonth());
            gorunumSec("puantaj");
            modalAc(doc.id);
          }
        });
      }
    });
  }catch(e){}
  /* 💵 Ödemeler: not + tür */
  try{
    if(tumOdemelerQS) tumOdemelerQS.forEach(doc=>{
      if(sonuc.length >= 60) return;
      const o = doc.data();
      if(aramaEslesme(q, [o.not, odemeTurEtiket(o.tur)])){
        const t = new Date((o.tarih||"2000-01-01")+"T12:00:00");
        sonuc.push({
          ikon:"💵", renk:"var(--tam)",
          b: paraFmt(o.tutar)+" — "+odemeTurEtiket(o.tur),
          a: t.getDate()+" "+AYLAR[t.getMonth()]+" "+t.getFullYear()+(o.not ? " · "+String(o.not).slice(0,40) : ""),
          git: async ()=>{
            await ayaGecVeBekle(t.getFullYear(), t.getMonth());
            gorunumSec("odemeler");
          }
        });
      }
    });
  }catch(e){}
  /* 🤝 Borçlar: kişi + not */
  borclar.forEach(b2=>{
    if(sonuc.length >= 60) return;
    if(aramaEslesme(q, [b2.kisi, b2.not])){
      sonuc.push({
        ikon:"🤝", renk:"var(--sari)",
        b: String(b2.kisi||"?") + " — " + paraFmt(borcKalan(b2)) + (b2.odendi ? " (kapandı)" : ""),
        a: b2.yon === "verdim" ? "Alacağın" : "Borcun",
        git: ()=> gorunumSec("borc")
      });
    }
  });
  /* 💳 Kartlar */
  kartlar.forEach(k2=>{
    if(sonuc.length >= 60) return;
    if(aramaEslesme(q, [k2.ad])){
      sonuc.push({
        ikon:"💳", renk:"var(--mesai)",
        b: String(k2.ad) + " — " + paraFmt(Number(k2.borc)||0),
        a: "Son ödeme: ayın " + k2.gun + "'i",
        git: ()=> gorunumSec("kartlar")
      });
    }
  });
  if(!sonuc.length){
    /* "Bulunamadı" ile "henüz yüklenmedi" ayrımı (0.0.9.4).
       Önbellek hazır değilken de sonuç boş dönüyordu ve kullanıcı
       "kaydım yok" sanıyordu. Artık ikisi ayrı mesaj veriyor. */
    const hazir = !!(tumGirdilerQS || tumOdemelerQS);
    kap.innerHTML = hazir
      ? '<div class="bos-mesaj"><span class="buyuk">🤷</span>"'+q.replace(/</g,"&lt;")+'" için kayıt bulunamadı.</div>'
      : '<div class="bos-mesaj"><span class="buyuk">⏳</span>Kayıtların yükleniyor, birkaç saniye…</div>';
    /* Yüklenme bitince aramayı kendiliğinden tazele.
       En fazla 5 kez dener (~6 sn); önbellek hiç gelmezse sonsuz
       döngüye girmesin. İnternet yoksa 5. denemeden sonra susuyor. */
    if(!hazir && aramaTazeSayac < 5){
      aramaTazeSayac++;
      setTimeout(()=>{
        const k = $("#arama-kutu");
        if(k && k.value.trim() === q) aramaCalistir();
      }, 1200);
    }
    return;
  }
  kap.innerHTML = "";
  sonuc.slice(0, 40).forEach(r=>{
    const li = document.createElement("li");
    li.style.cursor = "pointer";
    li.innerHTML =
      '<div class="rozet" style="background:'+r.renk+'">'+r.ikon+'</div>'+
      '<div class="orta"><div class="baslik">'+String(r.b).replace(/</g,"&lt;")+'</div>'+
      '<div class="alt-yazi">'+String(r.a).replace(/</g,"&lt;")+'</div></div>';
    li.addEventListener("click", r.git);
    kap.appendChild(li);
  });
  if(sonuc.length > 40){
    const li = document.createElement("li");
    li.innerHTML = '<div class="bos-mesaj" style="font-size:12px">+'+(sonuc.length-40)+' sonuç daha var — aramayı daralt</div>';
    kap.appendChild(li);
  }
}

/* ---------- 🕛 Gün Devri Bekçisi: gece yarısını kaçırma ---------- */
let bekciSonGun = tarihId(new Date());
function gunDevriKontrol(){
  const su = tarihId(new Date());
  if(su === bekciSonGun) return;
  const onceki = bekciSonGun;
  bekciSonGun = su;
  try{
    /* Kullanıcı eski "bugünün ayında" geziniyorduysa görünümü yeni güne taşı */
    const o = new Date(onceki + "T12:00:00");
    const simdi = new Date();
    if(aktifYil === o.getFullYear() && aktifAy === o.getMonth()){
      aktifYil = simdi.getFullYear();
      aktifAy = simdi.getMonth();
      ayiYukle();
      ayBarCiz();
    }
    anaTazele();
  }catch(e){}
}
setInterval(gunDevriKontrol, 60000);
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) gunDevriKontrol(); });

/* ---------- 🔔 Bildirimler (FCM) ---------- */
const VAPID_ANAHTAR = "BM566mNJdB-9hYvmhkyBNKopP2RMhy1wRuXvXDTds4PAOmMRW8Fq90HYvDY3u744PygXyoCgFAsNVJ9_z9Zm5gA";
function bildirimDestekli(){
  try{
    return "Notification" in window && "serviceWorker" in navigator &&
           firebase.messaging && firebase.messaging.isSupported();
  }catch(e){ return false; }
}
async function bildirimJetonKaydet(){
  const kayit = await navigator.serviceWorker.ready;
  const jeton = await firebase.messaging().getToken({
    vapidKey: VAPID_ANAHTAR,
    serviceWorkerRegistration: kayit
  });
  if(!jeton) throw new Error("jeton yok");
  const kimlik = jeton.slice(-48).replace(/[^\w-]/g, "_");
  await kokRef().collection("cihazlar").doc(kimlik).set({
    jeton,
    zaman: Date.now(),
    cihaz: String(navigator.userAgent||"").slice(0, 90)
  });
  return jeton;
}
async function bildirimAc(){
  const durum = $("#bildirim-durum");
  if(!bildirimDestekli()){
    durum.innerHTML = "Bu tarayıcı bildirimi desteklemiyor 😕 iPhone'daysan önce uygulamayı <b>ana ekrana kur</b>, uygulamadan tekrar dene.";
    return;
  }
  try{
    const izin = await Notification.requestPermission();
    if(izin !== "granted"){
      durum.textContent = "İzin verilmedi — telefon Ayarlar → Bildirimler'den izin verip tekrar dene.";
      return;
    }
    durum.textContent = "Kaydediliyor...";
    await bildirimJetonKaydet();
    try{ localStorage.setItem("bildirimAcik", "1"); }catch(e){}
    durum.innerHTML = "<b style='color:var(--tam)'>Açık ✅</b> — bu telefon duyuru listesinde, haberler artık cebine düşecek.";
    toast("Bildirimler açıldı 🔔");
  }catch(e){
    durum.textContent = "Kurulamadı 😕 İnterneti kontrol edip tekrar dene.";
  }
}
/* 📣 Duyuru kutusu: gelen her bildirim burada birikir */
function duyuruListesiAl(){
  try{ return JSON.parse(localStorage.getItem("duyurular")||"[]"); }catch(e){ return []; }
}
function duyuruBirlestir(mevcut, yeniler){
  const hepsi = mevcut.slice();
  (yeniler||[]).forEach(y=>{
    if(y && y.z && !hepsi.some(m=> m.z === y.z)) hepsi.push(y);
  });
  hepsi.sort((a,b)=> b.z - a.z);
  return hepsi.slice(0, 30);
}
function duyuruKaydet(liste){
  try{ localStorage.setItem("duyurular", JSON.stringify(liste)); }catch(e){}
}
function duyuruListeCiz(){
  const kap = $("#duyuru-liste"); if(!kap) return;
  const liste = duyuruListesiAl();
  if(!liste.length) return;
  kap.innerHTML = liste.slice(0, 10).map(d=>{
    const t = new Date(d.z);
    return '<div style="padding:7px 0;border-bottom:1px dashed var(--cizgi)">'+
      '<b style="color:var(--metin)">'+String(d.b||"Duyuru").replace(/</g,"&lt;")+'</b>'+
      '<div>'+String(d.m||"").replace(/</g,"&lt;")+'</div>'+
      '<div style="font-size:11px">'+t.getDate()+' '+AYLAR[t.getMonth()]+' '+String(t.getHours()).padStart(2,"0")+':'+String(t.getMinutes()).padStart(2,"0")+'</div></div>';
  }).join("");
}
function duyuruEkle(b, m){
  duyuruKaydet(duyuruBirlestir(duyuruListesiAl(), [{b, m, z: Date.now()}]));
  duyuruListeCiz();
}
/* Uygulama kapalıyken SW'nin kutuya bıraktıklarını al */
async function duyuruKutuBosalt(){
  try{
    if(!("caches" in window)) return;
    const kasa = await caches.open("puantaj-duyuru");
    const c = await kasa.match("/kutu");
    if(!c) return;
    const gelenler = await c.json();
    await kasa.delete("/kutu");
    if(Array.isArray(gelenler) && gelenler.length){
      duyuruKaydet(duyuruBirlestir(duyuruListesiAl(), gelenler));
      duyuruListeCiz();
      toast("📣 " + gelenler.length + " yeni duyurun var — Ayarlar'da kutuda");
    }
  }catch(e){}
}
/* Uygulama AÇIKKEN gelen bildirim: üstten şık bant */
function duyuruBantGoster(b, m){
  const bant = $("#duyuru-bant"); if(!bant) return;
  $("#duyuru-bant-baslik").textContent = "📣 " + (b || "Duyuru");
  $("#duyuru-bant-metin").textContent = m || "";
  bant.style.display = "block";
  tik();
  clearTimeout(duyuruBantGoster._z);
  duyuruBantGoster._z = setTimeout(()=>{ bant.style.display = "none"; }, 7000);
}
function onPlanDinle(){
  try{
    if(!bildirimDestekli()) return;
    firebase.messaging().onMessage(p=>{
      const n = (p && (p.notification || p.data)) || {};
      duyuruEkle(n.title || "Duyuru", n.body || "");
      duyuruBantGoster(n.title, n.body);
    });
  }catch(e){}
}
/* 🌙 Akşam dürtmesi: bugün işlenmemişse gerçek bildirimle hatırlat (günde 1 kez) */
function aksamDurtmeliMi(saat, bugunIsli, izinVar, acik, dahaOnce){
  return izinVar && acik && !bugunIsli && saat >= 19 && !dahaOnce;
}
async function aksamDurt(bugunIsli){
  try{
    const bugun = tarihId(new Date());
    const izinVar = "Notification" in window && Notification.permission === "granted";
    const acik = localStorage.getItem("bildirimAcik") === "1";
    const dahaOnce = localStorage.getItem("durt:" + bugun) === "1";
    if(!aksamDurtmeliMi(new Date().getHours(), bugunIsli, izinVar, acik, dahaOnce)) return;
    const kayit = await navigator.serviceWorker.ready;
    await kayit.showNotification("Bugünü işlemedin 📅", {
      body: "Çalıştıysan unutma usta — iki dokunuş, defter tamam 💪",
      icon: undefined, tag: "aksam-durt",
      vibrate: [80, 40, 80]
    });
    localStorage.setItem("durt:" + bugun, "1");
    /* Eski işaretleri temizle. Bu anahtar her gün bir tane ekleniyordu ve
       hiç silinmiyordu — bir yılda 365, üç yılda 1000+ anahtar. Tek başına
       az yer kaplıyor ama localStorage sınırlı ve dolduğunda AYARLARIN
       kaydedilememesine yol açar. Yalnızca son 7 gün tutuluyor. */
    try{
      const esik = tarihId(new Date(Date.now() - 7*86400000));
      Object.keys(localStorage)
        .filter(k => k.startsWith("durt:") && k.slice(5) < esik)
        .forEach(k => localStorage.removeItem(k));
    }catch(e){}
  }catch(e){}
}

/* Daha önce açanlarda jetonu sessizce tazele (jetonlar zamanla değişebilir) */
function bildirimSessizTazele(){
  try{
    if(localStorage.getItem("bildirimAcik") !== "1") return;
    if(!bildirimDestekli() || Notification.permission !== "granted" || !kullanici) return;
    bildirimJetonKaydet().catch(()=>{});
  }catch(e){}
}

/* ---------- 🩺 Bağlantı testi ---------- */
function zamanAsimli(soz, ms){
  return Promise.race([soz, new Promise(c=> setTimeout(()=> c(null), ms))]);
}
async function saglikTesti(){
  const btn = $("#btn-saglik"), kap = $("#saglik-sonuc");
  btn.disabled = true; btn.textContent = "Test ediliyor...";
  const satirlar = [];
  const yaz = ()=> kap.innerHTML = satirlar.join("<br>");
  const ok = "<b style='color:var(--tam)'>✓ çalışıyor</b>";
  const yok = "<b style='color:var(--gelmedi)'>✗ ulaşılamıyor</b>";
  try{
    /* 1. İnternet */
    satirlar.push("📶 İnternet: " + (navigator.onLine ? ok : yok)); yaz();
    /* 2. Veritabanı (Firebase) */
    try{
      const r = await zamanAsimli(kokRef().get(), 7000);
      satirlar.push("☁️ Hesap verisi (Firebase): " + (r ? ok : yok));
    }catch(e){ satirlar.push("☁️ Hesap verisi (Firebase): " + yok); }
    yaz();
    /* 3. Kur servisi */
    try{
      const r = await zamanAsimli(fetch("https://finans.truncgil.com/today.json"), 7000);
      satirlar.push("💰 Kur servisi (dolar/altın): " + (r && r.ok ? ok : yok));
    }catch(e){ satirlar.push("💰 Kur servisi (dolar/altın): " + yok); }
    yaz();
    /* 4. Özel köprü */
    if(OZEL_KOPRU){
      try{
        const r = await zamanAsimli(fetch(OZEL_KOPRU), 7000);
        const m = r ? await r.text() : "";
        satirlar.push("🌉 Senin köprün: " + (m.indexOf("izin yok")>-1 ? ok : "<b style='color:var(--sari)'>△ kurulu ama kod eski</b>"));
      }catch(e){ satirlar.push("🌉 Senin köprün: " + yok); }
    }else{
      satirlar.push("🌉 Senin köprün: <span style='color:var(--soluk)'>kurulmamış (isteğe bağlı)</span>");
    }
    yaz();
    /* 4b. Doğrudan servisler */
    try{
      const r = await zamanAsimli(fetch("https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(HABER_KAYNAK.gundem)), 8000);
      const j = r && r.ok ? await r.json() : null;
      satirlar.push("📰 Doğrudan haber hattı: " + (j && j.status==="ok" ? ok : yok));
    }catch(e){ satirlar.push("📰 Doğrudan haber hattı: " + yok); }
    yaz();
    try{
      const r = await zamanAsimli(fetch("https://pipedapi.kavin.rocks/search?q=deneme&filter=videos"), 8000);
      satirlar.push("▶️ Doğrudan video hattı: " + (r && r.ok ? ok : yok));
    }catch(e){ satirlar.push("▶️ Doğrudan video hattı: " + yok); }
    yaz();
    /* 5. Halka açık köprüler → haber testi */
    const rssHedef = encodeURIComponent("https://news.google.com/rss?hl=tr&gl=TR&ceid=TR:tr");
    const koprular = [
      ["Köprü 1 (allorigins)", "https://api.allorigins.win/raw?url=" + rssHedef],
      ["Köprü 2 (corsproxy)", "https://corsproxy.io/?url=" + rssHedef],
      ["Köprü 3 (codetabs)", "https://api.codetabs.com/v1/proxy?quest=" + rssHedef]
    ];
    let haberVar = false;
    for(const [ad2, url] of koprular){
      try{
        const r = await zamanAsimli(fetch(url), 8000);
        const m = r && r.ok ? await r.text() : "";
        const iyi = m && m.indexOf("<item") > -1;
        if(iyi) haberVar = true;
        satirlar.push("📰 " + ad2 + ": " + (iyi ? ok : yok));
      }catch(e){ satirlar.push("📰 " + ad2 + ": " + yok); }
      yaz();
    }
    const dogrudanIyi = satirlar.some(x=> x.indexOf("Doğrudan haber hattı: <b")>-1 && x.indexOf("✓")>-1);
    satirlar.push("<br>" + ((haberVar || dogrudanIyi)
      ? "📋 Sonuç: Gazete şu an <b>çalışır durumda</b> 👍"
      : "📋 Sonuç: Tüm hatlar kapalı görünüyor — biraz sonra tekrar dene, düzelmezse bu ekranı geliştiriciye at"));
    yaz();
  }finally{
    btn.disabled = false; btn.textContent = "🩺 Hatları test et";
  }
}

/* ---------- 🤝 Zam isteme asistanı ---------- */
let zamVeri = null;   /* {sonYev, oncekiYev, sonTarih, ayFark} */
function zamAnalizMetni(v){
  if(!v || !v.sonYev) return "Analiz için önce birkaç gün işle, yevmiyen günlere işlensin.";
  let m = "Şu anki yevmiyen: <b>"+paraFmt(v.sonYev)+"</b>";
  if(v.oncekiYev && v.sonTarih){
    const t = new Date(v.sonTarih+"T12:00:00");
    const oran = Math.round((v.sonYev/v.oncekiYev - 1)*100);
    m += "<br>Son zammın: <b>"+AYLAR[t.getMonth()]+" "+t.getFullYear()+"</b> ("+paraFmt(v.oncekiYev)+" → "+paraFmt(v.sonYev)+", %"+oran+")";
    m += "<br>Yani <b>"+v.ayFark+" aydır</b> zam almadın" + (v.ayFark>=6 ? " — konuşma vakti gelmiş 👀" : ".");
  }else{
    m += "<br>Kayıtlarında henüz zam görünmüyor — ilk pazarlık için tam zamanı 😉";
  }
  return m;
}
async function zamAnalizYap(){
  const el = $("#zam-analiz"); if(!el) return;
  try{
    tumVeriDinle();
    let gSnap = tumGirdilerQS;
    if(!gSnap) gSnap = await kokRef().collection("girdiler").get();
    const gecmis = [];
    gSnap.forEach(d=>{
      const u = Number(d.data().uYevmiye)||0;
      if(u>0) gecmis.push({id:d.id, yev:u});
    });
    gecmis.sort((a,b)=> a.id<b.id?-1:1);
    const adim = [];
    gecmis.forEach(x=>{ if(!adim.length || adim[adim.length-1].yev!==x.yev) adim.push(x); });
    if(!adim.length){ zamVeri = null; el.innerHTML = zamAnalizMetni(null); return; }
    const son = adim[adim.length-1];
    const onceki = adim.length>1 ? adim[adim.length-2] : null;
    const t = new Date(son.id+"T12:00:00"), simdi = new Date();
    const ayFark = Math.max(0, (simdi.getFullYear()-t.getFullYear())*12 + (simdi.getMonth()-t.getMonth()));
    zamVeri = {sonYev: son.yev, oncekiYev: onceki ? onceki.yev : 0, sonTarih: son.id, ayFark};
    el.innerHTML = zamAnalizMetni(zamVeri);
    if(!$("#zam-hedef").value && son.yev>0)
      $("#zam-hedef").placeholder = "Örn: " + Math.round(son.yev*1.2/50)*50;
  }catch(e){ el.textContent = "Analiz şu an yapılamadı, tekrar dene."; }
}
function zamMesajUret(ton){
  const hedef = sayi($("#zam-hedef").value);
  if(!(hedef>0)){ toast("Önce istediğin yeni yevmiyeyi yaz kanka"); return; }
  const v = zamVeri || {};
  const ad = (kullanici && kullanici.displayName) ? kullanici.displayName.split(" ")[0] : "";
  const suan = v.sonYev>0 ? v.sonYev : (Number(ayarlar.yevmiye)||0);
  const sure = v.ayFark>=1 ? v.ayFark+" aydır aynı yevmiyeyle çalışıyorum" : "bir süredir aynı yevmiyeyle çalışıyorum";
  let m;
  if(ton==="kibar"){
    m = "Ustam merhaba 🙏 Müsait bir vaktinde konuşmak istediğim bir konu var. "+sure+
        (suan>0 ? " ("+paraFmt(suan)+")" : "")+
        ". İşimi severek ve düzgün yaptığımı düşünüyorum. Yevmiyemin "+paraFmt(hedef)+
        " olması konusunu değerlendirmeni rica ediyorum. Emeğin karşılığı konusunda anlayışına güveniyorum, teşekkür ederim."+(ad ? " — "+ad : "");
  }else{
    m = "Ustam selam. "+sure+(suan>0 ? " ("+paraFmt(suan)+")" : "")+
        ". Her şey zamlanırken yevmiye yerinde sayınca emek karşılıksız kalıyor. Bundan sonrası için yevmiyemin "+
        paraFmt(hedef)+" olmasını istiyorum. Uygun görürsen bu haftadan itibaren geçerli olsun, olmazsa oturup konuşalım."+(ad ? " — "+ad : "");
  }
  const ta = $("#zam-mesaj");
  ta.value = m;
  ta.classList.remove("gizli");
  $("#btn-zam-paylas").classList.remove("gizli");
}

/* ---------- 📸 AY KARNESİ: paylaşılır story görseli ---------- */
async function karneOlustur(){
  try{
    const t = hesapla();
    const c = document.createElement("canvas");
    c.width = 1080; c.height = 1920;
    const x = c.getContext("2d");
    const stil = getComputedStyle(document.body);
    const sari = (stil.getPropertyValue("--sari")||"#FFC400").trim();
    /* Zemin */
    const g = x.createLinearGradient(0,0,0,1920);
    g.addColorStop(0,"#15161B"); g.addColorStop(1,"#0B0C10");
    x.fillStyle = g; x.fillRect(0,0,1080,1920);
    /* Üst şerit */
    x.fillStyle = sari; x.fillRect(0,0,1080,14);
    x.textAlign = "center";
    x.fillStyle = sari;
    x.font = "800 46px 'Saira Condensed', sans-serif";
    x.fillText("🏗️ PUANTAJ DEFTERİM", 540, 150);
    x.fillStyle = "#fff";
    x.font = "800 110px 'Saira Condensed', sans-serif";
    x.fillText((AYLAR[aktifAy]||"").toLocaleUpperCase("tr")+" "+aktifYil, 540, 300);
    x.fillStyle = "#8B8E99";
    x.font = "600 40px sans-serif";
    x.fillText("AY KARNEM", 540, 370);
    /* Kutular */
    function kutu(y, etiket, deger, renk){
      x.fillStyle = "rgba(255,255,255,.06)";
      const r = 28, kx = 90, kg = 900, kh = 210;
      x.beginPath();
      x.moveTo(kx+r,y); x.arcTo(kx+kg,y,kx+kg,y+kh,r); x.arcTo(kx+kg,y+kh,kx,y+kh,r);
      x.arcTo(kx,y+kh,kx,y,r); x.arcTo(kx,y,kx+kg,y,r); x.closePath(); x.fill();
      x.fillStyle = "#8B8E99"; x.font = "700 38px sans-serif";
      x.fillText(etiket, 540, y+75);
      x.fillStyle = renk || "#fff"; x.font = "800 92px 'Saira Condensed', sans-serif";
      x.fillText(deger, 540, y+170);
    }
    let y = 470;
    kutu(y, "ÇALIŞTIĞIM GÜN", (t.gunSayisi||0)+" gün", sari); y += 250;
    if((t.mesaiToplam||0) > 0){ kutu(y, "MESAİ", t.mesaiToplam+" saat", "#4C7DFF"); y += 250; }
    if(!gizliMod){
      kutu(y, "HAKEDİŞ", paraFmt(t.hakedis), "#35D07F"); y += 250;
      if(t.kalan > 0){ kutu(y, "KALAN ALACAĞIM", paraFmt(t.kalan), sari); y += 250; }
    }
    if((t.izinli||0) > 0){ kutu(y, "İZİNLİ / RAPORLU", t.izinli+" gün", "#8B8E99"); y += 250; }
    /* Alt imza */
    x.fillStyle = "#8B8E99"; x.font = "600 36px sans-serif";
    x.fillText("Alın terinin hesabı: Puantaj Defterim 📲", 540, 1830);
    /* Paylaş */
    c.toBlob(async blob=>{
      if(!blob){ toast("Görsel oluşturulamadı"); return; }
      const dosya = new File([blob], "ay-karnem.png", {type:"image/png"});
      try{
        if(navigator.canShare && navigator.canShare({files:[dosya]})){
          await navigator.share({files:[dosya]});
          return;
        }
      }catch(e){ if(e && e.name==="AbortError") return; }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "ay-karnem.png";
      a.click();
      toast("Karne indirildi 📸 Galeriden paylaşabilirsin");
    }, "image/png");
  }catch(e){ hataGoster(e); }
}

/* ---------- 📸 İş fotoğrafı ---------- */
let modalFoto;   /* undefined: değişmedi · "": silinecek · dataURL: yeni foto */
function fotoOnizleGoster(url){
  const im = $("#gun-foto-onizle");
  im.src = url; im.classList.remove("gizli");
  $("#btn-foto-sil").classList.remove("gizli");
}
/* Fotoğrafı küçültüp JPEG dataURL yapar (uzun kenar 1000px, ~500KB altı) */
function fotoSikistir(dosya){
  return new Promise((cozul, reddet)=>{
    const okuyucu = new FileReader();
    okuyucu.onerror = ()=> reddet(new Error("dosya okunamadı"));
    okuyucu.onload = ()=>{
      const img = new Image();
      img.onerror = ()=> reddet(new Error("resim açılamadı"));
      img.onload = ()=>{
        try{
          let olcek = 1000 / Math.max(img.width, img.height);
          if(olcek > 1) olcek = 1;
          const c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(img.width*olcek));
          c.height = Math.max(1, Math.round(img.height*olcek));
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          /* WebP, JPEG'e göre aynı kalitede genelde %25-35 daha küçük dosya verir
             (Firestore'un 1MB/belge sınırına daha rahat sığar, daha net kalır).
             Tarayıcı encode desteklemiyorsa toDataURL sessizce başka format döner,
             onu algılayıp JPEG'e otomatik düşüyoruz — hiçbir cihazda bozulma olmaz. */
          const webpDestekli = c.toDataURL("image/webp", 0.5).indexOf("data:image/webp") === 0;
          const format = webpDestekli ? "image/webp" : "image/jpeg";
          let kalite = 0.72, url = c.toDataURL(format, kalite);
          while(url.length > 500000 && kalite > 0.3){
            kalite -= 0.12;
            url = c.toDataURL(format, kalite);
          }
          if(url.length > 900000) reddet(new Error("fotoğraf çok büyük"));
          else cozul(url);
        }catch(e){ reddet(e); }
      };
      img.src = okuyucu.result;
    };
    okuyucu.readAsDataURL(dosya);
  });
}

/* ---------- Tık sesi ---------- */
function tik(){
  try{
    if(localStorage.getItem("ses")!=="1") return;
    const ac = new (window.AudioContext||window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = 880; g.gain.value = 0.08;
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.06);
  }catch(e){}
}

/* ---------- Tam veri önbelleği ----------
   Eskiden her kayıtta TÜM geçmiş sunucudan baştan okunuyordu (yavaş + kota yer).
   Artık iki canlı dinleyici bir kez kurulur; Firestore sonrasında sadece
   DEĞİŞENLERİ gönderir. Ana kart ve özet bu önbellekten beslenir. */
let tumGirdilerQS = null, tumOdemelerQS = null;
let dinleyiciTumG = null, dinleyiciTumO = null;
function tumVeriDinle(){
  if(dinleyiciTumG || !kullanici) return;
  /* KRİTİK DÜZELTME: hata callback'i eskiden tamamen boştu. Firestore bir dinleyici
     hata alınca onu KALICI olarak koparır (kendi kendine yeniden bağlanmaz), ama
     `dinleyiciTumG` dolu kaldığı için yukarıdaki erken çıkış yüzünden bir daha asla
     kurulamıyordu. İki ayrı sonuç doğuruyordu, ikisi de sessiz:
       1) Dinleyici veri geldikten SONRA düşerse, önbellek o anki haliyle DONUYORDU —
          ana ekran para kartı, sonraki tüm kayıtları görmeden eski rakamı göstermeye
          devam ediyordu (kullanıcı yanlış bakiye görüyor, hiçbir uyarı yok).
       2) Önbellek `null` kalırsa, ona bağlı CSV/Excel/PDF dışa aktarımları ödeme
          listesini SESSİZCE BOŞ üretiyordu (patrona verilen raporda alınan tüm
          avanslar eksik çıkıyordu).
     Artık hata olunca önbellek ve tutamaç sıfırlanıyor; bir sonraki `tumVeriDinle()`
     çağrısı dinleyiciyi yeniden kuruyor, kurulana kadar da `anaYukle()` içindeki
     `get()` yedeği devreye giriyor. */
  const dusursen = (hangi)=> ()=>{
    if(hangi==="girdi"){ tumGirdilerQS = null; dinleyiciTumG = null; }
    else{ tumOdemelerQS = null; dinleyiciTumO = null; }
  };
  dinleyiciTumG = kokRef().collection("girdiler").onSnapshot(qs=>{
    tumGirdilerQS = qs; anaTazele();
  }, dusursen("girdi"));
  dinleyiciTumO = kokRef().collection("odemeler").onSnapshot(qs=>{
    tumOdemelerQS = qs; anaTazele(); odemeleriAyaGoreDoldur();
  }, dusursen("odeme"));
}
/* Dışa aktarımlar (CSV/Excel/PDF) için ödeme listesini GARANTİLİ döndürür.
   Önbellek hazırsa onu kullanır; değilse (dinleyici henüz kurulmadıysa ya da
   düştüyse) sunucudan doğrudan çeker. Eskiden bu kontrol her çağrı yerinde
   `if(tumOdemelerQS)` şeklindeydi ve önbellek boşsa rapor sessizce ödemesiz
   üretiliyordu — artık bu mümkün değil. */
async function tumOdemeleriGetir(){
  const liste = [];
  if(tumOdemelerQS){ tumOdemelerQS.forEach(d=> liste.push(d.data())); return liste; }
  /* Bu fonksiyon CSV/Excel/PDF raporlarını besliyor. Hata olursa (ağ, kota,
     izin) rapor üretimi tamamen çöküyordu. Artık boş liste dönüyor: rapor
     ödemesiz de olsa üretilebiliyor ve hata günlüğe düşüyor. */
  try{
    const qs = await kokRef().collection("odemeler").get();
    qs.forEach(d=> liste.push(d.data()));
  }catch(e){
    try{ hataKaydet("tumOdemeleriGetir", e); }catch(_){}
  }
  return liste;
}
/* PDF üreten zincirlerin bir kısmı senkron (jsPDF çağrıları iç içe), yani içeride
   `await` edemiyoruz. Bu yüzden PDF'i tetikleyen ASYNC giriş noktalarında, senkron
   üretim başlamadan ÖNCE bu çağrılıp önbelleğin dolu olduğu garanti ediliyor —
   aksi halde önbellek boşken üretilen PDF, alınan avansları hiç göstermeden çıkardı. */
async function tumOdemeOnbellegiHazirla(){
  if(tumOdemelerQS) return;
  try{ tumOdemelerQS = await kokRef().collection("odemeler").get(); }catch(e){}
}
function tumVeriBirak(){
  if(dinleyiciTumG){ dinleyiciTumG(); dinleyiciTumG = null; }
  if(dinleyiciTumO){ dinleyiciTumO(); dinleyiciTumO = null; }
  tumGirdilerQS = null; tumOdemelerQS = null;
}

/* ---------- Ana ekran: şirket hesap kartı ---------- */
async function anaYukle(){
  try{
    tumVeriDinle();
    let gSnap = tumGirdilerQS, oSnap = tumOdemelerQS;
    if(!gSnap || !oSnap){
      const r = await Promise.all([
        kokRef().collection("girdiler").get(),
        kokRef().collection("odemeler").get()
      ]);
      gSnap = tumGirdilerQS || r[0];
      oSnap = tumOdemelerQS || r[1];
    }
    let hakedis=0, alinan=0;
    const hareketler = [];
    const aylikHak = {}, aylikAlinan = {};
    let gunToplam=0, mesaiToplam=0, artiToplam=0, pazarToplam=0;
    const simdi = new Date();
    const buYilOnEk = String(simdi.getFullYear());
    let buYilMesai = 0;
    const buAyOnEk = simdi.getFullYear()+"-"+pad(simdi.getMonth()+1);
    let buAyHak = 0, buAyGun = 0, buAyMesai = 0;
    /* Haftalık özet: bu haftanın Pazartesi'sinden bugüne */
    const pzt = new Date(simdi); pzt.setDate(simdi.getDate() - ((simdi.getDay()+6)%7));
    const pztId = tarihId(pzt), bugunId2 = tarihId(simdi);
    let haftaGun = 0, haftaHak = 0, haftaMesai = 0, haftaMesaiYev = 0;
    /* Dün hatırlatıcısı için son 7 günün kimlikleri */
    const sonYediGun = [];
    for(let i2=1; i2<=7; i2++){
      const d2 = new Date(simdi); d2.setDate(simdi.getDate()-i2);
      sonYediGun.push(tarihId(d2));
    }
    const islenenSon7 = [];
    let bugunIsli = false, bugunVeri = null, bugunKazanc = 0;
    gSnap.forEach(doc=>{
      const v = doc.data();
      const k = girdiKazanc(v);
      hakedis += k;
      { const ay7 = doc.id.slice(0,7); aylikHak[ay7] = (aylikHak[ay7]||0) + k; }
      if(doc.id.slice(0,7)===buAyOnEk){
        buAyHak += k;
        buAyGun += girdiGun(v);
        buAyMesai += Number(v.mesai)||0;
      }
      if(doc.id >= pztId && doc.id <= bugunId2){
        haftaGun += girdiGun(v);
        haftaHak += k;
        /* Hafta kutusu da yeni mesai alanını okumalı; eskiden yalnızca
           saat alanına bakıyordu ve yeni kayıtlarda "0s" gösteriyordu
           (alt özet 0,5 yevmiye derken). */
        haftaMesai += mesaiSaatMik(v);
        haftaMesaiYev += mesaiYevMik(v);
      }
      if(sonYediGun.indexOf(doc.id) > -1) islenenSon7.push(doc.id);
      if(doc.id === bugunId2){ bugunIsli = true; bugunVeri = v; bugunKazanc = k; }
      gunToplam += girdiGun(v);
      /* Yeni kayıtlarda mesai yevmiye katı, eskilerde saat. İkisi ayrı
         birim olduğu için yevmiye katları artı toplamına ekleniyor,
         saatler ayrı sayılıyor. */
      mesaiToplam += mesaiSaatMik(v);
      artiToplam += (Number(v.arti)||0) + mesaiYevMik(v);
      if(doc.id.slice(0,4)===buYilOnEk) buYilMesai += mesaiSaatMik(v);
      if(girdiGun(v)>0 && new Date(doc.id+"T12:00:00").getDay()===0) pazarToplam++;
      if(k>0 && doc.id.slice(0,7)===buAyOnEk) hareketler.push({tarih:doc.id, tutar:k, tip:"+", baslik:girisEtiket(v)+(v.santiye?" · "+v.santiye:"")});
    });
    oSnap.forEach(doc=>{
      const v = doc.data();
      alinan += Number(v.tutar)||0;
      { const ay7 = odemeAyi(v); if(ay7) aylikAlinan[ay7] = (aylikAlinan[ay7]||0) + (Number(v.tutar)||0); if(ay7===buAyOnEk) hareketler.push({tarih:v.tarih, tutar:Number(v.tutar)||0, tip:"-", baslik:odemeTurEtiket(v.tur)+" aldın"+(v.not?" · "+v.not:"")}); }
    });
    sirketOzet = {hakedis, alinan};
    asistanVeri = {buAyHak, buAyGun, buAyMesai};
    bugunKazancCiz(bugunVeri, bugunKazanc);
    hedefCiz({hakedis: buAyHak}, "ana-hedef-kart", "ana-hedef-icerik");
    /* Not: "Bekleyen aylar" artık Ana ekranda ayrı bir kart değil — tüm aylar
       (ödenmiş/ödenmemiş) artık kendi detaylı hesap kartlarıyla "Maaşlar"
       ekranında duruyor. Ana ekran sadece BU AYI gösteriyor (yukarıda). */
    /* 🚀 Yeni kullanıcı rehberi */
    const rehber = $("#rehber-kart");
    if(rehber){
      let kapandi = false;
      try{ kapandi = localStorage.getItem("rehberKapandi")==="1"; }catch(e){}
      const yeniKullanici = !(ayarlar.yevmiye>0) && gunToplam===0;
      rehber.classList.toggle("gizli", kapandi || !yeniKullanici);
      const a1 = $("#rehber-a1");
      if(a1 && ayarlar.yevmiye>0) a1.innerHTML = "✅ Yevmiyen girildi: "+paraFmt(ayarlar.yevmiye);
    }
    if(aktifGoruntu==="ana"){
      $("#asistan").style.display = "flex";
      if(!asistanSelamladi){
        asistanSelamladi = true;
        const ad = (kullanici && kullanici.displayName) ? kullanici.displayName.split(" ")[0] : "patron";
        const balon = $("#asistan-balon");
        balon.textContent = "Oooo hoş geldin "+ad+"! 👋";
        balon.classList.remove("gizli");
        setTimeout(()=> balon.classList.add("gizli"), 6000);
      }
    }
    tumIstatistik = {gunToplam, mesaiToplam, artiToplam, pazarToplam, hakedisToplam:hakedis, odemeSayisi:oSnap.size, buYilMesai};
    seviyeCiz(); sgkCiz(); mesaiSinirCiz(buYilMesai);
    /* Alacak eşiği uyarısı */
    const esikEl = $("#esik-uyari");
    if(esikEl){
      const kalanTum = hakedis - alinan;
      if(ayarlar.uyariEsik>0 && kalanTum >= ayarlar.uyariEsik){
        esikEl.classList.remove("gizli");
        esikEl.innerHTML = "💰 Şirkette <b>toplamda "+paraFmt(kalanTum)+"</b> biriktin (tüm aylar dahil, eşiğin: "+paraFmt(ayarlar.uyariEsik)+"). Hakedişini istemenin vakti gelmiş olabilir — \"Maaşlar\"dan hangi ayların eksik olduğuna bakabilirsin 😉";
      }else esikEl.classList.add("gizli");
      bildirimKutusuGuncelle();
    }
    const sirketKart = $("#sirket-bakiye").closest(".banka-kart");
    if(sirketKart) sirketKart.classList.add("kart-parla");
    const buAyAlinan = aylikAlinan[buAyOnEk]||0;
    const buAyKalan = buAyHak - buAyAlinan;
    sayacAnim($("#sirket-bakiye"), buAyKalan);
    kurSatirYaz(buAyKalan);
    /* 🔮 Ay sonu tahmini: bu tempoyla ay bitince ne kadar yaparsın */
    const tKart = $("#tahmin-kart");
    if(tKart){
      const gecenGun = simdi.getDate();
      const ayGunSay = new Date(simdi.getFullYear(), simdi.getMonth()+1, 0).getDate();
      if(!gizliMod && gecenGun>=5 && gecenGun<ayGunSay && buAyHak>0){
        /* TAHMİN DÜZ HESAPLA (0.1.3.4)
           Eskiden: buAyHak / geçenGün × ayGünSayısı
           Bu, ORTALAMA üzerinden gidiyordu ve iki yönden yanlıştı:
             1) Takvim gününe bölüyordu — çalışılmayan günler de paydaya
                giriyor, ortalama düşük çıkıyordu
             2) Artı yevmiye ve mesai ortalamaya karışıp yevmiyeden
                farklı bir rakam üretiyordu
           Artık düz hesap: bugüne kadarki hakediş + (kalan iş günü ×
           günlük yevmiye). Pazar günleri iş gününe sayılmıyor. */
        let kalanIsGunu = 0;
        for(let g=gecenGun+1; g<=ayGunSay; g++){
          if(new Date(simdi.getFullYear(), simdi.getMonth(), g).getDay() !== 0) kalanIsGunu++;
        }
        const tahmin = buAyHak + kalanIsGunu * (Number(ayarlar.yevmiye) || 0);
        let m = "🔮 <b>Ay sonu tahmini:</b> Bu tempoyla "+AYLAR[simdi.getMonth()]+" bitince ≈ <b style='color:var(--sari)'>"+paraFmt(tahmin)+"</b> hakediş yaparsın";
        if(ayarlar.hedef>0){
          m += tahmin>=ayarlar.hedef
            ? " — <b>"+paraFmt(ayarlar.hedef)+" hedefini geçiyorsun</b> 🎉"
            : " (hedefin "+paraFmt(ayarlar.hedef)+", biraz gaz lazım 💪)";
        }
        tKart.innerHTML = m;
        tKart.classList.remove("gizli");
      }else tKart.classList.add("gizli");
    }
    /* 🗓️ Tatil uyarısı */
    const tatilKrt = $("#tatil-kart");
    if(tatilKrt){
      const tatilYarin = new Date(simdi); tatilYarin.setDate(simdi.getDate()+1);
      const bugunT = tatilAdi(tarihId(simdi)), yarinT = tatilAdi(tarihId(tatilYarin));
      if(bugunT || yarinT){
        $("#tatil-metin").innerHTML = bugunT
          ? "🎉 <b>Bugün resmi tatil: " + bugunT + "</b><br>Çalıştıysan bil: resmi tatil mesaisi <b>zamlı ücrete</b> tabidir — günü işlemeyi ve mesaini yazmayı unutma 💪"
          : "🎉 <b>Yarın resmi tatil: " + yarinT + "</b><br>Çalışacaksan zamlı ücret hakkın var; tatil yapacaksan şimdiden iyi bayramlar usta! 🙌";
        tatilKrt.classList.remove("gizli");
      }else tatilKrt.classList.add("gizli");
      bildirimKutusuGuncelle();
    }
    aksamDurt(bugunIsli);
    /* 📌 Dün hatırlatıcısı: aktif kullanıcıysa ve dün boşsa */
    const dunKart = $("#dun-kart");
    if(dunKart){
      const dun = new Date(simdi); dun.setDate(simdi.getDate()-1);
      const dunId = tarihId(dun);
      const dunPazar = dun.getDay() === 0;
      const pazarCalisan = pazarToplam > 0;
      const aktifKullanici = islenenSon7.length >= 2;
      const goster = aktifKullanici && islenenSon7.indexOf(dunId) === -1 && (!dunPazar || pazarCalisan);
      dunKart.classList.toggle("gizli", !goster);
      dunKart.dataset.dun = dunId;
      bildirimKutusuGuncelle();
    }
    /* 🎉 İşe giriş yıldönümü */
    const ydKart = $("#yildonumu-kart");
    if(ydKart && ayarlar.iseGiris){
      const g = new Date(ayarlar.iseGiris+"T12:00:00");
      const yilSayi = simdi.getFullYear() - g.getFullYear();
      const bugunMu = isFinite(g) && g.getDate()===simdi.getDate() && g.getMonth()===simdi.getMonth() && yilSayi>=1;
      let kutlandi = false;
      try{ kutlandi = localStorage.getItem("yildonumu:"+simdi.getFullYear())==="1"; }catch(e){}
      if(bugunMu && !kutlandi){
        $("#yildonumu-metin").innerHTML =
          "Bugün işe girişinin <b>"+yilSayi+". yılı!</b> 🥳<br>"+
          "Bu defterde <b>"+gunToplam+" gün</b> emek"+
          (gizliMod ? "" : " ve <b>"+paraFmt(hakedis)+"</b> hakediş")+" biriktirdin.<br>Helal olsun usta, nice yıllara! 💪";
        ydKart.classList.remove("gizli");
        konfetiPatlat();
      }else ydKart.classList.add("gizli");
    }
    /* 💸 Maaş günü geri sayımı */
    const mKart = $("#maas-kart");
    if(mKart){
      const kg = maasKacGun(ayarlar.maasGunu, simdi);
      if(kg===null){ mKart.classList.add("gizli"); }
      else{
        mKart.innerHTML = kg===0
          ? "🎉 Bugün maaş günü! Hayırlı olsun usta 💸"
          : "💸 Maaş gününe <b style='color:var(--sari)'>"+kg+" gün</b> kaldı";
        mKart.classList.remove("gizli");
      }
      bildirimKutusuGuncelle();
    }
    if(buAyGun>0 && buAyHak<=0 && !(ayarlar.yevmiye>0) && !(ayarlar.saatUcret>0)){
      $("#sirket-alt").innerHTML = "⚠️ <b>"+buAyGun+" günün işli ama yevmiyen girili değil!</b> Ayarlar → Ücret ayarları'ndan günlük yevmiyeni yaz, paraların hemen görünsün.";
    }else{
      $("#sirket-alt").innerHTML = (gizliMod ? "Bu ayki hakediş •••• · Alınan ••••"
        : "Bu ayki hakediş "+paraFmt(buAyHak)+" · Alınan "+paraFmt(buAyAlinan))
        + ' <span style="opacity:.75">('+AYLAR[simdi.getMonth()]+" "+simdi.getFullYear()+')</span>'
        + ' <span style="text-decoration:underline">Maaşlar (tüm aylar) ›</span>';
    }
    /* AY SONU TAHMİNİ KUTUSU KALDIRILDI (0.1.3.4)
       0.1.0.8'de eklenen bu ikinci tahmin de ORTALAMA kullanıyordu
       (buAyHak / buAyGun). Kullanıcı ortalamaya dayalı rakamları
       yanıltıcı buldu — haklı: yevmiyeli çalışanda ortalama diye bir
       kavram yok. Zaten yukarıda `#tahmin-kart` ile düz hesaplı bir
       tahmin gösteriliyor; ikisi birden gereksizdi. */
    try{ const tE = $("#ay-tahmin"); if(tE) tE.classList.add("gizli"); }catch(e){}

    hareketler.sort((a,b)=> a.tarih < b.tarih ? 1 : -1);
    const ul = $("#liste-sirket-hareket");
    if(!hareketler.length){
      ul.innerHTML = '<div class="bos-mesaj">🏢 Henüz hareket yok. İlk gününü işleyince burada görünür.</div>';
      return;
    }
    ul.innerHTML = "";
    /* 🏦 Banka ekstresi gibi: yürüyen bakiye + ay başlıkları + ay toplamları */
    const kron = hareketler.slice().sort((a,b)=> (a.tarih||"") < (b.tarih||"") ? -1 : 1);
    let yuruyen = 0;
    const bakiyeler = new Map(), ayNet = {};
    kron.forEach(h=>{
      yuruyen += h.tip==="+" ? h.tutar : -h.tutar;
      bakiyeler.set(h, yuruyen);
      const k = String(h.tarih||"").slice(0,7);
      if(!ayNet[k]) ayNet[k] = {arti:0, eksi:0};
      if(h.tip==="+") ayNet[k].arti += h.tutar; else ayNet[k].eksi += h.tutar;
    });
    let sonAy = null;
    hareketler.slice(0,30).forEach(h=>{
      const t = new Date((h.tarih||"2000-01-01")+"T12:00:00");
      const ayK = String(h.tarih||"").slice(0,7);
      if(ayK !== sonAy){
        sonAy = ayK;
        const n = ayNet[ayK] || {arti:0, eksi:0};
        const bas = document.createElement("li");
        bas.className = "hareket-ay-baslik";
        bas.innerHTML = '<span>'+AYLAR[t.getMonth()]+' '+t.getFullYear()+'</span>'+
          '<span>'+(gizliMod ? "••••" :
            '<span style="color:var(--tam)">+'+paraKisa(n.arti)+'</span> · <span style="color:var(--gelmedi)">−'+paraKisa(n.eksi)+'</span>')+'</span>';
        ul.appendChild(bas);
      }
      const arti = h.tip==="+";
      const li = document.createElement("li");
      const bak = bakiyeler.get(h);
      li.innerHTML =
        '<div class="rozet" style="background:'+(arti?"var(--tam)":"var(--gelmedi)")+'">'+(arti?"＋":"−")+'</div>'+
        '<div class="orta"><div class="baslik">'+h.baslik+'</div>'+
        '<div class="alt-yazi">'+t.getDate()+' '+AYLAR[t.getMonth()]+
          (gizliMod ? '' : ' · kalan: '+paraFmt(bak))+'</div></div>'+
        '<div class="tutar" style="color:'+(arti?"var(--tam)":"var(--gelmedi)")+'">'+(arti?"+":"−")+(gizliMod ? "••••" : paraFmt(h.tutar))+'</div>';
      ul.appendChild(li);
    });
    if(hareketler.length > 30){
      const kalanLi = document.createElement("li");
      kalanLi.className = "hareket-ay-baslik";
      kalanLi.innerHTML = '<span>… '+(hareketler.length-30)+' hareket daha — tam döküm Hesap özetinde</span>';
      ul.appendChild(kalanLi);
    }
  }catch(e){ hataGoster(e); }
}

/* ---------- Ücret çözümleme (zam geçmişi desteği) ----------
   Her gün kaydına, kaydedildiği andaki ücretler işlenir (uYevmiye, uMesai, uEk).
   Böylece zam alınca eski aylar eski ücretten hesaplanmaya devam eder. */
function oranBul(v){
  if(!v) v = {};   /* bozuk kayıtta çökme (0.1.1.9) */
  let yev = ayarlar.yevmiye, mes = ayarlar.mesaiUcret, ek = ayarlar.ekGunluk||0, sa = ayarlar.saatUcret||0;
  if(v.santiyeId){
    const s = (ayarlar.santiyeler||[]).find(x=>x.id===v.santiyeId);
    if(s){ yev = Number(s.yevmiye)||yev; mes = Number(s.mesaiUcret)||mes; }
  }
  /* ÜCRET KAYNAĞI (0.1.2.4 — kökten değişti)
     ─────────────────────────────────────────────────────────────────
     ESKİDEN: her gün, işlendiği andaki ücretle "mühürleniyordu" ve
     hesap o mühürden yapılıyordu. Yevmiye zamlandığında eski günler
     eski ücretten kaldığı için toplam düşük çıkıyordu:
       28,5 gün × 2.500 = 71.250 beklenirken 52.500 görünüyordu.

     Kullanıcı (yevmiyeli inşaat işçisi) haklı olarak şunu söyledi:
     "Günlük yevmiyem kaç TL ise onunla çarpacaksın."
     Yevmiyeli çalışan için hesap budur — gün × yevmiye. Mühürlü eski
     ücretle hesaplamak ne beklentiye ne de patronla yapılan konuşmaya
     uyuyor; belgede rakamlar tutmuyor.

     ARTIK: AYARLARDAKİ GÜNCEL YEVMİYE esas alınıyor.
     Mühürlü değerler (uYevmiye vb.) kayıtta DURUYOR — silinmediler,
     geçmişte ne olduğunu görmek gerekirse duruyorlar — ama hesaba
     girmiyorlar.

     Tek istisna: ŞANTİYE ücreti. Farklı şantiyede farklı yevmiye
     alınıyorsa o şantiyenin ücreti geçerli (yukarıda uygulandı).
     ───────────────────────────────────────────────────────────────── */
  /* Ek ödeme (yol/yemek) güne özel girilmiş olabilir — o korunuyor,
     çünkü 0 da geçerli bir değer ve güne göre değişebiliyor. */
  if(v.uEk!=null) ek = Number(v.uEk)||0;
  const gece = v.uGeceUcret!=null ? Number(v.uGeceUcret) : mes*(1+(ayarlar.geceZam||0)/100);
  return {yev, mes, ek, sa, gece};
}
/* Bir kaydın mesai miktarını döndürür. Yeni kayıtlar yevmiye katı
   (`mesaiYev`), eski kayıtlar saat (`mesai`) tutuyor. Toplamlarda ikisi
   AYNI birimde toplanamaz — bu yüzden ayrı ayrı döndürülüyor. */
/* Mesai özetini metne çevirir. Yeni kayıtlar yevmiye katı, eski kayıtlar
   saat tutuyor; ikisi aynı cümlede farklı birimle yazılmalı. Kullanıcı
   ekranın üç ayrı yerinde çelişkili değer görüyordu (üstte "0 saat",
   altta "0,5 yevmiye") çünkü bazı yerler yalnızca eski alanı okuyordu. */
function mesaiOzetMetni(saatToplam, yevToplam){
  const p = [];
  if(yevToplam > 0)  p.push(String(yevToplam).replace(".", ",") + " yevmiye mesai");
  if(saatToplam > 0) p.push(String(saatToplam).replace(".", ",") + " saat mesai");
  return p.length ? p.join(" · ") : "0 mesai";
}
function mesaiYevMik(v){ return Number(v.mesaiYev)||0; }
function mesaiSaatMik(v){ return (Number(v.mesaiYev)||0) > 0 ? 0 : (Number(v.mesai)||0); }

function girdiKazanc(v){
  /* Bozuk/eksik kayıt gelirse çökme (0.1.1.9). Bu fonksiyon her gün
     kartında, her raporda ve her toplamda çağrılıyor — tek bir null
     kayıt tüm ekranı durdururdu. */
  if(!v) return 0;
  const o = oranBul(v);
  /* MESAİ HESABI (0.0.9.5)
     Yeni sistem: mesai artık SAAT değil, yevmiye katı olarak tutuluyor.
     `mesaiYev` alanı: 1 = X (bir tam yevmiye), 0.5 = / (yarım yevmiye).
     Eski kayıtlarda `mesai` (saat) alanı var ve ONLARA DOKUNULMUYOR —
     kullanıcı kararı: geçmiş tutarlar değişmesin. Eski kayıt saat ×
     saat ücretinden, yeni kayıt yevmiye katından hesaplanıyor.
     Bir kayıtta ikisi birden olmaz: yeni kayıtlar `mesai` yazmıyor. */
  const mYev = Number(v.mesaiYev)||0;
  const m    = Number(v.mesai)||0;
  let k = mYev > 0 ? mYev*(o.yev + o.ek) : m*o.mes;
  if(v.durum==="tam") k += o.yev + o.ek;
  else if(v.durum==="yarim") k += (o.yev + o.ek)/2;
  else if(v.durum==="saatlik"){
    const s = Number(v.saat)||0;
    k += s*o.sa + (s>0 ? o.ek : 0);
  }
  k += (Number(v.arti)||0) * (o.yev + o.ek);
  k += (Number(v.parcaMiktar)||0) * (v.uParcaFiyat!=null ? Number(v.uParcaFiyat) : (ayarlar.parcaFiyat||0));
  /* Gece mesaisi de aynı düzene geçti: `geceYev` yevmiye katı,
     eski `geceMesai` (saat) alanı korunuyor. */
  const gYev = Number(v.geceYev)||0;
  k += gYev > 0 ? gYev*(o.yev + o.ek) : (Number(v.geceMesai)||0) * o.gece;
  return k;
}
/* Bir tarihe (id: "YYYY-AA-GG") pazar/tatil zammı uygulanır mı, uygulanırsa hangi oranda? */
function zamOrani(id){
  if(!id) return {oran:0, sebep:null};
  if(tatilAdi(id) && (ayarlar.tatilZam||0) > 0) return {oran:ayarlar.tatilZam/100, sebep:"tatil"};
  if(new Date(id+"T12:00:00").getDay()===0 && (ayarlar.pazarZam||0) > 0) return {oran:ayarlar.pazarZam/100, sebep:"pazar"};
  return {oran:0, sebep:null};
}
function guncelOranlar(santiyeId, id){
  const z = zamOrani(id);
  const c = 1 + z.oran;
  const s = (ayarlar.santiyeler||[]).find(x=>x.id===santiyeId);
  const yev = s ? (Number(s.yevmiye)||ayarlar.yevmiye) : ayarlar.yevmiye;
  const mes = s ? (Number(s.mesaiUcret)||ayarlar.mesaiUcret) : ayarlar.mesaiUcret;
  return {
    uYevmiye: yev * c,
    uMesai:   mes * c,
    uEk:      (ayarlar.ekGunluk||0) * c,
    uSaatU:   (ayarlar.saatUcret||0) * c,
    uParcaFiyat: (ayarlar.parcaFiyat||0) * c,
    uGeceUcret: mes * c * (1 + (ayarlar.geceZam||0)/100),
    zamOrani: z.oran || 0,
    zamSebep: z.sebep || null
  };
}
/* Bir girdinin "gün" karşılığı (saatlik günler 1 gün sayılır) */
function girdiGun(v){
  if(!v) return 0;
  let g = 0;
  if(v.durum==="tam") g = 1;
  else if(v.durum==="yarim") g = 0.5;
  else if(v.durum==="saatlik") g = (Number(v.saat)||0) > 0 ? 1 : 0;
  return g + (Number(v.arti)||0);
}

function guvenli(ad, fn){
  try{ fn(); }
  catch(e){ console.error("Çizim hatası ["+ad+"]:", e); }
}
function hepsiniCiz(){
  guvenli("ayBar", ayBarCiz);
  guvenli("takvim", takvimCiz);
  guvenli("gunListesi", gunListesiCiz);
  guvenli("odemeler", odemeListesiCiz);
  guvenli("ozet", ozetCiz);
  guvenli("hafta", haftaCiz);
  guvenli("eksik", eksikCiz);
  guvenli("santiyeOzet", santiyeOzetCiz);
  guvenli("selam", anaSelamCiz);
  guvenli("anaHafta", anaHaftaCiz);
  guvenli("masraf", masrafCiz);
}

/* ---------- Ana ekran: selam + hafta şeridi ---------- */
function anaSelamCiz(){
  const ad = ((kullanici && kullanici.displayName) || "").split(" ")[0];
  const st = new Date().getHours();
  const selamSoz = st<6 ? "İyi geceler" : st<12 ? "Günaydın" : st<18 ? "Merhaba" : "İyi akşamlar";
  const selamIkon = st<6 ? "🌙" : st<12 ? "☀️" : st<18 ? "👋" : "🌆";
  $("#selam").textContent = selamSoz + (ad ? ", "+ad : "") + " " + selamIkon;
  const b = new Date();
  const islendi = !!girdiler[tarihId(b)] &&
    b.getFullYear()===aktifYil && b.getMonth()===aktifAy ? !!girdiler[tarihId(b)] : !!girdiler[tarihId(b)];
  $("#selam-alt").textContent = b.getDate()+" "+AYLAR[b.getMonth()]+" "+GUNLER[b.getDay()]+
    (girdiler[tarihId(b)] ? " · Bugünü işledin ✅" : " · Bugünü henüz işlemedin");
  gununIpucuEkle();
  /* Ay sonu / ay başı hatırlatması */
  const kEl = $("#kapanis-uyari");
  if(kEl){
    const sonGun = new Date(b.getFullYear(), b.getMonth()+1, 0).getDate();
    const oncekiAy = new Date(b.getFullYear(), b.getMonth()-1, 1);
    const oncekiKey = oncekiAy.getFullYear()+"-"+pad(oncekiAy.getMonth()+1);
    if(b.getDate() >= sonGun-1){
      kEl.classList.remove("gizli");
      kEl.innerHTML = "📅 <b>Ay bitiyor!</b> Eksik günleri işle, raporu patrona gönder, hesap kapanınca ayı kilitle 🔒";
    }else if(b.getDate() <= 2 && !ayarlar.kapali.includes(oncekiKey)){
      kEl.classList.remove("gizli");
      kEl.innerHTML = "🔒 <b>Geçen ay hâlâ açık.</b> Hesabı bittiyse "+AYLAR[oncekiAy.getMonth()]+" ayını kilitlemeyi unutma (Hesap özeti sayfasından).";
    }else kEl.classList.add("gizli");
    bildirimKutusuGuncelle();
  }
}

function anaHaftaCiz(){
  const kap = $("#hafta-serit");
  if(!kap) return;
  kap.innerHTML = "";
  const b = new Date();
  const pzt = new Date(b);
  pzt.setDate(b.getDate() - ((b.getDay()+6)%7));
  const bugunId = tarihId(b);
  for(let i=0;i<7;i++){
    const d = new Date(pzt); d.setDate(pzt.getDate()+i);
    const id = tarihId(d);
    const v = girdiler[id];
    const el = document.createElement("button");
    el.className = "hs-gun";
    if(d.getDay()===0) el.classList.add("pzr");
    if(id===bugunId) el.classList.add("bugun");
    let isaret = "";
    if(v){
      if(girdiGun(v)>0){ el.classList.add("dolu"); isaret = "✓"; }
      else if(v.durum==="gelmedi"){ el.classList.add("yok"); isaret = "✕"; }
    }
    el.innerHTML = '<span class="ga">'+GUNLER_KISA[i]+'</span><span class="gn">'+d.getDate()+'</span><span class="isaret">'+isaret+'</span>';
    el.addEventListener("click", async ()=>{
      /* Hafta şeridi ay sınırını aşabiliyor (örn. 1 Eylül Pazartesi ise
         şeritte 30 Ağustos da görünür). Başka aya tıklanınca veri
         gelmeden modal açılıyordu ve kayıt BOŞ görünüyordu (0.1.0.4). */
      if(d.getFullYear()!==aktifYil || d.getMonth()!==aktifAy){
        await ayaGecVeBekle(d.getFullYear(), d.getMonth());
      }
      modalAc(id);
    });
    kap.appendChild(el);
  }
}

/* ---------- İşlenmemiş gün uyarısı + ilerleme ---------- */
function eksikCiz(){
  const kart = $("#eksik-kart");
  const b = new Date();
  /* İlerleme çubuğu: ayın iş günlerinin (pazar hariç) kaçı işlendi */
  const sonGun = new Date(aktifYil, aktifAy+1, 0).getDate();
  const buAyMi = b.getFullYear()===aktifYil && b.getMonth()===aktifAy;
  const sinir = buAyMi ? b.getDate() : sonGun;
  let isGunu=0, islenen=0;
  for(let g=1; g<=sinir; g++){
    if(new Date(aktifYil, aktifAy, g).getDay()===0) continue;
    isGunu++;
    if(girdiler[aktifYil+"-"+pad(aktifAy+1)+"-"+pad(g)]) islenen++;
  }
  const yuzde = isGunu ? Math.round(islenen/isGunu*100) : 0;
  $("#ilerleme-yazi").innerHTML = "<span>📊 İşlenen: <b>"+islenen+"/"+isGunu+" iş günü</b></span><b>%"+yuzde+"</b>";
  const dolu = $("#ilerleme-dolu");
  dolu.style.width = yuzde+"%";
  dolu.classList.toggle("tamamlandi", yuzde>=100);

  if(!buAyMi || b.getDate()===1){
    kart.classList.add("gizli");
    const r0=$("#nav-rozet"); if(r0) r0.classList.remove("goster");
    return;
  }
  const eksik = [];
  for(let g=1; g<b.getDate(); g++){
    if(new Date(aktifYil, aktifAy, g).getDay()===0) continue;
    const id = aktifYil+"-"+pad(aktifAy+1)+"-"+pad(g);
    if(!girdiler[id]) eksik.push({g, id});
  }
  const rozet = $("#nav-rozet");
  if(rozet){
    rozet.textContent = eksik.length>9 ? "9+" : eksik.length;
    rozet.classList.toggle("goster", eksik.length>0);
  }
  if(!eksik.length){ kart.classList.add("gizli"); return; }
  kart.classList.remove("gizli");
  const kap = $("#eksik-icerik");
  kap.innerHTML = "";
  eksik.forEach(x=>{
    const b2 = document.createElement("button");
    b2.className = "eksik-cip";
    b2.textContent = x.g + " " + AYLAR[aktifAy].slice(0,3);
    b2.addEventListener("click", ()=> modalAc(x.id));
    kap.appendChild(b2);
  });

  /* PARASAL ETKİ
     Uyarı "3 gün boş bırakmışsın" diyordu — doğru ama soyut. Bu günlerin
     bir kısmı gerçekten gelmediğin gün, bir kısmı İŞARETLEMEYİ UNUTTUĞUN
     gün olabilir; aradaki fark doğrudan cebinden çıkan para.
     Rakamı yazınca uyarı bir hatırlatmadan çok bir uyarıya dönüşüyor.
     Tahmin, o günler TAM ÇALIŞILMIŞ sayılarak yapılıyor — üst sınır;
     metin de bunu "çalıştıysan" diye koşullu söylüyor, kesin bir kayıp
     iddia etmiyor. */
  const paraEl = $("#eksik-para");
  if(paraEl){
    const gunlukTahmin = (function(){
      /* Aynı aydaki gerçek kayıtlardan ortalama al; yoksa ayarlardaki yevmiye */
      const buAyKazanc = Object.keys(girdiler)
        .filter(k=> k.startsWith(aktifYil+"-"+pad(aktifAy+1)))
        .map(k=> girdiKazanc(girdiler[k]))
        .filter(v=> v>0);
      if(buAyKazanc.length) return buAyKazanc.reduce((a,b2)=>a+b2,0)/buAyKazanc.length;
      return Number(ayarlar.yevmiye)||0;
    })();
    if(gunlukTahmin > 0){
      const toplam = gunlukTahmin * eksik.length;
      paraEl.innerHTML =
        '<div class="eksik-para-kutu">'+
          '<span class="ik">💸</span>'+
          '<span class="yz">Bu günlerde çalıştıysan <b>'+paraFmt(toplam)+'</b> hesabında görünmüyor demektir.'+
          (eksik.length>1 ? ' <small>(günlük ≈'+paraFmt(gunlukTahmin)+')</small>' : '')+'</span>'+
        '</div>';
      paraEl.classList.remove("gizli");
    }else{
      paraEl.classList.add("gizli");
    }
  }
}

/* ---------- Şantiye dökümü (bu ay) ---------- */
function santiyeOzetCiz(){
  const ul = $("#liste-santiye-ozet");
  const gruplar = {};
  Object.values(girdiler).forEach(v=>{
    const ad = (v.santiye||"").trim() || "Belirtilmemiş";
    if(!gruplar[ad]) gruplar[ad] = {gun:0, mesai:0, kazanc:0};
    gruplar[ad].gun += girdiGun(v);
    /* Yeni kayıtlarda mesai yevmiye katı; eski saat alanı boş kalıyor.
       Sadece saati toplamak yeni kayıtları görünmez kılıyordu (0.1.1.0). */
    gruplar[ad].mesai += mesaiSaatMik(v);
    gruplar[ad].mesaiYev = (gruplar[ad].mesaiYev||0) + mesaiYevMik(v);
    gruplar[ad].kazanc += girdiKazanc(v);
  });
  const adlar = Object.keys(gruplar);
  if(!adlar.length){
    ul.innerHTML = '<div class="bos-mesaj" style="padding:14px">Bu ay kayıt yok.</div>';
    return;
  }
  ul.innerHTML = "";
  adlar.sort((a,b)=> gruplar[b].kazanc - gruplar[a].kazanc).forEach(ad=>{
    const g = gruplar[ad];
    const li = document.createElement("li");
    li.innerHTML =
      '<div class="rozet" style="background:var(--asfalt)">🏗️</div>'+
      '<div class="orta"><div class="baslik">'+esc(ad)+'</div>'+
      '<div class="alt-yazi">'+g.gun+' gün · '+mesaiOzetMetni(g.mesai||0, g.mesaiYev||0)+'</div></div>'+
      '<div class="tutar">'+paraFmt(g.kazanc)+'</div>';
    ul.appendChild(li);
  });
}

/* ---------- Bu hafta ---------- */
function haftaCiz(){
  const bugun = new Date();
  const kart = $("#hafta-kart");
  if(bugun.getFullYear()!==aktifYil || bugun.getMonth()!==aktifAy){
    kart.classList.add("gizli"); return;
  }
  const pzt = new Date(bugun);
  pzt.setDate(bugun.getDate() - ((bugun.getDay()+6)%7));
  /* Mesai iki birimde olabilir: yeni kayıtlar yevmiye katı (`mesaiYev`),
     eski kayıtlar saat (`mesai`). Bu kutu yalnızca saat alanını okuyordu
     ve yeni kayıtlarda "0s" gösteriyordu — alt özet "0,5 yevmiye" derken.
     Kullanıcı bu çelişkiyi ekranda gördü (0.1.0.1). */
  let gun=0, mesai=0, mesaiYev=0, kazanc=0;
  for(let i=0;i<7;i++){
    const d = new Date(pzt); d.setDate(pzt.getDate()+i);
    const v = girdiler[tarihId(d)];
    if(!v) continue;
    gun += girdiGun(v);
    mesai += mesaiSaatMik(v);
    mesaiYev += mesaiYevMik(v);
    kazanc += girdiKazanc(v);
  }
  /* Hangi birim doluysa o gösteriliyor; ikisi de varsa yevmiye önde */
  const mesaiYazi = mesaiYev > 0 ? String(mesaiYev).replace(".", ",")
                  : mesai > 0   ? String(mesai).replace(".", ",")+"s"
                  : "0";
  kart.classList.remove("gizli");
  $("#hafta-icerik").innerHTML =
    '<div class="ozet-kut"><div class="et">Gün</div><div class="deger">'+gun+'</div></div>'+
    '<div class="ozet-kut mesai-r"><div class="et">Mesai</div><div class="deger">'+mesaiYazi+'</div></div>'+
    '<div class="ozet-kut vurgu"><div class="et">Kazanç</div><div class="deger">'+paraFmt(kazanc)+'</div></div>';
}

function ayBarCiz(){
  $("#ay-ad").firstChild.textContent = AYLAR[aktifAy] + " " + aktifYil;
  const t = hesapla();
  const kilit = ayarlar.kapali.includes(aktifAyAnahtar()) ? " · 🔒" : "";
  /* Mesai artık iki birimde olabilir; ortak metin üreticisi kullanılıyor.
     `hesapla()` yevmiye katlarını artiToplam'a topluyor (0.0.9.5). */
  try{ mutabakatDurumCiz(); }catch(e){}
  $("#ay-alt").textContent = t.gunSayisi + " gün · " +
    mesaiOzetMetni(t.mesaiToplam || 0, t.artiToplam || 0) + kilit;
}

function takvimCiz(){
  const kap = $("#takvim");
  kap.innerHTML = "";
  const ilkGun = new Date(aktifYil, aktifAy, 1);
  let bosluk = (ilkGun.getDay()+6)%7; // Pazartesi başlangıç
  for(let i=0;i<bosluk;i++){
    const el=document.createElement("div"); el.className="hucre bos"; kap.appendChild(el);
  }
  /* O ay masraf girilen günleri önceden bir kümede topla — döngü içinde tekrar tekrar
     .filter/.some çağırmamak için (30 gün × N masraf yerine tek geçişte O(1) bakış) */
  const masrafGunleri = new Set(masraflar.map(m=>m.tarih));
  const gunSayisi = new Date(aktifYil, aktifAy+1, 0).getDate();
  const bugunId = tarihId(new Date());
  for(let g=1; g<=gunSayisi; g++){
    const id = aktifYil+"-"+pad(aktifAy+1)+"-"+pad(g);
    const veri = girdiler[id];
    const el = document.createElement("button");
    el.className = "hucre";
    el.dataset.id = id;   /* gün işlendiğinde o hücreyi vurgulayabilmek için */
    if(new Date(aktifYil, aktifAy, g).getDay()===0) el.classList.add("pazar");
    if(tatilAdi(id)) el.classList.add("tatil");
    if(id===bugunId) el.classList.add("bugun");
    if(veri && veri.durum){
      const renkSinif = veri.durum==="saatlik"
        ? ((Number(veri.saat)||0)>0 ? "d-tam" : "d-gelmedi")
        : "d-"+veri.durum;
      el.classList.add(renkSinif);
    }
    el.innerHTML = "<span>"+g+"</span>";
    if(veri && veri.durum==="saatlik" && Number(veri.saat)>0){
      const s=document.createElement("span");
      s.className="nokta"; s.textContent=veri.saat+"s";
      el.appendChild(s);
    }
    if(takvimPara && veri){
      const k = girdiKazanc(veri);
      if(k>0){
        const p=document.createElement("span");
        p.className="para-yazi";
        p.textContent = k>=1000 ? (Math.round(k/100)/10)+"K" : Math.round(k);
        el.appendChild(p);
      }
    }
    if(veri && Number(veri.mesai)>0){
      const r=document.createElement("span");
      r.className="mesai-rozet"; r.textContent="+"+veri.mesai+"s";
      el.appendChild(r);
    }
    if(veri && veri.foto){
      const f=document.createElement("span");
      f.className="foto-nokta"; f.textContent="📸";
      el.appendChild(f);
    }
    /* İleri tarihli (henüz çalışılmamış) günler: hakedişe dahil oluyorlar ama
       kullanıcı bunu fark etmiyor ve bakiyesini olduğundan yüksek sanıyor.
       Görsel olarak ayırıyoruz — renk/anlam aynı kalıyor, sadece "bu henüz
       gelmedi" bilgisi ekleniyor. */
    if(id > bugunId && veri) el.classList.add("ileri-tarih");
    if(masrafGunleri.has(id)){
      const mk=document.createElement("span");
      mk.className="masraf-nokta"; mk.textContent="🧾"; mk.title="Bu gün masraf kaydı var";
      el.appendChild(mk);
    }
    if(tatilAdi(id)){
      const tk = document.createElement("span");
      tk.className = "foto-nokta";
      tk.style.left = "auto"; tk.style.right = "2px";
      tk.textContent = "🎉";
      tk.title = tatilAdi(id);
      el.appendChild(tk);
    }
    /* Kısa dokunuş: modal aç. Basılı tut: anında tam yevmiye işle. */
    let lpZaman=null, lpAtesledi=false, lpX=0, lpY=0;
    el.addEventListener("contextmenu", e=> e.preventDefault());
    el.addEventListener("pointerdown", e=>{
      lpAtesledi=false; lpX=e.clientX; lpY=e.clientY;
      lpZaman=setTimeout(()=>{ lpAtesledi=true; hizliIsaretle(id); }, 550);
    });
    el.addEventListener("pointermove", e=>{
      /* Takvimi kaydırırken yanlışlıkla gün işlenmesin */
      if(Math.abs(e.clientX-lpX) > 12 || Math.abs(e.clientY-lpY) > 12) clearTimeout(lpZaman);
    });
    ["pointerup","pointerleave","pointercancel"].forEach(ev=>
      el.addEventListener(ev, ()=> clearTimeout(lpZaman)));
    el.addEventListener("click", ()=>{
      if(lpAtesledi){ lpAtesledi=false; return; }
      modalAc(id);
    });
    kap.appendChild(el);
  }

  /* ── AY ÖZETİ ────────────────────────────────────────────────────
     Çalışılan gün / hakediş / mesai, takvimin hemen altında.
     Bu rakamlar Hesap Özeti ekranında zaten hesaplanıyordu ama
     kullanıcı takvime bakarken oraya gitmek zorundaydı — soru tam da
     takvime bakarken doğuyor. hesaplaAralik() yeniden kullanılıyor,
     yeni bir hesap yazılmadı: tek kaynak, tutarsızlık riski yok. */
  try{
    const oz = document.getElementById("takvim-ozet");
    if(oz){
      const t = hesaplaAralik(1, new Date(aktifYil, aktifAy+1, 0).getDate());
      oz.innerHTML =
        '<div class="to-kut g"><span class="e">ÇALIŞILAN</span>'+
          '<b>'+t.gunSayisi+'</b><small>gün</small></div>'+
        '<div class="to-kut p"><span class="e">HAKEDİŞ</span>'+
          /* TAM RAKAM (0.1.0.2) — kısaltma kaldırıldı.
             Kutuda "3,8B" yazıyordu ama hemen üstündeki kazanç kartında
             "3.750 ₺" görünüyordu; aynı tutarın yuvarlanmış hâli yanlış
             hesap izlenimi veriyordu. Kutuya 7 karakter rahat sığıyor
             ("125.000"), yani milyonun altında kısaltmaya gerek yok.
             Milyon üstünde yer darlığı için paraKisa devrede kalıyor. */
          '<b>'+(gizliMod ? "••••"
                : (t.hakedis >= 1000000 ? paraKisa(t.hakedis)
                                        : Math.round(t.hakedis).toLocaleString("tr-TR")))+'</b><small>₺</small></div>'+
        '<div class="to-kut m"><span class="e">MESAİ</span>'+
          /* Ondalık ayracı Türkçe virgül: "0.5" değil "0,5" */
          '<b>'+String(t.artiToplam>0 ? t.artiToplam : t.mesaiToplam).replace(".", ",")+'</b>'+
          '<small>'+(t.artiToplam>0 ? "yevmiye" : "saat")+'</small></div>';
    }
  }catch(e){}

}

function durumEtiket(d){
  return d==="tam" ? "Tam yevmiye" : d==="yarim" ? "Yarım yevmiye" : d==="gelmedi" ? "Gelmedim" : d==="saatlik" ? "Saatlik çalışma" : d==="izin" ? "İzinli / Raporlu" : "";
}
function girisEtiket(v){
  if(!v) return "";
  if(v.durum==="saatlik") return (Number(v.saat)||0) + " saat çalışma";
  return durumEtiket(v.durum);
}
function durumRenk(d){
  return (d==="tam"||d==="saatlik") ? "var(--tam)" : d==="yarim" ? "var(--yarim)" : d==="izin" ? "var(--mesai)" : "var(--gelmedi)";
}

function gunListesiCiz(){
  const ul = $("#liste-gunler");
  const ara = trKucuk($("#kayit-ara").value||"").trim();
  let idler = Object.keys(girdiler).sort();
  if(kayitSirala==="yeni") idler.reverse();
  if(ara){
    idler = idler.filter(id=>{
      const v = girdiler[id];
      return trKucuk((v.not||"")+" "+(v.santiye||"")+" "+girisEtiket(v)).includes(ara);
    });
  }
  if(!idler.length){
    ul.innerHTML = ara
      ? '<div class="bos-mesaj">🔎 "'+ara+'" ile eşleşen kayıt yok.</div>'
      : '<div class="bos-mesaj"><span class="buyuk">🗓️</span>Bu ay henüz kayıt yok.<br>Takvimden bir güne dokun ya da "Bugünü işle" butonunu kullan.</div>';
    return;
  }
  ul.innerHTML = "";
  idler.forEach(id=>{
    const v = girdiler[id];
    const t = new Date(id+"T12:00:00");
    const li = document.createElement("li");
    /* Yeni kayıtlarda mesai yevmiye katı; eskiden yalnızca saat okunduğu
       için listede hiç görünmüyordu (0.1.1.1). */
    const mYevL = Number(v.mesaiYev)||0;
    const mesaiIsaret = mYevL>0
      ? (function(){ const t=Math.floor(mYevL), b=(mYevL-t)>=0.5;
          return (t<=3 ? "X".repeat(t) : t+"X") + (b?"/":"") || "/"; })()
      : "";
    const mesaiYazi = (mYevL>0 ? " · +"+mesaiIsaret+" mesai"
                     : Number(v.mesai)>0 ? " · +"+String(v.mesai).replace(".",",")+" saat mesai" : "") + (Number(v.arti)>0 ? " · "+v.arti+" artı" : "");
    const notYazi = [(v.basSaat&&v.bitSaat ? "🕐 "+v.basSaat+"–"+v.bitSaat : ""), v.santiye, (Number(v.parcaMiktar)>0 ? "📦 "+v.parcaMiktar+" "+(ayarlar.parcaBirim||"adet") : ""), v.not, (v.konum&&v.konum.adres ? "📍 "+v.konum.adres : "")].filter(Boolean).join(" — ");
    li.innerHTML =
      '<div class="rozet" style="background:'+durumRenk(v.durum)+'">'+t.getDate()+'<small>'+AYLAR[t.getMonth()].slice(0,3)+'</small></div>'+
      '<div class="orta"><div class="baslik">'+GUNLER[t.getDay()]+' · '+girisEtiket(v)+mesaiYazi+'</div>'+
      '<div class="alt-yazi">'+esc(notYazi||"—")+'</div></div>';
    li.style.cursor="pointer";
    li.addEventListener("click", ()=> modalAc(id));
    ul.appendChild(li);
  });
}

function odemeTurRenk(t){
  return t==="avans" ? "var(--sari)" : t==="askeriye" ? "var(--mesai)" : t==="hakedis" ? "var(--tam)" : t==="kesinti" ? "var(--gelmedi)" : "var(--mesai)";
}
function odemeTurEtiket(t){
  return t==="avans" ? "Avans" : t==="askeriye" ? "Askeriye" : t==="hakedis" ? "Hakediş" : t==="kesinti" ? "Kesinti" : "Diğer";
}

function odemeListesiCiz(){
  const ul = $("#liste-odemeler");
  let gorunen = odemeFiltre ? odemeler.filter(o=> (o.tur||"diger")===odemeFiltre) : odemeler;
  const oAra = trKucuk(($("#odeme-ara")&&$("#odeme-ara").value)||"").trim();
  if(oAra) gorunen = gorunen.filter(o=> trKucuk(o.not||"").includes(oAra) || trKucuk(odemeTurEtiket(o.tur)).includes(oAra));
  const toplamEl = $("#odeme-toplam");
  if(toplamEl) toplamEl.textContent = gorunen.length ? "Toplam: "+paraFmt(gorunen.reduce((s,o)=>s+(Number(o.tutar)||0),0)) : "";
  if(!gorunen.length){
    ul.innerHTML = '<div class="bos-mesaj"><span class="buyuk">💸</span>'+(odemeFiltre ? 'Bu türde kayıt yok.' : 'Bu ay para girişi yok.')+'</div>';
    return;
  }
  ul.innerHTML = "";
  gorunen.forEach(o=>{
    const t = new Date(o.tarih+"T12:00:00");
    const li = document.createElement("li");
    li.innerHTML =
      '<div class="rozet" style="background:'+odemeTurRenk(o.tur)+(o.tur==="avans" ? ";color:#111" : "")+'">'+t.getDate()+'<small>'+AYLAR[t.getMonth()].slice(0,3)+'</small></div>'+
      '<div class="orta" style="cursor:pointer"><div class="baslik">'+odemeTurEtiket(o.tur)+' <span style="font-size:11px;color:var(--soluk)">✏️ düzenle</span></div>'+
      '<div class="alt-yazi">'+esc(o.not||"—")+'</div></div>'+
      '<div class="tutar">'+paraFmt(o.tutar)+'</div>'+
      (o.dekontlu ? '<button class="sil" aria-label="Dekont" style="color:var(--sari)">🏦</button>' : '')+
      '<button class="sil" aria-label="Sil">🗑️</button>';
    const dkBtn = li.querySelector('[aria-label="Dekont"]');
    if(dkBtn) dkBtn.addEventListener("click", async ()=>{
      dkBtn.textContent = "⏳";
      try{
        const d3 = await kokRef().collection("dekontlar").doc(o.id).get();
        dkBtn.textContent = "🏦";
        const f = d3.exists ? d3.data().veri : null;
        if(!f){ toast("Dekont bulunamadı"); return; }
        geriKaydet();
        const b = $("#foto-buyuk");
        b.querySelector("img").src = f;
        b.style.display = "flex";
      }catch(err){ dkBtn.textContent = "🏦"; toast("Dekont yüklenemedi, internete bak"); }
    });
    li.querySelector(".orta").addEventListener("click", ()=>{
      if(ayKilitli(odemeAyi(o)+"-15")){ toast("Bu ay kilitli 🔒 Hesap özetinden açabilirsin"); return; }
      duzenlenenOdeme = o;
      $("#odeme-tarih").value = o.tarih;
      const aaSel = $("#odeme-ait-ay");
      if(aaSel){
        const gercekAy = odemeAyi(o);
        if(![...aaSel.options].some(op=>op.value===gercekAy)){
          const [yy,aa2] = gercekAy.split("-").map(Number);
          const op2 = document.createElement("option");
          op2.value = gercekAy; op2.textContent = AYLAR[aa2-1]+" "+yy;
          aaSel.appendChild(op2);
        }
        aaSel.value = gercekAy;
      }
      $("#odeme-tutar").value = o.tutar;
      $("#odeme-tur").value = o.tur||"diger";
      $("#odeme-not").value = o.not||"";
      $("#btn-odeme-ekle").textContent = "✏️ Güncelle";
      $("#btn-odeme-vazgec").classList.remove("gizli");
      window.scrollTo({top:0, behavior:"smooth"});
      toast("Düzenleme modu: bilgileri değiştir, Güncelle'ye bas");
    });
    li.querySelector('[aria-label="Sil"]').addEventListener("click", async ()=>{
      if(ayKilitli(odemeAyi(o)+"-15")){ toast("Bu ay kilitli 🔒 Hesap özetinden açabilirsin"); return; }
      const kopya = {...o}; delete kopya.id;
      /* Dekontu silmeden ÖNCE belleğe al ki "GERİ AL" onu da geri getirebilsin */
      let dekontYedek = null;
      let dekontOkunamadi = false;
      if(o.dekontlu){
        try{
          const dd = await kokRef().collection("dekontlar").doc(o.id).get();
          if(dd.exists) dekontYedek = dd.data();
        }catch(e){
          /* Fiş ile aynı kritik hata: yedek alınamazsa dekont silinmemeli,
             yoksa "GERİ AL" onu geri getiremiyor ve dekont kalıcı kayboluyor. */
          dekontOkunamadi = true;
          try{ hataKaydet("dekontYedek", e); }catch(_){}
        }
        if(dekontOkunamadi){
          toast("⚠️ Dekont okunamadı — ödeme silinmedi. İnternetini kontrol et.");
          return;
        }
        kokRef().collection("dekontlar").doc(o.id).delete().catch(()=>{});
      }
      try{
        await kokRef().collection("odemeler").doc(o.id).delete();
        toastGeriAlVeri("Ödeme silindi", "odemeler", o.id, kopya,
                        dekontYedek ? {koleksiyon:"dekontlar", veri:dekontYedek} : null);
      }catch(e){ hataGoster(e); }
    });
    ul.appendChild(li);
  });
}

/* Koleksiyon kaydı için geri al */
/* mesaj/koleksiyon/id/veri: geri alınacak ANA kayıt.
   ek (isteğe bağlı): {koleksiyon, veri} — o kayda bağlı fotoğraf/belge (fiş, dekont).
   DÜZELTME: eskiden bu fonksiyon sadece ana kaydı geri getiriyordu. Oysa masraf/ödeme
   silinirken bağlı fotoğraf da siliniyordu ve geri alma onu kurtarmıyordu — kullanıcı
   "GERİ AL"a bastığında kayıt geri geliyor, `fisli:true` bayrağı da geri geliyor, ama
   fotoğrafın kendisi çoktan yok olduğu için 🧾 düğmesi "Fiş fotoğrafı bulunamadı"
   diyordu. Fotoğraf kalıcı olarak kaybedilmiş oluyordu. Artık fotoğraf silinmeden
   önce belleğe alınıp geri almada birlikte yazılıyor. */
function toastGeriAlVeri(mesaj, koleksiyon, id, veri, ek){
  const t = $("#toast");
  t.innerHTML = "";
  t.appendChild(document.createTextNode(mesaj + " "));
  const b = document.createElement("button");
  b.textContent = "GERİ AL";
  b.style.cssText = "margin-left:10px;color:var(--sari);font-weight:800;font-size:14px";
  b.addEventListener("click", async ()=>{
    try{
      await kokRef().collection(koleksiyon).doc(id).set(veri);
      if(ek && ek.koleksiyon && ek.veri!=null){
        try{ await kokRef().collection(ek.koleksiyon).doc(id).set(ek.veri); }catch(e){}
      }
      toast("Geri alındı ↩️");
    }catch(e){ hataGoster(e); }
  });
  t.appendChild(b);
  t.classList.add("goster");
  clearTimeout(toastZaman);
  toastZaman = setTimeout(()=> t.classList.remove("goster"), 5500);
}

function hesapla(){
  let tam=0, yarim=0, gelmedi=0, izinli=0, mesaiToplam=0, saatToplam=0, gunSayisi=0;
  let yevmiyeKazanc=0, mesaiKazanc=0, ekKazanc=0, parcaKazanc=0, geceKazanc=0;
  let zamGun=0, zamKazanc=0;
  Object.values(girdiler).forEach(v=>{
    const o = oranBul(v);
    let gunKazanc = 0;
    if(v.durum==="tam"){ tam++; yevmiyeKazanc+=o.yev; ekKazanc+=o.ek; gunKazanc += o.yev+o.ek; }
    else if(v.durum==="yarim"){ yarim++; yevmiyeKazanc+=o.yev/2; ekKazanc+=o.ek/2; gunKazanc += (o.yev+o.ek)/2; }
    else if(v.durum==="gelmedi") gelmedi++;
    else if(v.durum==="izin") izinli++;
    else if(v.durum==="saatlik"){
      const s = Number(v.saat)||0;
      saatToplam += s;
      yevmiyeKazanc += s*o.sa;
      if(s>0) ekKazanc += o.ek;
      gunKazanc += s*o.sa + (s>0 ? o.ek : 0);
    }
    gunSayisi += girdiGun(v);
    const m = mesaiSaatMik(v);
    const mY = mesaiYevMik(v);
    mesaiToplam += m;
    mesaiKazanc += m*o.mes + mY*(o.yev + o.ek);
    gunKazanc += m*o.mes + mY*(o.yev + o.ek);
    const pMiktar = Number(v.parcaMiktar)||0;
    if(pMiktar>0){
      const pTutar = pMiktar * (v.uParcaFiyat!=null ? Number(v.uParcaFiyat) : (ayarlar.parcaFiyat||0));
      parcaKazanc += pTutar;
      gunKazanc += pTutar;
    }
    const gMesai = Number(v.geceMesai)||0;
    if(gMesai>0){
      const gTutar = gMesai * o.gece;
      geceKazanc += gTutar;
      gunKazanc += gTutar;
    }
    /* Pazar/bayram zammından bu güne düşen ekstra pay (mühürlenmiş orandan geri hesaplanır) */
    if(v.zamOrani>0 && gunKazanc>0){ zamGun++; zamKazanc += gunKazanc * (v.zamOrani/(1+v.zamOrani)); }
  });
  const hakedis = yevmiyeKazanc + mesaiKazanc + ekKazanc + parcaKazanc + geceKazanc;
  const alinan = odemeler.reduce((s,o)=> s + (Number(o.tutar)||0), 0);
  const masrafToplam = masraflar.filter(m=>!m.odendi).reduce((s,m)=> s + (Number(m.tutar)||0), 0);
  return { tam, yarim, gelmedi, izinli, mesaiToplam, saatToplam, gunSayisi,
           yevmiyeKazanc, mesaiKazanc, ekKazanc, parcaKazanc, geceKazanc, hakedis, alinan, masrafToplam,
           zamGun, zamKazanc,
           kalan: hakedis + masrafToplam - alinan };
}

/* ---------- Çalışma serisi (üst üste gün, pazar seriyi bozmaz) ---------- */
function seriHesapla(){
  const sonGun = new Date(aktifYil, aktifAy+1, 0).getDate();
  let seri=0, maksSeri=0, pazarCalisma=0;
  for(let g=1; g<=sonGun; g++){
    const d = new Date(aktifYil, aktifAy, g);
    const v = girdiler[aktifYil+"-"+pad(aktifAy+1)+"-"+pad(g)];
    const calisti = v && girdiGun(v)>0;
    if(d.getDay()===0){
      if(calisti){ pazarCalisma++; seri++; }
      /* pazar boşsa seri bozulmaz */
    }else{
      if(calisti) seri++; else seri=0;
    }
    if(seri>maksSeri) maksSeri=seri;
  }
  return {maksSeri, pazarCalisma};
}

/* ---------- Gün modalında canlı kazanç ---------- */
function modalKazancGuncelle(){
  try{
    const saatlikMod = ayarlar.calismaTipi==="saatlik";
    const secId = $("#gun-santiye-sec").value || "";
    const temp = {
      durum: saatlikMod ? "saatlik" : modalDurum,
      /* Önizleme de yeni alanı kullanmalı, yoksa "bu gün kazancın"
         satırı kaydedilecek tutarı yanlış gösterir (0.0.9.5). */
      mesaiYev: sayi($("#mesai-saat").value, true)||0,
      arti: sayi($("#gun-arti").value, true)||0,
      parcaMiktar: sayi($("#gun-parca-miktar").value, true)||0,
      geceYev: sayi($("#gun-gece-mesai").value, true)||0,
      santiyeId: secId,
      ...guncelOranlar(secId, modalTarih)
    };
    if(saatlikMod) temp.saat = sayi($("#gun-saat").value, true)||0;
    const toplam = girdiKazanc(temp);
    $("#gun-kazanc-tutar").textContent = paraFmt(toplam);
    /* 🧾 Kalem kalem döküm — adam neyin ne kadar kazandırdığını görsün */
    const dok = $("#gun-kazanc-dokum");
    if(dok){
      const o = oranBul(temp);
      const parcalar = [];
      const zam = zamOrani(modalTarih);
      if(zam.oran>0) parcalar.push((zam.sebep==="tatil" ? "🎉 Resmi/dini bayram" : "🛐 Pazar günü")+" — %"+Math.round(zam.oran*100)+" zamlı hesaplanıyor");
      const m = Number(temp.mesai)||0, a = Number(temp.arti)||0;
      if(saatlikMod){
        const st = Number(temp.saat)||0;
        if(st>0) parcalar.push(st+" saat × "+paraFmt(o.sa)+" = <b>"+paraFmt(st*o.sa)+"</b>");
        if(st>0 && o.ek>0) parcalar.push("Yol + yemek <b>"+paraFmt(o.ek)+"</b>");
      }else if(temp.durum==="tam"){
        parcalar.push("Tam yevmiye <b>"+paraFmt(o.yev)+"</b>");
        if(o.ek>0) parcalar.push("Yol + yemek <b>"+paraFmt(o.ek)+"</b>");
      }else if(temp.durum==="yarim"){
        parcalar.push("Yarım yevmiye <b>"+paraFmt((o.yev+o.ek)/2)+"</b>"+(o.ek>0 ? " (yol/yemek dahil)" : ""));
      }else if(temp.durum==="gelmedi"){
        parcalar.push("Gelmedin — yevmiye işlenmez 🚫");
      }else if(temp.durum==="izin"){
        parcalar.push("İzinli/raporlu — yevmiye işlenmez 🏖️");
      }
      if(m>0) parcalar.push("Mesai "+m+" saat × "+paraFmt(o.mes)+" = <b>"+paraFmt(m*o.mes)+"</b>");
      if(a>0) parcalar.push("Gün içi artı "+a+" × "+paraFmt(o.yev+o.ek)+" = <b>"+paraFmt(a*(o.yev+o.ek))+"</b>");
      const pM = Number(temp.parcaMiktar)||0;
      if(pM>0) parcalar.push("📦 "+pM+" "+(ayarlar.parcaBirim||"adet")+" × "+paraFmt(temp.uParcaFiyat)+" = <b>"+paraFmt(pM*temp.uParcaFiyat)+"</b>");
      const gM = Number(temp.geceMesai)||0;
      if(gM>0) parcalar.push("🌙 Gece mesaisi "+gM+" saat × "+paraFmt(temp.uGeceUcret)+" = <b>"+paraFmt(gM*temp.uGeceUcret)+"</b>");
      dok.innerHTML = parcalar.length ? parcalar.map(p=>"• "+p).join("<br>") : "";
      dok.style.display = parcalar.length ? "block" : "none";
    }
  }catch(e){}
}

function ozetCiz(){
  const t = hesapla();
  const seri = seriHesapla();
  $("#ozet-grid").innerHTML =
    kut("Tam yevmiye", t.tam + " gün", "tam-r") +
    kut("Yarım yevmiye", t.yarim + " gün", "") +
    (t.saatToplam>0 ? kut("Normal çalışma", t.saatToplam + " saat", "tam-r") : "") +
    kut("Toplam mesai", t.mesaiToplam + " saat", "mesai-r") +
    (seri.maksSeri>=2 ? kut("🔥 En uzun seri", seri.maksSeri + " gün", "tam-r") : "") +
    (seri.pazarCalisma>0 ? kut("Pazar çalışması", seri.pazarCalisma + " gün", "mesai-r") : "") +
    kut("Gelmediğim gün", t.gelmedi + " gün", t.gelmedi>0?"eksi":"") +
    (t.izinli>0 ? kut("İzinli / raporlu", t.izinli + " gün", "mesai-r") : "") +
    kut("Yevmiye kazancı", paraFmt(t.yevmiyeKazanc), "", t.yevmiyeKazanc) +
    kut("Mesai kazancı", paraFmt(t.mesaiKazanc), "mesai-r", t.mesaiKazanc) +
    (t.ekKazanc>0 ? kut("Yol + yemek", paraFmt(t.ekKazanc), "", t.ekKazanc) : "") +
    (t.parcaKazanc>0 ? kut("📦 Parça başı kazanç", paraFmt(t.parcaKazanc), "", t.parcaKazanc) : "") +
    /* "Gün başı ortalama" KALDIRILDI (0.1.3.4)
       Yevmiyeli çalışanda böyle bir kavram yok: gün × yevmiye = hakediş.
       Ortalama, artı yevmiye ve mesai karıştığında yevmiyeden farklı bir
       rakam üretiyor (örn. 2.708 ₺) ve kullanıcı "benim yevmiyem 2.500,
       bu ne?" diye haklı olarak tereddüt ediyordu. Yanıltıcı olduğu için
       çıkarıldı. */
    kut("Toplam hakediş", paraFmt(t.hakedis), "vurgu", t.hakedis) +
    kut("Aldığım para", paraFmt(t.alinan), "", t.alinan) +
    (t.masrafToplam>0 ? kut("🧾 Masraf alacağı", paraFmt(t.masrafToplam), "", t.masrafToplam) : "") +
    (t.zamGun>0 ? kut("🛐 Pazar/bayram zammı", t.zamGun+" gün · +"+paraFmt(t.zamKazanc), "mesai-r") : "") +
    kut("Kalan alacağım", paraFmt(t.kalan), t.kalan>=0?"vurgu":"eksi", t.kalan);
  function kut(et,deger,cls,para){
    return '<div class="ozet-kut '+cls+'"><div class="et">'+et+'</div><div class="deger"'+(para!=null ? ' data-para="'+para+'"' : '')+'>'+deger+'</div></div>';
  }
  paraKutulariCanlandir("#ozet-grid");
  hedefCiz(t);
  kilitYenile();
  /* Ödeme türü dağılımı */
  const dag = {};
  odemeler.forEach(o=>{ const k=odemeTurEtiket(o.tur); dag[k]=(dag[k]||0)+(Number(o.tutar)||0); });
  /* Eskiden düz metindi: "Alınanlar → Avans: 5.000 ₺ · Hakediş: 20.000 ₺".
     Oran bilgisi vardı ama görülmüyordu — okuyup kafada hesaplaman
     gerekiyordu. Artık tek satırlık bir oran şeridi: hangi türün payı
     ne kadar, bakar bakmaz görülüyor. */
  const dEl = $("#odeme-dagilim");
  if(dEl){
    const girisler = Object.entries(dag).filter(([,v])=> v>0);
    if(!girisler.length){ dEl.innerHTML = ""; }
    else{
      const toplam = girisler.reduce((t,[,v])=> t+v, 0);
      const renk = { "Avans":"var(--sari)", "Hakediş":"var(--tam)", "Askeriye":"var(--mesai)",
                     "Kesinti":"var(--gelmedi)", "Diğer":"var(--soluk)" };
      girisler.sort((a,b)=> b[1]-a[1]);
      dEl.innerHTML =
        '<div class="dagilim-baslik">Aldığın paraların dağılımı</div>'+
        '<div class="dagilim-serit">'+
          girisler.map(([k,v])=>
            '<i style="flex:'+v+';background:'+(renk[k]||"var(--soluk)")+'" title="'+k+'"></i>').join("")+
        '</div>'+
        '<div class="dagilim-etiket">'+
          girisler.map(([k,v])=>
            '<span><b style="background:'+(renk[k]||"var(--soluk)")+'"></b>'+k+
            ' <em>'+paraFmt(v)+'</em> <small>%'+Math.round(v/toplam*100)+'</small></span>').join("")+
        '</div>';
    }
  }
}

/* ---------- Aylık hedef çubuğu (hem Hesap özeti hem Ana ekranda kullanılır) ---------- */
function hedefCiz(t, kartId, icerikId){
  const kart = $("#"+(kartId||"hedef-kart"));
  if(!kart) return;
  if(!(ayarlar.hedef>0)){ kart.classList.add("gizli"); return; }
  kart.classList.remove("gizli");
  const yuzde = Math.min(100, Math.round(t.hakedis/ayarlar.hedef*100));
  const kaldi = ayarlar.hedef - t.hakedis;
  $("#"+(icerikId||"hedef-icerik")).innerHTML =
    '<div style="display:flex;justify-content:space-between;font-size:13.5px">'+
    '<span><b>'+paraFmt(t.hakedis)+'</b> / '+paraFmt(ayarlar.hedef)+'</span>'+
    '<b>%'+yuzde+'</b></div>'+
    /* Çubuğun içine yüzde YAZILMADI: yüzde zaten hemen üstteki satırda
       duruyor, tekrar etmek gürültü olurdu. Onun yerine kalan tutar
       yazılıyor — çubuğa bakarken merak edilen şey "ne kadar kaldı". */
    '<div class="hedef-bar"><div class="dolu'+(yuzde>=100?' tamamlandi':'')+'" style="width:'+yuzde+'%"></div>'+
      '<span class="yuzde-yazi">'+(kaldi>0 ? paraFmt(kaldi)+' kaldı' : 'Hedef tamam ✓')+'</span></div>'+
    '<div style="font-size:13px;color:var(--soluk);margin-top:8px">'+
    (kaldi>0 ? 'Gaza devam 💪' : '🎉 Hedefi geçtin, helal olsun usta!')+'</div>';
}
/* ---------- 📅 Ana ekran: bugünkü kazanç kartı ---------- */
function bugunKazancCiz(v, kazanc){
  const kart = $("#bugun-kazanc-kart"), icerik = $("#bugun-kazanc-icerik");
  if(!kart || !icerik) return;
  if(!v){
    icerik.innerHTML = '<div style="color:var(--soluk);font-size:13.5px">Bugün henüz işlemedin — "Bugünü işle"ye dokun 👆</div>';
    return;
  }
  /* Ana ekrandaki "bugün" satırı yeni mesai sistemini de göstermeli.
     0.1.1.1'de bu değişken kullanıma sokulmuş ama TANIMI eklenmemişti;
     `mesaiYaziB is not defined` hatası ana ekran çizimini komple
     durduruyordu — bakiye, bugün kartı ve altındaki her şey boş
     kalıyordu (0.1.1.7'de bulundu). */
  const mesai = mesaiSaatMik(v);
  const mYevB = mesaiYevMik(v);
  const mesaiYaziB = mYevB > 0
    ? (function(){
        const t = Math.floor(mYevB), b = (mYevB - t) >= 0.5;
        return " · +" + ((t <= 3 ? "X".repeat(t) : t + "X") + (b ? "/" : "") || "/") + " mesai";
      })()
    : (mesai > 0 ? " · " + String(mesai).replace(".", ",") + " saat mesai" : "");
  /* DÜZELTME: bu satır iki yan yana öğeli bir flex'ti ve hiçbirinde esneme
     koruması yoktu. `.kart` içinde `overflow-x:hidden` olduğu için, sol metin
     uzayınca (örn. "Yarım gün · 3,5 saat mesai") sağdaki TUTAR kırpılıyordu —
     yani kullanıcı o gün ne kazandığını göremiyordu. Artık:
       • sol metin daralabiliyor ve gerekirse "…" ile kısalıyor (min-width:0)
       • tutar asla daralmıyor (flex-shrink:0) — para her zaman tam görünür */
  icerik.innerHTML =
    '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px">'+
    '<span style="font-size:13.5px;color:var(--soluk);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+girisEtiket(v)+mesaiYaziB+'</span>'+
    '<span style="font-family:\'Saira Condensed\';font-size:26px;font-weight:800;color:var(--sari);flex-shrink:0;white-space:nowrap">'+gizliPara(kazanc)+'</span>'+
    '</div>';
}

/* ---------- 🕓 Bekleyen aylar: geçmiş her ayın "hâlâ ödenmemiş" kısmı ---------- */
/* Not: "bekleyenAylarCiz" (eski Ana ekran kartı) kaldırıldı — yerini "Maaşlar" ekranı aldı. */

/* ---------- 💰 Maaşlar: her ayın kendi hesap kartı ---------- */
let aktifAyDetay = null;
function maaslarListCiz(){
  const ul = $("#liste-maaslar"); if(!ul) return;
  const gSnap = tumGirdilerQS, oSnap = tumOdemelerQS;
  if(!gSnap || !oSnap){ ul.innerHTML = '<div class="bos-mesaj">Yükleniyor...</div>'; return; }
  const aylar = {};
  gSnap.forEach(doc=>{
    const v = doc.data(), ay = doc.id.slice(0,7);
    if(!aylar[ay]) aylar[ay] = {hak:0, alinan:0, gun:0, mesai:0, odemeler:[], gunler:[]};
    const kazanc = girdiKazanc(v);
    aylar[ay].hak += kazanc;
    aylar[ay].gun += girdiGun(v);
    aylar[ay].mesai += Number(v.mesai)||0;
    aylar[ay].gunler.push({id:doc.id, ...v, kazanc});
  });
  oSnap.forEach(doc=>{
    const v = doc.data(), ay = odemeAyi(v);
    if(!ay) return;
    if(!aylar[ay]) aylar[ay] = {hak:0, alinan:0, gun:0, mesai:0, odemeler:[], gunler:[]};
    aylar[ay].alinan += Number(v.tutar)||0;
    aylar[ay].odemeler.push({id:doc.id, ...v});
  });
  const anahtarlar = Object.keys(aylar).sort().reverse();
  maaslarVeri = aylar;
  if(!anahtarlar.length){ ul.innerHTML = '<div class="bos-mesaj">Henüz hiç kayıt yok — bir gün işleyince burada birikmeye başlar.</div>'; return; }
  ul.innerHTML = "";
  anahtarlar.forEach(ay=>{
    const a = aylar[ay];
    const kalan = a.hak - a.alinan;
    const [yy,aa] = ay.split("-").map(Number);
    const li = document.createElement("li");
    li.style.cursor = "pointer";
    const tamMi = kalan <= 50;
    const durumRenk = tamMi ? "var(--tam)" : "var(--sari)";
    const durumYazi = tamMi ? "✓ Tamamlandı" : paraFmt(kalan)+" kaldı";
    li.innerHTML =
      '<div class="rozet" style="background:'+durumRenk+';color:'+(tamMi?'#fff':'#111')+'">'+AYLAR[aa-1].slice(0,3)+'</div>'+
      '<div class="orta"><div class="baslik">'+AYLAR[aa-1]+' '+yy+'</div>'+
      '<div class="alt-yazi">'+a.gun+' gün · Hakediş '+paraFmt(a.hak)+'</div></div>'+
      '<div class="tutar" style="color:'+durumRenk+'">'+durumYazi+'</div>';
    li.addEventListener("click", ()=> ayDetayAc(ay));
    ul.appendChild(li);
  });
}
/* "3 gün önce", "dün", "bugün" gibi göreli tarih metni üretir (YYYY-MM-DD alır) */
function gunFarkiYaz(tarihStr){
  try{
    const g = new Date(tarihStr+"T12:00:00"), bugun = new Date();
    bugun.setHours(12,0,0,0);
    const fark = Math.round((bugun - g) / 86400000);
    if(fark===0) return "bugün";
    if(fark===1) return "dün";
    if(fark>1 && fark<31) return fark+" gün önce";
    if(fark<0) return "ileri tarihli";
    const ay = Math.round(fark/30);
    return ay+" ay önce";
  }catch(e){ return ""; }
}
function ayDetayAc(ay){
  const a = (maaslarVeri||{})[ay]; if(!a) return;
  aktifAyDetay = ay;
  const [yy,aa] = ay.split("-").map(Number);
  const kalan = a.hak - a.alinan;
  const tamMi = kalan <= 50;
  $("#ay-detay-ay-adi").textContent = AYLAR[aa-1]+" "+yy;
  $("#ay-detay-kalan").textContent = paraFmt(Math.max(0,kalan));
  const durumEl = $("#ay-detay-durum");
  durumEl.textContent = tamMi ? "✓ Tamamlandı" : "Eksik";
  durumEl.style.background = tamMi ? "var(--tam)" : "var(--sari)";
  durumEl.style.color = tamMi ? "#fff" : "#111";
  $("#ay-detay-ozet-alt").textContent = "Hakediş "+paraFmt(a.hak)+" · Alınan "+paraFmt(a.alinan);
  $("#ay-detay-calisma").innerHTML =
    '<div style="display:flex;justify-content:space-between;padding:4px 0"><span>Çalışılan gün</span><b>'+a.gun+' gün</b></div>'+
    '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--cizgi);margin-bottom:8px;padding-bottom:10px"><span>Mesai</span><b>'+a.mesai+' saat</b></div>';
  const gunKap = document.createElement("div");
  gunKap.style.cssText = "max-height:260px;overflow-y:auto";
  const gunlerSirali = [...(a.gunler||[])].sort((x,y)=> x.id < y.id ? 1 : -1);
  if(!gunlerSirali.length){
    gunKap.innerHTML = '<div style="color:var(--soluk);font-size:13px">Bu ay için hiç gün işlenmemiş.</div>';
  }else{
    const ulGun = document.createElement("ul");
    ulGun.className = "liste";
    gunlerSirali.forEach(v=>{
      const t = new Date(v.id+"T12:00:00");
      const li = document.createElement("li");
      li.innerHTML =
        '<div class="rozet" style="background:var(--asfalt2);font-size:12px">'+t.getDate()+'<small>'+GUNLER_KISA[(t.getDay()+6)%7]+'</small></div>'+
        '<div class="orta"><div class="baslik">'+girisEtiket(v)+(Number(v.mesai)>0 ? " · "+v.mesai+" saat mesai" : "")+'</div>'+
        '<div class="alt-yazi">'+esc([v.santiye, v.not].filter(Boolean).join(" — ")||"—")+'</div></div>'+
        '<div class="tutar">'+paraFmt(v.kazanc)+'</div>';
      ulGun.appendChild(li);
    });
    gunKap.appendChild(ulGun);
  }
  $("#ay-detay-calisma").appendChild(gunKap);
  const turler = {};
  a.odemeler.forEach(o=>{ const t=o.tur||"diger"; turler[t]=(turler[t]||0)+(Number(o.tutar)||0); });
  const turSirasi = ["avans","askeriye","hakedis","kesinti","diger"];
  const dokumHtml = turSirasi.filter(t=>turler[t]).map(t=>
    '<div style="display:flex;justify-content:space-between;padding:4px 0"><span>'+odemeTurEtiket(t)+'</span><b>'+paraFmt(turler[t])+'</b></div>'
  ).join("");
  $("#ay-detay-odeme-dokum").innerHTML = dokumHtml || '<div style="color:var(--soluk);font-size:13px">Bu ay için hiç ödeme kaydı yok.</div>';
  const liste = $("#ay-detay-odeme-liste");
  liste.innerHTML = "";
  [...a.odemeler].sort((x,y)=> String(x.tarih)<String(y.tarih)?-1:1).forEach(o=>{
    const li = document.createElement("li");
    const t = o.tarih ? new Date(o.tarih+"T12:00:00") : null;
    const gunAdi = t ? GUNLER[t.getDay()] : "";
    const tarihUzun = t ? (t.getDate()+" "+AYLAR[t.getMonth()]+" "+gunAdi) : "";
    li.innerHTML =
      '<div class="rozet" style="background:'+odemeTurRenk(o.tur)+(o.tur==="avans"||o.tur==="askeriye" ? ";color:#111" : "")+'">'+(t?t.getDate():"💰")+(t?'<small>'+GUNLER_KISA[(t.getDay()+6)%7]+'</small>':'')+'</div>'+
      '<div class="orta" style="cursor:pointer"><div class="baslik">'+odemeTurEtiket(o.tur)+(o.dekontlu ? ' 🏦' : '')+' <span style="font-size:11px;color:var(--soluk)">✏️ düzenle</span></div>'+
      '<div class="alt-yazi">'+esc(tarihUzun)+' · '+gunFarkiYaz(o.tarih)+(o.not?" — "+esc(o.not):"")+'</div></div>'+
      '<div class="tutar">'+paraFmt(o.tutar)+'</div>'+
      (o.dekontlu ? '<button class="sil" aria-label="Dekont" style="color:var(--sari)">🏦</button>' : '')+
      '<button class="sil" aria-label="Sil">🗑️</button>';
    const dkBtn = li.querySelector('[aria-label="Dekont"]');
    if(dkBtn) dkBtn.addEventListener("click", async ()=>{
      dkBtn.textContent = "⏳";
      try{
        const d3 = await kokRef().collection("dekontlar").doc(o.id).get();
        dkBtn.textContent = "🏦";
        const f = d3.exists ? d3.data().veri : null;
        if(!f){ toast("Dekont bulunamadı"); return; }
        geriKaydet();
        const b = $("#foto-buyuk");
        b.querySelector("img").src = f;
        b.style.display = "flex";
      }catch(err){ dkBtn.textContent = "🏦"; toast("Dekont yüklenemedi, internete bak"); }
    });
    li.querySelector(".orta").addEventListener("click", ()=>{
      if(ayKilitli(odemeAyi(o)+"-15")){ toast("Bu ay kilitli 🔒 Hesap özetinden açabilirsin"); return; }
      ayDetayKapat();
      document.querySelector('[data-goruntu="odemeler"]').click();
      setTimeout(()=>{
        duzenlenenOdeme = o;
        $("#odeme-tarih").value = o.tarih;
        const aaSel = $("#odeme-ait-ay");
        if(aaSel){
          const gercekAy = odemeAyi(o);
          if(![...aaSel.options].some(op=>op.value===gercekAy)){
            const [yy,aa2] = gercekAy.split("-").map(Number);
            const op2 = document.createElement("option");
            op2.value = gercekAy; op2.textContent = AYLAR[aa2-1]+" "+yy;
            aaSel.appendChild(op2);
          }
          aaSel.value = gercekAy;
        }
        $("#odeme-tutar").value = o.tutar;
        $("#odeme-tur").value = o.tur||"diger";
        $("#odeme-not").value = o.not||"";
        $("#btn-odeme-ekle").textContent = "✏️ Güncelle";
        $("#btn-odeme-vazgec").classList.remove("gizli");
        toast("Düzenleme modu: bilgileri değiştir, Güncelle'ye bas");
      }, 250);
    });
    li.querySelector('[aria-label="Sil"]').addEventListener("click", async ()=>{
      if(ayKilitli(odemeAyi(o)+"-15")){ toast("Bu ay kilitli 🔒 Hesap özetinden açabilirsin"); return; }
      if(!confirm("Bu ödeme kaydı silinsin mi?")) return;
      const kopya = {...o}; delete kopya.id;
      let dekontYedek2 = null;
      if(o.dekontlu){
        try{
          const dd2 = await kokRef().collection("dekontlar").doc(o.id).get();
          if(dd2.exists) dekontYedek2 = dd2.data();
        }catch(e){}
        kokRef().collection("dekontlar").doc(o.id).delete().catch(()=>{});
      }
      try{
        await kokRef().collection("odemeler").doc(o.id).delete();
        toastGeriAlVeri("Ödeme silindi", "odemeler", o.id, kopya,
                        dekontYedek2 ? {koleksiyon:"dekontlar", veri:dekontYedek2} : null);
        ayDetayKapat();
        setTimeout(()=> maaslarListCiz(), 400);
      }catch(err){ hataGoster(err, "ay-detay-odeme-sil"); }
    });
    liste.appendChild(li);
  });
  $("#modal-perde").classList.add("acik");
  $("#ay-detay-modal").classList.add("acik");
}
/* AY DETAYI PAYLAŞIMI (0.1.0.3)
   Maaşlar ekranında hiç paylaşım yoktu. Puantaj ekranındaki `raporPaylas()`
   ve `pdfPaylas()` üreticileri hazır ama ikisi de `aktifAy` / `aktifYil`
   genel değişkenlerine bakıyor — yani "şu an görüntülenen ay"ı raporluyor.
   Maaşlar listesinden başka bir ay paylaşılacağı için bu değerler geçici
   olarak değiştirilip işlem bitince GERİ KONUYOR.

   Neden ikinci bir rapor yazılmadı: tek kaynak kalsın. İki ayrı üretici
   olsaydı biri güncellenip diğeri unutulabilirdi (bu projede daha önce
   yaşandı — aynı düzeltmenin bazı çıktılarda atlanması).

   `girdiler` de o aya ait olmalı; ay değişince yeniden yükleniyor. */
/* Bir aya geç ve VERİSİ GELENE KADAR BEKLE (0.1.0.4)
   `ayiYukle()` bir dinleyici kuruyor; veri sonradan geliyor. Ay
   değiştirip hemen bir gün açmaya çalışan kod, henüz boş olan
   `girdiler` önbelleğini okuyup kaydı YOK sanıyordu.
   Somut sonuç: aramadan başka bir aydaki güne tıklayınca gün modalı
   boş açılıyordu; kullanıcı kaydını göremiyor, üstüne yazabiliyordu.
   Bu yardımcı önce tek seferlik sorguyla veriyi getirip önbelleğe
   koyuyor, sonra dinleyiciyi kuruyor. */
async function ayaGecVeBekle(yil, ay){
  aktifYil = yil; aktifAy = ay;
  try{
    const bas = yil + "-" + pad(ay+1) + "-01";
    const son = yil + "-" + pad(ay+1) + "-31";
    const qs = await kokRef().collection("girdiler")
      .where(firebase.firestore.FieldPath.documentId(), ">=", bas)
      .where(firebase.firestore.FieldPath.documentId(), "<=", son)
      .get();
    const gecici = {};
    qs.forEach(doc=> gecici[doc.id] = doc.data());
    girdiler = gecici;
  }catch(e){ /* sorgu başarısızsa dinleyici yine de kurulacak */ }
  ayiYukle();   /* canlı dinleyiciyi de kur */
}

async function ayDetayPaylas(tur){
  if(!aktifAyDetay){ toast("Önce bir ay seç"); return; }
  const [yy, aa] = aktifAyDetay.split("-").map(Number);
  const eskiYil = aktifYil, eskiAy = aktifAy, eskiGirdiler = girdiler;
  const ayDegisti = (yy !== aktifYil || (aa-1) !== aktifAy);
  try{
    if(ayDegisti){
      /* `ayiYukle()` KULLANILMIYOR: o bir dinleyici kuruyor ve veri
         sonradan geliyor — beklemeden rapor üretilirse BOŞ çıkardı.
         Burada tek seferlik doğrudan sorgu yapılıp sonuç bekleniyor. */
      toast("Hazırlanıyor...");
      const bas = yy + "-" + pad(aa) + "-01";
      const son = yy + "-" + pad(aa) + "-31";
      const qs = await kokRef().collection("girdiler")
        .where(firebase.firestore.FieldPath.documentId(), ">=", bas)
        .where(firebase.firestore.FieldPath.documentId(), "<=", son)
        .get();
      const gecici = {};
      qs.forEach(doc=> gecici[doc.id] = doc.data());
      aktifYil = yy; aktifAy = aa-1; girdiler = gecici;
    }
    const aySonu = new Date(aktifYil, aktifAy+1, 0).getDate();
    if(tur === "pdf") await pdfPaylas(1, aySonu);
    else              await raporPaylas(1, aySonu);
  }catch(e){
    hataGoster(e, "ayDetayPaylas");
  }finally{
    /* Kullanıcının baktığı ay ve verisi her durumda geri konuyor —
       hata çıksa bile ekran bozulmasın. */
    if(ayDegisti){
      aktifYil = eskiYil; aktifAy = eskiAy; girdiler = eskiGirdiler;
      try{ hepsiniCiz(); }catch(e){}
    }
  }
}

function ayDetayKapat(){
  $("#modal-perde").classList.remove("acik");
  $("#ay-detay-modal").classList.remove("acik");
}

function kilitYenile(){
  const kilitli = ayarlar.kapali.includes(aktifAyAnahtar());
  $("#btn-kilit").textContent = kilitli
    ? "🔓 " + AYLAR[aktifAy] + " ayının kilidini aç"
    : "🔒 " + AYLAR[aktifAy] + " ayını kilitle";
}

/* ---------- Dosya indirme yardımcısı ---------- */
function dosyaIndir(ad, icerik, tip){
  const blob = new Blob([icerik], {type: tip});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = ad;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
}

/* ---------- Özet detayı: grafik + tüm zamanlar ---------- */
async function ozetDetayYukle(){
  try{
    tumVeriDinle();
    let gSnap = tumGirdilerQS, oSnap = tumOdemelerQS;
    if(!gSnap || !oSnap){
      const r = await Promise.all([
        kokRef().collection("girdiler").get(),
        kokRef().collection("odemeler").get()
      ]);
      gSnap = tumGirdilerQS || r[0];
      oSnap = tumOdemelerQS || r[1];
    }
    /* Tüm zamanlar */
    let gun=0, mesai=0, alinan=0, hakedis=0;
    const ayHak = {}; // "2026-07" -> hakediş
    const yevGecmis = []; // {id:"2026-07-15", yev:2500} — zam geçmişi için
    const santiyeHak = {}; // "Konut projesi" -> hakediş
    const kiyasOnEk = (aktifYil-1) + "-" + pad(aktifAy+1);   // geçen yılın aynı ayı
    let kGun = 0, kMesai = 0, kHak = 0;
    gSnap.forEach(doc=>{
      const v = doc.data(), ayKey = doc.id.slice(0,7);
      gun += girdiGun(v);
      mesai += mesaiSaatMik(v);
      const h = girdiKazanc(v);
      hakedis += h;
      const uy = Number(v.uYevmiye)||0;
      if(uy>0) yevGecmis.push({id:doc.id, yev:uy});
      const sAd = String(v.santiye||"").trim();
      if(sAd && h>0) santiyeHak[sAd] = (santiyeHak[sAd]||0) + h;
      if(doc.id.slice(0,7) === kiyasOnEk){
        kGun += girdiGun(v);
        kMesai += Number(v.mesai)||0;
        kHak += h;
      }
      ayHak[ayKey] = (ayHak[ayKey]||0) + h;
    });
    const ayAlinan = {}; // "2026-07" -> alınan
    oSnap.forEach(doc=>{
      const v = doc.data(), t = Number(v.tutar)||0;
      alinan += t;
      const k = odemeAyi(v);
      if(k.length===7) ayAlinan[k] = (ayAlinan[k]||0) + t;
    });
    $("#genel-grid").innerHTML =
      '<div class="ozet-kut tam-r"><div class="et">Toplam gün</div><div class="deger">'+gun+'</div></div>'+
      '<div class="ozet-kut mesai-r"><div class="et">Toplam mesai</div><div class="deger">'+mesai+' saat</div></div>'+
      '<div class="ozet-kut"><div class="et">Toplam hakediş</div><div class="deger" data-para="'+hakedis+'">'+paraFmt(hakedis)+'</div></div>'+
      '<div class="ozet-kut"><div class="et">Toplam alınan</div><div class="deger" data-para="'+alinan+'">'+paraFmt(alinan)+'</div></div>'+
      '<div class="ozet-kut '+(hakedis-alinan>=0?'vurgu':'eksi')+'" style="grid-column:1/-1"><div class="et">Genel kalan alacağım</div><div class="deger" data-para="'+(hakedis-alinan)+'">'+paraFmt(hakedis-alinan)+'</div></div>';
    paraKutulariCanlandir("#genel-grid");

    /* 📈 Zam geçmişi: günlere mühürlenen yevmiyelerden çıkarılır */
    const zamEl = $("#zam-gecmisi");
    if(zamEl){
      yevGecmis.sort((a,b)=> a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
      const adimlar = [];
      yevGecmis.forEach(x=>{
        if(!adimlar.length || adimlar[adimlar.length-1].yev !== x.yev)
          adimlar.push({id:x.id, yev:x.yev});
      });
      if(adimlar.length >= 2){
        const etiket = x => {
          const t = new Date(x.id+"T12:00:00");
          return paraFmt(x.yev)+" <span style='opacity:.7'>("+AYLAR[t.getMonth()].slice(0,3)+" "+t.getFullYear()+")</span>";
        };
        const ilk = adimlar[0].yev, son = adimlar[adimlar.length-1].yev;
        const oran = ilk>0 ? Math.round((son/ilk - 1)*100) : 0;
        zamEl.innerHTML = "📈 <b>Yevmiye geçmişin:</b> " + adimlar.map(etiket).join(" → ")
          + (oran>0 ? " · başladığından beri <b>%"+oran+" zam</b> almışsın 💪"
             : oran<0 ? " · başladığından beri %"+Math.abs(oran)+" düşmüş görünüyor" : "");
      }else{ zamEl.textContent = ""; }
    }
    /* 🏗️ Şantiye kırılımı: nerede ne kazandın */
    const skEl = $("#santiye-kirilim");
    if(skEl){
      const sirali = Object.keys(santiyeHak).sort((a,b)=> santiyeHak[b]-santiyeHak[a]);
      if(sirali.length >= 2){
        /* Eskiden nokta ile ayrılmış tek satır metindi; hangi şantiyenin
           daha çok kazandırdığı ancak rakamları okuyup karşılaştırınca
           anlaşılıyordu. Artık her şantiye kendi oran çubuğuyla. */
        const enBuyuk = santiyeHak[sirali[0]] || 1;
        skEl.innerHTML =
          '<div class="dagilim-baslik">🏗️ Şantiye kırılımı</div>' +
          sirali.slice(0,5).map(ad2=>{
            const v = santiyeHak[ad2];
            return '<div class="sk-satir">'+
              '<span class="sk-ad">'+ad2.replace(/</g,"&lt;")+'</span>'+
              '<span class="sk-bar"><i style="width:'+Math.max(4,Math.round(v/enBuyuk*100))+'%"></i></span>'+
              '<span class="sk-tutar">'+paraFmt(v)+'</span></div>';
          }).join("") +
          (sirali.length>5 ? '<div class="sk-daha">+'+(sirali.length-5)+' şantiye daha</div>' : "");
      }else skEl.textContent = "";
    }
    /* 📊 Geçen yılla kıyas */
    const ykEl = $("#yil-kiyas");
    if(ykEl){
      const buT = hesapla();
      if(kGun > 0 && Number(buT.gunSayisi) > 0){
        const yuzde = (eski2, yeni2)=> eski2 > 0 ? Math.round((yeni2-eski2)/eski2*100) : null;
        const ok = f=> f===null ? "" : (f >= 0 ? " <b style='color:var(--tam)'>▲ %"+f+"</b>" : " <b style='color:var(--gelmedi)'>▼ %"+Math.abs(f)+"</b>");
        ykEl.innerHTML =
          "📊 <b>Geçen yılla kıyas — " + AYLAR[aktifAy] + "</b><br>" +
          "Gün: " + kGun + " → <b>" + buT.gunSayisi + "</b>" + ok(yuzde(kGun, Number(buT.gunSayisi))) + "<br>" +
          (kMesai > 0 || Number(buT.mesaiToplam) > 0 ? "Mesai: " + kMesai + " → <b>" + (Number(buT.mesaiToplam)||0) + " saat</b>" + ok(yuzde(kMesai, Number(buT.mesaiToplam)||0)) + "<br>" : "") +
          (gizliMod ? "" : "Hakediş: " + paraFmt(kHak) + " → <b>" + paraFmt(buT.hakedis) + "</b>" + ok(yuzde(kHak, buT.hakedis)) + "<br>") +
          "<span style='color:var(--soluk);font-size:12px'>" + (aktifYil-1) + " " + AYLAR[aktifAy] + " → " + aktifYil + " " + AYLAR[aktifAy] + "</span>";
        ykEl.style.display = "block";
      }else ykEl.style.display = "none";
    }
    ggGrafikCiz(ayHak, ayAlinan);

    /* Son 6 ay grafiği */
    const aylarDizi = [];
    let y = aktifYil, a = aktifAy;
    for(let i=0;i<6;i++){
      aylarDizi.unshift({key: y+"-"+pad(a+1), ad: AYLAR[a].slice(0,3), buAy: i===0});
      a--; if(a<0){a=11;y--;}
    }
    const maks = Math.max(1, ...aylarDizi.map(x=> ayHak[x.key]||0));
    $("#grafik").innerHTML = aylarDizi.map(x=>{
      const deger = ayHak[x.key]||0;
      const yuzde = Math.round(deger/maks*100);
      /* Grafik sütun etiketi de artık ortak `paraKisa()` kullanıyor —
         eskiden burada ayrı bir yuvarlama vardı ve aynı tutar farklı
         görünüyordu (özet "4k" derken grafik "3.8K" diyordu). */
      const binler = deger>0 ? paraKisa(deger) : "0";
      return '<div class="sutun"><span class="deger-yazi">'+binler+'</span>'+
             '<div class="cubuk'+(x.buAy?' bu-ay':'')+'" style="height:'+Math.max(3,yuzde)+'%"></div>'+
             '<span class="ay-yazi">'+x.ad+'</span></div>';
    }).join("");

    /* Geçen aya göre karşılaştırma */
    const buKey = aylarDizi[5].key, gecenKey = aylarDizi[4].key;
    const bu = ayHak[buKey]||0, gecen = ayHak[gecenKey]||0;
    const karsi = $("#grafik-karsi");
    if(gecen>0 && bu>0){
      const fark = Math.round((bu-gecen)/gecen*100);
      karsi.innerHTML = fark>=0
        ? "📈 Geçen aya göre <b style='color:var(--tam)'>%"+fark+" fazla</b> hakediş yaptın, helal 💪"
        : "📉 Geçen aya göre <b style='color:var(--gelmedi)'>%"+Math.abs(fark)+" az</b> hakediş var.";
    }else{
      karsi.textContent = "";
    }
  }catch(e){ hataGoster(e); }
}

/* ---------- CSV dışa aktarma ---------- */
async function csvIndir(){
  toast("CSV hazırlanıyor...");
  try{
    const bas = aktifYil+"-01-01", son = aktifYil+"-12-31";
    const [gSnap, mSnap] = await Promise.all([
      kokRef().collection("girdiler")
        .where(firebase.firestore.FieldPath.documentId(), ">=", bas)
        .where(firebase.firestore.FieldPath.documentId(), "<=", son).get(),
      kokRef().collection("masraflar")
        .where("tarih", ">=", bas).where("tarih", "<=", son).get()
    ]);
    /* DÜZELTME: ödemeler artık ham tarihe göre sorgulanmıyor — aitAy/FIFO
       gereği yıl sınırını aşan bir ödeme (örn. 1 Ocak'ta alınıp bir önceki
       Aralık'a sayılan bir avans) eskiden hem yanlış yılda çıkabiliyor hem
       de bazı durumlarda hiçbir yılın dışa aktarımında görünmeyebiliyordu.
       tumOdemelerQS (tüm zamanların önbelleği) odemeAyi()'ye göre süzülüyor. */
    /* GARANTİLİ: önbellek boşsa sunucudan çekilir — rapor asla sessizce ödemesiz çıkmaz */
    const tumOdemeListesi = await tumOdemeleriGetir();
    const oListe = tumOdemeListesi.filter(o=> odemeAyi(o).slice(0,4)===String(aktifYil));
    const tirnak = s => '"' + String(s==null?"":s).replace(/"/g,'""') + '"';
    let csv = "\uFEFFTarih;Tur;Durum/Aciklama;Mesai Saat;Tutar TL;Santiye;Not\n";
    const satirlar = [];
    gSnap.forEach(doc=>{
      const v = doc.data();
      satirlar.push([doc.id, "Puantaj", girisEtiket(v), (Number(v.mesaiYev)||0) > 0 ? gunIsaret(v).mesai : (v.mesai||0), girdiKazanc(v), v.santiye||"", v.not||""]);
    });
    oListe.forEach(v=>{
      satirlar.push([v.tarih, "Odeme", odemeTurEtiket(v.tur), "", -Number(v.tutar||0), "", v.not||""]);
    });
    /* Masraflar da CSV'ye eklendi — kategori bilgisiyle birlikte (önceden dışa aktarıma hiç girmiyordu) */
    mSnap.forEach(doc=>{
      const v = doc.data();
      const kat = masrafKategoriBul(v.kategori);
      satirlar.push([v.tarih, "Masraf", kat.ad+(v.odendi?" (ödendi)":""), "", Number(v.tutar||0), "", v.aciklama||""]);
    });
    satirlar.sort((a,b)=> a[0]<b[0]?-1:1);
    satirlar.forEach(s=> csv += s.map(tirnak).join(";")+"\n");
    dosyaIndir("puantaj-"+aktifYil+".csv", csv, "text/csv;charset=utf-8");
    toast("CSV indirildi ⬇️ (Excel ile açabilirsin)");
  }catch(e){ hataGoster(e); }
}

/* ---------- Gerçek Excel (.xlsx) dışa aktarım (SheetJS) ---------- */
async function excelIndir(){
  await kutuphaneYukle("xlsx");
  if(typeof XLSX === "undefined"){
    toast("Excel kütüphanesi yüklenemedi — internetin var mı? 📡");
    return;
  }
  toast("Excel hazırlanıyor...");
  try{
    const bas = aktifYil+"-01-01", son = aktifYil+"-12-31";
    const [gSnap, mSnap] = await Promise.all([
      kokRef().collection("girdiler")
        .where(firebase.firestore.FieldPath.documentId(), ">=", bas)
        .where(firebase.firestore.FieldPath.documentId(), "<=", son).get(),
      kokRef().collection("masraflar")
        .where("tarih", ">=", bas).where("tarih", "<=", son).get()
    ]);
    const puantajSatir = [["Tarih","Gün","Durum","Mesai","Şantiye","Not","Kazanç (TL)"]];
    const gunler = [];
    gSnap.forEach(doc=> gunler.push({id:doc.id, ...doc.data()}));
    gunler.sort((a,b)=> a.id<b.id?-1:1);
    gunler.forEach(v=>{
      const t = new Date(v.id+"T12:00:00");
      puantajSatir.push([v.id, GUNLER[t.getDay()], girisEtiket(v), ((Number(v.mesaiYev)||0)>0 ? gunIsaret(v).mesai : (Number(v.mesai)||0)), v.santiye||"", v.not||"", girdiKazanc(v)]);
    });
    /* DÜZELTME: aynı csvIndir()'daki gibi — ham tarih yerine odemeAyi()/FIFO
       kullanılıyor, yıl sınırını aşan ödemeler artık doğru yılda çıkıyor. */
    /* GARANTİLİ: önbellek boşsa sunucudan çekilir — rapor asla sessizce ödemesiz çıkmaz */
    const tumOdemeListesi = await tumOdemeleriGetir();
    const odemeler2 = tumOdemeListesi.filter(o=> odemeAyi(o).slice(0,4)===String(aktifYil));
    const odemeSatir = [["Tarih","Tür","Not","Tutar (TL)"]];
    odemeler2.sort((a,b)=> String(a.tarih)<String(b.tarih)?-1:1);
    odemeler2.forEach(o=> odemeSatir.push([o.tarih||"", odemeTurEtiket(o.tur), o.not||"", Number(o.tutar)||0]));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet(puantajSatir);
    ws1["!cols"] = [{wch:11},{wch:11},{wch:10},{wch:9},{wch:16},{wch:28},{wch:12}];
    XLSX.utils.book_append_sheet(wb, ws1, "Puantaj");
    const ws2 = XLSX.utils.aoa_to_sheet(odemeSatir);
    ws2["!cols"] = [{wch:11},{wch:12},{wch:28},{wch:12}];
    XLSX.utils.book_append_sheet(wb, ws2, "Ödemeler");

    /* Masraflar sayfası — önceden Excel'de hiç yoktu, sadece uygulama içinde görünüyordu */
    const masrafSatir = [["Tarih","Kategori","Açıklama","Tutar (TL)","Ödendi mi"]];
    const masrafListe = [];
    mSnap.forEach(doc=> masrafListe.push(doc.data()));
    masrafListe.sort((a,b)=> String(a.tarih)<String(b.tarih)?-1:1);
    masrafListe.forEach(m=> masrafSatir.push([m.tarih||"", masrafKategoriBul(m.kategori).ad, m.aciklama||"", Number(m.tutar)||0, m.odendi?"Evet":"Hayır"]));
    const ws3 = XLSX.utils.aoa_to_sheet(masrafSatir);
    ws3["!cols"] = [{wch:11},{wch:14},{wch:28},{wch:12},{wch:10}];
    XLSX.utils.book_append_sheet(wb, ws3, "Masraflar");

    XLSX.writeFile(wb, "puantaj-"+aktifYil+".xlsx");
    toast("Excel indirildi 📗");
  }catch(e){ hataGoster(e, "excel-indir"); }
}


/* 💾 Kayıtların zaten Firestore'da (bulutta) otomatik güvende — ama hesap
   silinir/proje bozulursa diye 30 günde bir de yerel bir JSON kopyası
   indirmesini öner (bir kere/gün, gereksiz sıkmasın). */
function yedekHatirlat(){
  try{
    const bugun = tarihId(new Date());
    if(localStorage.getItem("yedekHatirlatGun") === bugun) return;   /* bugün zaten sorduk */
    const son = Number(localStorage.getItem("sonYedekTarihi")||0);
    const gun30 = 30*24*60*60*1000;
    if(son && (Date.now()-son) < gun30) return;   /* yakın zamanda yedek alınmış */
    localStorage.setItem("yedekHatirlatGun", bugun);
    setTimeout(()=>{
      toast("💾 30 gündür yerel yedek almadın — Ayarlar → Yedekleme'den bir JSON kopyası indirmeni öneririm.");
    }, 4000);
  }catch(e){}
}
async function yedekAl(){
  toast("Yedek hazırlanıyor...");
  try{
    const [ayarDoc, gSnap, oSnap, bSnap, cSnap, nSnap, mSnap, eSnap, egSnap, bkSnap,
           kaSnap, plSnap, kzSnap] = await Promise.all([
      kokRef().get(),
      kokRef().collection("girdiler").get(),
      kokRef().collection("odemeler").get(),
      kokRef().collection("borclar").get(),
      kokRef().collection("cuzdan").get(),
      kokRef().collection("notlar").get(),
      kokRef().collection("masraflar").get(),
      kokRef().collection("ekip").get(),
      kokRef().collection("ekipGun").get(),
      kokRef().collection("beklenenler").get(),
      /* 0.0.3.7'de eklendi — bu üçü gerçek kullanıcı verisi ama yedeğe hiç
         girmiyordu; yedekten dönen bir kullanıcı kartlarını, planlarını ve
         kaza kayıtlarını sessizce kaybediyordu. */
      kokRef().collection("kartlar").get(),
      kokRef().collection("planlar").get(),
      kokRef().collection("kazalar").get()
    ]);
    const yedek = {
      uygulama: "Puantaj Defterim",
      surum: 5,
      tarih: new Date().toISOString(),
      eposta: kullanici.email,
      ayarlar: ayarDoc.data()||{},
      girdiler: {}, odemeler: {}, borclar: {}, cuzdan: {}, notlar: {}, masraflar: {},
      ekip: {}, ekipGun: {}, beklenenler: {}, kartlar: {}, planlar: {}, kazalar: {},
      /* Fotoğraflar (fisler/dekontlar/fotolar) BİLEREK yedeğe alınmıyor: base64
         oldukları için dosyayı onlarca MB'a çıkarır ve telefonda indirilemez
         hale getirirdi. Kullanıcı bunu bilsin diye yedeğin içine not düşülüyor
         ve indirme sonrası bildirimde de söyleniyor. */
      fotograflarDahilMi: false
    };
    gSnap.forEach(doc=> yedek.girdiler[doc.id] = doc.data());
    oSnap.forEach(doc=> yedek.odemeler[doc.id] = doc.data());
    bSnap.forEach(doc=> yedek.borclar[doc.id] = doc.data());
    cSnap.forEach(doc=> yedek.cuzdan[doc.id] = doc.data());
    nSnap.forEach(doc=> yedek.notlar[doc.id] = doc.data());
    mSnap.forEach(doc=> yedek.masraflar[doc.id] = doc.data());
    eSnap.forEach(doc=> yedek.ekip[doc.id] = doc.data());
    egSnap.forEach(doc=> yedek.ekipGun[doc.id] = doc.data());
    bkSnap.forEach(doc=> yedek.beklenenler[doc.id] = doc.data());
    kaSnap.forEach(doc=> yedek.kartlar[doc.id] = doc.data());
    plSnap.forEach(doc=> yedek.planlar[doc.id] = doc.data());
    kzSnap.forEach(doc=> yedek.kazalar[doc.id] = doc.data());
    dosyaIndir("puantaj-yedek-"+tarihId(new Date())+".json", JSON.stringify(yedek,null,2), "application/json");
    try{ localStorage.setItem("sonYedekTarihi", Date.now().toString()); }catch(e){}
    try{ localStorage.setItem("yedekZaman", Date.now()); }catch(e){}
    /* Fotoğrafların yedeğe girmediğini AÇIKÇA söyle. Kullanıcı bunu ancak
       yedekten dönmeye çalıştığında fark ederse çok geç olur. */
    const fotoSayisi = (Object.values(yedek.masraflar).filter(m=>m.fisli).length) +
                       (Object.values(yedek.odemeler).filter(o=>o.dekontlu).length) +
                       (Object.values(yedek.girdiler).filter(g=>g.foto).length);
    toast(fotoSayisi
      ? "Yedek indirildi 💾 — NOT: " + fotoSayisi + " fotoğraf (fiş/dekont) yedeğe DAHİL DEĞİL, dosya çok büyür diye. Kayıtların tamamı var."
      : "Yedek indirildi 💾");
  }catch(e){ hataGoster(e); }
}

/* ---------- Yedekten geri yükleme ---------- */
async function yedekGeriYukle(dosya){
  let y;
  try{ y = JSON.parse(await dosya.text()); }
  catch(e){ toast("Bu dosya okunamadı, geçerli bir yedek değil"); return; }
  if(!y || y.uygulama!=="Puantaj Defterim"){ toast("Bu dosya bir Puantaj Defterim yedeği değil"); return; }
  const gSayi = Object.keys(y.girdiler||{}).length;
  const oSayi = Array.isArray(y.odemeler) ? y.odemeler.length : Object.keys(y.odemeler||{}).length;
  const bSayi = Object.keys(y.borclar||{}).length;
  if(!confirm("Yedekte "+gSayi+" gün, "+oSayi+" ödeme, "+bSayi+" borç kaydı var.\n"+
      "Bunlar hesabına yazılacak (aynı günler yedekteki haliyle ÜZERİNE yazılır).\nDevam edilsin mi?")) return;
  toast("Geri yükleniyor, bekle...");
  try{
    if(y.ayarlar) await kokRef().set(y.ayarlar, {merge:true});
    let batch = db.batch(), sayac = 0;
    const batches = [batch];
    const ekle = (ref, veri)=>{
      batch.set(ref, veri);
      if(++sayac===450){ batch = db.batch(); batches.push(batch); sayac=0; }
    };
    Object.entries(y.girdiler||{}).forEach(([id, v])=> ekle(kokRef().collection("girdiler").doc(id), v));
    if(Array.isArray(y.odemeler)){ /* eski (v1) yedek biçimi */
      y.odemeler.forEach(v=> ekle(kokRef().collection("odemeler").doc(), v));
    }else{
      Object.entries(y.odemeler||{}).forEach(([id, v])=> ekle(kokRef().collection("odemeler").doc(id), v));
    }
    Object.entries(y.borclar||{}).forEach(([id, v])=> ekle(kokRef().collection("borclar").doc(id), v));
    Object.entries(y.cuzdan||{}).forEach(([id, v])=> ekle(kokRef().collection("cuzdan").doc(id), v));
    Object.entries(y.notlar||{}).forEach(([id, v])=> ekle(kokRef().collection("notlar").doc(id), v));
    Object.entries(y.masraflar||{}).forEach(([id, v])=> ekle(kokRef().collection("masraflar").doc(id), v));
    Object.entries(y.ekip||{}).forEach(([id, v])=> ekle(kokRef().collection("ekip").doc(id), v));
    Object.entries(y.ekipGun||{}).forEach(([id, v])=> ekle(kokRef().collection("ekipGun").doc(id), v));
    /* beklenenler: 0.0.1.7'de eklendi. Eski (surum<=3) yedeklerde bu anahtar hiç yok,
       `||{}` sayesinde sorunsuz atlanıyor — eski yedekler geriye dönük uyumlu kalıyor. */
    Object.entries(y.beklenenler||{}).forEach(([id, v])=> ekle(kokRef().collection("beklenenler").doc(id), v));
    /* 0.0.3.7'de eklendi. Eski yedeklerde bu anahtarlar yok; `||{}` sayesinde
       sorunsuz atlanıyor, yani eski yedekler geriye dönük uyumlu kalıyor. */
    Object.entries(y.kartlar||{}).forEach(([id, v])=> ekle(kokRef().collection("kartlar").doc(id), v));
    Object.entries(y.planlar||{}).forEach(([id, v])=> ekle(kokRef().collection("planlar").doc(id), v));
    Object.entries(y.kazalar||{}).forEach(([id, v])=> ekle(kokRef().collection("kazalar").doc(id), v));
    for(const bt of batches) await bt.commit();
    toast("Yedek geri yüklendi ✅ ("+gSayi+" gün)");
  }catch(e){ hataGoster(e); }
}

/* ---------- Yıllık ısı haritası ---------- */
function isiHaritaCiz(gunKazanc){
  const kap = $("#isi-harita");
  if(!kap) return;
  const degerler = Object.values(gunKazanc);
  if(!degerler.length){ kap.innerHTML = ""; return; }
  const maks = Math.max(...degerler);
  let html = '<div style="font-size:12px;color:var(--soluk);margin-bottom:9px;line-height:1.5">🗓️ Yılın haritası — koyu sarı = çok kazandığın gün.<br>Bir aya dokun, o ayın takvimine git.</div>';
  for(let ay=0; ay<12; ay++){
    const gunSayi = new Date(aktifYil, ay+1, 0).getDate();
    let hucre = "";
    for(let g=1; g<=31; g++){
      if(g>gunSayi){ hucre += '<i style="opacity:0"></i>'; continue; }
      const id = aktifYil+"-"+pad(ay+1)+"-"+pad(g);
      const k = gunKazanc[id]||0;
      if(k>0){
        const alfa = 0.25 + 0.75*(k/maks);
        hucre += '<i style="background:rgba(255,196,0,'+alfa.toFixed(2)+')"></i>';
      }else{
        hucre += '<i></i>';
      }
    }
    /* İçinde bulunulan ayı işaretle — kullanıcı haritada nerede olduğunu görsün.
       (Yalnızca görüntülenen yıl, gerçek bugünün yılıysa anlamlı.) */
    const buAyMi = (aktifYil === new Date().getFullYear() && ay === new Date().getMonth());
    html += '<div class="isi-ay'+(buAyMi?" bu-ay":"")+'" data-ay="'+ay+'"><span class="ay-et">'+AYLAR[ay].slice(0,3)+'</span><div class="isi-gunler">'+hucre+'</div></div>';
  }
  kap.innerHTML = html;
  $$("#isi-harita .isi-ay").forEach(el=>{
    el.addEventListener("click", ()=>{
      aktifAy = Number(el.dataset.ay);
      document.querySelector('[data-goruntu="puantaj"]').click();
      ayiYukle(); ayBarCiz();
    });
  });
}

/* ---------- Yıl özeti ---------- */async function yilYukle(){
  $("#yil-baslik").textContent = aktifYil;
  $("#yil-icerik").innerHTML = '<div class="bos-mesaj">Yükleniyor...</div>';
  try{
    const bas = aktifYil+"-01-01", son = aktifYil+"-12-31";
    const [gSnap] = await Promise.all([
      kokRef().collection("girdiler")
        .where(firebase.firestore.FieldPath.documentId(), ">=", bas)
        .where(firebase.firestore.FieldPath.documentId(), "<=", son).get()
    ]);
    const aylik = Array.from({length:12}, ()=>({gun:0,mesai:0,hak:0,alinan:0}));
    const gunKazanc = {};
    gSnap.forEach(doc=>{
      const ay = Number(doc.id.slice(5,7))-1, v=doc.data();
      aylik[ay].gun += girdiGun(v);
      aylik[ay].mesai += Number(v.mesai)||0;
      const kz = girdiKazanc(v);
      aylik[ay].hak += kz;
      if(kz>0) gunKazanc[doc.id] = kz;
    });
    isiHaritaCiz(gunKazanc);
    /* DÜZELTME: eskiden oSnap sorgusu ham tarihe göre atılıyordu — yıl
       sınırını aşan bir ödeme (örn. 1 Ocak'ta alınıp bir önceki Aralık'a
       sayılan avans) sorguya hiç girmiyordu, dolayısıyla Yıl Özeti ekranı ve
       ondan beslenen Yıl PDF'i onu göstermiyordu. Artık tumOdemelerQS (tüm
       zamanların önbelleği) odemeAyi()'nin YILINA göre süzülüyor. */
    const tumOdemeListesi = [];
    if(tumOdemelerQS) tumOdemelerQS.forEach(doc=> tumOdemeListesi.push(doc.data()));
    tumOdemeListesi.filter(v=> odemeAyi(v).slice(0,4)===String(aktifYil)).forEach(v=>{
      const ay=Number(odemeAyi(v).slice(5,7))-1;
      if(ay>=0 && ay<12) aylik[ay].alinan += Number(v.tutar)||0;
    });
    let T={gun:0,mesai:0,hak:0,alinan:0}, satirlar="";
    yilSon = {yil: aktifYil, aylar: [], T};
    aylik.forEach((a,i)=>{
      const gun = a.gun, hak = a.hak;
      if(gun===0 && a.mesai===0 && a.alinan===0) return;
      T.gun+=gun; T.mesai+=a.mesai; T.hak+=hak; T.alinan+=a.alinan;
      yilSon.aylar.push({ad:AYLAR[i], gun, mesai:a.mesai, hak, alinan:a.alinan});
      satirlar += "<tr data-ay='"+i+"'><td>"+AYLAR[i]+" ›</td><td>"+gun+"</td><td>"+a.mesai+"</td><td>"+paraFmt(hak)+"</td><td>"+paraFmt(a.alinan)+"</td><td>"+paraFmt(hak-a.alinan)+"</td></tr>";
    });
    if(!satirlar){
      $("#yil-icerik").innerHTML = '<div class="bos-mesaj"><span class="buyuk">📭</span>'+aktifYil+' yılında hiç kayıt yok.</div>';
      return;
    }
    $("#yil-icerik").innerHTML =
      '<table class="yil-tablo"><thead><tr><th>Ay</th><th>Gün</th><th>Mesai</th><th>Hakediş</th><th>Alınan</th><th>Kalan</th></tr></thead><tbody>'+
      satirlar+
      '<tr class="toplam"><td>TOPLAM</td><td>'+T.gun+'</td><td>'+T.mesai+'</td><td>'+paraFmt(T.hak)+'</td><td>'+paraFmt(T.alinan)+'</td><td>'+paraFmt(T.hak-T.alinan)+'</td></tr>'+
      '</tbody></table>'+
      '<p style="font-size:11.5px;color:var(--soluk);margin-top:8px">💡 Bir aya dokun: detayını gör, takvimine atla</p>';
    /* 📅 Aya tıkla → detay satırı + o aya gitme */
    document.querySelectorAll("#yil-icerik tr[data-ay]").forEach(tr=>{
      tr.addEventListener("click", ()=>{
        const acikDetay = tr.nextElementSibling;
        document.querySelectorAll("#yil-icerik tr.ay-detay").forEach(x=> x.remove());
        if(acikDetay && acikDetay.classList.contains("ay-detay")) return; /* aynıysa kapat */
        const i = Number(tr.dataset.ay);
        const a = aylik[i];
        const det = document.createElement("tr");
        det.className = "ay-detay";
        det.innerHTML = '<td colspan="6">'+
          /* Gün başı ortalama kaldırıldı (0.1.3.4) — yerine günlük
             yevmiye ve gün sayısı gösteriliyor, hesap açık olsun. */
          '📌 ' + a.gun + ' gün × ' + paraFmt(Number(ayarlar.yevmiye)||0) +
          (a.mesai>0 ? ' · Mesai: <b>'+a.mesai+' saat</b>' : '')+
          ' · Kalan: <b>'+paraFmt(a.hak-a.alinan)+'</b>'+
          ' &nbsp; <button class="eksik-cip" data-git="'+i+'">📅 '+AYLAR[i]+' takvimine git</button></td>';
        tr.after(det);
        det.querySelector("[data-git]").addEventListener("click", e=>{
          e.stopPropagation();
          aktifAy = i;
          ayiYukle(); ayBarCiz();
          gorunumSec("puantaj");
        });
      });
    });
  }catch(e){
    $("#yil-icerik").innerHTML = '<div class="bos-mesaj">Yüklenemedi.</div>';
    hataGoster(e);
  }
}

/* ---------- Patron raporu (WhatsApp) ----------
   Çalışılmayan gün: yevmiye 0, artı ve mesai BOMBOŞ.
   Çalışılan gün → YEVMİYE: X tam · / yarım · Ns saatlik
   ARTI: X tam artı · / yarım artı · 0 yok
   MESAİ: varsa saat (örn 3s) · yoksa 0 */
/* Bir günün hangi şantiyede geçtiğini çözer. Öncelik: o güne kaydedilmiş
   şantiye adı (varsa) → şantiyeId üzerinden şantiyeler listesinden ad →
   hiçbiri yoksa (özellik eklenmeden önceki eski kayıtlar) ayarlardaki GÜNCEL
   şantiye adına geriye dönük düşer, boş/"Bilinmiyor" göstermek yerine. */
/* ---------- 💼 İşlerim: her işten girişi/çıkışı ayrı bir kayıt ----------
   "Şantiyeler" (yukarıda) sadece ÜCRET hesaplama içindi. "İşler" bambaşka bir
   şey: bir işten çıkıp bambaşka bir firmaya/patrona geçince, o iki dönemin
   raporlarının/PDF'lerinin KESİNLİKLE karışmaması, her birinin kendi ayrı
   kartı ve ayrı raporu olması için. Zorunlu alanlar: ad, soyad, şantiye adı,
   patron adı, giriş tarihi (çıkış tarihi işten ayrılınca girilir). */
function aktifIs(){
  return (ayarlar.isler||[]).find(x=> !x.cikisTarihi) || null;
}
function isBul(id){
  return (ayarlar.isler||[]).find(x=> id>=x.girisTarihi && (!x.cikisTarihi || id<=x.cikisTarihi)) || null;
}
function isSirali(){
  return [...(ayarlar.isler||[])].sort((a,b)=> a.girisTarihi<b.girisTarihi?1:-1);  // en yeni üstte
}
function islerListCiz(){
  const kutu = $("#isler-liste");
  if(!kutu) return;
  const liste = isSirali();
  if(!liste.length){ kutu.innerHTML = '<div class="bos-mesaj" style="padding:14px">Henüz bir iş kaydın yok. Aşağıdan ilk işini ekle.</div>'; return; }
  kutu.innerHTML = "";
  liste.forEach(is=>{
    const aktif = !is.cikisTarihi;
    const aralik = tarihFormatla(is.girisTarihi) + " – " + (aktif ? "devam ediyor" : tarihFormatla(is.cikisTarihi));
    const li = document.createElement("li");
    li.innerHTML =
      '<div class="rozet" style="background:'+(aktif ? "var(--sari)" : "var(--mesai)")+'">'+(aktif ? "●" : "🏗️")+'</div>'+
      '<div class="orta" style="cursor:pointer">'+
        '<div class="baslik">'+esc(is.patronAdi)+(aktif ? ' <span style="color:var(--sari);font-size:11px">AKTİF</span>' : '')+'</div>'+
        '<div class="alt-yazi">🏗️ '+esc(is.santiyeAdi)+' · 📅 '+aralik+'</div>'+
      '</div><span style="opacity:.5;padding:0 4px">›</span>';
    li.querySelector(".orta").addEventListener("click", ()=> isDetayAc(is.id));
    kutu.appendChild(li);
  });
}
function tarihFormatla(id){
  if(!id) return "—";
  const [y,a,g] = id.split("-");
  return g+"/"+a+"/"+y;
}

function gunSantiyeAdi(v){
  if(v && v.santiye) return v.santiye;
  if(v && v.santiyeId){
    const s = (ayarlar.santiyeler||[]).find(x=>x.id===v.santiyeId);
    if(s) return s.ad;
  }
  return ayarlar.santiye || "";
}
/* Bir ay içindeki [gBas,gSon] gün aralığında hangi şantiyelerde çalışıldığını,
   ardışık aynı-şantiye günlerini TEK bloğa birleştirerek listeler. Örn: biri
   1-14 Temmuz'da A Şantiyesi'nde, 15-31'inde B Şantiyesi'nde çalıştıysa iki
   blok döner. Sadece kazancı olan (fiilen çalışılan) günler dikkate alınır. */
function santiyeBloklariCiz(yil, ay, gBas, gSon, girdilerHarita){
  const bloklar = [];
  for(let g=gBas; g<=gSon; g++){
    const id = yil+"-"+pad(ay+1)+"-"+pad(g);
    const v = girdilerHarita[id];
    const i = gunIsaret(v);
    const kazancVar = i.yev!=="0" ||
      (v && (Number(v.mesai)>0 || Number(v.mesaiYev)>0 || Number(v.geceYev)>0));
    if(!kazancVar) continue;
    const ad = gunSantiyeAdi(v) || "Belirtilmemiş";
    const son = bloklar[bloklar.length-1];
    if(son && son.ad===ad) son.son = g;
    else bloklar.push({ad, ilk:g, son:g});
  }
  return bloklar;
}
/* santiyeBloklariCiz()'in çıktısını okunabilir tek satıra çevirir.
   Tek şantiye varsa sadece adı döner (eski davranışla uyumlu, sade kalsın). */
function santiyeOzetMetni(bloklar, ay){
  if(!bloklar.length) return "";
  if(bloklar.length===1) return bloklar[0].ad;
  return bloklar.map(b=> (b.ilk===b.son ? b.ilk : b.ilk+"–"+b.son)+" "+AYLAR[ay].slice(0,3)+": "+b.ad).join(" · ");
}

function gunIsaret(v){
  const calisti = v && (v.durum==="tam" || v.durum==="yarim" ||
    (v.durum==="saatlik" && (Number(v.saat)||0)>0));
  if(!calisti){
    /* Gelinmeyen günde de mesai olabilir (işçi sadece akşam gelmiş olabilir).
       Yeni sistemde yevmiye katı, eskide saat — ikisi de gösterilmeli.
       Bu dal `mesaiYev`'i bilmiyordu, yeni kayıtlarda mesai boş
       görünüyordu (0.0.9.5'te bulundu). */
    const mY0 = v ? (Number(v.mesaiYev)||0) : 0;
    const m0  = v ? (Number(v.mesai)||0) : 0;
    let mes0 = "";
    if(mY0 > 0){
      const t0 = Math.floor(mY0), b0 = (mY0 - t0) >= 0.5;
      mes0 = (t0 <= 3 ? "X".repeat(t0) : t0+"X") + (b0 ? "/" : "");
      if(!mes0) mes0 = "/";
    }else if(m0 > 0){
      mes0 = String(m0).replace(".", ",")+"s";
    }
    return {yev: (v&&v.durum==="izin") ? "İ" : "0", arti:"", mesai: mes0};
  }
  let yev = "X";
  if(v.durum==="yarim") yev = "/";
  else if(v.durum==="saatlik") yev = v.saat+"s";
  const a = Number(v.arti)||0;
  let arti = "0";
  if(a>0){
    const tamA = Math.floor(a), bucuk = (a - tamA) >= 0.5;
    /* DÜZELTME: eskiden `Math.min(tamA,3)` ile 3'ten fazlası SESSİZCE
       kırpılıyordu — 4 artı da 5 artı da raporda "XXX" görünüyordu.
       Kazanç doğru hesaplanıyor ama artı sütunu yanlış gösteriyordu;
       patron 3 sayarken işçi 5 bekliyordu. Bu, imzalanan bir belgede
       anlaşmazlık çıkarır.
       3'e kadar geleneksel X gösterimi korunuyor (sektörün alıştığı
       biçim), fazlası sayıyla yazılıyor: "5X" gibi. */
    arti = tamA <= 3
      ? "X".repeat(tamA) + (bucuk ? "/" : "")
      : tamA + "X" + (bucuk ? "/" : "");
    if(!arti) arti = "/";
  }
  /* MESAİ GÖSTERİMİ (0.0.9.5)
     Yeni kayıtlar `mesaiYev` (yevmiye katı) tutuyor ve gün içi artı ile
     aynı dille gösteriliyor: X = bir tam yevmiye, / = yarım, XX = iki.
     Eski saat bazlı kayıtlar dokunulmadan "2s" biçiminde kalıyor —
     kullanıcı kararı: geçmiş tutarlar ve gösterim değişmesin. */
  const mYev = Number(v.mesaiYev)||0;
  const m    = Number(v.mesai)||0;
  let mesai;
  if(mYev > 0){
    const tamM = Math.floor(mYev), bucukM = (mYev - tamM) >= 0.5;
    mesai = tamM <= 3
      ? "X".repeat(tamM) + (bucukM ? "/" : "")
      : tamM + "X" + (bucukM ? "/" : "");
    if(!mesai) mesai = "/";
  }else{
    mesai = m>0 ? String(m).replace(".", ",")+"s" : "0";
  }
  return {yev, arti, mesai};
}

/* Bir dönem (gün aralığı) için gösterilecek ödemeleri seçer. NOT: `odemeler`
   dizisi zaten aitAy'a göre BU AYA süzülmüş halde gelir (odemeleriAyaGoreDoldur).
   Burada sadece gün-aralığı (1-15 / 16-son gibi kısmi dönem) filtresi uygulanır.
   Eğer ödeme FARKLI bir ayda alınıp FIFO gereği bu aya sayıldıysa (aitAy bu ay
   ama gerçek tarih başka ay), gün aralığı kıyası anlamsız kalır — o yüzden
   böyle ödemeler her zaman dahil edilir, hiçbir dönemde "kaybolmaz". */
function donemOdemeSec(bId, sId){
  const buAy = aktifYil + "-" + pad(aktifAy+1);
  return odemeler.filter(o=>{
    const tarihAy = String(o.tarih||"").slice(0,7);
    if(tarihAy !== buAy) return true;
    return o.tarih>=bId && o.tarih<=sId;
  });
}

/* ---------- Alınan paraların dökümü (rapor metni için) ---------- */
function masrafDokum(t){
  const liste = masraflar.filter(m=> !m.odendi && m.tarih>=t.bId && m.tarih<=t.sId)
                         .sort((a,b)=> a.tarih<b.tarih ? -1 : 1);
  if(!liste.length) return "";
  let s = "┈┈ Masrafların dökümü ┈┈\n";
  liste.forEach(m=>{
    const d = new Date(m.tarih+"T12:00:00");
    s += "• "+d.getDate()+" "+AYLAR[d.getMonth()].slice(0,3)+" — "+(m.aciklama||"Masraf")+": "+paraFmt(m.tutar)+"\n";
  });
  return s;
}
function alinanDokum(t){
  const liste = donemOdemeSec(t.bId, t.sId)
                        .sort((a,b)=> a.tarih<b.tarih ? -1 : 1);
  if(!liste.length) return "";
  let m = "┈┈ Alınanların dökümü ┈┈\n";
  liste.forEach(o=>{
    const d = new Date(o.tarih+"T12:00:00");
    m += "• "+d.getDate()+" "+AYLAR[d.getMonth()].slice(0,3)+" — "+odemeTurEtiket(o.tur)+
         (o.not ? " ("+o.not+")" : "")+": "+paraFmt(o.tutar)+"\n";
  });
  return m;
}

/* ---------- Dönem hesabı (1–15, 16–son, tüm ay) ---------- */
function hesaplaAralik(gBas, gSon){
  const aySonu = new Date(aktifYil, aktifAy+1, 0).getDate();
  if(gBas==null) gBas = 1;
  if(gSon==null) gSon = aySonu;
  gSon = Math.min(gSon, aySonu);
  let gunSayisi=0, mesaiToplam=0, saatToplam=0, artiToplam=0, hakedis=0;
  Object.entries(girdiler).forEach(([id, v])=>{
    const g = Number(id.slice(8,10));
    if(g<gBas || g>gSon) return;
    gunSayisi += girdiGun(v);
    mesaiToplam += mesaiSaatMik(v);
    if(v.durum==="saatlik") saatToplam += Number(v.saat)||0;
    artiToplam += (Number(v.arti)||0) + mesaiYevMik(v);
    hakedis += girdiKazanc(v);
  });
  const bId = aktifYil+"-"+pad(aktifAy+1)+"-"+pad(gBas);
  const sId = aktifYil+"-"+pad(aktifAy+1)+"-"+pad(gSon);
  const alinan = donemOdemeSec(bId, sId)
                         .reduce((s,o)=> s+(Number(o.tutar)||0), 0);
  const masrafToplam = masraflar.filter(m=> !m.odendi && m.tarih>=bId && m.tarih<=sId)
                                .reduce((s,m)=> s+(Number(m.tutar)||0), 0);
  return {gBas, gSon, gunSayisi, mesaiToplam, saatToplam, artiToplam, bId, sId,
          hakedis, alinan, masrafToplam, kalan: hakedis + masrafToplam - alinan,
          etiket: (gBas===1 && gSon===aySonu) ? "" : " ("+gBas+"–"+gSon+")"};
}

async function raporPaylas(gBas, gSon){
  const t = hesaplaAralik(gBas, gSon);
  const ad = (kullanici && kullanici.displayName) || "";
  const kolon = (s,n) => String(s).padEnd(n," ");
  /* RAPOR OKUNURLUĞU (0.0.6.5)
     Eski hâlde çalışılan gün "X", gelinmeyen gün "0" ile gösteriliyordu.
     Bu, raporu OKUYAN kişi (patron/ustabaşı) için tehlikeliydi: "X" günlük
     dilde "olmadı / gelmedi" anlamına gelir, oysa burada TAM TERSİ —
     çalışıldığını belirtiyordu. Ayrıca hangi işaretin ne demek olduğunu
     açıklayan bir satır yoktu. Bir ödeme anlaşmazlığında bu, işçinin
     aleyhine yorumlanabilecek bir belirsizlikti.
     Yeni gösterim kendi kendini açıklıyor: "Tam", "Yarım", "—", "İzin". */
  let calisilanSatir = 0;
  let satirlar = "TARİH     YEVMİYE  ARTI  MESAİ\n";
  for(let g=t.gBas; g<=t.gSon; g++){
    const id = aktifYil+"-"+pad(aktifAy+1)+"-"+pad(g);
    const d = new Date(aktifYil, aktifAy, g);
    const v = girdiler[id];
    const i = gunIsaret(v);
    /* Boş günleri (hiç işlenmemiş) rapora yazma — 31 satırın çoğu boşsa
       rapor okunmaz hâle geliyor. Yalnızca kaydı olan günler listeleniyor. */
    if(!v) continue;
    calisilanSatir++;

    satirlar += kolon(pad(g)+"."+pad(aktifAy+1)+" "+GUNLER[d.getDay()].slice(0,2), 11)
              + kolon(i.yev,9) + kolon(i.arti,6) + i.mesai + "\n";
  }
  if(!calisilanSatir) satirlar += "(bu aralıkta işlenmiş gün yok)\n";
  const metin =
    "📋 *PUANTAJ — " + AYLAR[aktifAy] + " " + aktifYil + t.etiket + "*\n" +
    (ad ? "👷 " + ad + "\n" : "") +
    "```\n" + satirlar + "```\n" +
    "_X = tam yevmiye · / = yarım · XX = 2 yevmiye · 0 = gelinmedi_\n" +
    "✅ Çalışılan: " + t.gunSayisi + " gün" +
    (t.saatToplam>0 ? " ("+t.saatToplam+" saat)" : "") + "\n" +
    (t.artiToplam>0 ? "➕ Gün içi artı: " + t.artiToplam + "\n" : "") +
    "⏱ Mesai: " + t.mesaiToplam + " saat\n" +
    "────────────\n" +
    "💰 Hakediş: " + paraFmt(t.hakedis) + "\n" +
    "💵 Alınan: " + paraFmt(t.alinan) + "\n" +
    alinanDokum(t) +
    (t.masrafToplam>0 ? "🧾 Masraf alacağı: " + paraFmt(t.masrafToplam) + "\n" + masrafDokum(t) : "") +
    "🔴 KALAN: " + paraFmt(t.kalan) + "\n_Puantaj Defterim ile hazırlandı_";
  try{
    if(navigator.share){
      await navigator.share({text: metin});
    }else{
      await navigator.clipboard.writeText(metin);
      toast("Rapor kopyalandı, WhatsApp'a yapıştır 📋");
    }
  }catch(e){ /* kullanıcı paylaşımı iptal etti */ }
}

/* ---------- Hızlı işaretleme + geri al ---------- */
async function hizliIsaretle(id){
  if(ayKilitli(id)){ toast("Bu ay kilitli 🔒 Hesap özetinden açabilirsin"); return; }
  const onceki = girdiler[id] ? {...girdiler[id]} : null;
  const saatlikMod = ayarlar.calismaTipi==="saatlik";
  const veri = {
    durum: saatlikMod ? "saatlik" : "tam",
    mesai:0,
    santiye: ayarlar.santiye||"", santiyeId:"", not:"",
    ...guncelOranlar("", id),
    guncelleme: firebase.firestore.FieldValue.serverTimestamp()
  };
  if(saatlikMod) veri.saat = ayarlar.gunlukSaat||8;
  try{
    titret(35);
    await kokRef().collection("girdiler").doc(id).set(veri);
    toastGeriAl(saatlikMod ? "⚡ "+(ayarlar.gunlukSaat||8)+" saat işlendi" : "⚡ Tam yevmiye işlendi", {id, onceki});
  }catch(e){ hataGoster(e); }
}

/* islem: {id, onceki, foto?} — foto varsa, gün kaydıyla birlikte silinmiş
   şantiye fotoğrafı da geri yazılır (masraf/ödeme geri almadaki aynı düzeltme). */
function toastGeriAl(mesaj, islem){
  const t = $("#toast");
  t.innerHTML = "";
  t.appendChild(document.createTextNode(mesaj + " "));
  const b = document.createElement("button");
  b.textContent = "GERİ AL";
  b.style.cssText = "margin-left:10px;color:var(--sari);font-weight:800;font-size:14px";
  b.addEventListener("click", async ()=>{
    try{
      const ref = kokRef().collection("girdiler").doc(islem.id);
      if(islem.onceki) await ref.set(islem.onceki);
      else await ref.delete();
      if(islem.foto!=null){
        try{ await kokRef().collection("fotolar").doc(islem.id).set(islem.foto); }catch(e){}
      }
      toast("Geri alındı ↩️");
      anaTazele();
    }catch(e){ hataGoster(e); }
  });
  t.appendChild(b);
  t.classList.add("goster");
  clearTimeout(toastZaman);
  toastZaman = setTimeout(()=> t.classList.remove("goster"), 5500);
}

/* ---------- PDF hakediş raporu (patron formatı, dönem destekli) ---------- */
/* Hem yazdırma sekmesi (pdfYazdir) hem de "resim gibi PDF" (pdfResimBlobOlustur) için
   AYNI HTML içeriğini üretir — tek bir yerden bakım yapılır, ikisi de birbirini tutar.
   Seçiciler ".pdf-rapor" ile öneklenir ki bir <style> etiketi olarak ana uygulama
   sayfasına geçici eklendiğinde (resim alma akışında) app'in kendi tablo/başlık
   stillerini ezmesin. */
function raporIcerikUret(gBas, gSon){
  const t = hesaplaAralik(gBas, gSon);
  const ad = (kullanici && kullanici.displayName) || "";
  let satirlar = "";
  for(let g=t.gBas; g<=t.gSon; g++){
    const id = aktifYil+"-"+pad(aktifAy+1)+"-"+pad(g);
    const d = new Date(aktifYil, aktifAy, g);
    const v = girdiler[id];
    const i = gunIsaret(v);
    const kazancVar = i.yev!=="0" ||
      (v && (Number(v.mesai)>0 || Number(v.mesaiYev)>0 || Number(v.geceYev)>0));
    const pazar = d.getDay()===0 ? " style='background:#F4F4F4;color:#999'" : "";
    satirlar += "<tr"+pazar+"><td>"+pad(g)+" / "+pad(aktifAy+1)+" / "+aktifYil+" — "+GUNLER[d.getDay()]+
      "</td><td class='orta-h'>"+i.yev+"</td><td class='orta-h'>"+i.arti+"</td><td class='orta-h'>"+i.mesai+
      "</td><td>"+(kazancVar ? esc(gunSantiyeAdi(v)) : "")+
      "</td><td class='sag'>"+(kazancVar ? paraFmt(girdiKazanc(v)) : "")+"</td></tr>";
  }
  /* 🏗️ Dönem içinde birden fazla şantiyede çalışılmışsa (biri bırakılıp
     diğerine geçilmişse), her ikisi de tarih aralığıyla birlikte görünsün diye
     — tek bir "güncel şantiye" adı yazıp eskisini kaybetmeyelim. */
  const santiyeBloklar = santiyeBloklariCiz(aktifYil, aktifAy, t.gBas, t.gSon, girdiler);
  const santiyeOzeti = santiyeOzetMetni(santiyeBloklar, aktifAy);
  /* 💰 Para girişleri: türlere göre AYRI bölümler — avanslar tek tek görünür */
  const donemOdeme = donemOdemeSec(t.bId, t.sId)
                             .sort((a,b)=> a.tarih<b.tarih?-1:1);
  function odemeBolum(baslik, liste2){
    if(!liste2.length) return "";
    let oSat = "", araToplam = 0;
    liste2.forEach((o, idx)=>{
      const d2 = new Date(o.tarih+"T12:00:00");
      araToplam += Number(o.tutar)||0;
      oSat += "<tr><td class='orta-h'>"+(idx+1)+"</td><td>"+pad(d2.getDate())+" / "+pad(d2.getMonth()+1)+" / "+d2.getFullYear()+
        " — "+GUNLER[d2.getDay()]+"</td><td>"+esc(o.not||"")+
        "</td><td class='sag'>"+paraFmt(o.tutar)+"</td></tr>";
    });
    return '<h2 style="font-size:15px;margin-top:22px;border-bottom:3px solid #FFC400;padding-bottom:5px">'+baslik+' ('+liste2.length+' adet)</h2>'+
      '<table><tr><th style="width:34px;text-align:center">#</th><th>TARİH</th><th>NOT</th><th class="sag">TUTAR</th></tr>'+oSat+
      '<tr class="ozet"><td colspan="3">'+baslik+' TOPLAMI</td><td class="sag">'+paraFmt(araToplam)+'</td></tr></table>';
  }
  const tSec = t2 => donemOdeme.filter(o=> (o.tur||"diger")===t2);
  let odemeHtml =
    odemeBolum("AVANSLAR", tSec("avans")) +
    odemeBolum("HAKEDİŞ ÖDEMELERİ", tSec("hakedis")) +
    odemeBolum("KESİNTİLER", tSec("kesinti")) +
    odemeBolum("DİĞER ÖDEMELER", tSec("diger"));
  if(donemOdeme.length){
    odemeHtml += '<table style="margin-top:10px"><tr class="ozet"><td>DÖNEM TOPLAM ALINAN ('+donemOdeme.length+' işlem)</td><td class="sag">'+paraFmt(t.alinan)+'</td></tr></table>';
  }else{
    odemeHtml = '<h2 style="font-size:15px;margin-top:22px;border-bottom:3px solid #FFC400;padding-bottom:5px">ALINAN PARALAR</h2>'+
      '<p style="font-size:12px;color:#666">Bu dönemde kayıtlı para girişi yok.</p>';
  }

  const css =
    '.pdf-rapor{font-family:Arial,sans-serif;font-size:12.5px;color:#111;padding:24px;max-width:720px;margin:auto;background:#fff}'+
    '.pdf-rapor h1{font-size:19px;border-bottom:4px solid #FFC400;padding-bottom:8px}'+
    '.pdf-rapor table{width:100%;border-collapse:collapse;margin-top:12px}'+
    '.pdf-rapor th,.pdf-rapor td{border:1px solid #999;padding:5px 8px;text-align:left}'+
    '.pdf-rapor th{background:#f2f2f2;font-size:11px}'+
    '.pdf-rapor .sag{text-align:right}.pdf-rapor .orta-h{text-align:center;font-weight:bold}'+
    '.pdf-rapor .ozet td{font-weight:bold;background:#FFF7DC}'+
    '.pdf-rapor .imza{display:flex;justify-content:space-between;margin-top:55px}'+
    '.pdf-rapor .imza div{width:40%;border-top:1.5px solid #111;padding-top:6px;text-align:center;font-size:12px}';

  const govde = '<div class="pdf-rapor">'+
    '<h1>PUANTAJ ÇİZELGESİ — '+AYLAR[aktifAy]+' '+aktifYil+t.etiket+'</h1>'+
    (ad ? '<p><b>İşçi:</b> '+esc(ad)+(santiyeOzeti?' &nbsp;·&nbsp; <b>Şantiye:</b> '+esc(santiyeOzeti):'')+'</p>' : '')+
    '<table><tr><th>TARİH</th><th style="text-align:center">YEVMİYE</th><th style="text-align:center">GÜN İÇİ ARTI</th><th style="text-align:center">MESAİ</th><th>ŞANTİYE</th><th class="sag">KAZANÇ</th></tr>'+
    satirlar+
    '<tr class="ozet"><td>TOPLAM: '+t.gunSayisi+' gün'+(t.artiToplam>0?' · '+t.artiToplam+' artı':'')+' · '+t.mesaiToplam+' saat mesai</td><td colspan="4">HAKEDİŞ</td><td class="sag">'+paraFmt(t.hakedis)+'</td></tr>'+
    '<tr class="ozet"><td></td><td colspan="4">ALINAN (avans/ödeme)</td><td class="sag">'+paraFmt(t.alinan)+'</td></tr>'+
    (t.masrafToplam>0 ? '<tr class="ozet"><td></td><td colspan="4">MASRAF ALACAĞI</td><td class="sag">'+paraFmt(t.masrafToplam)+'</td></tr>' : '')+
    '<tr class="ozet"><td></td><td colspan="4">KALAN</td><td class="sag">'+paraFmt(t.kalan)+'</td></tr></table>'+
    odemeHtml+
    '<div class="imza"><div>İşçi<br>Ad Soyad / İmza</div><div>İşveren<br>Ad Soyad / İmza</div></div>'+
    '</div>';

  return {t, css, govde};
}

function pdfYazdir(gBas, gSon){
  const {css, govde} = raporIcerikUret(gBas, gSon);
  const w = window.open("", "_blank");
  if(!w){ toast("Tarayıcı yeni pencereyi engelledi, izin ver"); return; }
  w.document.write('<html><head><meta charset="UTF-8"><title>Puantaj - '+AYLAR[aktifAy]+' '+aktifYil+'</title>'+
    '<style>body{margin:0}'+css+'</style></head><body>'+govde+'</body></html>');
  w.document.close(); w.focus();
  setTimeout(()=> w.print(), 500);
}

/* ---------- Gerçek PDF DOSYASI üretme (WhatsApp'a metin değil, dosya olarak paylaşmak için) ----------
   pdfYazdir() bir tarayıcı sekmesi açıp yazdırma diyaloğu gösterir — kullanıcı isterse
   "PDF olarak kaydet" seçebilir ama bu, uygulamanın ELİNDE gerçek bir dosya olmaz, o yüzden
   WhatsApp paylaşımına otomatik EKLENEMEZ. Bunun yerine jsPDF ile hafızada gerçek bir PDF
   dosyası (Blob) üretip, Web Share API'ye (navigator.share) dosya olarak veriyoruz — telefonun
   paylaşım ekranı açılıyor ve WhatsApp seçilince gerçek bir PDF eki gidiyor (yazı değil). */
/* Bir jsPDF dokümanına Türkçe destekli gerçek fontu gömer, doc.text/doc.autoTable'ı
   otomatik bu fontu kullanacak şekilde sarar. Her PDF üreten fonksiyon bunu çağırır
   (tek yerden bakım — ileride yeni bir PDF raporu eklenirse tekrar yazılmaz). */
/* ---------- ⚡ PDF fontlarını TEMBEL yükle (eski cihazlarda açılış performansı) ----------
   SORUN: font-liberationsans-regular.js (535 KB) ve -bold.js (540 KB), yani toplam
   ~1,05 MB base64 metin, index.html'de normal <script> etiketiyle duruyordu. Bu şu
   demekti: uygulama HER açıldığında tarayıcı bu 1 MB'ı indirip JavaScript olarak
   ayrıştırmak (parse) ve çalıştırmak zorundaydı — üstelik render'ı bloklayarak.
   Modern telefonda fark edilmez ama eski/yavaş cihazlarda bu, her açılışta saniyelerle
   ölçülen bir donma demek. Oysa bu fontlar SADECE PDF üretilirken gerekiyor; kullanıcı
   hiç PDF paylaşmasa bile bedeli her açılışta ödeniyordu.

   ÇÖZÜM: <script> etiketleri index.html'den kaldırıldı; fontlar ilk PDF üretimi
   sırasında talep üzerine yükleniyor. Bir kez yüklendikten sonra bellekte kalıyor
   (aynı oturumda ikinci PDF anında üretilir). Yükleme başarısız olursa kod zaten
   var olan "helvetica" yedeğine düşüyor — PDF yine üretilir, sadece Türkçe karakter
   desteği jsPDF'in gömülü fontuna kalır. */
/* ⚡ TALEP ÜZERİNE KÜTÜPHANE YÜKLEME (0.0.9.2)
   ─────────────────────────────────────────────────────────────────
   SheetJS, jsPDF, autotable, html2canvas ve Tesseract eskiden
   index.html'de açılışta yükleniyordu — sıkıştırılmış ~350 KB. Hiçbiri
   uygulama açılırken gerekmiyor; yalnızca Excel/PDF/görsel/fiş okuma
   işlemlerinde lazım oluyorlar.
   Artık ilk ihtiyaç anında yükleniyorlar. Service worker bunları
   önbelleğe aldığı için (0.0.7.0) ikinci kullanımda anında geliyor.

   Aynı anda iki çağrı gelirse tek indirme yapılır (söz saklanıyor).
   Yükleme başarısız olursa söz sıfırlanır ki tekrar denenebilsin. */
const KUTUPHANE_ADRES = {
  xlsx:        ["https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js"],
  jspdf:       ["https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
                "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"],
  html2canvas: ["https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"],
  tesseract:   ["https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"]
};
const KUTUPHANE_HAZIR = {
  xlsx:        ()=> typeof XLSX !== "undefined",
  jspdf:       ()=> !!(window.jspdf && window.jspdf.jsPDF),
  html2canvas: ()=> typeof html2canvas !== "undefined",
  tesseract:   ()=> typeof Tesseract !== "undefined"
};
const kutuphaneSozleri = {};
function kutuphaneYukle(ad){
  if(KUTUPHANE_HAZIR[ad] && KUTUPHANE_HAZIR[ad]()) return Promise.resolve(true);
  if(kutuphaneSozleri[ad]) return kutuphaneSozleri[ad];
  const adresler = KUTUPHANE_ADRES[ad] || [];
  /* Sırayla yükle: autotable jsPDF'e bağımlı, paralel yüklenirse bozulur. */
  const sirayla = adresler.reduce((zincir, src)=>
    zincir.then(()=> new Promise(tamam=>{
      const sc = document.createElement("script");
      sc.src = src;
      sc.onload  = ()=> tamam(true);
      sc.onerror = ()=> tamam(false);
      document.head.appendChild(sc);
    })), Promise.resolve());

  kutuphaneSozleri[ad] = sirayla.then(()=>{
    const oldu = KUTUPHANE_HAZIR[ad] ? KUTUPHANE_HAZIR[ad]() : true;
    if(!oldu) kutuphaneSozleri[ad] = null;   /* tekrar denenebilsin */
    return oldu;
  });
  return kutuphaneSozleri[ad];
}

let pdfFontSozu = null;
function pdfFontlariYukle(){
  if(window.PDF_FONT_REGULAR_B64 && window.PDF_FONT_BOLD_B64) return Promise.resolve();
  if(pdfFontSozu) return pdfFontSozu;                 /* aynı anda iki çağrı gelirse tek indirme */
  const tekDosya = src => new Promise((tamam)=>{
    const s = document.createElement("script");
    s.src = src;
    s.onload = ()=> tamam(true);
    s.onerror = ()=> tamam(false);                    /* reject etme: helvetica yedeği devrede */
    document.head.appendChild(s);
  });
  pdfFontSozu = Promise.all([
    tekDosya("font-liberationsans-regular.js"),
    tekDosya("font-liberationsans-bold.js")
  ]).then(()=>{
    /* Yükleme başarısızsa bir daha denenebilsin diye sözü sıfırla */
    if(!(window.PDF_FONT_REGULAR_B64 && window.PDF_FONT_BOLD_B64)) pdfFontSozu = null;
  });
  return pdfFontSozu;
}
function pdfTurkceFontKur(doc){
  if(window.PDF_FONT_REGULAR_B64){
    doc.addFileToVFS("LiberationSans-Regular.ttf", window.PDF_FONT_REGULAR_B64);
    doc.addFont("LiberationSans-Regular.ttf", "LiberationSans", "normal");
  }
  if(window.PDF_FONT_BOLD_B64){
    doc.addFileToVFS("LiberationSans-Bold.ttf", window.PDF_FONT_BOLD_B64);
    doc.addFont("LiberationSans-Bold.ttf", "LiberationSans", "bold");
  }
  const yaziTipi = (window.PDF_FONT_REGULAR_B64 && window.PDF_FONT_BOLD_B64) ? "LiberationSans" : "helvetica";
  const lira = s => String(s==null?"":s).replace(/₺/g,"TL");   /* fontta olmayan TEK karakter */
  const _text = doc.text.bind(doc);
  doc.text = (txt, x, yy, opt) => _text(Array.isArray(txt) ? txt.map(lira) : lira(txt), x, yy, opt);
  const _autoTable = doc.autoTable.bind(doc);
  doc.autoTable = (ayar)=>{
    ayar.styles = Object.assign({font:yaziTipi}, ayar.styles);
    if(ayar.headStyles) ayar.headStyles.font = yaziTipi;
    if(ayar.footStyles) ayar.footStyles.font = yaziTipi;
    ayar.didParseCell = (veri)=>{
      veri.cell.text = Array.isArray(veri.cell.text) ? veri.cell.text.map(lira) : lira(veri.cell.text);
    };
    return _autoTable(ayar);
  };
  return yaziTipi;
}

function pdfBlobOlustur(gBas, gSon){
  if(!window.jspdf || !window.jspdf.jsPDF) return null;
  const { jsPDF } = window.jspdf;
  const t = hesaplaAralik(gBas, gSon);
  const ad = (kullanici && kullanici.displayName) || "";
  const santiyeOzeti = santiyeOzetMetni(santiyeBloklariCiz(aktifYil, aktifAy, t.gBas, t.gSon, girdiler), aktifAy);
  const doc = new jsPDF({unit:"pt", format:"a4"});
  const solX = 40, sagX = 555;
  let y = 46;

  /* jsPDF'in standart (helvetica) fontu Türkçe'ye özgü İ, ı, Ş/ş, Ğ/ğ harflerini
     desteklemiyor — gerçek Türkçe destekli fontu (Liberation Sans) gömüyoruz. */
  const yaziTipi = pdfTurkceFontKur(doc);

  doc.setFont(yaziTipi,"bold"); doc.setFontSize(15);
  doc.text("PUANTAJ ÇİZELGESİ — "+AYLAR[aktifAy]+" "+aktifYil+t.etiket, solX, y);
  y += 8;
  doc.setDrawColor(255,196,0); doc.setLineWidth(2.5);
  doc.line(solX, y, sagX, y);
  y += 16;
  /* BELGE KÜNYESİ
     Bu PDF'in altında İŞÇİ / İŞVEREN imza alanı var — yani bir ödeme
     anlaşmazlığında delil niteliği taşıyor. Böyle bir belgede iki temel
     bilgi eksikti:
       1) DÜZENLENME TARİHİ — belgenin ne zaman hazırlandığı yazmıyordu
       2) UYGULANAN ÜCRET — anlaşmazlığın konusu genelde tam olarak budur
          ("günlüğün kaçtı?"). Tabloda yalnızca sonuç tutarları vardı,
          hangi ücretten hesaplandığı belirtilmiyordu. */
  doc.setFont(yaziTipi,"normal"); doc.setFontSize(9.5); doc.setTextColor(60);
  if(ad || santiyeOzeti){
    doc.text("İşçi: "+(ad||"—")+(santiyeOzeti ? "   ·   Şantiye: "+santiyeOzeti : ""), solX, y);
    y += 12;
  }
  const ucretSatiri = [];
  if(Number(ayarlar.yevmiye)>0)    ucretSatiri.push("Günlük yevmiye: "+paraFmt(ayarlar.yevmiye));
  if(Number(ayarlar.saatUcret)>0)  ucretSatiri.push("Saat ücreti: "+paraFmt(ayarlar.saatUcret));
  if(Number(ayarlar.mesaiUcret)>0) ucretSatiri.push("Mesai saati: "+paraFmt(ayarlar.mesaiUcret));
  if(ucretSatiri.length){ doc.text(ucretSatiri.join("   ·   "), solX, y); y += 12; }
  doc.text("Belge düzenlenme tarihi: "+new Date().toLocaleDateString("tr-TR"), solX, y);
  doc.setTextColor(0);

  /* Ana çizelge tablosu */
  const gunSatir = [];
  for(let g=t.gBas; g<=t.gSon; g++){
    const id = aktifYil+"-"+pad(aktifAy+1)+"-"+pad(g);
    const d = new Date(aktifYil, aktifAy, g);
    const v = girdiler[id];
    const i = gunIsaret(v);
    const kazancVar = i.yev!=="0" ||
      (v && (Number(v.mesai)>0 || Number(v.mesaiYev)>0 || Number(v.geceYev)>0));
    gunSatir.push([
      pad(g)+" / "+pad(aktifAy+1)+" / "+aktifYil+" — "+GUNLER[d.getDay()],
      i.yev, i.arti, i.mesai,
      kazancVar ? gunSantiyeAdi(v) : "",
      kazancVar ? paraFmt(girdiKazanc(v)) : ""
    ]);
  }
  doc.autoTable({
    startY: y+8, margin:{left:solX, right: 595-sagX},
    head: [["TARİH","YEVMİYE","GÜN İÇİ ARTI","MESAİ","ŞANTİYE","KAZANÇ"]],
    body: gunSatir,
    styles:{fontSize:8, cellPadding:4, lineColor:[200,200,200], lineWidth:0.5},
    headStyles:{fillColor:[242,242,242], textColor:20, fontStyle:"bold"},
    columnStyles:{1:{halign:"center"},2:{halign:"center"},3:{halign:"center"},5:{halign:"right"}},
    foot:[
      ["TOPLAM: "+t.gunSayisi+" gün"+(t.artiToplam>0?" · "+t.artiToplam+" artı":"")+" · "+t.mesaiToplam+" saat mesai","","HAKEDİŞ","","",paraFmt(t.hakedis)],
      ["","","ALINAN (avans/ödeme)","","",paraFmt(t.alinan)],
      ...(t.masrafToplam>0 ? [["","","MASRAF ALACAĞI","","",paraFmt(t.masrafToplam)]] : []),
      ["","","KALAN","","",paraFmt(t.kalan)]
    ],
    footStyles:{fillColor:[255,247,220], textColor:20, fontStyle:"bold", fontSize:8.5}
  });
  let y2 = doc.lastAutoTable.finalY + 22;

  /* Para girişleri: avans/hakediş/kesinti/diğer — türlere göre ayrı bölümler */
  const donemOdeme = donemOdemeSec(t.bId, t.sId).sort((a,b)=> a.tarih<b.tarih?-1:1);
  const tSec = t2 => donemOdeme.filter(o=> (o.tur||"diger")===t2);
  function odemeBolumPdf(baslik, liste2){
    if(!liste2.length) return;
    const tahminiYukseklik = 24 + 22 + liste2.length*17 + 20;
    if(y2 + tahminiYukseklik > 780){ doc.addPage(); y2 = 50; }
    doc.setFont(yaziTipi,"bold"); doc.setFontSize(11); doc.setTextColor(0);
    doc.text(baslik+" ("+liste2.length+" adet)", solX, y2);
    const araToplam = liste2.reduce((s,o)=>s+(Number(o.tutar)||0),0);
    const body = liste2.map((o,idx)=>{
      const d2 = new Date(o.tarih+"T12:00:00");
      return [String(idx+1), pad(d2.getDate())+" / "+pad(d2.getMonth()+1)+" / "+d2.getFullYear()+" — "+GUNLER[d2.getDay()], o.not||"", paraFmt(o.tutar)];
    });
    doc.autoTable({
      startY: y2+8, margin:{left:solX, right: 595-sagX},
      head: [["#","TARİH","NOT","TUTAR"]],
      body,
      foot: [["", "", baslik+" TOPLAMI", paraFmt(araToplam)]],
      styles:{fontSize:8, cellPadding:4, lineColor:[200,200,200], lineWidth:0.5},
      headStyles:{fillColor:[242,242,242], textColor:20, fontStyle:"bold"},
      footStyles:{fillColor:[255,247,220], textColor:20, fontStyle:"bold"},
      columnStyles:{0:{halign:"center", cellWidth:24}, 3:{halign:"right"}},
      rowPageBreak: "avoid"
    });
    y2 = doc.lastAutoTable.finalY + 18;
  }
  odemeBolumPdf("AVANSLAR", tSec("avans"));
  odemeBolumPdf("HAKEDİŞ ÖDEMELERİ", tSec("hakedis"));
  odemeBolumPdf("KESİNTİLER", tSec("kesinti"));
  odemeBolumPdf("DİĞER ÖDEMELER", tSec("diger"));
  if(!donemOdeme.length){
    if(y2 > 740){ doc.addPage(); y2 = 50; }
    doc.setFont(yaziTipi,"bold"); doc.setFontSize(11);
    doc.text("ALINAN PARALAR", solX, y2); y2 += 16;
    doc.setFont(yaziTipi,"normal"); doc.setFontSize(9); doc.setTextColor(100);
    doc.text("Bu dönemde kayıtlı para girişi yok.", solX, y2);
    doc.setTextColor(0);
    y2 += 20;
  }

  /* ── MUTABAKAT ÖZETİ (imzanın hemen üstünde) ──────────────────────
     Toplamlar tablonun alt satırındaydı; çok günlü bir ayda tablo birkaç
     sayfa sürebiliyor ve imza atan kişi neyi onayladığını görmeden
     imzalıyordu. İmzanın hemen üstüne, tek cümlelik ve rakamlı bir
     mutabakat metni kondu. */
  if(y2 > 690){ doc.addPage(); y2 = 60; } else { y2 += 24; }
  doc.setFillColor(255,247,220);
  doc.rect(solX, y2-13, sagX-solX, 46, "F");
  doc.setFont(yaziTipi,"bold"); doc.setFontSize(9.5); doc.setTextColor(20);
  doc.text("MUTABAKAT", solX+8, y2);
  doc.setFont(yaziTipi,"normal"); doc.setFontSize(9);
  doc.text(
    AYLAR[aktifAy]+" "+aktifYil+t.etiket+" dönemi için "+t.gunSayisi+" gün çalışma karşılığı "+
    paraFmt(t.hakedis)+" hakediş doğmuş, "+paraFmt(t.alinan)+" ödenmiştir.",
    solX+8, y2+14);
  doc.setFont(yaziTipi,"bold");
  doc.text("Kalan alacak: "+paraFmt(t.kalan), solX+8, y2+27);
  doc.setTextColor(0);
  y2 += 46;

  /* İmza satırları */
  if(y2 > 720){ doc.addPage(); y2 = 60; } else { y2 += 34; }
  doc.setDrawColor(30); doc.setLineWidth(1);
  doc.line(solX, y2, solX+180, y2);
  doc.line(sagX-180, y2, sagX, y2);
  doc.setFont(yaziTipi,"normal"); doc.setFontSize(9);
  doc.text("İşçi", solX, y2+14); doc.text("Ad Soyad / İmza", solX, y2+26);
  doc.text("Tarih: ......../......../..........", solX, y2+40);
  doc.text("İşveren", sagX-180, y2+14); doc.text("Ad Soyad / İmza", sagX-180, y2+26);
  doc.text("Tarih: ......../......../..........", sagX-180, y2+40);

  /* ── SAYFA NUMARALARI ─────────────────────────────────────────────
     İmzalanan çok sayfalı bir belgeden bir sayfa çıkarılsa fark
     edilmiyordu. "Sayfa 2 / 4" bunu görünür kılıyor. */
  const toplamSayfa = doc.internal.getNumberOfPages();
  for(let sf=1; sf<=toplamSayfa; sf++){
    doc.setPage(sf);
    doc.setFont(yaziTipi,"normal"); doc.setFontSize(8); doc.setTextColor(120);
    doc.text("Sayfa "+sf+" / "+toplamSayfa, sagX-60, 820);
    doc.text("Puantaj Defterim", solX, 820);
    doc.setTextColor(0);
  }

  return doc.output("blob");
}

/* ---------- "Resim gibi" PDF: yazdırma sekmesindeki HTML'in BİREBİR görüntüsünü
   alıp PDF'e gömüyor (ekran görüntüsü gibi ama gerçek bir PDF dosyası içinde).
   jsPDF'in metin motoru yerine tarayıcının KENDİ font render motorunu kullandığı
   için Türkçe karakterler (İ, ı, ş, ğ, ₺ dahil) HER ZAMAN doğru ve net çıkıyor —
   yazdırıp kaydettiğin PDF'le birebir aynı görünür. */
async function pdfResimBlobOlustur(gBas, gSon){
  await Promise.all([kutuphaneYukle("html2canvas"), kutuphaneYukle("jspdf")]);
  if(!window.html2canvas || !window.jspdf || !window.jspdf.jsPDF) return null;
  const { jsPDF } = window.jspdf;
  const {css, govde} = raporIcerikUret(gBas, gSon);
  const kutu = document.createElement("div");
  kutu.style.cssText = "position:fixed;left:-9999px;top:0;width:720px;background:#fff;z-index:-1";
  kutu.innerHTML = "<style>"+css+"</style>"+govde;
  document.body.appendChild(kutu);
  try{
    await new Promise(r=> setTimeout(r, 80));   /* tablo/font oturması için kısa nefes */
    const canvas = await html2canvas(kutu, {scale:2, backgroundColor:"#ffffff", useCORS:true});
    const dokPdf = new jsPDF({unit:"pt", format:"a4"});
    const sayfaGenislik = dokPdf.internal.pageSize.getWidth();
    const sayfaYukseklik = dokPdf.internal.pageSize.getHeight();
    const oran = sayfaGenislik / canvas.width;
    const toplamYukseklikPt = canvas.height * oran;
    const resim = canvas.toDataURL("image/jpeg", 0.92);
    const sayfaSayisi = Math.max(1, Math.ceil(toplamYukseklikPt / sayfaYukseklik));
    for(let i=0; i<sayfaSayisi; i++){
      if(i>0) dokPdf.addPage();
      dokPdf.addImage(resim, "JPEG", 0, -(i*sayfaYukseklik), sayfaGenislik, toplamYukseklikPt);
    }
    return dokPdf.output("blob");
  }finally{
    if(document.body.contains(kutu)) document.body.removeChild(kutu);
  }
}

async function pdfPaylas(gBas, gSon){
  await Promise.all([kutuphaneYukle("jspdf"), pdfFontlariYukle()]);
  /* Kullanıcı isteği: "resim değil, gerçek PDF" — artık gerçek (metin tabanlı,
     seçilebilir/aranabilir yazılı) PDF önceliği. Gömülü Türkçe font sayesinde
     artık bozuk karakter riski yok. html2canvas'lı "resim" yöntemi sadece
     jsPDF hiç yüklenemezse (örn. internet yok) yedek olarak devrede kalıyor. */
  let blob = pdfBlobOlustur(gBas, gSon);
  if(!blob){
    try{ blob = await pdfResimBlobOlustur(gBas, gSon); }catch(e){ /* aşağıya düşülecek */ }
  }
  const dosyaAdi = "Puantaj-"+AYLAR[aktifAy]+"-"+aktifYil+".pdf";
  if(!blob){
    /* jsPDF yüklenemedi (örn. internet yok) — eski yazdırma ekranına düş */
    toast("PDF motoru yüklenemedi, yazdırma ekranı açılıyor 🖨️");
    pdfYazdir(gBas, gSon);
    return;
  }
  await pdfDosyaPaylas(blob, dosyaAdi, "Puantaj Çizelgesi — "+AYLAR[aktifAy]+" "+aktifYil);
}

/* ═══════════════════════════════════════════════════════════════════
   📤 PDF PAYLAŞIMI — iOS ve Android için ayrı yol
   ───────────────────────────────────────────────────────────────────
   iPhone kullanıcılarından "PDF gönderemiyorum" şikayeti geldi, Android'de
   sorun yoktu. İki ayrı sebep bulundu:

   1) DOKUNUŞ İZNİ TÜKENİYOR (asıl sebep)
      iOS Safari, navigator.share() çağrısının kullanıcı dokunuşundan hemen
      sonra yapılmasını şart koşar. Eski akış şöyleydi:
        dokunuş → font indir (ilk seferde 1 MB!) → PDF üret → sahte indirme
        tıklaması → navigator.share()
      Bu zincir birkaç saniye sürüyor; iOS o noktada izni geri alıp
      NotAllowedError fırlatıyor. Android bu konuda gevşek olduğu için
      orada sorun görünmüyordu.

   2) a.download iOS'ta ÇALIŞMIYOR
      iOS'ta "İndirilenler klasörü" kavramı yok ve Safari blob için
      download özniteliğini yok sayıyor. Yani "PDF telefonuna kaydedildi
      (İndirilenler)" mesajı iPhone'da yanlış bilgi veriyordu. Üstelik o
      sahte tıklama paylaşım akışını da bozuyordu.

   Çözüm: iOS'ta indirme adımı atlanıp DOĞRUDAN paylaşım penceresi
   açılıyor. İzin tükenmişse kullanıcıya anlaşılır bir yönlendirme
   veriliyor (ikinci dokunuşta fontlar önbellekte olduğu için hızlı
   çalışıyor). Android'de eski davranış korunuyor — orada indirme
   gerçekten işe yarıyor ve zayıf bağlantıda yedek sağlıyor.
   ═══════════════════════════════════════════════════════════════════ */
function iosMu(){
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

async function pdfDosyaPaylas(blob, dosyaAdi, baslik){
  const dosya = new File([blob], dosyaAdi, {type:"application/pdf"});
  const paylasilabilir = navigator.canShare && navigator.canShare({files:[dosya]});

  if(iosMu()){
    /* iOS: önce paylaş, indirme yok. */
    if(paylasilabilir){
      try{
        await navigator.share({files:[dosya], title: baslik});
        return;
      }catch(e){
        /* Kullanıcı iptal ettiyse sessiz geç; izin hatasıysa yönlendir. */
        if(e && e.name === "AbortError") return;
        if(e && e.name === "NotAllowedError"){
          toast("Paylaşım açılamadı — PDF hazır, düğmeye bir kez daha bas 👆");
          return;
        }
      }
    }
    /* Paylaşım hiç desteklenmiyorsa: PDF'i yeni sekmede aç.
       Kullanıcı oradan iOS'un kendi paylaş düğmesiyle gönderebiliyor. */
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(()=> URL.revokeObjectURL(url), 30000);
    toast("PDF açıldı — paylaşmak için köşedeki ⬆️ düğmesini kullan");
    return;
  }

  /* ANDROID / MASAÜSTÜ: önce kalıcı indirme, sonra paylaşım.
     Sebep (eski ve hâlâ geçerli): paylaşım penceresine verilen dosya
     tarayıcının silinebilen geçici alanında duruyor; zayıf bağlantıda
     WhatsApp'ın yüklemesi yarıda kalırsa "yeniden gönder" de çalışmıyor.
     Önce kalıcı kaydedilince elde her hâlükârda gerçek bir PDF kalıyor,
     WhatsApp'tan ataç (📎) → Belge ile elle eklenebiliyor. */
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = dosyaAdi; a.click();
  setTimeout(()=> URL.revokeObjectURL(url), 15000);
  toast("PDF telefonuna kaydedildi 📥 (İndirilenler)");

  try{
    if(paylasilabilir) await navigator.share({files:[dosya], title: baslik});
  }catch(e){ /* iptal ya da hata — PDF zaten kaydedildi */ }
}

/* ---------- Yıl Özeti: gerçek (metin tabanlı) PDF raporu ----------
   Ekrandaki 12 aylık dökümün ("AY · GÜN · MESAİ · HAKEDİŞ · ALINAN · KALAN")
   aynısını gerçek, seçilebilir/aranabilir metinli bir PDF'e döker. */
/* ---------- 💼 Bir işin (giriş-çıkış aralığının) verilerini hesaplar ----------
   Ay sınırını aşabilir (örn. 20 Temmuz - 5 Ağustos gibi), o yüzden aktifAy/
   aktifYil'e bağlı hesaplaAralik() değil, gün gün elle ilerleyen bu fonksiyon
   kullanılıyor. tumGirdilerQS/tumOdemelerQS (tüm zamanların önbelleği) okur,
   yeni bir Firestore sorgusu atmaz. */
function isVerileriHesapla(is, aySecim){
  let bas = is.girisTarihi;
  let son = is.cikisTarihi || tarihId(new Date());
  /* aySecim={yil,ay} verilirse (belirli bir ayı paylaşmak için), aralık o aya
     kısıtlanır — ama işin gerçek giriş/çıkış sınırlarının dışına taşmaz. */
  if(aySecim){
    const ayBas = aySecim.yil+"-"+pad(aySecim.ay+1)+"-01";
    const ayninSonGunu = new Date(aySecim.yil, aySecim.ay+1, 0).getDate();
    const aySon = aySecim.yil+"-"+pad(aySecim.ay+1)+"-"+pad(ayninSonGunu);
    if(ayBas > bas) bas = ayBas;
    if(aySon < son) son = aySon;
  }
  const girdilerHarita = {};
  if(tumGirdilerQS) tumGirdilerQS.forEach(d=>{ girdilerHarita[d.id] = d.data(); });
  const gunler = [];
  let gunSayisi=0, mesaiToplam=0, mesaiYevToplam=0, hakedis=0;
  const d = new Date(bas+"T12:00:00");
  const dSon = new Date(son+"T12:00:00");
  while(d <= dSon){
    const id = tarihId(d);
    const v = girdilerHarita[id];
    const i = gunIsaret(v);
    /* Yeni mesai alanı da "kazanç var" saymalı (0.1.1.1) — yoksa yalnızca
       mesaiye kalınan gün iş raporunda boş görünüyordu. */
    const kazancVar = i.yev!=="0" ||
      (v && (Number(v.mesai)>0 || Number(v.mesaiYev)>0 || Number(v.geceYev)>0));
    if(kazancVar){
      gunSayisi += girdiGun(v);
      mesaiToplam += mesaiSaatMik(v);
      mesaiYevToplam += mesaiYevMik(v);
      hakedis += girdiKazanc(v);
    }
    gunler.push({id, d:new Date(d), v, i, kazancVar});
    d.setDate(d.getDate()+1);
  }
  const tumOdemeListesi = [];
  if(tumOdemelerQS) tumOdemelerQS.forEach(doc=> tumOdemeListesi.push(doc.data()));
  /* DÜZELTME: burada da odemeAyi() (aitAy/FIFO) kullanılmalı — bu TEK bir işin
     (aynı işveren) içindeki ay geçişleri, tıpkı ana Puantaj sistemindeki gibi.
     Örn: Temmuz'da çalışılıp ödenmeyen bir alacak, 1 Ağustos'ta alınan avansla
     kapatılıyorsa, o avans Temmuz'un hesabından düşülmeli — Ağustos'tan değil.
     (Önceki "ham tarih" mantığı yanlıştı, kullanıcı ekran görüntüsüyle bildirdi.) */
  const basAy = bas.slice(0,7), sonAy = son.slice(0,7);
  const odemelerBu = tumOdemeListesi.filter(o=>{
    const ay = odemeAyi(o);
    return ay>=basAy && ay<=sonAy;
  }).sort((a,b)=> a.tarih<b.tarih?-1:1);
  const alinan = odemelerBu.reduce((s,o)=> s+(Number(o.tutar)||0),0);
  return {gunler, gunSayisi, mesaiToplam, mesaiYevToplam, hakedis, alinan, kalan:hakedis-alinan, odemeler:odemelerBu};
}

/* Bir işin kapsadığı, en az bir gün çalışılmış ayları listeler — "belirli bir
   ayı paylaş" seçenekleri için (her zaman işin TAM aralığına göre, seçime göre değil). */
function isAylarListele(is){
  const t = isVerileriHesapla(is);
  const gruplar = {};
  t.gunler.filter(g=>g.kazancVar).forEach(g=>{
    gruplar[g.d.getFullYear()+"-"+pad(g.d.getMonth()+1)] = true;
  });
  return Object.keys(gruplar).sort();
}

let isDetayAktif = null;
/* Bir işin "belirli bir ayı ayrı paylaş" çip düğmelerini bir kutuya çizer.
   İşte sadece 1 ay varsa (bölünecek bir şey yok) hiçbir şey göstermez. */
function isAySecenekleriCiz(kutuSecici, is){
  const kutu = $(kutuSecici);
  if(!kutu) return;
  const aylar = isAylarListele(is);
  if(aylar.length<=1){ kutu.innerHTML=""; return; }
  kutu.innerHTML = '<div style="font-size:11.5px;color:var(--soluk);margin:12px 0 6px">📆 Sadece belirli bir ayı ayrı paylaş:</div>'+
    '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">'+
    aylar.map(anahtar=>{
      const [yy,aa] = anahtar.split("-").map(Number);
      return '<button data-yil="'+yy+'" data-ay="'+(aa-1)+'" style="padding:7px 12px;border-radius:20px;border:1.5px solid var(--cizgi);background:var(--girdi);color:var(--yazi);font-size:12.5px;font-weight:700">'+AYLAR[aa-1].slice(0,3)+" "+yy+'</button>';
    }).join("")+
    '</div>';
  kutu.querySelectorAll("button").forEach(b=>{
    b.addEventListener("click", ()=> isPdfPaylas(is, {yil:Number(b.dataset.yil), ay:Number(b.dataset.ay)}));
  });
}

function isDetayAc(isId){
  const is = (ayarlar.isler||[]).find(x=>x.id===isId);
  if(!is) return;
  isDetayAktif = is;
  $("#is-detay-baslik").textContent = is.patronAdi;
  $("#is-detay-alt").textContent = is.santiyeAdi+" · "+tarihFormatla(is.girisTarihi)+" – "+(is.cikisTarihi?tarihFormatla(is.cikisTarihi):"devam ediyor");
  const t = isVerileriHesapla(is);
  const calisilanlar = t.gunler;   /* PDF'teki gibi HER gün (boş/izinli dahil) — tutarlılık için, "günler kayboldu" karışıklığı olmasın */
  /* ---- AY AY GRUPLAMA ----
     Eskiden bütün günler ve bütün ödemeler tek uzun liste hâlinde alt alta
     diziliyordu; bir işte aylarca çalışılınca (örn. Temmuz + Ağustos) hepsi
     birbirine giriyor, hangi kaydın hangi aya ait olduğu anlaşılmıyordu.
     Artık her ay kendi kartında: başlıkta ay adı ve o ayın özeti var,
     karta dokununca açılıp kapanıyor. En son ay açık başlar. */
  const aylar = {};
  const ayEkle = (anahtar) => {
    if(!aylar[anahtar]) aylar[anahtar] = {gunler:[], odemeler:[], hakedis:0, alinan:0, calisilan:0};
    return aylar[anahtar];
  };
  calisilanlar.forEach(g=>{
    const a = ayEkle(String(g.id).slice(0,7));
    a.gunler.push(g);
    if(g.kazancVar){ a.calisilan++; a.hakedis += girdiKazanc(g.v); }
  });
  t.odemeler.forEach(o=>{
    const a = ayEkle(odemeAyi(o));
    a.odemeler.push(o);
    a.alinan += Number(o.tutar)||0;
  });
  const ayAnahtarlar = Object.keys(aylar).sort();          /* eskiden yeniye */
  /* 0.0.3.9: artık HİÇBİR ay açık başlamıyor.
     Önceden son ay otomatik açılıyordu; ekrana girer girmez uzun bir liste
     karşılıyordu ve "hangi aya bakayım" seçimi kayboluyordu. Artık ekran
     sade bir ay listesiyle açılıyor, kullanıcı istediği aya dokunup içine
     giriyor. */

  const ayKartlari = ayAnahtarlar.map(ak=>{
    const a = aylar[ak];
    const [yy, aa] = ak.split("-").map(Number);
    const acik = false;   /* hepsi kapalı başlar */
    const kalan = a.hakedis - a.alinan;
    return (
      '<div class="is-ay-kart'+(acik?" acik":"")+'" data-ay="'+ak+'">'+
        '<button class="is-ay-bas" data-ay-ac="'+ak+'">'+
          '<div class="is-ay-ad">'+AYLAR[aa-1]+' '+yy+'</div>'+
          '<div class="is-ay-ozet">'+a.calisilan+' gün · '+paraFmt(a.hakedis)+
            (a.alinan>0 ? ' · alınan '+paraFmt(a.alinan) : '')+'</div>'+
          '<span class="is-ay-ok">▾</span>'+
        '</button>'+
        '<div class="is-ay-govde">'+
          '<div class="is-ay-rakam">'+
            '<div><span>Hakediş</span><b>'+paraFmt(a.hakedis)+'</b></div>'+
            '<div><span>Alınan</span><b>'+paraFmt(a.alinan)+'</b></div>'+
            '<div><span>Kalan</span><b style="color:var(--sari)">'+paraFmt(kalan)+'</b></div>'+
          '</div>'+
          (a.gunler.length ?
            '<ul class="liste">'+ a.gunler.map(g=>
              '<li class="is-gun-satir" data-gun="'+g.id+'"><div class="rozet" style="background:'+(g.kazancVar?"var(--mesai)":"var(--cizgi)")+'">'+g.d.getDate()+'</div>'+
              '<div class="orta"><div class="baslik">'+g.i.yev+(g.kazancVar?' · '+g.i.mesai+' saat mesai':'')+'</div>'+
              '<div class="alt-yazi">'+tarihFormatla(g.id)+'</div></div>'+
              '<div class="tutar">'+(g.kazancVar?paraFmt(girdiKazanc(g.v)):'')+'</div></li>').join("")+'</ul>' : '')+
          (a.odemeler.length ?
            '<h3 style="margin:14px 0 4px;font-size:13.5px">💵 Alınan paralar ('+a.odemeler.length+')</h3>'+
            '<ul class="liste">'+ a.odemeler.map(o=>
              '<li><div class="rozet" style="background:var(--sari);color:#2C2000">💵</div>'+
              '<div class="orta"><div class="baslik">'+esc(o.not||"Ödeme")+'</div>'+
              '<div class="alt-yazi">'+tarihFormatla(o.tarih)+'</div></div>'+
              '<div class="tutar">'+paraFmt(o.tutar)+'</div></li>').join("")+'</ul>' : '')+
        '</div>'+
      '</div>'
    );
  }).join("");

  $("#is-detay-icerik").innerHTML =
    '<div style="display:flex;gap:8px;margin:12px 0">'+
      '<div style="flex:1;background:var(--girdi);border:1.5px solid var(--cizgi);border-radius:12px;padding:10px;text-align:center"><div style="font-size:10.5px;color:var(--soluk)">HAKEDİŞ</div><div style="font-weight:800;font-size:15px">'+paraFmt(t.hakedis)+'</div></div>'+
      '<div style="flex:1;background:var(--girdi);border:1.5px solid var(--cizgi);border-radius:12px;padding:10px;text-align:center"><div style="font-size:10.5px;color:var(--soluk)">ALINAN</div><div style="font-weight:800;font-size:15px">'+paraFmt(t.alinan)+'</div></div>'+
      '<div style="flex:1;background:var(--girdi);border:1.5px solid var(--cizgi);border-radius:12px;padding:10px;text-align:center"><div style="font-size:10.5px;color:var(--soluk)">KALAN</div><div style="font-weight:800;font-size:15px;color:var(--sari)">'+paraFmt(t.kalan)+'</div></div>'+
    '</div>'+
    '<div style="font-size:12.5px;color:var(--soluk);margin:10px 0 8px">📋 '+
      calisilanlar.filter(g=>g.kazancVar).length+' gün çalışıldı · '+
      ayAnahtarlar.length+' ay · aya dokunarak aç</div>'+
    ayKartlari;

  /* Ay kartlarını aç/kapa — aynı anda tek ay açık kalsın (akordeon).
     Böylece uzun listeler üst üste binmiyor, ekran sade kalıyor. */
  $("#is-detay-icerik").querySelectorAll("[data-ay-ac]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const kart = b.closest(".is-ay-kart");
      if(!kart) return;
      const zatenAcik = kart.classList.contains("acik");
      $("#is-detay-icerik").querySelectorAll(".is-ay-kart").forEach(k=> k.classList.remove("acik"));
      if(!zatenAcik) kart.classList.add("acik");
      titret(8);
    });
  });

  /* Gün satırına dokununca o günün detay penceresi açılsın.
     İş detayı bir alt-sayfa (modal) olduğu için önce onu kapatıyoruz,
     yoksa iki pencere üst üste biniyor. */
  $("#is-detay-icerik").querySelectorAll(".is-gun-satir").forEach(li=>{
    li.addEventListener("click", ()=>{
      const id = li.dataset.gun;
      if(!id) return;
      const t = new Date(id+"T12:00:00");
      /* Gün başka bir aydaysa takvimi o aya taşı ki modal doğru veriyi göstersin */
      if(t.getFullYear()!==aktifYil || t.getMonth()!==aktifAy){
        aktifYil = t.getFullYear(); aktifAy = t.getMonth();
        ayiYukle();
      }
      try{ $("#is-detay-modal").classList.remove("acik"); }catch(e){}
      setTimeout(()=> modalAc(id), 180);
    });
  });

  isAySecenekleriCiz("#is-detay-aylar", is);
  $("#modal-perde").classList.add("acik");
  $("#is-detay-modal").classList.add("acik");
}

/* ---------- 💼 Bir işin PDF raporu: gerçek metin, gömülü Türkçe font ----------
   aySecim={yil,ay} verilirse SADECE o ayı kapsayan bir PDF üretir (başlıkta
   belirtilir); verilmezse işin TÜM giriş-çıkış aralığını, ay ay bölümlere
   ayrılmış halde kapsar (0.0.1.6'deki davranış). */
function isPdfBlobOlustur(is, aySecim){
  if(!window.jspdf || !window.jspdf.jsPDF) return null;
  const { jsPDF } = window.jspdf;
  const t = isVerileriHesapla(is, aySecim);
  const doc = new jsPDF({unit:"pt", format:"a4"});
  const yaziTipi = pdfTurkceFontKur(doc);
  const solX = 40, sagX = 555;
  let y = 46;
  doc.setFont(yaziTipi,"bold"); doc.setFontSize(16);
  doc.text("İŞ RAPORU"+(aySecim ? " — "+trBuyuk(AYLAR[aySecim.ay])+" "+aySecim.yil : ""), solX, y);
  y += 8;
  doc.setDrawColor(255,196,0); doc.setLineWidth(2.5);
  doc.line(solX, y, sagX, y);
  y += 18;
  doc.setFont(yaziTipi,"normal"); doc.setFontSize(10);
  doc.text("İşçi: "+is.ad+" "+is.soyad, solX, y); y += 15;
  doc.text("Patron / Firma: "+is.patronAdi, solX, y); y += 15;
  doc.text("Şantiye: "+is.santiyeAdi, solX, y); y += 15;
  doc.text("Giriş: "+tarihFormatla(is.girisTarihi)+"   ·   Çıkış: "+(is.cikisTarihi?tarihFormatla(is.cikisTarihi):"devam ediyor"), solX, y);
  y += 18;

  /* Kullanıcı isteği: sadece çalışılan günler değil, İZİNLİ/BOŞ günler de dahil
     TÜM günler görünsün (normal aylık PDF'teki gibi eksiksiz bir çizelge).
     Yine de tek uzun karışık tabloda değil, HER AYIN kendi başlığı ve kendi
     alt toplamıyla ayrı ayrı görünüyor ("Temmuz 2026" tablosu, sonra "Ağustos
     2026" tablosu vb). */
  const aylikGruplar = {}, aySirasi = [];
  t.gunler.forEach(g=>{
    const anahtar = g.d.getFullYear()+"-"+pad(g.d.getMonth()+1);
    if(!aylikGruplar[anahtar]){ aylikGruplar[anahtar] = []; aySirasi.push(anahtar); }
    aylikGruplar[anahtar].push(g);
  });
  aySirasi.forEach(anahtar=>{
    const [yy, aa] = anahtar.split("-").map(Number);
    const gunlerBuAy = aylikGruplar[anahtar];
    if(y > 700){ doc.addPage(); y = 50; }
    doc.setFont(yaziTipi,"bold"); doc.setFontSize(12.5); doc.setTextColor(0);
    doc.text(trBuyuk(AYLAR[aa-1])+" "+yy, solX, y);
    y += 6;
    const ayGun = gunlerBuAy.reduce((s,g)=> s+(g.v?girdiGun(g.v):0), 0);
    const ayMesai = gunlerBuAy.reduce((s,g)=> s+(g.v?(Number(g.v.mesai)||0):0), 0);
    const ayHakedis = gunlerBuAy.reduce((s,g)=> s+(g.v?girdiKazanc(g.v):0), 0);
    const gunSatir = gunlerBuAy.map(g=> [
      tarihFormatla(g.id)+" — "+GUNLER[g.d.getDay()],
      g.i.yev, g.i.arti, g.i.mesai,
      g.kazancVar ? paraFmt(girdiKazanc(g.v)) : ""
    ]);
    doc.autoTable({
      startY: y+4, margin:{left:solX, right: 595-sagX},
      head: [["TARİH","YEVMİYE","GÜN İÇİ ARTI","MESAİ","KAZANÇ"]],
      body: gunSatir,
      styles:{fontSize:8, cellPadding:4, lineColor:[200,200,200], lineWidth:0.5},
      headStyles:{fillColor:[242,242,242], textColor:20, fontStyle:"bold"},
      columnStyles:{1:{halign:"center"},2:{halign:"center"},3:{halign:"center"},4:{halign:"right"}},
      foot:[["TOPLAM: "+ayGun+" gün · "+ayMesai+" saat mesai","","","",paraFmt(ayHakedis)]],
      footStyles:{fillColor:[255,247,220], textColor:20, fontStyle:"bold", fontSize:8.5}
    });
    y = doc.lastAutoTable.finalY + 20;
  });

  /* Tüm ayların GENEL toplamı — ayrı, tek bir özet kutusu */
  if(y > 720){ doc.addPage(); y = 50; }
  doc.autoTable({
    startY: y, margin:{left:solX, right: 595-sagX},
    body: [
      ["TOPLAM: "+t.gunSayisi+" gün · "+t.mesaiToplam+" saat mesai"+(aySecim ? "" : " (tüm aylar)"), "HAKEDİŞ", paraFmt(t.hakedis)],
      ["", "ALINAN", paraFmt(t.alinan)],
      ["", "KALAN", paraFmt(t.kalan)]
    ],
    theme: "plain",
    styles:{fontSize:9.5, cellPadding:5, fontStyle:"bold", fillColor:[255,247,220], textColor:20},
    columnStyles:{2:{halign:"right"}}
  });
  let y2 = doc.lastAutoTable.finalY + 20;

  if(t.odemeler.length){
    /* Bu tablo sayfa sonuna çok yakın başlarsa ortadan bölünüp bir satır
       görünmeyen bir sonraki sayfaya kayabiliyordu (kullanıcı bildirdi: satır
       kaybolmuş gibi görünüyordu, aslında sayfa 2'ye kaymıştı). Artık gereken
       yüksekliği ÖNCEDEN kabaca hesaplayıp sığmıyorsa TÜM bölüm bir sonraki
       sayfaya baştan alınıyor, tablo asla ortadan bölünmüyor. */
    const tahminiYukseklik = 24 + 22 + t.odemeler.length*17 + 20;
    if(y2 + tahminiYukseklik > 780){ doc.addPage(); y2 = 50; }
    doc.setFont(yaziTipi,"bold"); doc.setFontSize(11);
    doc.text("ALINAN PARALAR ("+t.odemeler.length+" adet)", solX, y2);
    const body = t.odemeler.map((o,idx)=> [String(idx+1), tarihFormatla(o.tarih), o.not||"", paraFmt(o.tutar)]);
    doc.autoTable({
      startY: y2+6, margin:{left:solX, right: 595-sagX},
      head: [["#","TARİH","NOT","TUTAR"]],
      body,
      foot: [["","","TOPLAM",paraFmt(t.alinan)]],
      styles:{fontSize:8, cellPadding:4, lineColor:[200,200,200], lineWidth:0.5},
      headStyles:{fillColor:[242,242,242], textColor:20, fontStyle:"bold"},
      footStyles:{fillColor:[255,247,220], textColor:20, fontStyle:"bold"},
      columnStyles:{0:{halign:"center", cellWidth:24}, 3:{halign:"right"}},
      rowPageBreak: "avoid"
    });
    y2 = doc.lastAutoTable.finalY + 20;
  }
  if(y2>720){ doc.addPage(); y2=60; } else y2 += 30;
  doc.setDrawColor(30); doc.setLineWidth(1);
  doc.line(solX, y2, solX+180, y2);
  doc.line(sagX-180, y2, sagX, y2);
  doc.setFont(yaziTipi,"normal"); doc.setFontSize(9);
  doc.text("İşçi", solX, y2+14); doc.text("Ad Soyad / İmza", solX, y2+26);
  doc.text("İşveren", sagX-180, y2+14); doc.text("Ad Soyad / İmza", sagX-180, y2+26);

  return doc.output("blob");
}

async function isPdfPaylas(is, aySecim){
  /* Korumasızdı: kütüphane veya font yüklenemezse (internet yok) fonksiyon
     yakalanmayan bir hatayla ölüyor, kullanıcı düğmeye basıyor ama hiçbir
     şey olmuyor ve sebebini göremiyordu (0.1.0.5). */
  try{
    await Promise.all([kutuphaneYukle("jspdf"), pdfFontlariYukle()]);
    await tumOdemeOnbellegiHazirla();   /* rapor ödemesiz çıkmasın */
    const blob = isPdfBlobOlustur(is, aySecim);
    if(!blob){ toast("PDF motoru yüklenemedi, internetini kontrol et"); return; }
    const ayEki = aySecim ? "-"+AYLAR[aySecim.ay]+"-"+aySecim.yil : "";
    const dosyaAdi = "Is-Raporu-"+String(is.patronAdi).replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]+/g,"-")+ayEki+".pdf";
    await pdfDosyaPaylas(blob, dosyaAdi, "İş Raporu — "+is.patronAdi+(aySecim ? " ("+AYLAR[aySecim.ay]+" "+aySecim.yil+")" : ""));
  
  
  }catch(e){
    toast("Iş raporu hazırlanamadı — internetini kontrol edip tekrar dene 📡");
    try{ hataKaydet("isPdfPaylas", e); }catch(_){}
  }
}

function yilPdfBlobOlustur(){
  if(!window.jspdf || !window.jspdf.jsPDF) return null;
  if(!yilSon || !yilSon.aylar.length) return null;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:"pt", format:"a4"});
  const yaziTipi = pdfTurkceFontKur(doc);
  const solX = 40, sagX = 555;
  let y = 46;

  doc.setFont(yaziTipi,"bold"); doc.setFontSize(17);
  doc.text("YIL RAPORU — "+yilSon.yil, solX, y);
  y += 8;
  doc.setDrawColor(255,196,0); doc.setLineWidth(2.5);
  doc.line(solX, y, sagX, y);
  y += 16;
  const ad = (kullanici && kullanici.displayName) || "";
  if(ad){
    doc.setFont(yaziTipi,"normal"); doc.setFontSize(9.5); doc.setTextColor(60);
    doc.text("İşçi: "+ad, solX, y);
    doc.setTextColor(0);
  }

  const body = yilSon.aylar.map(a=> [a.ad, String(a.gun), String(a.mesai), paraFmt(a.hak), paraFmt(a.alinan), paraFmt(a.hak-a.alinan)]);
  doc.autoTable({
    startY: y+8, margin:{left:solX, right: 595-sagX},
    head: [["AY","GÜN","MESAİ","HAKEDİŞ","ALINAN","KALAN"]],
    body,
    styles:{fontSize:9.5, cellPadding:6, lineColor:[200,200,200], lineWidth:0.5},
    headStyles:{fillColor:[242,242,242], textColor:20, fontStyle:"bold"},
    columnStyles:{1:{halign:"center"},2:{halign:"center"},3:{halign:"right"},4:{halign:"right"},5:{halign:"right"}},
    foot:[["TOPLAM", String(yilSon.T.gun), String(yilSon.T.mesai), paraFmt(yilSon.T.hak), paraFmt(yilSon.T.alinan), paraFmt(yilSon.T.hak-yilSon.T.alinan)]],
    footStyles:{fillColor:[255,247,220], textColor:20, fontStyle:"bold", fontSize:10}
  });

  /* ---- Her ay için TAM detay: gün gün çizelge + avans/ödeme dökümü ----
     Kullanıcı isteği: WhatsApp'a paylaşılınca sadece aylık toplamlar değil,
     hangi gün çalışıldığı, artılar, avanslar TARİH TARİH — hepsi görünsün.
     tumGirdilerQS/tumOdemelerQS (tüm zamanların önbelleğe alınmış canlı verisi)
     kullanılıyor — ay değiştirmeye/yeniden sorgu atmaya gerek kalmadan. */
  const girdilerHarita = {};
  if(tumGirdilerQS) tumGirdilerQS.forEach(d=>{ girdilerHarita[d.id] = d.data(); });
  const tumOdemeListesi = [];
  if(tumOdemelerQS) tumOdemelerQS.forEach(d=> tumOdemeListesi.push(d.data()));

  yilSon.aylar.forEach(ayOzet=>{
    const ayIndex = AYLAR.indexOf(ayOzet.ad);
    if(ayIndex<0) return;
    doc.addPage();
    let y2 = 46;
    const ayinSonGunu = new Date(yilSon.yil, ayIndex+1, 0).getDate();
    doc.setFont(yaziTipi,"bold"); doc.setFontSize(15);
    doc.text(trBuyuk(ayOzet.ad)+" "+yilSon.yil+" — DETAY", solX, y2);
    y2 += 8;
    doc.setDrawColor(255,196,0); doc.setLineWidth(2.5);
    doc.line(solX, y2, sagX, y2);
    y2 += 16;
    /* Bu ay içinde birden fazla şantiyede çalışılmışsa (biri bırakılıp
       diğerine geçilmişse) ikisi de tarih aralığıyla birlikte görünsün. */
    const ayinSantiyeOzeti = santiyeOzetMetni(santiyeBloklariCiz(yilSon.yil, ayIndex, 1, ayinSonGunu, girdilerHarita), ayIndex);
    if(ayinSantiyeOzeti){
      doc.setFont(yaziTipi,"normal"); doc.setFontSize(9); doc.setTextColor(60);
      doc.text("Şantiye: "+ayinSantiyeOzeti, solX, y2);
      doc.setTextColor(0);
      y2 += 12;
    }

    const gunSatir = [];
    for(let g=1; g<=ayinSonGunu; g++){
      const id = yilSon.yil+"-"+pad(ayIndex+1)+"-"+pad(g);
      const d = new Date(yilSon.yil, ayIndex, g);
      const v = girdilerHarita[id];
      const i = gunIsaret(v);
      const kazancVar = i.yev!=="0" ||
      (v && (Number(v.mesai)>0 || Number(v.mesaiYev)>0 || Number(v.geceYev)>0));
      gunSatir.push([
        pad(g)+" / "+pad(ayIndex+1)+" — "+GUNLER[d.getDay()],
        i.yev, i.arti, i.mesai,
        kazancVar ? gunSantiyeAdi(v) : "",
        kazancVar ? paraFmt(girdiKazanc(v)) : ""
      ]);
    }
    doc.autoTable({
      startY: y2+4, margin:{left:solX, right: 595-sagX},
      head: [["TARİH","YEVMİYE","GÜN İÇİ ARTI","MESAİ","ŞANTİYE","KAZANÇ"]],
      body: gunSatir,
      styles:{fontSize:7.5, cellPadding:3, lineColor:[200,200,200], lineWidth:0.4},
      headStyles:{fillColor:[242,242,242], textColor:20, fontStyle:"bold"},
      columnStyles:{1:{halign:"center"},2:{halign:"center"},3:{halign:"center"},5:{halign:"right"}},
      foot:[
        ["TOPLAM: "+ayOzet.gun+" gün · "+ayOzet.mesai+" saat mesai","","HAKEDİŞ","","",paraFmt(ayOzet.hak)],
        ["","","ALINAN (avans/ödeme)","","",paraFmt(ayOzet.alinan)],
        ["","","KALAN","","",paraFmt(ayOzet.hak-ayOzet.alinan)]
      ],
      footStyles:{fillColor:[255,247,220], textColor:20, fontStyle:"bold", fontSize:8}
    });
    let y3 = doc.lastAutoTable.finalY + 18;

    const buAyStr = yilSon.yil+"-"+pad(ayIndex+1);
    const donemOdeme = tumOdemeListesi.filter(o=> odemeAyi(o)===buAyStr).sort((a,b)=> a.tarih<b.tarih?-1:1);
    const tSec = t2 => donemOdeme.filter(o=> (o.tur||"diger")===t2);
    function odemeBolumPdf(baslik, liste2){
      if(!liste2.length) return;
      const tahminiYukseklik = 20 + 20 + liste2.length*15 + 16;
      if(y3 + tahminiYukseklik > 780){ doc.addPage(); y3 = 50; }
      doc.setFont(yaziTipi,"bold"); doc.setFontSize(10.5); doc.setTextColor(0);
      doc.text(baslik+" ("+liste2.length+" adet)", solX, y3);
      const araToplam = liste2.reduce((s,o)=>s+(Number(o.tutar)||0),0);
      const govdeSat = liste2.map((o,idx)=>{
        const d2 = new Date(o.tarih+"T12:00:00");
        return [String(idx+1), pad(d2.getDate())+" / "+pad(d2.getMonth()+1)+" / "+d2.getFullYear()+" — "+GUNLER[d2.getDay()], o.not||"", paraFmt(o.tutar)];
      });
      doc.autoTable({
        startY: y3+6, margin:{left:solX, right: 595-sagX},
        head: [["#","TARİH","NOT","TUTAR"]],
        body: govdeSat,
        foot: [["", "", baslik+" TOPLAMI", paraFmt(araToplam)]],
        styles:{fontSize:7.5, cellPadding:3, lineColor:[200,200,200], lineWidth:0.4},
        headStyles:{fillColor:[242,242,242], textColor:20, fontStyle:"bold"},
        footStyles:{fillColor:[255,247,220], textColor:20, fontStyle:"bold"},
        columnStyles:{0:{halign:"center", cellWidth:24}, 3:{halign:"right"}},
        rowPageBreak: "avoid"
      });
      y3 = doc.lastAutoTable.finalY + 14;
    }
    odemeBolumPdf("AVANSLAR", tSec("avans"));
    odemeBolumPdf("HAKEDİŞ ÖDEMELERİ", tSec("hakedis"));
    odemeBolumPdf("KESİNTİLER", tSec("kesinti"));
    odemeBolumPdf("DİĞER ÖDEMELER", tSec("diger"));
  });

  return doc.output("blob");
}

async function yilPdfPaylas(){
  /* Korumasızdı: kütüphane veya font yüklenemezse (internet yok) fonksiyon
     yakalanmayan bir hatayla ölüyor, kullanıcı düğmeye basıyor ama hiçbir
     şey olmuyor ve sebebini göremiyordu (0.1.0.5). */
  try{
    await Promise.all([kutuphaneYukle("jspdf"), pdfFontlariYukle()]);
    await tumOdemeOnbellegiHazirla();   /* rapor ödemesiz çıkmasın */
    const blob = yilPdfBlobOlustur();
    if(!blob){ toast("Önce yıl verisi yüklensin"); return; }
    const dosyaAdi = "Yil-Raporu-"+yilSon.yil+".pdf";
    /* Diğer PDF paylaşımlarıyla aynı desen: önce kalıcı dosya olarak indir,
       sonra paylaşım penceresini dene — WhatsApp'ta takılıp kalma sorununu önler. */
    await pdfDosyaPaylas(blob, dosyaAdi, "Yıl Raporu — "+yilSon.yil);
  
  
  }catch(e){
    toast("Yıl raporu hazırlanamadı — internetini kontrol edip tekrar dene 📡");
    try{ hataKaydet("yilPdfPaylas", e); }catch(_){}
  }
}

/* ---------- Gün modalı ---------- */
function modalAc(id){
  modalTarih = id;
  const t = new Date(id+"T12:00:00");
  const tatil = tatilAdi(id);
  $("#modal-tarih").textContent = t.getDate()+" "+AYLAR[t.getMonth()]+" "+t.getFullYear()+" "+GUNLER[t.getDay()]
    + (tatil ? " · 🎉 "+tatil : "")
    + (ayKilitli(id) ? " · 🔒 KİLİTLİ AY" : "");
  const v = girdiler[id] || {};
  modalDurum = (v.durum && v.durum!=="saatlik") ? v.durum : "tam";
  /* Saatlik / yevmiyeli mod */
  const saatlikMod = ayarlar.calismaTipi==="saatlik";
  $("#durum-secim").classList.toggle("gizli", saatlikMod);
  $("#alan-saat").classList.toggle("gizli", !saatlikMod);
  if(saatlikMod){
    $("#gun-saat").value = girdiler[id] ? (Number(v.saat)||0) : (ayarlar.gunlukSaat||8);
  }
  /* Yeni kayıtlarda `mesaiYev`, eski kayıtlarda `mesai` (saat) var.
     Eski bir kayıt açıldığında saat değeri gösteriliyor; kullanıcı
     kaydederse yevmiye katına dönüşür (bilinçli — düzenlenen kayıt
     yeni sisteme geçer, dokunulmayan eski kayıt olduğu gibi kalır). */
  $("#mesai-saat").value = (v.mesaiYev != null ? v.mesaiYev : (v.mesai || 0));
  $("#gun-arti").value = Number(v.arti)||0;
  $("#gun-gece-mesai").value = (v.geceYev != null ? v.geceYev : (Number(v.geceMesai)||0));
  const parcaAcik = (ayarlar.parcaFiyat||0) > 0;
  $("#alan-parca").classList.toggle("gizli", !parcaAcik);
  if(parcaAcik){
    $("#parca-etiket").textContent = "📦 "+(ayarlar.parcaBirim||"adet")+" (bugün) — birim fiyat "+paraFmt(ayarlar.parcaFiyat);
    $("#gun-parca-miktar").value = Number(v.parcaMiktar)||"";
  }
  $("#gun-bas-saat").value = v.basSaat || "";
  $("#gun-bit-saat").value = v.bitSaat || "";
  gunKonum = v.konum || null;
  const kEl2 = $("#gun-konum-yazi");
  if(gunKonum && gunKonum.adres){
    kEl2.innerHTML = gunKonum.lat
      ? '<a href="https://maps.google.com/?q='+gunKonum.lat+','+gunKonum.lng+'" target="_blank" style="color:var(--sari)">📍 '+gunKonum.adres+' (haritada aç)</a>'
      : "📍 "+gunKonum.adres;
  }else kEl2.textContent = "";
  $("#gun-santiye").value = v.santiye || "";
  $("#gun-not").value = v.not || "";
  /* Fotoğraf */
  modalFoto = undefined;   /* undefined: değişmedi · "": silinecek · dataURL: yeni */
  $("#gun-foto-onizle").classList.add("gizli");
  $("#btn-foto-sil").classList.add("gizli");
  $("#gun-foto-durum").textContent = "";
  if(v.foto){
    $("#gun-foto-durum").textContent = "Fotoğraf yükleniyor...";
    kokRef().collection("fotolar").doc(id).get().then(d=>{
      if(modalTarih !== id) return;   /* bu arada başka gün açıldıysa dokunma */
      const f = d.exists ? d.data().veri : null;
      $("#gun-foto-durum").textContent = "";
      if(f) fotoOnizleGoster(f);
    }).catch(()=>{ if(modalTarih===id) $("#gun-foto-durum").textContent = "Fotoğraf yüklenemedi (internet?)"; });
  }
  /* Şantiye seçici */
  const secAlan = $("#alan-santiye-sec"), sec = $("#gun-santiye-sec");
  if(ayarlar.santiyeler.length){
    secAlan.classList.remove("gizli");
    sec.innerHTML = '<option value="">Varsayılan ücret ('+paraFmt(ayarlar.yevmiye)+')</option>' +
      ayarlar.santiyeler.map(s=> '<option value="'+s.id+'">'+esc(s.ad)+' ('+paraFmt(s.yevmiye)+')</option>').join("");
    let hedefSec = v.santiyeId || "";
    if(!girdiler[id]){ try{ hedefSec = localStorage.getItem("sonSantiye")||""; }catch(e){} }
    sec.value = hedefSec;
    if(sec.value !== hedefSec) sec.value = "";
  }else{
    secAlan.classList.add("gizli");
    sec.innerHTML = "";
  }
  $("#btn-gun-sil").style.display = girdiler[id] ? "block" : "none";
  durumButonYenile();
  modalKazancGuncelle();

  /* Seyrek alanlar bölümü: kapalı başlar, AMA içinde dolu bir şey varsa
     otomatik açılır. Sebep: kullanıcı geçen sefer gece mesaisi girdiyse
     ve bu sefer bölüm kapalı gelirse, girdisini göremez ve "kaybolmuş"
     sanır. Dolu içerik asla gizli kalmıyor. */
  try{
    const kap = $("#gun-detay-alanlar"), btn = $("#btn-gun-detay");
    if(kap && btn){
      const alanlar = ["gun-bas-saat","gun-bit-saat","gun-gece-mesai","gun-parca-miktar"];
      let doluVar = alanlar.some(aid=>{
        const el = document.getElementById(aid);
        if(!el) return false;
        const d = (el.value||"").trim();
        return d && d!=="0" && d!=="0.0";
      }) || !!gunKonum;
      kap.classList.toggle("gizli", !doluVar);
      btn.classList.toggle("acik", doluVar);
    }
    if(window.gunDetayRozetGuncelle) gunDetayRozetGuncelle();
  }catch(e){}

  geriKaydet();
  $("#modal-perde").classList.add("acik");
  $("#gun-modal").classList.add("acik");
}
function modalKapat(){
  $("#modal-perde").classList.remove("acik");
  $("#gun-modal").classList.remove("acik");
}
function durumButonYenile(){
  $$(".durum-secim button").forEach(b=>{
    b.className = "";
    if(b.dataset.durum===modalDurum) b.classList.add("secili-"+modalDurum);
  });
}

/* ---------- Olaylar ---------- */
/* ---------- 💸 Firestore maliyet koruması: arka planda dinleyicileri durdur ----------
   Firestore belgelerine göre, bir onSnapshot dinleyicisi 30 DAKİKADAN uzun süre
   bağlantısız kalıp sonra yeniden bağlanırsa, eşleşen TÜM dökümanlar sıfırdan bir
   sorguymuş gibi yeniden faturalanır. Şantiyede internet sürekli kesilip bağlandığı
   ve telefon uzun süre cepte (arka planda) kaldığı için bu, sessizce tekrarlayan bir
   okuma maliyeti kaynağı.

   Çözüm: uygulama arka plana geçtiğinde ağır "tüm zamanlar" dinleyicilerini kapat,
   öne dönünce yeniden kur. Ana ekran para kartını besleyen bu iki dinleyici zaten
   `tumVeriBirak()` ile temiz kapanıyor ve `anaYukle()` içinde get() yedeği var —
   yani kapatmak veri kaybına yol açmıyor, sadece maliyeti düşürüyor.

   Diğer dinleyiciler (girdiler, ödemeler, masraflar) BİLEREK kapatılmıyor: onlar
   aktif ayla sınırlı, küçük ve kullanıcı ekrana dönünce anında veri görmeli. */
let arkaPlanZaman = null;
document.addEventListener("visibilitychange", ()=>{
  if(document.visibilityState === "hidden"){
    /* Hemen kapatma — ekran kilidi/bildirim gibi kısa geçişlerde gereksiz
       kapat-aç döngüsü olmasın diye 2 dakika bekle. */
    clearTimeout(arkaPlanZaman);
    arkaPlanZaman = setTimeout(()=>{ try{ tumVeriBirak(); }catch(e){} }, 120000);
  }else{
    clearTimeout(arkaPlanZaman);
    if(kullanici){ try{ tumVeriDinle(); anaTazele(); }catch(e){} }
  }
});

/* PWA: service worker kaydı + güncelleme bildirimi.
   Otomatik yenilemiyoruz (kullanıcı ortasında form doldurken sayfa
   birden yenilenirse yazdığı şey kaybolur) — sadece nazikçe haber veriyoruz,
   dokununca kendi isteğiyle yeniliyor. */
if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("./sw.js").then(kayit=>{
      /* Chrome, varsayılan olarak yeni bir sw.js olup olmadığını günde en
         fazla 1 kez kontrol eder. Biz sık güncelleme yaptığımız için bu,
         "sürüm hiç değişmiyor" gibi görünen bir soruna yol açıyordu — her
         açılışta AÇIKÇA kontrol ettirerek bunu aşıyoruz. */
      kayit.update().catch(()=>{});
      kayit.addEventListener("updatefound", ()=>{
        const yeni = kayit.installing; if(!yeni) return;
        yeni.addEventListener("statechange", ()=>{
          if(yeni.state==="installed" && navigator.serviceWorker.controller) guncellemeBandiGoster();
        });
      });
    }).catch(()=>{});
    let yenilendiMi = false;
    navigator.serviceWorker.addEventListener("controllerchange", ()=>{
      if(!yenilendiMi) return;   /* sadece kullanıcı bizzat "yenile"ye bastıysa reload et */
      yenilendiMi = false;
      location.reload();
    });
    window._swYenile = ()=>{ yenilendiMi = true; };
  });
}
async function guncellemeBandiGoster(){
  const ekran = $("#guncelleme-ekrani");
  if(!ekran || !ekran.classList.contains("gizli")) return;   /* zaten gösteriliyor ya da HTML yok */

  /* AÇIK PENCERELERİ KAPAT (0.0.9.9)
     Kullanıcı bildirimi: güncelleme penceresi açılırken arkada "Neler
     değişti" listesi görünüyordu. Pencere "yenileyince neler değiştiğini
     göreceksin" derken arkada zaten liste duruyor — çelişki.
     Ayrıca yarı saydam zemin yüzünden arkadaki her ekran okunabiliyordu.
     Kullanıcı nasıl olsa sayfayı yenileyecek; açık pencereleri kapatmak
     hem mantıklı hem de dikkat dağınıklığını önlüyor. */
  try{
    ["#yenilik-tam","#kur-modal","#gun-modal","#modal-perde","#cekmece","#perde"].forEach(sec=>{
      const el = document.querySelector(sec);
      if(el){ el.classList.remove("acik"); el.classList.add("gizli"); }
    });
  }catch(e){}
  /* 0.0.3.8 — SADELEŞTİRİLDİ.
     Bu pencere eskiden tüm değişiklik listesini çekip burada gösteriyordu.
     Gereksizdi: kullanıcı "Şimdi Yenile"ye bastıktan sonra zaten uygulama
     açılışında TAM EKRAN yenilik penceresi çıkıyor ve her şeyi orada
     okuyor. Aynı metni iki kez göstermek hem yer kaplıyor hem de bu
     pencerenin tek işini (—yeni sürüm var, yenile—) gölgeliyordu.
     Artık yalnızca hangi sürüme geçileceği yazıyor. */
  let yeniSurum = "";
  try{
    /* Sürüm numarası index.html'de değil app.js içinde (YENILIK_SURUM sabiti)
       yazıyor — bu yüzden yeni app.js'i çekip oradan okuyoruz. */
    const r = await fetch("./app.js?guncelleme=" + Date.now());
    const metin = await r.text();
    const m = metin.match(/YENILIK_SURUM\s*=\s*"([0-9.]+)"/);
    if(m) yeniSurum = m[1];
  }catch(e){}
  $("#guncelleme-yenilik-liste").innerHTML =
    '<div style="text-align:center;padding:6px 0 2px">' +
      '<div style="font-family:\'Saira Condensed\';font-size:34px;font-weight:800;color:var(--sari);line-height:1.1">' +
        (yeniSurum ? "Sürüm " + yeniSurum : "Yeni sürüm") +
      '</div>' +
      '<div style="font-size:13.5px;color:var(--soluk);margin-top:6px;line-height:1.5">' +
        "Yenileyince neler değiştiğini uygulama açılır açılmaz göreceksin." +
      '</div>' +
    '</div>';
  ekran.classList.remove("gizli");
  const cubuk = $("#guncelleme-cubuk");
  const btn = $("#btn-guncelleme-yenile");
  cubuk.style.transition = "none";
  cubuk.style.width = "0%";
  btn.classList.add("gizli");
  requestAnimationFrame(()=> requestAnimationFrame(()=>{
    cubuk.style.transition = "width 5s linear";
    cubuk.style.width = "100%";
  }));
  setTimeout(()=> btn.classList.remove("gizli"), 5000);
  btn.onclick = async ()=>{
    btn.textContent = "Yenileniyor…";
    window._swYenile();
    /* 0.0.3.0: sw.js artık kurulum biter bitmez kendini devreye SOKMUYOR
       (kullanıcı form doldururken sayfa yenilenip veri kaybolmasın diye).
       Yeni sürüm "waiting" durumunda bekliyor; devralması için ona açıkça
       izin vermemiz gerekiyor. Mesaj gönderildikten sonra worker devralır,
       `controllerchange` tetiklenir ve yukarıdaki dinleyici sayfayı yeniler.
       Mesaj gönderilemezse (worker yoksa vb.) doğrudan reload'a düşülüyor —
       kullanıcı hiçbir durumda ekranda takılı kalmıyor. */
    try{
      const kayit = await navigator.serviceWorker.getRegistration();
      if(kayit && kayit.waiting){
        kayit.waiting.postMessage({tip:"SKIP_WAITING"});
        setTimeout(()=> location.reload(), 1200);   /* devralma olmazsa yine de yenile */
        return;
      }
    }catch(e){}
    location.reload();
  };
}

/* ---------- 🎁 Tam ekran "Neler yeni" penceresi ---------- */
function yenilikTamAc(surum){
  const kaynak = document.getElementById("yenilik-kart");
  const govde  = document.getElementById("yenilik-tam-govde");
  const pencere= document.getElementById("yenilik-tam");
  if(!kaynak || !govde || !pencere) return;
  const liste = kaynak.querySelector("ul");
  if(!liste) return;
  govde.innerHTML = "<ul>" + liste.innerHTML + "</ul>";
  const sEl = document.getElementById("yenilik-tam-surum");
  if(sEl) sEl.textContent = "Sürüm " + (surum || "");
  pencere.classList.remove("gizli");
  /* Arkadaki sayfa kaymasın */
  try{ document.body.style.overflow = "hidden"; }catch(e){}
}
function yenilikTamKapat(){
  const p = document.getElementById("yenilik-tam");
  if(p) p.classList.add("gizli");
  try{ document.body.style.overflow = ""; }catch(e){}
  try{ localStorage.setItem("yenilik", window.__SURUM || ""); }catch(e){}
}

/* Android geri tuşu: açık pencereyi kapat, uygulamadan çıkma */
function geriKaydet(){
  try{ history.pushState({pencere:1}, ""); }catch(e){}
}
function acikPencereKapat(){
  let kapandi = false;
  /* Tam ekran yenilik penceresi açıksa önce onu kapat */
  const yt = document.getElementById("yenilik-tam");
  if(yt && !yt.classList.contains("gizli")){ yenilikTamKapat(); return true; }
  /* TV oynatıcı açıksa önce onu kapat (ses de kesilsin) */
  const tvo = document.getElementById("tv-oynatici");
  if(tvo && !tvo.classList.contains("gizli")){
    tvKapat();
    return true;
  }
  /* Haber detayı açıksa önce onu kapat */
  const hDetay = document.getElementById("haber-detay");
  if(hDetay && !hDetay.classList.contains("gizli")){
    hDetay.classList.add("gizli");
    return true;
  }
  /* Asistan sohbeti açıksa önce onu kapat */
  const asPanel = document.getElementById("asistan-panel");
  if(asPanel && !asPanel.classList.contains("gizli")){
    asPanel.classList.add("gizli");
    return true;
  }
  /* Tam ekran fotoğraf açıksa onu kapat */
  const fotoB = document.getElementById("foto-buyuk");
  if(fotoB && fotoB.style.display === "flex"){
    fotoB.style.display = "none";
    return true;
  }
  ["gun-modal","donem-modal","ay-modal","kur-modal","toplu-modal"].forEach(id=>{
    const el = document.getElementById(id);
    if(el && el.classList.contains("acik")){ el.classList.remove("acik"); kapandi = true; }
  });
  /* ay-detay-modal ("Maaşlar" ekranındaki ay detayı) alt-sayfa değil, ayrı bir
     sınıfla (acik) açılıyor — onu da geri tuşu listesine dahil et */
  const ayDetay = document.getElementById("ay-detay-modal");
  if(ayDetay && ayDetay.classList.contains("acik")){ ayDetayKapat(); kapandi = true; }
  const kartDetay = document.getElementById("kart-detay-modal");
  if(kartDetay && kartDetay.classList.contains("acik")){ kartDetayKapat(); kapandi = true; }
  /* Hava durumu tam ekranı da "gizli" class'ıyla açılıp kapanıyor — aynı şekilde dahil et */
  const havaTE = document.getElementById("hava-tam-ekran");
  if(havaTE && !havaTE.classList.contains("gizli")){ havaTE.classList.add("gizli"); kapandi = true; }
  const guncTE = document.getElementById("guncelleme-ekrani");
  if(guncTE && !guncTE.classList.contains("gizli")){ guncTE.classList.add("gizli"); kapandi = true; }
  const cek = document.getElementById("cekmece");
  if(cek && cek.classList.contains("acik")){
    cek.classList.remove("acik");
    const cp = document.getElementById("perde");
    if(cp) cp.classList.remove("acik");
    const hb = document.getElementById("btn-hamburger");
    if(hb) hb.classList.remove("acik");
    kapandi = true;
  }
  const perde = document.getElementById("modal-perde");
  if(kapandi && perde) perde.classList.remove("acik");
  return kapandi;
}
function gorunumSec(g){
  const b = document.querySelector('[data-goruntu="'+g+'"]');
  if(b) b.click();
}
window.addEventListener("popstate", ()=>{
  if(!acikPencereKapat() && aktifGoruntu!=="ana") gorunumSec("ana");
});

document.addEventListener("DOMContentLoaded", ()=>{

  /* Bir girdi alanına odaklanılacaksa, o alan kapalı bir "ekle" formunun
     içindeyse önce formu AÇ. Aksi halde (örn. ana ekrandaki "Avans" düğmesi
     ya da derin bağlantı) kullanıcı ödemeler ekranına gidiyor ama form kapalı
     kalıyor, imleç görünmez bir kutuya konuyor ve hiçbir şey olmamış gibi
     duruyordu. */
  window.formuAcVeOdaklan = (secici)=>{
    const el = document.querySelector(secici);
    if(!el) return;
    const kart = el.closest(".ekle-kart");
    if(kart && kart.classList.contains("kapali")) kart.classList.remove("kapali");
    try{ el.focus(); }catch(e){}
  };

  /* ── Kapanır "ekle" formları ──────────────────────────────────────
     Aldığım paralar, Borç defteri, Masraflar, Kartlar, Ekip, Planlar
     ekranlarında ekleme formu kapalı başlıyor; başlığa dokununca
     açılıyor. Amaç: kullanıcı ekrana girince önce LİSTESİNİ görsün,
     boş bir formla karşılaşmasın. Bir form açılınca diğerleri kapanmıyor
     (aynı ekranda birden fazla olabiliyor, kullanıcıyı şaşırtmayalım). */
  /* Araçlar ekranındaki 17 kart da aynı mantıkla kapanır. Aralarındaki
     tek fark: burada AKORDEON — bir araç açılınca diğerleri kapanıyor.
     Sebep: araçlar birbirinden bağımsız ve uzun; ikisi birden açık
     kalırsa ekran yine kaydırma şeridine dönüyor. */
  /* Şifre göster/gizle. Küçük ama gerçek bir sorunu çözüyor: kullanıcı
     yanlış şifre yazdığını göremediği için "hesabım kilitlendi" sanıp
     şifre sıfırlamaya gidiyor. Tozlu/eldivenli parmakla yanlış tuşa
     basmak da kolay. */
  try{
    const gz = $("#btn-sifre-goster"), inp = $("#giris-sifre");
    if(gz && inp) gz.addEventListener("click", ()=>{
      const gorunur = inp.type === "text";
      inp.type = gorunur ? "password" : "text";
      gz.classList.toggle("acik", !gorunur);
      gz.setAttribute("aria-label", gorunur ? "Şifreyi göster" : "Şifreyi gizle");
      inp.focus();
    });
  }catch(e){}

  /* Ayarlar kartları — Araçlar ile aynı akordeon mantığı.
     Ücret ayarları HTML'de açık başlıyor; ona dokunulmuyor. */
  document.querySelectorAll(".ayar-kart .ayar-bas").forEach(bas=>{
    const ac = ()=>{
      const kart = bas.closest(".ayar-kart");
      if(!kart) return;
      const zatenAcik = !kart.classList.contains("kapali");
      document.querySelectorAll(".ayar-kart").forEach(k=> k.classList.add("kapali"));
      if(!zatenAcik){
        kart.classList.remove("kapali");
        setTimeout(()=>{ try{ kart.scrollIntoView({behavior:"smooth", block:"start"}); }catch(e){} }, 210);
      }
      titret(8);
    };
    bas.addEventListener("click", ac);
    bas.addEventListener("keydown", e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); ac(); } });
  });

  document.querySelectorAll(".arac-kart .arac-bas").forEach(bas=>{
    const ac = ()=>{
      const kart = bas.closest(".arac-kart");
      if(!kart) return;
      const zatenAcik = !kart.classList.contains("kapali");
      document.querySelectorAll(".arac-kart").forEach(k=> k.classList.add("kapali"));
      if(!zatenAcik){
        kart.classList.remove("kapali");
        setTimeout(()=>{ try{ kart.scrollIntoView({behavior:"smooth", block:"start"}); }catch(e){} }, 210);
      }
      titret(8);
    };
    bas.addEventListener("click", ac);
    bas.addEventListener("keydown", e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); ac(); } });
  });

  document.querySelectorAll(".ekle-kart .ekle-bas").forEach(bas=>{
    const ac = ()=>{
      const kart = bas.closest(".ekle-kart");
      if(!kart) return;
      const acildi = kart.classList.toggle("kapali") === false;
      titret(8);
      /* Açılınca forma kaydır ki kullanıcı nereye yazacağını görsün */
      if(acildi) setTimeout(()=>{
        try{ kart.scrollIntoView({behavior:"smooth", block:"nearest"}); }catch(e){}
      }, 210);
    };
    bas.addEventListener("click", ac);
    bas.addEventListener("keydown", e=>{
      if(e.key==="Enter" || e.key===" "){ e.preventDefault(); ac(); }
    });
  });

  /* 🔒 EKRAN KİLİDİ: yakınlaştırma yok, yatay kayma yok
     ─────────────────────────────────────────────────────────────────
     CSS'teki `touch-action:pan-x pan-y` çoğu tarayıcıda yeter, ama:
       • iOS Safari, `user-scalable=no` viewport ayarını 10. sürümden
         beri BİLEREK YOK SAYAR (erişilebilirlik gerekçesiyle). Çimdik
         (pinch) yakınlaştırmayı kesmek için `gesture*` olaylarını
         engellemek gerekir — bunlar yalnızca Safari'de vardır.
       • Masaüstünde Ctrl/⌘ + tekerlek de yakınlaştırır.
     Aşağıdaki engeller SADECE yakınlaştırmayı hedefler; kaydırma,
     dokunma, sürükleme ve yazma normal çalışmaya devam eder.

     Not: iOS'un bu ayarı yok sayması bilinçli bir erişilebilirlik
     tercihidir. Burada kilitlemek uygulamayı yerli uygulama gibi
     davrandırıyor; gözü zayıf bir kullanıcı için sistem genelindeki
     "Büyüteç" ve Ayarlar'daki "Büyük yazı" seçeneği hâlâ çalışıyor. */
  ["gesturestart","gesturechange","gestureend"].forEach(olay=>{
    document.addEventListener(olay, e=> e.preventDefault(), {passive:false});
  });
  /* Ctrl/⌘ + tekerlek (masaüstü) */
  document.addEventListener("wheel", e=>{
    if(e.ctrlKey || e.metaKey) e.preventDefault();
  }, {passive:false});
  /* İki parmakla dokunma başlangıcı — eski Android WebView'lerde
     touch-action yeterli olmayabiliyor. Tek parmak dokunuşa KARIŞMAZ,
     böylece kaydırma ve düğmeler etkilenmez. */
  document.addEventListener("touchstart", e=>{
    if(e.touches && e.touches.length > 1) e.preventDefault();
  }, {passive:false});
  /* Yatay kaymaya karşı son güvenlik ağı: bir şekilde sayfa yana
     kaydıysa (beklenmedik bir taşma öğesi yüzünden) geri toparla.
     Kaydırma sırasında sürekli çalışmasın diye yalnızca sıfırdan
     farklıysa müdahale eder. */
  window.addEventListener("scroll", ()=>{
    if(window.scrollX !== 0) window.scrollTo(0, window.scrollY);
  }, {passive:true});

  /* ⚡ Hafif modu EN BAŞTA uygula — Ayarlar ekranı hiç açılmasa bile geçerli
     olmalı, üstelik ilk boyamadan önce uygulanmalı ki açılışta bulanık zemin
     bir an görünüp sonra kaybolmasın. */
  hafifModUygula();
  olcekUygula();   /* ilk boyamadan önce ölçek geçerli olsun */

  /* Açılış ekranı: 3 saniye */
  setTimeout(()=> $("#acilis").classList.add("kapan"), 2600);
  setTimeout(()=> $("#acilis").style.display = "none", 3200);

  /* Geri bildirim */
  $("#btn-geribildirim").addEventListener("click", async ()=>{
    const metin = "👷 Puantaj Defterim hakkında geri bildirimim:\n\n";
    try{
      if(navigator.share) await navigator.share({text: metin});
      else{ await navigator.clipboard.writeText(metin); toast("Metin kopyalandı, istediğin yere yapıştır 📋"); }
    }catch(e){}
  });

  /* Giriş / kayıt sekmeleri */
  let kayitModu = false;
  const sekmeYenile = ()=>{
    $("#sekme-giris").classList.toggle("aktif", !kayitModu);
    $("#sekme-kayit").classList.toggle("aktif", kayitModu);
    $("#alan-ad").classList.toggle("gizli", !kayitModu);
    $("#btn-giris").textContent = kayitModu ? "Hesap oluştur" : "Giriş yap";
    $("#giris-hata").classList.remove("goster");
  };
  $("#sekme-giris").addEventListener("click", ()=>{ kayitModu=false; sekmeYenile(); });
  $("#sekme-kayit").addEventListener("click", ()=>{ kayitModu=true; sekmeYenile(); });

  const girisHata = m => { const e=$("#giris-hata"); e.textContent=m; e.classList.add("goster"); };
  const hataCevir = e=>{
    const k = e.code||"";
    if(k.includes("invalid-email")) return "E-posta adresi hatalı görünüyor.";
    if(k.includes("weak-password")) return "Şifre en az 6 karakter olmalı.";
    if(k.includes("email-already-in-use")) return "Bu e-posta ile zaten hesap var. Giriş yapmayı dene.";
    if(k.includes("invalid-credential")||k.includes("wrong-password")||k.includes("user-not-found")) return "E-posta ya da şifre yanlış.";
    if(k.includes("network")) return "İnternet bağlantısını kontrol et.";
    /* Eksik olan ve kullanıcıyı gerçekten kilitleyen durumlar (0.0.6.8).
       Bunlar olmayınca ekrana ham İngilizce Firebase mesajı düşüyordu —
       "Bir sorun oldu: Firebase: Error (auth/too-many-requests)" gibi.
       Kullanıcı ne yapacağını bilemiyor, çoğu bu noktada uygulamayı bırakıyor. */
    if(k.includes("too-many-requests"))
      return "Çok fazla denediğin için hesabın geçici olarak kilitlendi. 15-20 dakika bekleyip tekrar dene, ya da 'Şifremi unuttum'a bas.";
    if(k.includes("user-disabled"))
      return "Bu hesap kapatılmış. Yardım için geliştiriciye ulaş.";
    if(k.includes("operation-not-allowed"))
      return "E-posta ile giriş şu an kapalı görünüyor. Geliştiriciye haber ver.";
    if(k.includes("missing-password"))
      return "Şifre alanı boş kalmış.";
    if(k.includes("invalid-login-credentials"))
      return "E-posta ya da şifre yanlış.";
    if(k.includes("requires-recent-login"))
      return "Güvenlik için tekrar giriş yapman gerekiyor. Çıkış yapıp yeniden gir.";
    if(k.includes("internal-error"))
      return "Sunucuda geçici bir sorun var. Birkaç dakika sonra tekrar dene.";
    /* Bilinmeyen hatada bile ham İngilizce mesaj GÖSTERİLMİYOR; teknik ayrıntı
       hata günlüğüne yazılıyor, kullanıcıya anlaşılır bir şey söyleniyor. */
    try{ hataKaydet("giris", e); }catch(_){}
    return "Giriş yapılamadı. İnternetini kontrol edip tekrar dene. Sorun sürerse geliştiriciye yaz.";
  };

  $("#btn-giris").addEventListener("click", async ()=>{
    const eposta = $("#giris-eposta").value.trim();
    const sifre = $("#giris-sifre").value;
    if(!eposta || !sifre){ girisHata("E-posta ve şifreyi doldur."); return; }
    try{
      if(kayitModu){
        const ad = $("#giris-ad").value.trim();
        if(!ad){ girisHata("Adını yaz kanka, menüde görünsün."); return; }
        const c = await auth.createUserWithEmailAndPassword(eposta, sifre);
        await c.user.updateProfile({displayName: ad});
        try{ await c.user.sendEmailVerification(); }catch(e){}
        kullanici = auth.currentUser; kullaniciBilgiYaz();
        toast("Hesabın hazır, hoş geldin " + ad + " 👷");
      }else{
        await auth.signInWithEmailAndPassword(eposta, sifre);
      }
    }catch(e){ girisHata(hataCevir(e)); }
  });

  $("#btn-sifre-unut").addEventListener("click", async ()=>{
    const eposta = $("#giris-eposta").value.trim();
    if(!eposta){ girisHata("Önce e-posta adresini yaz, sıfırlama linki gönderelim."); return; }
    try{
      await auth.sendPasswordResetEmail(eposta);
      toast("Şifre sıfırlama e-postası gönderildi 📧");
    }catch(e){ girisHata(hataCevir(e)); }
  });

  /* Hamburger / çekmece */
  const cekmeceAc = ac=>{
    if(ac) geriKaydet();
    $("#cekmece").classList.toggle("acik", ac);
    $("#perde").classList.toggle("acik", ac);
    $("#btn-hamburger").classList.toggle("acik", ac);
  };
  $("#btn-hamburger").addEventListener("click", ()=> cekmeceAc(!$("#cekmece").classList.contains("acik")));
  $("#perde").addEventListener("click", ()=> cekmeceAc(false));

  /* Menü grupları: katlanabilir (accordion). Kullanıcının hangi grupları
     kapattığı localStorage'da hatırlanır, varsayılan hepsi açık. */
  (function(){
    let kapaliGruplar = [];
    try{ kapaliGruplar = JSON.parse(localStorage.getItem("menuGrupKapali")||"[]"); }catch(e){}
    const uygula = ()=>{
      $$(".menu-grup[data-grup-baslik]").forEach(baslik=>{
        const grup = baslik.dataset.grupBaslik;
        const kapali = kapaliGruplar.includes(grup);
        baslik.classList.toggle("kapali", kapali);
        $$('li[data-grup="'+grup+'"]').forEach(li=> li.classList.toggle("grup-kapali", kapali));
      });
    };
    uygula();
    $$(".menu-grup[data-grup-baslik]").forEach(baslik=>{
      baslik.addEventListener("click", ()=>{
        const grup = baslik.dataset.grupBaslik;
        const i = kapaliGruplar.indexOf(grup);
        if(i>-1) kapaliGruplar.splice(i,1); else kapaliGruplar.push(grup);
        try{ localStorage.setItem("menuGrupKapali", JSON.stringify(kapaliGruplar)); }catch(e){}
        uygula();
      });
    });
  })();

  /* Görünüm değiştirme */
  const basliklar = {
    ana:["Ana ekran","Bu ayki hesabın"],
    puantaj:["Puantaj","Bu ayki çizelgen"],
    odemeler:["Paralar","Avans ve ödemeler"],
    borc:["Borçlar","Verdiğin ve aldığın"],
    ozet:["Hesap","Ay sonu özeti"],
    yil:["Yıl özeti","12 ayın dökümü"],
    notlar:["Notlar","Aklında kalmasın, yaz"],
    rozet:["Başarımlar","Rozetlerini topla"],
    masraf:["Masraflar","Patrondan alacakların"],
    ekip:["Ekibim","Yanındakilerin puantajı"],
    arac:["Araçlar","Hesap ve haklar"],
    kisiler:["Herkes","Kim ne çalışmış gör"],
    ayarlar:["Ayarlar","Ücret ve hesap"],
    haber:["Gündem","Türkiye ve dünya haberleri"],
    tv:["Canlı TV","Kanalların resmi yayınları"],
    video:["Video","Ara, uygulamada izle"],
    kartlar:["Kredi kartlarım","Borç ve son ödeme takibi"],
    arama:["Kayıt ara","Tüm defterde bul"],
    planlar:["Planlarım","Proje ve plan linklerin"],
    maaslar:["Maaşlar","Her ayın kendi hesap kartı"],
    isler:["İşlerim","İşe giriş/çıkış geçmişin"],
    tani:["Tanı / Test","Uygulama kendini kontrol ediyor"]
  };
  $$("[data-goruntu]").forEach(b=>{
    b.addEventListener("click", ()=>{
      const g = b.dataset.goruntu;
      if(g!=="ana" && aktifGoruntu!==g) geriKaydet();  /* donanım geri tuşu ana ekrana dönsün */
      aktifGoruntu = g;
      $("#btn-geri").classList.toggle("gizli", g==="ana");
      $$("[data-goruntu]").forEach(x=>x.classList.toggle("aktif", x===b));
      ["ana","puantaj","odemeler","masraf","borc","ozet","yil","notlar","rozet","ekip","kisiler","arac","ayarlar","haber","tv","video","kartlar","arama","planlar","maaslar","isler","tani"].forEach(x=>{
        $("#goruntu-"+x).classList.toggle("gizli", x!==g);
      });
      $("#ay-bar").style.display = (g==="ayarlar"||g==="borc"||g==="ana"||g==="notlar"||g==="rozet"||g==="arac"||g==="haber"||g==="tv"||g==="video"||g==="kartlar"||g==="arama"||g==="planlar"||g==="maaslar"||g==="isler"||g==="tani") ? "none" : "flex";
      $("#topbar-baslik").firstChild.textContent = basliklar[g][0];
      $("#topbar-alt").textContent = basliklar[g][1];
      $("#btn-bugun").style.display = g==="puantaj" ? "flex" : "none";
      $$(".alt-nav [data-nav]").forEach(n=> n.classList.toggle("aktif", n.dataset.nav===g));
      if(g==="yil"){
        $("#ay-ad").firstChild.textContent = aktifYil;
        $("#ay-alt").textContent = "yıl seç";
        yilYukle();
      }else{
        ayBarCiz();
      }
      if(g==="ozet") ozetDetayYukle();
      if(g==="ana") anaYukle();
      if(g==="rozet"){ rozetYukle(); if(tumIstatistik) seviyeCiz(); }
      if(g==="ekip"){ birKezBaslat("ekip", ekipDinle); ekipYoklamaCiz(); ekipYoklamaYukle(); ekipOzetYukle(); }
      if(g==="kisiler") kisilerYukle();
      if(g==="planlar"){ birKezBaslat("planlar", planlariDinle); planSantiyeSecDoldur(); }
      if(g==="maaslar") maaslarListCiz();
      if(g==="notlar") birKezBaslat("notlar", notlariDinle);
      if(g==="odemeler") birKezBaslat("beklenen", beklenenDinle);
      if(g!=="arac" && sesAkis) sesDurdur();
      if(g!=="arac" && oyun){ oyun.bitti = true; oyun = null; const oa=$("#oyun-alan"); if(oa) oa.classList.add("gizli"); }
      if(g!=="arac" && teraziAcik){ teraziAcik = false; window.removeEventListener("deviceorientation", teraziDinle); const ta=$("#terazi-alan"); if(ta) ta.classList.add("gizli"); }
      if(g==="arama"){
        /* ARAMA ÖNBELLEĞİ (0.0.9.4)
           Arama, `tumGirdilerQS` ve `tumOdemelerQS` önbelleklerinden okuyor
           ancak bu ekran onları HAZIRLAMIYORDU. Önbellek yalnızca ana ekran,
           zam analizi ve hesap özeti açılınca doluyor.
           Sonuç: uygulamayı açıp doğrudan aramaya giden kullanıcı boş sonuç
           alıyor ve "kaydım yok" sanıyordu — sessiz bir hata.
           Artık ekran açılırken dinleyici tetikleniyor. */
        try{ tumVeriDinle(); }catch(e){}
        setTimeout(()=>{ const k=$("#arama-kutu"); if(k) k.focus(); }, 150);
      }
      if(g==="ayarlar"){
        const cs = $("#cihaz-sayi");
        if(cs && kullanici){
          kokRef().collection("cihazlar").limit(10).get()
            .then(r=> { cs.textContent = r.size ? "📱 " + r.size + " cihaz duyuru listesinde" : ""; })
            .catch(()=>{});
        }
      }
      if(g==="arac"){
        [yillikIzinCiz, zamAnalizYap, emekKarneCiz, kimlikOzetCiz, kazaListeYukle, acilFormDoldur, vakitIlKur, vakitYukle, hataGunluguCiz,
         ()=>{ if(tumIstatistik){ sgkCiz(); mesaiSinirCiz(tumIstatistik.buYilMesai||0); } }]
          .forEach(f=>{ try{ f(); }catch(e){ console.warn("araç kartı:", e); } });
      }
      if(g==="haber") haberYukle(false);
      if(g==="tv") tvCiz();
      if(g==="video") videoSayfaAc();
      $("#asistan").style.display = g==="ana" ? "flex" : "none";
      if(g!=="ana") $("#asistan-panel").classList.add("gizli");
      cekmeceAc(false);
      window.scrollTo({top:0});
    });
  });

  $("#btn-geri").addEventListener("click", ()=>{
    if(acikPencereKapat()) return;   /* önce açık bir modal/pencere varsa onu kapat, direkt Ana ekrana atlama */
    gorunumSec("ana");
  });

  /* 📰 Gündem olayları */
  document.querySelectorAll("#haber-sekmeler button").forEach(b=>{
    b.addEventListener("click", ()=>{
      document.querySelectorAll("#haber-sekmeler button").forEach(x=> x.classList.remove("aktif"));
      b.classList.add("aktif");
      haberKat = b.dataset.kat;
      haberYukle(false);
    });
  });
  $("#btn-haber-yenile").addEventListener("click", ()=> haberYukle(true));
  $("#haber-ara").addEventListener("input", ()=>{
    try{
      const sakli = JSON.parse(localStorage.getItem("haber:"+haberKat)||"null");
      if(sakli && sakli.liste) haberBas(sakli.liste, sakli.t);
    }catch(e){}
  });
  $("#btn-haber-detay-kapat").addEventListener("click", ()=> $("#haber-detay").classList.add("gizli"));
  $("#btn-tvo-kapat").addEventListener("click", tvKapat);
  $("#btn-saglik").addEventListener("click", saglikTesti);

  /* Hata günlüğü: kopyala / temizle */
  $("#btn-hata-kopyala").addEventListener("click", async ()=>{
    try{
      await navigator.clipboard.writeText(hataGunluguMetin());
      toast("Hata günlüğü kopyalandı 📋");
    }catch(e){ toast("Kopyalanamadı, elle seçip kopyala"); }
  });
  $("#btn-hata-temizle").addEventListener("click", ()=>{
    if(!confirm("Hata günlüğü temizlensin mi?")) return;
    try{ localStorage.removeItem("hataGunlugu"); }catch(e){}
    hataGunluguCiz();
    toast("Hata günlüğü temizlendi");
  });
  $("#btn-bildirim").addEventListener("click", bildirimAc);
  let aramaZ = null;
  $("#arama-kutu").addEventListener("input", ()=>{
    clearTimeout(aramaZ);
    aramaZ = setTimeout(aramaCalistir, 250);
  });
  $("#btn-bildirim-dene").addEventListener("click", async ()=>{
    try{
      if(!("Notification" in window) || Notification.permission !== "granted"){
        toast("Önce üstteki düğmeyle bildirimleri aç 🔔"); return;
      }
      const kayit = await navigator.serviceWorker.ready;
      await kayit.showNotification("Deneme başarılı! 🎉", {
        body: "Bildirimler çalışıyor usta — duyurular artık cebine düşecek 👊",
        vibrate: [80, 40, 80], tag: "deneme"
      });
      duyuruEkle("Deneme başarılı! 🎉", "Bildirim sistemi çalışıyor.");
      toast("Bildirim gönderildi — ekranın tepesine bak 🔔");
    }catch(e){ toast("Deneme gönderilemedi 😕"); }
  });
  $("#duyuru-bant-kapat").addEventListener("click", ()=> $("#duyuru-bant").style.display = "none");
  duyuruListeCiz();
  duyuruKutuBosalt();
  onPlanDinle();
  try{
    const bd = $("#bildirim-durum");
    if(bd && "Notification" in window && Notification.permission === "granted" && localStorage.getItem("bildirimAcik") === "1"){
      bd.innerHTML = "<b style='color:var(--tam)'>Açık ✅</b> — bu telefon duyuru listesinde.";
    }
  }catch(e){}
  /* PDF fontlarını ARKA PLANDA önceden indir (yalnızca iOS'ta).
     Gerekçe: iOS Safari, paylaşım penceresinin kullanıcı dokunuşundan hemen
     sonra açılmasını istiyor. Fontlar paylaşım anında indiriliyordu (ilk
     seferde ~1 MB) ve bu gecikme izni tüketip paylaşımı engelliyordu.
     Açılıştan 12 saniye sonra, kullanıcı hiçbir şey beklemeden arka planda
     indiriliyor; böylece PDF'e basıldığında font zaten hazır oluyor.
     Android'de gerek yok (orada izin kuralı gevşek) — gereksiz veri
     harcamamak için yalnızca iOS'ta yapılıyor. */
  if(iosMu()) setTimeout(()=>{ pdfFontlariYukle().catch(()=>{}); }, 12000);

  setTimeout(bildirimSessizTazele, 7000);

  /* 🌙 Akşam hatırlatmasını UYGULAMA KAPALIYKEN de çalışacak şekilde kaydet.
     Mevcut hatırlatma yalnızca ana ekran çizilirken tetikleniyordu — yani
     kullanıcı uygulamayı açtığında. Ama zaten açtıysa hatırlatmaya ihtiyacı
     yok; özellik tam gerektiği anda sessizdi.
     Periodic Background Sync desteği sınırlı (Chrome/Android'de var, iOS'ta
     yok) ve tarayıcı izin/kullanım sıklığına göre karar veriyor. Bu yüzden
     eski kontrol KALDIRILMADI — destekleyen cihazda kapalıyken, diğerlerinde
     açılışta hatırlatılıyor. */
  setTimeout(async ()=>{
    try{
      if(localStorage.getItem("bildirimAcik") !== "1") return;
      if(!("Notification" in window) || Notification.permission !== "granted") return;
      const kayit = await navigator.serviceWorker.ready;
      if(!kayit.periodicSync) return;                 /* desteklenmiyor, sessiz geç */
      const izin = await navigator.permissions.query({name:"periodic-background-sync"});
      if(izin.state !== "granted") return;
      const mevcut = await kayit.periodicSync.getTags();
      if(mevcut.includes("aksam-hatirlatma")) return; /* zaten kayıtlı */
      await kayit.periodicSync.register("aksam-hatirlatma", {
        minInterval: 12 * 60 * 60 * 1000              /* en sık 12 saatte bir */
      });
    }catch(e){ /* tarayıcı desteklemiyorsa sorun değil, eski yol devrede */ }
  }, 9000);
  insaatHesaplaKur();
  $("#btn-kimlik-kart").addEventListener("click", kimlikKartOlustur);
  let kazaFoto = null;
  $("#btn-kaza-foto").addEventListener("click", ()=> $("#kaza-foto-sec").click());
  $("#kaza-foto-sec").addEventListener("change", async e=>{
    const dosya = e.target.files && e.target.files[0];
    e.target.value = "";
    if(!dosya) return;
    toast("Fotoğraf küçültülüyor...");
    try{
      kazaFoto = await fotoSikistir(dosya);
      const im = $("#kaza-foto-onizle");
      im.src = kazaFoto; im.classList.remove("gizli");
      toast("Fotoğraf hazır, Kaydı tut'a bas 📷");
    }catch(err){ toast("Fotoğraf eklenemedi, başka dene"); }
  });
  $("#btn-kaza-kaydet").addEventListener("click", async ()=>{
    /* ÇİFT TIKLAMA KORUMASI (0.1.2.0)
       Bu düğme `.add()` ile YENİ kayıt oluşturuyor; hızlı iki dokunuşta
       aynı kaza kaydı iki kez kaydediliyordu. Ödeme, masraf, borç ve
       beklenen düğmelerinde bu koruma zaten vardı, bu üçü atlanmış. */
    const _dg = document.getElementById("btn-kaza-kaydet");
    if(_dg && _dg.disabled) return;
    if(_dg) _dg.disabled = true;
    try{
      const tarih = $("#kaza-tarih").value;
      const aciklama = $("#kaza-aciklama").value.trim();
      if(!tarih){ toast("Kaza tarihini seç kanka"); return; }
      if(!aciklama){ toast("Ne olduğunu kısaca yaz — ileride en önemli satır bu"); return; }
      try{
        const veri = {
          tarih, aciklama,
          tanik: $("#kaza-tanik").value.trim(),
          rapor: $("#kaza-rapor").value.trim(),
          sgk: $("#kaza-sgk").value,
          kayitZamani: Date.now(),
          olusturma: firebase.firestore.FieldValue.serverTimestamp()
        };
        if(kazaFoto) veri.foto = kazaFoto;
        await kokRef().collection("kazalar").add(veri);
        kazaFoto = null;
        $("#kaza-foto-onizle").classList.add("gizli");
        $("#kaza-aciklama").value=""; $("#kaza-tanik").value=""; $("#kaza-rapor").value="";
        toast("Kayıt tutuldu 🚑 Geçmiş olsun — 📄 ile tutanak paylaşabilirsin");
        kazaListeYukle();
      }catch(e){ hataGoster(e); }
    
    }finally{
      if(_dg) _dg.disabled = false;
    }
  });
  $("#btn-acil-kaydet").addEventListener("click", async ()=>{
    try{
      await kokRef().set({acil:{
        kan: $("#acil-kan").value,
        kisi: $("#acil-kisi").value.trim(),
        not: $("#acil-not").value.trim()
      }},{merge:true});
      toast("Acil durum bilgilerin kaydedildi 🆘");
    }catch(e){ hataGoster(e); }
  });
  $("#btn-acil-goster").addEventListener("click", ()=>{
    const a = ayarlar.acil || {};
    if(!a.kan && !a.kisi){ toast("Önce kan grubunu ve acil kişiyi kaydet"); return; }
    $("#acil-b-ad").textContent = (kullanici && kullanici.displayName) || "";
    $("#acil-b-kan").textContent = a.kan || "?";
    $("#acil-b-kisi").innerHTML = a.kisi ? "📞 " + String(a.kisi).replace(/</g,"&lt;") : "";
    $("#acil-b-not").innerHTML = a.not ? "⚠️ " + String(a.not).replace(/</g,"&lt;") : "";
    $("#acil-buyuk").style.display = "flex";
  });
  $("#acil-buyuk").addEventListener("click", ()=>{ $("#acil-buyuk").style.display = "none"; });
  $("#btn-gun-paylas").addEventListener("click", async ()=>{
    let m; try{ m = gunPaylasMetni(); }catch(e){ toast("Paylaşım hazırlanamadı"); return; }
    try{
      if(navigator.share) await navigator.share({text: m});
      else{ await navigator.clipboard.writeText(m); toast("Gün kopyalandı, istediğin yere yapıştır 📋"); }
    }catch(e){}
  });
  $("#btn-dun-isle").addEventListener("click", ()=>{
    const d = $("#dun-kart").dataset.dun;
    if(d) modalAc(d);
  });
  $("#btn-yildonumu-kapat").addEventListener("click", ()=>{
    $("#yildonumu-kart").classList.add("gizli");
    try{ localStorage.setItem("yildonumu:"+new Date().getFullYear(), "1"); }catch(e){}
  });
  $("#btn-zam-kibar").addEventListener("click", ()=> zamMesajUret("kibar"));
  $("#btn-zam-net").addEventListener("click", ()=> zamMesajUret("net"));
  $("#btn-zam-paylas").addEventListener("click", async ()=>{
    const m = $("#zam-mesaj").value;
    if(!m) return;
    try{
      if(navigator.share) await navigator.share({text: m});
      else{ await navigator.clipboard.writeText(m); toast("Mesaj kopyalandı 📋"); }
    }catch(e){}
  });
  $("#btn-karne").addEventListener("click", karneOlustur);
  $("#btn-video-ara").addEventListener("click", ()=>{
    const q = $("#video-ara").value.trim();
    if(q) videoAra(q); else toast("Ne aramak istediğini yaz kanka 🔎");
  });
  $("#video-ara").addEventListener("keydown", e=>{
    if(e.key === "Enter"){ e.preventDefault(); $("#btn-video-ara").click(); }
  });
  $("#btn-tvo-youtube").addEventListener("click", ()=>{
    if(!tvAcikKanal) return;
    const u = tvAcikKanal.ytLive || "https://www.youtube.com/channel/"+tvAcikKanal.ytId+"/live";
    try{ window.open(u, "_blank"); }catch(e){ location.href = u; }
  });
  $("#btn-tvo-site").addEventListener("click", ()=>{
    if(tvAcikKanal) try{ window.open(tvAcikKanal.url, "_blank"); }catch(e){ location.href = tvAcikKanal.url; }
  });
  $("#btn-hd-oku").addEventListener("click", ()=>{
    if(acikHaber && linkGuvenliMi(acikHaber.l)) try{ window.open(acikHaber.l, "_blank"); }catch(e){ location.href = acikHaber.l; }
  });
  $("#btn-hd-paylas").addEventListener("click", async ()=>{
    if(!acikHaber) return;
    const metin = "📰 " + acikHaber.b + (acikHaber.k ? " ("+acikHaber.k+")" : "") + "\n" + acikHaber.l;
    try{
      if(navigator.share) await navigator.share({text: metin});
      else{ await navigator.clipboard.writeText(metin); toast("Haber kopyalandı, istediğin yere yapıştır 📋"); }
    }catch(e){}
  });
  $("#borc-uyari").addEventListener("click", ()=> gorunumSec("borc"));
  $("#beklenen-uyari").addEventListener("click", ()=> gorunumSec("odemeler"));
  $("#kart-uyari").addEventListener("click", ()=> gorunumSec("kartlar"));
  $("#btn-kart-ekle").addEventListener("click", async ()=>{
    /* ÇİFT TIKLAMA KORUMASI (0.1.2.0)
       Bu düğme `.add()` ile YENİ kayıt oluşturuyor; hızlı iki dokunuşta
       aynı kart iki kez kaydediliyordu. Ödeme, masraf, borç ve
       beklenen düğmelerinde bu koruma zaten vardı, bu üçü atlanmış. */
    const _dg = document.getElementById("btn-kart-ekle");
    if(_dg && _dg.disabled) return;
    if(_dg) _dg.disabled = true;
    try{
      const banka = $("#kart-banka").value.trim();
      const ad = $("#kart-ad").value.trim();
      const gun = Number(sayi($("#kart-gun").value));
      const borc = sayi($("#kart-borc").value);
      if(!ad){ toast("Kartın adını yaz kanka (Bonus, Axess...)"); return; }
      if(!(gun >= 1 && gun <= 31)){ toast("Son ödeme günü 1-31 arası olmalı"); return; }
      if(/\d{6,}/.test(ad)){ toast("Dur kanka! Kart NUMARASI yazma — sadece takma ad 🔒"); return; }
      try{
        if(duzenlenenKart){
          await kokRef().collection("kartlar").doc(duzenlenenKart.id).update({ad, banka, gun, borc: borc||0});
          toast("Kart güncellendi ✏️");
        }else{
          await kokRef().collection("kartlar").add({ad, banka, gun, borc: borc||0, odemeler: [],
            olusturma: firebase.firestore.FieldValue.serverTimestamp()});
          toast("Kart eklendi 💳 Son ödeme yaklaşınca haber veririm");
        }
        duzenlenenKart = null;
        $("#kart-banka").value=""; $("#kart-ad").value=""; $("#kart-gun").value=""; $("#kart-borc").value="";
        $("#btn-kart-ekle").textContent = "Kaydet";
        $("#btn-kart-vazgec").classList.add("gizli");
      }catch(e){ hataGoster(e); }
    
    }finally{
      if(_dg) _dg.disabled = false;
    }
  });
  $("#btn-terazi-basla").addEventListener("click", teraziBaslat);
  $("#btn-oyun-basla").addEventListener("click", oyunBaslat);
  $("#btn-ses-basla").addEventListener("click", sesBaslat);
  $("#btn-karne-kart").addEventListener("click", karneKartOlustur);
  /* 🎙️ Sesle sorma — destekleyen telefonlarda görünür */
  const SesTanima = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(SesTanima){
    const mikBtn = $("#btn-asistan-mik");
    mikBtn.classList.remove("gizli");
    mikBtn.addEventListener("click", ()=>{
      try{
        const rec = new SesTanima();
        rec.lang = "tr-TR";
        rec.interimResults = false;
        mikBtn.textContent = "🔴";
        rec.onresult = e=>{
          const soz = e.results[0][0].transcript;
          $("#asistan-soru").value = soz;
          $("#asistan-gonder").click();
        };
        rec.onend = ()=>{ mikBtn.textContent = "🎙️"; };
        rec.onerror = ()=>{ mikBtn.textContent = "🎙️"; toast("Seni duyamadım, tekrar dene 🎙️"); };
        rec.start();
        toast("Dinliyorum, konuş 🎙️");
      }catch(e){ mikBtn.textContent = "🎙️"; toast("Ses tanıma başlatılamadı"); }
    });
  }
  $("#btn-kart-vazgec").addEventListener("click", ()=>{
    duzenlenenKart = null;
    $("#kart-banka").value=""; $("#kart-ad").value=""; $("#kart-gun").value=""; $("#kart-borc").value="";
    $("#btn-kart-ekle").textContent = "Kaydet";
    $("#btn-kart-vazgec").classList.add("gizli");
  });

  /* Başlangıç rehberi olayları */
  $("#btn-rehber-kapat").addEventListener("click", ()=>{
    $("#rehber-kart").classList.add("gizli");
    try{ localStorage.setItem("rehberKapandi","1"); }catch(e){}
  });
  $("#btn-rehber-yevmiye").addEventListener("click", ()=> gorunumSec("ayarlar"));
  $("#btn-rehber-isle").addEventListener("click", ()=> modalAc(tarihId(new Date())));

  /* Ay gezgini */
  $("#btn-onceki-ay").addEventListener("click", ()=>{
    if(aktifGoruntu==="yil"){
      aktifYil--; $("#ay-ad").firstChild.textContent = aktifYil; yilYukle(); return;
    }
    aktifAy--; if(aktifAy<0){aktifAy=11;aktifYil--;}
    takvimYonAnimasyon("geri");
    ayiYukle(); ayBarCiz();
  });
  $("#btn-sonraki-ay").addEventListener("click", ()=>{
    if(aktifGoruntu==="yil"){
      aktifYil++; $("#ay-ad").firstChild.textContent = aktifYil; yilYukle(); return;
    }
    aktifAy++; if(aktifAy>11){aktifAy=0;aktifYil++;}
    takvimYonAnimasyon("ileri");
    ayiYukle(); ayBarCiz();
  });

  /* Bugünü işle */
  $("#btn-bugun").addEventListener("click", ()=>{
    const b = new Date();
    if(b.getFullYear()!==aktifYil || b.getMonth()!==aktifAy){
      aktifYil=b.getFullYear(); aktifAy=b.getMonth(); ayiYukle();
    }
    modalAc(tarihId(b));
  });

  /* Modal */
  $("#modal-perde").addEventListener("click", ()=>{
    modalKapat();
    $("#toplu-modal").classList.remove("acik");
    $("#kur-modal").classList.remove("acik");
    $("#donem-modal").classList.remove("acik");
    $("#ay-modal").classList.remove("acik");
    $("#is-giris-modal").classList.remove("acik");
    $("#is-cikis-modal").classList.remove("acik");
    $("#is-detay-modal").classList.remove("acik");
    $("#modal-perde").classList.remove("acik");
  });
  $$(".durum-secim button").forEach(b=>{
    b.addEventListener("click", ()=>{ modalDurum=b.dataset.durum; durumButonYenile(); });
  });
  $("#mesai-arti").addEventListener("click", ()=>{
    $("#mesai-saat").value = Math.min(SINIR.artiGun, (sayi($("#mesai-saat").value, true)||0) + 0.5);
  });
  $("#mesai-eksi").addEventListener("click", ()=>{
    $("#mesai-saat").value = Math.max(0, (sayi($("#mesai-saat").value, true)||0) - 0.5);
  });
  $("#saat-arti").addEventListener("click", ()=>{
    $("#gun-saat").value = Math.min(16, (sayi($("#gun-saat").value, true)||0) + 0.5);
  });
  $("#saat-eksi").addEventListener("click", ()=>{
    $("#gun-saat").value = Math.max(0, (sayi($("#gun-saat").value, true)||0) - 0.5);
  });
  $("#arti-arti").addEventListener("click", ()=>{
    $("#gun-arti").value = Math.min(9, (sayi($("#gun-arti").value, true)||0) + 0.5);
  });
  $("#arti-eksi").addEventListener("click", ()=>{
    $("#gun-arti").value = Math.max(0, (sayi($("#gun-arti").value, true)||0) - 0.5);
  });
  $("#gece-arti").addEventListener("click", ()=>{
    $("#gun-gece-mesai").value = Math.min(SINIR.artiGun, (sayi($("#gun-gece-mesai").value, true)||0) + 0.5);
  });
  $("#gece-eksi").addEventListener("click", ()=>{
    $("#gun-gece-mesai").value = Math.max(0, (sayi($("#gun-gece-mesai").value, true)||0) - 0.5);
  });

  /* Borç defteri */
  $("#borc-tarih").value = tarihId(new Date());
  $("#btn-borc-ekle").addEventListener("click", async ()=>{
    const kisi = $("#borc-kisi").value.trim();
    const tutar = sinirla(sayi($("#borc-tutar").value), SINIR.tutar, "Borç tutarı", "TL");
    const tarih = $("#borc-tarih").value || tarihId(new Date());
    if(!kisi || !tutar || tutar<=0){ toast("Kişi ve tutarı doldur kanka"); return; }
    /* ÇİFT KAYIT KORUMASI: bu ".add()" ile her tıklamada YENİ, rastgele ID'li
       bir kayıt oluşturuyor (gün kaydı gibi sabit tarih-ID değil) — kullanıcı
       hızlı iki kez basarsa (yavaş bağlantıda "basmadı mı" diye tekrar
       basmak gayet olası) aynı borç iki kez eklenebiliyordu. Düğmeyi işlem
       sürerken devre dışı bırakmak bunu kesin olarak engelliyor. */
    const btn = $("#btn-borc-ekle");
    if(btn.disabled) return;
    btn.disabled = true;
    try{
      await kokRef().collection("borclar").add({
        kisi, tutar, tarih,
        vade: $("#borc-vade").value || "",
        odenen: 0,
        yon: $("#borc-yon").value,
        not: $("#borc-not").value.trim(),
        odendi: false,
        olusturma: firebase.firestore.FieldValue.serverTimestamp()
      });
      $("#borc-kisi").value=""; $("#borc-tutar").value=""; $("#borc-not").value=""; $("#borc-vade").value="";
      toast("Borç kaydedildi 🤝");
    }catch(e){ hataGoster(e); }
    finally{ btn.disabled = false; }
  });

  /* Ay kilidi */
  $("#btn-kilit").addEventListener("click", async ()=>{
    const anahtar = aktifAyAnahtar();
    const kilitli = ayarlar.kapali.includes(anahtar);
    if(!kilitli && !confirm(AYLAR[aktifAy]+" "+aktifYil+" kilitlensin mi? Kilitliyken bu aya kayıt eklenemez, silinemez.")) return;
    try{
      /* Aynı yarış durumu düzeltmesi burada da geçerli: primitive string
         değerler için arrayUnion/arrayRemove'a geçildi. */
      if(kilitli){
        await kokRef().set({kapali: firebase.firestore.FieldValue.arrayRemove(anahtar)},{merge:true});
      }else{
        await kokRef().set({kapali: firebase.firestore.FieldValue.arrayUnion(anahtar)},{merge:true});
      }
      toast(kilitli ? "Ay kilidi açıldı 🔓" : "Ay kilitlendi 🔒");
    }catch(e){ hataGoster(e); }
  });

  /* Yedekten geri yükleme */
  $("#btn-geri-yukle").addEventListener("click", ()=> $("#yedek-dosya").click());
  $("#yedek-dosya").addEventListener("change", e=>{
    const f = e.target.files && e.target.files[0];
    if(f) yedekGeriYukle(f);
    e.target.value = "";
  });
  $("#btn-gun-kaydet").addEventListener("click", async ()=>{
    if(!modalTarih) return;
    if(ayKilitli(modalTarih)){ toast("Bu ay kilitli 🔒 Hesap özetinden açabilirsin"); return; }

    /* ⚠️ SESSİZ SIFIR KORUMASI
       girdiKazanc() mesai kazancını `saat × mesaiUcret` olarak hesaplıyor.
       Mesai ücreti girilmemişse (0) kullanıcı 5 saat mesai yazsa bile kazanç
       0 TL çıkıyor — üstelik hiçbir uyarı verilmiyordu. Gerçek kullanım
       verisinde bunun sonucu net görülüyor: kullanıcı 49 gün işlemiş ama
       HİÇ mesai girmemiş, çünkü girmenin bir karşılığı yok.
       Artık mesai/gece mesaisi yazılıp ücret tanımsızsa, kaydetmeden önce
       uyarılıyor ve doğrudan ayarlara gidebiliyor. */
    /* Mesai artık SAAT ÜCRETİNE değil YEVMİYEYE bağlı (0.0.9.5).
       Eski uyarı "mesai saat ücretin girili değil" diyordu; artık yanlış
       yönlendirme olurdu çünkü mesai yevmiyeden hesaplanıyor.
       Yeni kontrol: yevmiye girili mi? */
    const yazilanMesai = (sayi($("#mesai-saat").value, true)||0) + (sayi($("#gun-gece-mesai").value, true)||0);
    if(yazilanMesai > 0 && !(Number(ayarlar.yevmiye) > 0)){
      const git = confirm(
        "Mesai yazdın ama GÜNLÜK YEVMİYEN girili değil.\n\n" +
        "Mesai, yevmiye üzerinden hesaplanıyor — bu hâliyle kaydedersen 0 ₺ sayılır.\n\n" +
        "Ayarlara gidip yevmiyeni şimdi girmek ister misin?\n" +
        "(İptal dersen mesai 0 ₺ olarak kaydedilir)");
      if(git){ modalKapat(); gorunumSec("ayarlar"); toast("Ücret ayarlarından günlük yevmiyeni gir 👇"); return; }
    }
    const onceki = girdiler[modalTarih] ? {...girdiler[modalTarih]} : null;
    let silinenGunFoto = null;   /* fotoğraf kaldırıldıysa geri alma için */
    const secId = $("#gun-santiye-sec").value || "";
    const s = (ayarlar.santiyeler||[]).find(x=>x.id===secId);
    const saatlikMod = ayarlar.calismaTipi==="saatlik";
    const veri = {
      durum: saatlikMod ? "saatlik" : modalDurum,
      /* Sınırlama (0.0.6.9): eskiden buraya ne yazılsa o kaydediliyordu.
         "999" yazılırsa 999 saat mesai kaydolup hakediş milyonlara çıkıyordu;
         eksi değer de kabul edilip kazancı düşürüyordu. */
      /* Mesai artık yevmiye katı olarak kaydediliyor (0.0.9.5).
         `mesai` (saat) alanı YAZILMIYOR — eski kayıtlarda kalmaya devam
         ediyor ve onların hesabı bozulmuyor, ama yeni kayıtlar
         `mesaiYev` kullanıyor. Sınır: gün içi artı ile aynı (5 yevmiye). */
      mesaiYev: Math.round(sinirla(sayi($("#mesai-saat").value, true), SINIR.artiGun, "Mesai", "yevmiye")*2)/2,
      mesai: 0,
      arti: Math.round(sinirla(sayi($("#gun-arti").value, true), SINIR.artiGun, "Gün içi artı", "yevmiye")*2)/2,
      santiyeId: secId,
      santiye: $("#gun-santiye").value.trim() || (s ? s.ad : (ayarlar.santiye||"")),
      not: $("#gun-not").value.trim(),
      ...guncelOranlar(secId, modalTarih),
      guncelleme: firebase.firestore.FieldValue.serverTimestamp()
    };
    if(saatlikMod) veri.saat = sinirla(sayi($("#gun-saat").value, true), SINIR.calismaSaat, "Çalışma", "saat");
    if((ayarlar.parcaFiyat||0) > 0) veri.parcaMiktar = Math.max(0, sayi($("#gun-parca-miktar").value, true)||0);
    veri.geceYev = Math.round(sinirla(sayi($("#gun-gece-mesai").value, true), SINIR.artiGun, "Gece mesaisi", "yevmiye")*2)/2;
    veri.geceMesai = 0;
    if(gunKonum) veri.konum = gunKonum;
    const bs = $("#gun-bas-saat").value, bts = $("#gun-bit-saat").value;
    if(bs) veri.basSaat = bs;
    if(bts) veri.bitSaat = bts;
    /* foto bayrağı: yeni foto varsa veya eskisi korunuyorsa true */
    const fotoVar = modalFoto===undefined ? !!(onceki && onceki.foto) : !!modalFoto;
    if(fotoVar) veri.foto = true;
    try{
      await kokRef().collection("girdiler").doc(modalTarih).set(veri);
      titret(25);
      if(typeof modalFoto === "string" && modalFoto){
        try{ await kokRef().collection("fotolar").doc(modalTarih).set({veri: modalFoto, guncelleme: firebase.firestore.FieldValue.serverTimestamp()}); }
        catch(fe){ toast("Gün kaydedildi ama fotoğraf kaydedilemedi 😕"); }
      }else if(modalFoto === ""){
        /* Kullanıcı fotoğrafı kaldırdı. Silmeden ÖNCE yedekle ki "GERİ AL"
           onu da geri getirebilsin — eskiden yedeklenmiyordu ve geri alma
           fotoğrafı kurtaramıyordu (0.1.0.7). */
        try{
          const fd = await kokRef().collection("fotolar").doc(modalTarih).get();
          if(fd.exists) silinenGunFoto = fd.data();
        }catch(e){ try{ hataKaydet("gunFotoKaydetYedek", e); }catch(_){} }
        kokRef().collection("fotolar").doc(modalTarih).delete().catch(()=>{});
      }
      try{ localStorage.setItem("sonSantiye", secId); }catch(e){}
      tik();
      modalKapat(); toastGeriAl("Gün kaydedildi ✅", {id:modalTarih, onceki, foto:silinenGunFoto});
      /* ✨ Görsel onay: ortada kısa bir tik damgası + takvimde o hücreyi vurgula.
         Vurgulama takvim yeniden çizildikten sonra çalışmalı, bu yüzden
         gunHucreVurgula içinde requestAnimationFrame ile bir kare bekleniyor. */
      kayitTikGoster();
      gunHucreVurgula(modalTarih);
      anaTazele();
    }catch(e){ hataGoster(e); }
  });
  $("#btn-gun-sil").addEventListener("click", async ()=>{
    if(!modalTarih) return;
    if(ayKilitli(modalTarih)){ toast("Bu ay kilitli 🔒 Hesap özetinden açabilirsin"); return; }
    if(!confirm("Bu günün kaydını silmek istiyor musun?")) return;
    const onceki = girdiler[modalTarih] ? {...girdiler[modalTarih]} : null;
    /* Fotoğrafı silmeden ÖNCE belleğe al ki "GERİ AL" onu da geri getirebilsin */
    let fotoYedek = null;
    let fotoOkunamadi = false;
    if(onceki && onceki.foto){
      try{
        const fd = await kokRef().collection("fotolar").doc(modalTarih).get();
        if(fd.exists) fotoYedek = fd.data();
      }catch(e){
        /* KRİTİK (0.1.0.7): yedek alınamazsa gün YİNE DE siliniyordu ve
           fotoğraf "GERİ AL" ile kurtarılamıyordu — kalıcı kayıp. */
        fotoOkunamadi = true;
        try{ hataKaydet("gunFotoYedek", e); }catch(_){}
      }
    }
    if(fotoOkunamadi){
      toast("⚠️ Gün fotoğrafı okunamadı — kayıt silinmedi. İnternetini kontrol et.");
      return;
    }
    try{
      await kokRef().collection("girdiler").doc(modalTarih).delete();
      kokRef().collection("fotolar").doc(modalTarih).delete().catch(()=>{});
      modalKapat(); toastGeriAl("Kayıt silindi", {id:modalTarih, onceki, foto:fotoYedek});
      anaTazele();
    }catch(e){ hataGoster(e); }
  });

  /* 🎨 Tema */
  function temaUygula(ad){
    if(ad) document.body.dataset.tema = ad;
    else delete document.body.dataset.tema;
    try{ localStorage.setItem("tema", ad||""); }catch(e){}
    document.querySelectorAll("#tema-secim button").forEach(b=>
      b.classList.toggle("secili", (b.dataset.tema||"")===(ad||"")));
  }
  try{
    let kayitliTema = localStorage.getItem("tema")||"";
    if(kayitliTema === "cam") kayitliTema = "";   /* cam kaldırıldı, klasiğe dön */
    temaUygula(kayitliTema);
  }catch(e){ temaUygula(""); }
  /* 🔠 Büyük yazı modu — gözlüğü unutulan günler için */
  function buyukYaziUygula(acik){
    document.documentElement.style.fontSize = acik ? "112%" : "";
    const d = $("#buyuk-yazi-durum");
    if(d) d.textContent = acik ? "açık ✓" : "kapalı";
    try{ localStorage.setItem("buyukYazi", acik ? "1" : "0"); }catch(e){}
  }
  let buyukYazi = false;
  try{ buyukYazi = localStorage.getItem("buyukYazi")==="1"; }catch(e){}
  buyukYaziUygula(buyukYazi);
  $("#btn-buyuk-yazi").addEventListener("click", ()=>{
    buyukYazi = !buyukYazi;
    buyukYaziUygula(buyukYazi);
    tik();
  });
  document.querySelectorAll("#tema-secim button").forEach(b=>
    b.addEventListener("click", ()=>{ temaUygula(b.dataset.tema||""); tik(); }));

  /* ---------- 🤖 USTA ASİSTAN ---------- */
  window.asistanVeri = window.asistanVeri || null;
  window.asistanSelamladi = false;
  const A_SAKALAR = [
    "Ustabaşı çırağa sormuş: \"Beton kaç günde donar?\" Çırak: \"Maaş gününe kadar dayanırsa öğreniriz usta\" 😄",
    "Şantiyede en hızlı koşan kimdir? Yemek molası zili çalınca herkes 🏃💨",
    "İskelede telefonla konuşan işçiye usta bağırmış: \"İn aşağı!\" İşçi: \"Konuşma bitince inerim, çekmiyor aşağıda\" 📶😅",
    "Patron: \"Bu duvar eğri olmuş.\" Usta: \"Duvar düz patron, bina yamuk\" 🧱"
  ];
  const A_SOZLER = [
    "Alın teri en helal paradır. Sen döktüğünün karşılığını sonuna kadar hak ediyorsun 💪",
    "Bugün yorulduysan, yarın o yorgunluğun karşılığı cebine girecek. Devam usta! 🔨",
    "Koca binalar tuğla tuğla yükselir — senin birikimin de gün gün. Sabır 🏗️",
    "Çalışan demir ışıldar. Sen de bugün ışıldadın usta ✨"
  ];
  const rasgeleSec = d => d[Math.floor(Math.random()*d.length)];
  function asistanAd(){
    return (kullanici && kullanici.displayName) ? kullanici.displayName.split(" ")[0] : "patron";
  }
  async function asistanCevap(ham){
    /* "alacagim" da "alacağım" da anlaşılsın diye harfleri düzleştir */
    const duz = t => t.toLocaleLowerCase("tr")
      .replace(/ı/g,"i").replace(/ğ/g,"g").replace(/ü/g,"u")
      .replace(/ş/g,"s").replace(/ö/g,"o").replace(/ç/g,"c");
    const s = " " + duz(ham).replace(/[?!.,;:]/g," ").replace(/\s+/g," ") + " ";
    const ic = (...k) => k.some(x => s.indexOf(duz(x)) > -1);
    const oz = sirketOzet || {hakedis:0, alinan:0};
    const ist = tumIstatistik || {};
    const av = asistanVeri || {};
    const kalan = (oz.hakedis||0) - (oz.alinan||0);
    const ad = asistanAd();
    const simdi = new Date();

    if(ic("kaç para alacağım","ne kadar alacağım","alacağım ne","kalan para","alacak","kaç param","param ne kadar")){
      let m = kalan > 0
        ? "Toplamda (tüm aylar dahil) şirketten alacağın " + paraFmt(kalan) + " " + ad + " 💰 (Toplam hakediş " + paraFmt(oz.hakedis) + ", aldığın " + paraFmt(oz.alinan) + "). Hangi ayın eksik olduğunu görmek için Maaşlar'a bak."
        : kalan === 0
        ? "Şu an alacağın görünmüyor, hesap sıfır — aldıkların hakedişini karşılamış."
        : "Dikkat: aldığın para hakedişinden " + paraFmt(Math.abs(kalan)) + " fazla görünüyor. Avans borcun var demektir 😬";
      if(kalan > 0 && kurVeri && (kurVeri.usd>0 || kurVeri.gram>0)){
        const p = [];
        if(kurVeri.usd>0) p.push("≈ " + Math.round(kalan/kurVeri.usd).toLocaleString("tr-TR") + " dolar");
        if(kurVeri.gram>0) p.push((kalan/kurVeri.gram).toLocaleString("tr-TR",{maximumFractionDigits:1}) + " gram altın");
        m += "\nYani " + p.join(" ya da ") + " 📈";
      }
      return m;
    }
    if(ic("bu ay") && ic("gün","çalış","kazan","yaptım")){
      if(!(av.buAyGun>0)) return "Bu ay henüz işlenmiş günün yok " + ad + ". Takvimden işleyelim mi? 📅";
      return "Bu ay " + av.buAyGun + " yevmiye çalıştın, " + (av.buAyMesai>0 ? av.buAyMesai + " saat de mesain var, " : "") + "hakedişin " + paraFmt(av.buAyHak) + " 💪";
    }
    if(ic("toplam") && ic("gün","çalış")) 
      return "Baştan beri toplam " + (ist.gunToplam||0) + " yevmiye çalışmışsın, " + (ist.mesaiToplam||0) + " saat mesai yapmışsın. Toplam hakedişin " + paraFmt(oz.hakedis) + " 🏗️";
    if(ic("mesai"))
      return "Bu ay " + (av.buAyMesai||0) + " saat mesai yapmışsın" + ((ist.mesaiToplam||0)>0 ? ", baştan beri toplam " + ist.mesaiToplam + " saat" : "") + " ⏰";
    if(ic("avans","aldığım para","ne kadar aldım"))
      return "Şirketten bugüne kadar toplam " + paraFmt(oz.alinan) + " almışsın (avans + ödemeler). Kalan alacağın " + paraFmt(kalan) + " 💵";
    if(ic("dolar","altın","kur","euro")){
      const k = await kurGetir();
      if(!k || !(k.usd>0)) return "Kurlara şu an ulaşamadım, internet gelince tekrar sor " + ad + " 📡";
      let m = "Dolar şu an ≈ " + k.usd.toLocaleString("tr-TR",{maximumFractionDigits:2}) + " ₺";
      if(k.gram>0) m += ", gram altın ≈ " + Math.round(k.gram).toLocaleString("tr-TR") + " ₺";
      if(kalan>0) m += ".\nSenin alacağın " + Math.round(kalan/k.usd).toLocaleString("tr-TR") + " dolar ediyor 💰";
      return m;
    }
    if(ic("yevmiye") && ic("ne kadar","kaç","benim"))
      return ayarlar.yevmiye>0
        ? "Günlük yevmiyen " + paraFmt(ayarlar.yevmiye) + (ayarlar.ekGunluk>0 ? " + " + paraFmt(ayarlar.ekGunluk) + " yol/yemek" : "") + " olarak kayıtlı ⚙️"
        : "Yevmiyen henüz girili değil! Ayarlar → Ücret ayarları'ndan gir ki hesabını tutayım.";
    if(ic("hedef")){
      if(!(ayarlar.hedef>0)) return "Aylık hedef koymamışsın. Ayarlar'dan bir hedef gir, ben de takip edeyim 🎯";
      const y = Math.round((av.buAyHak||0)/ayarlar.hedef*100);
      return "Bu ayki hedefin " + paraFmt(ayarlar.hedef) + ". Şu an " + paraFmt(av.buAyHak||0) + " yaptın, yani %" + y + " tamam. " + (y>=100 ? "Hedef bitti, helal olsun! 🎉" : "Devam usta 💪");
    }
    if(ic("tahmin","ay sonu","ay sonunda")){
      const gecen = simdi.getDate(), ayG = new Date(simdi.getFullYear(), simdi.getMonth()+1, 0).getDate();
      if(!(av.buAyHak>0) || gecen<5) return "Tahmin için biraz erken, birkaç gün daha işle de tempoyu göreyim 🔮";
      /* Düz hesap (0.1.3.4) — ortalama değil: bugüne kadarki hakediş +
         kalan iş günü × günlük yevmiye. Pazarlar sayılmıyor. */
      let kalanIs = 0;
      for(let g=gecen+1; g<=ayG; g++){
        if(new Date(simdi.getFullYear(), simdi.getMonth(), g).getDay() !== 0) kalanIs++;
      }
      const tah = (av.buAyHak||0) + kalanIs * (Number(ayarlar.yevmiye)||0);
      return "🔮 Her gün çalışırsan " + AYLAR[simdi.getMonth()] + " sonunda ≈ " + paraFmt(tah) +
             " hakediş yaparsın (" + kalanIs + " iş günü kaldı).";
    }
    if(ic("izin","tatil hakkı"))
      return ayarlar.iseGiris
        ? "İzin hesabın Araçlar sayfasında hazır duruyor " + ad + " — kıdemine göre hakkını ve kalanını orada görürsün 🏖️"
        : "İşe giriş tarihini Ayarlar'a girersen yıllık izin hakkını hesaplarım 🏖️";
    if(ic("kart borc","kart borç","kredi kart")){
      if(!kartlar.length) return "Kayıtlı kredi kartın yok " + ad + " — takip istersen menüden 💳 Kredi kartlarım'a ekle.";
      const top = kartlar.reduce((t2,k)=> t2 + (Number(k.borc)||0), 0);
      const borclu = kartlar.filter(k=> (Number(k.borc)||0) > 0).sort((a,b)=> kartGunKalan(a.gun) - kartGunKalan(b.gun));
      if(!borclu.length) return "Kart borcun SIFIR " + ad + " 🎉 Böyle devam!";
      const y = borclu[0];
      return "Toplam kart borcun: " + paraFmt(top) + "\nEn yakın son ödeme: " + y.ad + " — " + (kartGunKalan(y.gun)===0 ? "BUGÜN!" : kartGunKalan(y.gun)+" gün kaldı") + " 💳";
    }
    if(ic("kan grubu","kan grubum")){
      const a2 = ayarlar.acil||{};
      return a2.kan
        ? "Kan grubun kayıtlı: <b>"+a2.kan+"</b> 🩸 Acil kartın Araçlar'da, tam ekran gösterebilirsin."
        : "Kan grubun kayıtlı değil " + ad + " — Araçlar → Acil Durum Kartı'na yaz, şantiyede hayat kurtarır 🆘";
    }
    if(ic("güvenli","guvenli","baret","iskele","kkd"))
      return "İş güvenliği candır " + ad + " 🦺 Araçlar → İş Güvenliği Köşesi'nde hayat kurtaran 8 kural var. Unutma: baret/kemer/kulaklık işverenin ÜCRETSİZ vermek zorunda olduğu haklardır; güvensiz işi reddetme hakkın kanunla korunur (6331/13).";
    if(ic("kaza","iş kazası","is kazasi"))
      return "Geçmiş olsun " + ad + " 🙏 Araçlar → İş Kazası Defteri'ne hemen kaydet: ne oldu, tanıklar, rapor. Unutma: kazayı SGK'ya bildirmek İŞVERENİN görevi (3 iş günü) — bildirmezse ALO 170'i arayabilirsin.";
    if(ic("borç","borc","kime para","alacaklarım","alacaklarim")){
      const acikV = borclar.filter(b=> b.yon==="verdim" && !b.odendi);
      const acikA = borclar.filter(b=> b.yon==="aldim" && !b.odendi);
      if(!acikV.length && !acikA.length) return "Borç defterin tertemiz " + ad + ", ne borcun var ne alacağın 👏";
      const tV = acikV.reduce((t2,b)=> t2+borcKalan(b), 0);
      const tA = acikA.reduce((t2,b)=> t2+borcKalan(b), 0);
      let m = "";
      if(acikV.length) m += "Alacağın: " + paraFmt(tV) + " (" + acikV.slice(0,3).map(b=>b.kisi).join(", ") + (acikV.length>3 ? " +"+(acikV.length-3) : "") + ")";
      if(acikA.length) m += (m?"\n":"") + "Borcun: " + paraFmt(tA) + " (" + acikA.slice(0,3).map(b=>b.kisi).join(", ") + ")";
      const geciken = acikV.filter(b=> b.vade && b.vade < tarihId(simdi)).length;
      if(geciken) m += "\n⚠️ " + geciken + " alacağının vadesi geçmiş, hatırlatma zamanı!";
      return m;
    }
    if(ic("masraf")){
      const acik = masraflar.filter(m2=> !m2.odendi);
      const top = acik.reduce((t2,m2)=> t2 + (Number(m2.tutar)||0), 0);
      return acik.length
        ? "Bu ay patrondan " + paraFmt(top) + " masraf alacağın var (" + acik.length + " kalem) 🧾"
        : "Bu ay bekleyen masraf alacağın yok " + ad + " ✨";
    }
    {
      const komut = sesKomutCoz(soru);
      if(komut){
        const bugunId2 = tarihId(simdi);
        if(girdiler[bugunId2]){
          const e2 = {tam:"tam", yarim:"yarım", gelmedi:"gelmedin", izin:"izinli", saatlik:"saatlik"};
          return "Bugün zaten işli (" + (e2[girdiler[bugunId2].durum]||"") + ") " + ad + " — değiştirmek istersen takvimden güne dokun ✏️";
        }
        try{
          const veri = {
            durum: komut.durum, mesai: komut.mesai, arti: 0,
            santiye: ayarlar.santiye||"", santiyeId: "", not: "",
            ...guncelOranlar("", bugunId2),
            guncelleme: firebase.firestore.FieldValue.serverTimestamp()
          };
          if(ayarlar.calismaTipi === "saatlik" && komut.durum === "tam"){
            veri.durum = "saatlik"; veri.saat = ayarlar.gunlukSaat||8;
          }
          await kokRef().collection("girdiler").doc(bugunId2).set(veri);
          anaTazele();
          const e3 = {tam:"tam yevmiye ✅", yarim:"yarım yevmiye 🌗", gelmedi:"gelmedin 🚫", izin:"izinli 🏖️", saatlik:"saatlik ⏱️"};
          return "İşledim usta! Bugün: " + (e3[veri.durum]||veri.durum) +
                 (komut.mesai > 0 ? " + " + komut.mesai + " saat mesai 💪" : "") +
                 "\nKonuşarak puantaj — bu devirde böyle 😎";
        }catch(e){ return "İşleyemedim " + ad + " 😕 İnterneti kontrol edip tekrar dene."; }
      }
    }
    if(ic("bugünü işledim mi","bugün işledim mi","bugunu isledim","bugün işli")){
      const v = girdiler[tarihId(simdi)];
      if(!v) return "Bugün henüz işlenmemiş " + ad + "! Ana ekrandan \"Bugünü işle\"ye bas, unutma 📅";
      const e = {tam:"tam yevmiye ✅", yarim:"yarım yevmiye 🌗", gelmedi:"gelmedin 🚫", izin:"izinli 🏖️", saatlik:"saatlik ⏱️"};
      return "Bugün işli: " + (e[v.durum]||v.durum) + (Number(v.mesai)>0 ? " + " + v.mesai + " saat mesai 💪" : "");
    }
    if(ic("rozet","başarım","basarim")){
      const acik = ROZETLER.filter(r=> { try{ return r.t(tumIstatistik||{}); }catch(e){ return false; } }).length;
      return acik + " / " + ROZETLER.length + " rozet açtın " + ad + " 🏅 Kalanların ne kadar yaklaştığını Başarımlar sayfasında çubuklarda görürsün.";
    }
    if(ic("maaş","maas")){
      const kg = maasKacGun(ayarlar.maasGunu, simdi);
      if(kg===null) return "Maaş gününü bilmiyorum " + ad + " — Ayarlar'a ayın kaçında maaş aldığını yaz, geri sayayım 💸";
      if(kg===0) return "🎉 Bugün maaş günü " + ad + "! Hayırlı olsun. Parayı alınca Paralar bölümüne işlemeyi unutma 💸";
      return "Maaş gününe " + kg + " gün var " + ad + " 💸 Sabır, geliyor!";
    }
    if(ic("youtube","video aç","film izle","video izle"))
      return "Menüde ▶️ Video var " + ad + " — ara, uygulamanın içinde izle. Dışarı yönlendirme yok 🎬";
    if(ic("televizyon"," tv ","kanal aç","maç hangi kanal","canlı yayın","canli yayin"))
      return "Menüde 📺 Canlı TV var " + ad + " — kanala dokun, yayın resmi sitesinde açılır. Maç için Spor bölümüne bak ⚽";
    if(ic("haber","gündem","gundem","son dakika"))
      return "Gündemi menüdeki 📰 Gündem sayfasına koydum " + ad + " — Türkiye, dünya ve ekonomi haberleri gazete gibi orada, canlı geliyor 🗞️";
    if(ic("saat kaç")) return "Saat " + simdi.getHours() + ":" + String(simdi.getMinutes()).padStart(2,"0") + " ⌚";
    if(ic("bugün günlerden","hangi gün","tarih ne"))
      return "Bugün " + simdi.getDate() + " " + AYLAR[simdi.getMonth()] + " " + simdi.getFullYear() + ", " + GUNLER[simdi.getDay()] + " 📅";
    if(ic("güldür","şaka","fıkra","komik")) return rasgeleSec(A_SAKALAR);
    if(ic("motivasyon","moral","yorgun","söz söyle","güzel söz")) return rasgeleSec(A_SOZLER);
    if(ic("selam","merhaba","naber","nasılsın","günaydın","iyi akşam","hoş","sea","slm"))
      return rasgeleSec([
        "Oooo " + ad + "! 👋 Hoş geldin. Hesap kitap ne varsa sor bana.",
        "Selam usta! 🤖 Bugün de buradayım, sor bakalım.",
        "Hoş geldin " + ad + "! İşler nasıl gidiyor? Alacağını mı öğrenmek istersin, tahmin mi yapayım?"
      ]);
    if(ic("teşekkür","sağol","eyvallah","helal"))
      return rasgeleSec(["Ne demek " + ad + ", her zaman 🤝","Eyvallah usta, iyi çalışmalar! 💪","Rica ederim, ben buradayım 🤖"]);
    if(ic("kimsin","nesin","ne yapabilirsin","yardım","neler bilirsin"))
      return "Ben Usta 🤖 — bu uygulamanın asistanıyım. Şunları sorabilirsin:\n• Ne kadar alacağım?\n• Bu ay kaç gün çalıştım?\n• Bugünü işledim mi?\n• Kime borcum/alacağım var?\n• Masraflarım ne durumda?\n• Dolar/altın ne kadar?\n• Maaşa kaç gün var?\n• Beni güldür 😄";
    return rasgeleSec([
      "Bunu tam çözemedim " + ad + " 😅 Ama hesap sorularında ustayım — mesela \"ne kadar alacağım\" ya da \"bu ay kaç gün çalıştım\" de.",
      "Hmm, bu benim alanın dışında usta. Para, gün, mesai, kur, tahmin... bunları sor, anında söylerim 🤖"
    ]);
  }
  /* Panel akışı */
  let asistanIlkAcilis = true;
  function asistanMesaj(kim, metin, yazarak){
    const kap = $("#asistan-mesajlar");
    const d = document.createElement("div");
    d.className = "a-msg " + kim;
    kap.appendChild(d);
    if(yazarak && !AZ_HAREKET){
      let i = 0;
      const yaz = ()=>{
        d.textContent = metin.slice(0, ++i);
        kap.scrollTop = kap.scrollHeight;
        if(i < metin.length) setTimeout(yaz, 14);
      };
      yaz();
    }else{
      d.textContent = metin;
      kap.scrollTop = kap.scrollHeight;
    }
  }
  async function asistanSor(soru){
    if(!soru) return;
    asistanMesaj("ben", soru, false);
    const cevap = await asistanCevap(soru);
    asistanMesaj("bot", cevap, true);
  }
  $("#asistan").addEventListener("click", ()=>{
    geriKaydet();
    $("#asistan-balon").classList.add("gizli");
    $("#asistan-panel").classList.remove("gizli");
    if(asistanIlkAcilis){
      asistanIlkAcilis = false;
      asistanMesaj("bot", "Oooo hoş geldin " + asistanAd() + "! 👷 Ben Usta, senin asistanın. Hesabını ezbere bilirim — aşağıdan seç ya da yaz, anında söylerim.", true);
      const cipler = ["Ne kadar alacağım?","Bu ay kaç gün çalıştım?","Dolar ne kadar?","Ay sonu tahminin ne?","Beni güldür 😄"];
      $("#asistan-cipler").innerHTML = "";
      cipler.forEach(c=>{
        const b = document.createElement("button");
        b.textContent = c;
        b.addEventListener("click", ()=> asistanSor(c));
        $("#asistan-cipler").appendChild(b);
      });
    }
  });
  $("#asistan-kapat").addEventListener("click", ()=> $("#asistan-panel").classList.add("gizli"));
  $("#asistan-gonder").addEventListener("click", ()=>{
    const g = $("#asistan-soru");
    const soru = g.value.trim(); g.value = "";
    asistanSor(soru);
  });
  $("#asistan-soru").addEventListener("keydown", e=>{
    if(e.key === "Enter"){ e.preventDefault(); $("#asistan-gonder").click(); }
  });

  /* İş fotoğrafı olayları */
  $("#btn-foto-ekle").addEventListener("click", ()=> $("#gun-foto-sec").click());
  $("#gun-foto-sec").addEventListener("change", async e=>{
    const dosya = e.target.files && e.target.files[0];
    e.target.value = "";
    if(!dosya) return;
    $("#gun-foto-durum").textContent = "Fotoğraf küçültülüyor...";
    try{
      const url = await fotoSikistir(dosya);
      modalFoto = url;
      fotoOnizleGoster(url);
      $("#gun-foto-durum").textContent = "👍 Kaydet'e basınca fotoğraf da kaydedilir";
    }catch(err){
      $("#gun-foto-durum").textContent = "Fotoğraf eklenemedi" + (err && err.message ? " ("+err.message+")" : "") + ", başka fotoğraf dene";
    }
  });
  $("#btn-foto-sil").addEventListener("click", ()=>{
    modalFoto = "";
    $("#gun-foto-onizle").classList.add("gizli");
    $("#btn-foto-sil").classList.add("gizli");
    $("#gun-foto-durum").textContent = "Kaydet'e basınca fotoğraf silinecek";
  });
  $("#gun-foto-onizle").addEventListener("click", ()=>{
    geriKaydet();
    const b = $("#foto-buyuk");
    b.querySelector("img").src = $("#gun-foto-onizle").src;
    b.style.display = "flex";
  });
  $("#foto-buyuk").addEventListener("click", ()=>{ $("#foto-buyuk").style.display = "none"; });

  /* Dönem seçimli paylaşım (Paylaş / PDF) */
  let donemMod = "paylas";
  const donemAc = mod=>{
    donemMod = mod;
    $("#donem-baslik").textContent = mod==="pdf" ? "🖨️ PDF dönemi" : mod==="png" ? "🖼️ Görsel dönemi" : "📤 Paylaşım dönemi";
    $("#donem-wp").classList.toggle("gizli", mod!=="pdf");   /* png/paylaş modlarında üstteki 3 seçenek zaten direkt paylaşıyor, tekrar olmasın */
    geriKaydet();
    $("#modal-perde").classList.add("acik");
    $("#donem-modal").classList.add("acik");
  };
  const donemSec = (b,s)=>{
    $("#modal-perde").classList.remove("acik");
    $("#donem-modal").classList.remove("acik");
    $("#ay-modal").classList.remove("acik");
    if(donemMod==="pdf") pdfYazdir(b,s);
    else if(donemMod==="png") gorselPaylas(b,s);
    else raporPaylas(b,s);
  };
  $("#donem-tum").addEventListener("click", ()=> donemSec(null,null));
  $("#donem-ilk").addEventListener("click", ()=> donemSec(1,15));
  $("#donem-ikinci").addEventListener("click", ()=> donemSec(16,null));
  $("#donem-wp").addEventListener("click", ()=>{
    $("#modal-perde").classList.remove("acik");
    $("#donem-modal").classList.remove("acik");
    if(donemMod==="pdf") pdfPaylas(null,null);   /* PDF modundayken gerçek PDF DOSYASI paylaşılır */
    else raporPaylas(null,null);                  /* diğer modlarda kısa metin özeti paylaşılır */
  });

  /* Canlı kazanç güncelleme kancaları */
  ["mesai-saat","gun-saat","gun-arti","gun-gece-mesai"].forEach(id=>
    $("#"+id).addEventListener("input", modalKazancGuncelle));
  ["mesai-arti","mesai-eksi","saat-arti","saat-eksi","arti-arti","arti-eksi","gece-arti","gece-eksi"].forEach(id=>
    $("#"+id).addEventListener("click", modalKazancGuncelle));
  $("#gun-santiye-sec").addEventListener("change", modalKazancGuncelle);
  $$(".durum-secim button").forEach(b=> b.addEventListener("click", modalKazancGuncelle));

  /* Hızlı tutar çipleri */
  $$(".tutar-cip").forEach(c=>{
    c.addEventListener("click", ()=>{
      $("#"+c.dataset.hedef).value = c.dataset.deger;
    });
  });

  /* Neler yeni kartı */
  const YENILIK_SURUM = "0.1.3.4";
  window.__SURUM = YENILIK_SURUM;   /* tanı raporu bunu okur */
  try{ $("#cekmece-surum").textContent = "Puantaj Defterim " + YENILIK_SURUM; }catch(e){}
  /* Sürümü çekmece başlığında da göster. Sebep: "değişiklik gelmedi" durumunda
     ilk sorulacak soru "hangi sürüm çalışıyor?" — bunu bulmak için menüyü açıp
     en alta kaydırmak gerekiyordu. Artık profil bloğunda, göz hizasında. */
  try{
    const bas = document.querySelector(".cekmece-bas");
    if(bas && !document.getElementById("cekmece-surum-rozet")){
      const r = document.createElement("div");
      r.id = "cekmece-surum-rozet";
      r.textContent = "v" + YENILIK_SURUM;
      bas.appendChild(r);
    }
  }catch(e){}

  /* 🔧 GİZLİ GİRİŞ — çekmecedeki sürüm yazısına arka arkaya 5 kez dokun.
     Neden gerekli: tanı menüsü `sabitler.js` içindeki TANI_YETKILI listesine
     bakıyor. Oraya e-postanı yazmayı unutursan ya da yanlış yazarsan menü
     hiç görünmüyor ve HİÇBİR UYARI ÇIKMIYOR — sessiz başarısızlık, kötü tasarım.
     Bu kapı her zaman açık: 5 dokunuşta tanı ekranı açılır ve rapor sana
     GERÇEK e-postanı söyler, böylece dosyaya ne yazacağını görürsün.
     Güvenlik açığı değil: tanı yalnızca giriş yapmış kullanıcının kendi
     verisini okur, hiçbir şey yazmaz. */
  try{
    let dokunusSayaci = 0, sonDokunus = 0;
    $("#cekmece-surum").addEventListener("click", ()=>{
      const simdi = Date.now();
      dokunusSayaci = (simdi - sonDokunus < 900) ? dokunusSayaci + 1 : 1;
      sonDokunus = simdi;
      if(dokunusSayaci >= 5){
        dokunusSayaci = 0;
        const li = document.getElementById("menu-tani-li");
        if(li) li.classList.remove("gizli");
        titret(20);
        toast("🔧 Tanı ekranı açıldı");
        gorunumSec("tani");
      }else if(dokunusSayaci >= 3){
        toast((5 - dokunusSayaci) + " dokunuş kaldı…");
      }
    });
  }catch(e){}
  /* Yenilikler artık TAM EKRAN gösteriliyor.
     Eskiden ana ekranda bir karttı ve kullanıcı aşağı kaydırmazsa hiç
     görmüyordu — yani yapılan onca güncelleme kullanıcıya ulaşmıyordu.
     Artık güncellemeden sonraki ilk açılışta ekranı kaplıyor.

     İçerik `#yenilik-kart` içindeki listeden KOPYALANIYOR; böylece her
     sürümde tek bir yerde (o kart) düzenleme yapmak yeterli oluyor,
     iki ayrı yerde aynı metni tutmak gerekmiyor. Kart ise gizli kalıyor
     ve "Neler yeni" penceresini sonradan tekrar açmak için kaynak
     görevi görüyor. */
  let yenilikGoster = true;
  try{ yenilikGoster = localStorage.getItem("yenilik") !== YENILIK_SURUM; }catch(e){}
  if(yenilikGoster) yenilikTamAc(YENILIK_SURUM);
  $("#btn-yenilik-kapat").addEventListener("click", ()=>{
    $("#yenilik-kart").classList.add("gizli");
    try{ localStorage.setItem("yenilik", YENILIK_SURUM); }catch(e){}
  });
  /* Tam ekran pencerenin kapatma düğmesi */
  $("#btn-yenilik-tam-kapat").addEventListener("click", yenilikTamKapat);

  /* ---- Ay seçici ---- */
  const ayModalAc = ()=>{
    seciciYil = aktifYil;
    $("#sec-yil").textContent = seciciYil;
    const kap = $("#sec-aylar");
    kap.innerHTML = "";
    AYLAR.forEach((ad,i)=>{
      const b = document.createElement("button");
      b.className = "btn btn-cizgili";
      b.style.cssText = "padding:12px 4px;font-size:13.5px" +
        (i===aktifAy && seciciYil===aktifYil ? ";border-color:var(--sari);color:var(--sari)" : "");
      b.textContent = ad.slice(0,3);
      b.addEventListener("click", ()=>{
        aktifYil = seciciYil; aktifAy = i;
        $("#modal-perde").classList.remove("acik");
        $("#ay-modal").classList.remove("acik");
        if(aktifGoruntu==="yil"){ $("#ay-ad").firstChild.textContent = aktifYil; yilYukle(); }
        else { ayiYukle(); ayBarCiz(); }
      });
      kap.appendChild(b);
    });
    geriKaydet();
    $("#modal-perde").classList.add("acik");
    $("#ay-modal").classList.add("acik");
  };
  $("#sec-onceki-yil").addEventListener("click", ()=>{ seciciYil--; $("#sec-yil").textContent = seciciYil; });
  $("#sec-sonraki-yil").addEventListener("click", ()=>{ seciciYil++; $("#sec-yil").textContent = seciciYil; });
  $("#btn-sec-bugun").addEventListener("click", ()=>{
    const b = new Date();
    aktifYil = b.getFullYear(); aktifAy = b.getMonth();
    $("#modal-perde").classList.remove("acik");
    $("#ay-modal").classList.remove("acik");
    ayiYukle(); ayBarCiz();
    toast("Bugüne dönüldü 📅");
  });

  /* ---- Ödeme filtre çipleri ---- */
  $$("#odeme-filtre button").forEach(b=>{
    b.addEventListener("click", ()=>{
      odemeFiltre = b.dataset.f;
      /* Seçili filtre eskiden yalnızca kenarlık rengiyle belirtiliyordu —
         sarı ince bir çizgi, dar ekranda fark edilmiyordu. Üstelik HTML'de
         `secili-f` diye bir sınıf vardı ama JS onu HİÇ kullanmıyordu, yani
         "Tümü" düğmesi sen başka filtre seçsen bile seçili görünüyordu.
         Artık sınıf üzerinden yönetiliyor ve dolgu rengiyle belli oluyor. */
      $$("#odeme-filtre button").forEach(x=> x.classList.toggle("secili-f", x===b));
      odemeListesiCiz();
    });
  });

  /* ---- Kazanç simülatörü ---- */
  const simGuncelle = ()=>{
    const gun = sayi($("#sim-gun").value)||0;
    const mesai = sayi($("#sim-mesai").value)||0;
    let kazanc;
    if(ayarlar.calismaTipi==="saatlik"){
      kazanc = gun*(ayarlar.gunlukSaat||8)*(ayarlar.saatUcret||0) + mesai*ayarlar.mesaiUcret + gun*(ayarlar.ekGunluk||0);
    }else{
      kazanc = gun*ayarlar.yevmiye + mesai*ayarlar.mesaiUcret + gun*(ayarlar.ekGunluk||0);
    }
    $("#sim-sonuc").textContent = paraFmt(kazanc);
  };
  $("#sim-gun").addEventListener("input", simGuncelle);
  $("#sim-mesai").addEventListener("input", simGuncelle);
  setTimeout(simGuncelle, 1500);

  /* ---- Takvim para modu ---- */
  try{ takvimPara = localStorage.getItem("takvimPara")==="1"; }catch(e){}
  const takvimModYaz = ()=>{
    $("#btn-takvim-mod").textContent = takvimPara ? "✓ İşaretleri göster" : "₺ Kazançları göster";
  };
  takvimModYaz();
  $("#btn-takvim-mod").addEventListener("click", ()=>{
    takvimPara = !takvimPara;
    try{ localStorage.setItem("takvimPara", takvimPara?"1":"0"); }catch(e){}
    takvimModYaz();
    takvimCiz();
  });

  /* ---- Bu haftayı paylaş ---- */
  $("#btn-hafta-paylas").addEventListener("click", async ()=>{
    const b = new Date();
    const pzt = new Date(b); pzt.setDate(b.getDate() - ((b.getDay()+6)%7));
    let satir = "", gun=0, mesai=0, kazanc=0;
    for(let i=0;i<7;i++){
      const d = new Date(pzt); d.setDate(pzt.getDate()+i);
      const v = girdiler[tarihId(d)];
      const isr = gunIsaret(v);
      satir += GUNLER_KISA[i]+" "+pad(d.getDate())+": "+(isr.yev||"0")+(isr.mesai&&isr.mesai!=="0"?" +"+isr.mesai+" mesai":"")+"\n";
      if(v){ gun += girdiGun(v); mesai += Number(v.mesai)||0; kazanc += girdiKazanc(v); }
    }
    const metin = "📆 *BU HAFTA* — "+((kullanici&&kullanici.displayName)||"")+"\n```\n"+satir+"```\n"+
      "✅ "+gun+" gün · ⏱ "+mesai+" saat mesai\n💰 Kazanç: "+paraFmt(kazanc);
    try{
      if(navigator.share) await navigator.share({text:metin});
      else{ await navigator.clipboard.writeText(metin); toast("Hafta raporu kopyalandı 📋"); }
    }catch(e){}
  });


  /* ---- PIN kilidi: ZORUNLU, 6 haneli, banka uygulaması tarzı ----
     pinEkraniHazirla() artık uygulama her açıldığında (onAuthStateChanged
     içinden) çağrılıyor — PIN yoksa "oluştur" akışını, varsa "gir" akışını
     zorunlu olarak gösteriyor. Kullanıcı doğru PIN girmeden/oluşturmadan
     #ekran-uygulama'nın altındaki hiçbir şeye erişemiyor (tam ekran, z-index
     9000 üstte duruyor). */
  let pinGirilen = "", pinIlkGiris = "", pinModu = "gir", pinDegistiriliyor = false;

  /* ---- "Video gibi" hafif Canvas arka planı ----
     Gerçek bir video dosyası eklemek (birkaç MB) düşük bütçeli telefonlarda/
     zayıf internette ağır olurdu — bunun yerine birkaç yumuşak, yavaşça
     dönen sıcak ışık lekesi çiziliyor. Neredeyse hiç pil/veri tüketmiyor,
     ama arka plan artık düz siyah durmuyor. */
  (function pinArkaPlanBaslat(){
    const cv = document.getElementById("pin-arka-canvas");
    if(!cv || !cv.getContext) return;
    const ctx = cv.getContext("2d");
    let boyutlandirildi = false;
    function boyutAyarla(){
      cv.width = window.innerWidth; cv.height = window.innerHeight; boyutlandirildi = true;
    }
    window.addEventListener("resize", boyutAyarla);
    const lekeler = [
      {x:.25, y:.2, r:.55, renk:"255,196,0", hiz:.00025, faz:0},
      {x:.75, y:.55, r:.6, renk:"228,87,46", hiz:.00019, faz:2},
      {x:.5, y:.85, r:.5, renk:"63,178,127", hiz:.00022, faz:4},
    ];
    function cizArkaPlan(zaman){
      if(!boyutlandirildi) boyutAyarla();
      /* PIN ekranı kapalıyken boşuna çizmeyip GPU/pil tasarrufu yapıyoruz */
      if($("#pin-ekran").classList.contains("acik")){
        const w = cv.width, h = cv.height;
        ctx.fillStyle = "#0A0B0D"; ctx.fillRect(0,0,w,h);
        ctx.globalCompositeOperation = "lighten";
        lekeler.forEach(l=>{
          const dx = Math.sin(zaman*l.hiz + l.faz)*.12, dy = Math.cos(zaman*l.hiz*.8 + l.faz)*.10;
          const cx = (l.x+dx)*w, cy = (l.y+dy)*h, r = l.r*Math.max(w,h);
          const g = ctx.createRadialGradient(cx,cy,0,cx,cy,r);
          g.addColorStop(0, "rgba("+l.renk+",.16)");
          g.addColorStop(1, "rgba("+l.renk+",0)");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
        });
        ctx.globalCompositeOperation = "source-over";
      }
      requestAnimationFrame(cizArkaPlan);
    }
    requestAnimationFrame(cizArkaPlan);
  })();

  window.pinEkraniHazirla = function(degistirMi){
    pinDegistiriliyor = !!degistirMi;
    let pin = null;
    try{ pin = localStorage.getItem("pin"); }catch(e){}
    pinGirilen = ""; pinIlkGiris = "";
    const saat = new Date().getHours();
    const selamMetni = saat<6 ? "İyi geceler," : saat<12 ? "Günaydın," : saat<18 ? "İyi günler," : "İyi akşamlar,";
    const ad = (kullanici && kullanici.displayName) || "";
    $("#pin-selam").textContent = selamMetni;
    $("#pin-baslik-ad").textContent = ad || "İşçi kardeşim";
    if(ayarlar && ayarlar.profilFoto){
      $("#pin-avatar").style.backgroundImage = "url("+ayarlar.profilFoto+")";
      $("#pin-avatar").textContent = "";
    }else{
      $("#pin-avatar").style.backgroundImage = "";
      $("#pin-avatar").textContent = trBuyuk(ad.trim().charAt(0)) || "?";
    }
    if(degistirMi){
      pinModu = "dogrula";
      $("#pin-alt-baslik").textContent = "Değiştirmek için mevcut PIN'ini gir";
    }else if(pin && pin.length===6){
      pinModu = "gir";
      $("#pin-alt-baslik").textContent = "Devam etmek için PIN'ini gir";
    }else{
      pinModu = "olustur1";
      $("#pin-alt-baslik").textContent = "Devam etmek için 6 haneli bir PIN oluştur";
    }
    /* "PIN'imi unuttum" sadece normal giriş ekranında anlamlı — PIN'i yeni
       oluştururken veya değiştirirken "unuttum" diye bir şey yok zaten */
    $("#btn-pin-unuttum").classList.toggle("gizli", pinModu!=="gir");
    let biyoKayitli=false; try{ biyoKayitli = !!localStorage.getItem("biyoKimlikId"); }catch(e){}
    $("#btn-pin-biyometrik").classList.toggle("gizli", !(pinModu==="gir" && biyoKayitli));
    $("#pin-hata").textContent = "";
    pinNoktalariCiz();
    $("#pin-ekran").classList.add("acik");
  };
  const pinNoktalariCiz = ()=> $$("#pin-noktalar span").forEach((el,i)=> el.classList.toggle("dolu", i<pinGirilen.length));
  /* PIN doğru girildiğinde: noktalar yeşile dönüp dalgalanıyor, ardından
     ekran yumuşakça kapanıyor.
     Bu iki animasyon (.basarili ve .kapaniyor) CSS'te ZATEN TANIMLIYDI ama
     JS hiç tetiklemiyordu — hazırlanmış ama hiç çalışmayan bir efekt olarak
     duruyordu. Ölü CSS taramasında bulundu; silmek yerine bağlandı.
     Eskiden doğru PIN girilince ekran hiçbir geri bildirim vermeden anında
     kayboluyordu. */
  const pinBasariKapat = ()=>{
    const ekran = document.getElementById("pin-ekran");
    const noktalar = document.querySelector(".pin-noktalar");
    if(noktalar) noktalar.classList.add("basarili");
    titret(18);
    setTimeout(()=>{
      if(ekran) ekran.classList.add("kapaniyor");
      setTimeout(()=>{
        if(ekran) ekran.classList.remove("acik","kapaniyor");
        if(noktalar) noktalar.classList.remove("basarili");
      }, 240);
    }, 260);
  };

  const pinHataGoster = (msg, sonra)=>{
    $("#pin-hata").textContent = msg;
    $("#pin-noktalar").classList.add("titre");
    setTimeout(()=>{ $("#pin-noktalar").classList.remove("titre"); sonra(); }, 420);
  };
  const pinTamamlandi = ()=>{
    if(pinModu==="dogrula"){
      let pin=null; try{ pin=localStorage.getItem("pin"); }catch(e){}
      if(pinGirilen===pin){
        pinGirilen=""; pinModu="olustur1";
        $("#pin-alt-baslik").textContent = "Yeni 6 haneli PIN'ini oluştur";
        $("#pin-hata").textContent = ""; pinNoktalariCiz();
      }else{
        pinHataGoster("PIN yanlış, tekrar dene", ()=>{ pinGirilen=""; pinNoktalariCiz(); });
      }
    }else if(pinModu==="gir"){
      let pin=null; try{ pin=localStorage.getItem("pin"); }catch(e){}
      if(pinGirilen===pin){
        pinBasariKapat();
      }else{
        pinHataGoster("PIN yanlış, tekrar dene", ()=>{ pinGirilen=""; pinNoktalariCiz(); });
      }
    }else if(pinModu==="olustur1"){
      pinIlkGiris = pinGirilen; pinGirilen = ""; pinModu = "olustur2";
      $("#pin-alt-baslik").textContent = "Onaylamak için PIN'ini tekrar gir";
      pinNoktalariCiz();
    }else if(pinModu==="olustur2"){
      if(pinGirilen===pinIlkGiris){
        try{ localStorage.setItem("pin", pinGirilen); }catch(e){ toast("Bu tarayıcıda kaydedilemedi"); }
        toast(pinDegistiriliyor ? "🔒 PIN değiştirildi" : "🔒 PIN oluşturuldu");
        pinBasariKapat();
      }else{
        pinHataGoster("PIN'ler eşleşmedi, baştan dene", ()=>{
          pinGirilen=""; pinIlkGiris=""; pinModu="olustur1";
          $("#pin-alt-baslik").textContent = "Devam etmek için 6 haneli bir PIN oluştur";
          pinNoktalariCiz();
        });
      }
    }
  };
  $$(".pin-tus-takimi button[data-tus]").forEach(b=>{
    b.addEventListener("click", ()=>{
      if(pinGirilen.length>=6) return;
      pinGirilen += b.dataset.tus;
      pinNoktalariCiz();
      if(pinGirilen.length===6) setTimeout(pinTamamlandi, 150);
    });
  });
  $("#pin-sil").addEventListener("click", ()=>{ pinGirilen = pinGirilen.slice(0,-1); pinNoktalariCiz(); });
  $("#btn-pin-degistir").addEventListener("click", ()=> pinEkraniHazirla(true));
  /* GÜVENLİK: PIN ekranındaki avatardan fotoğraf değiştirmeyi BİLEREK
     kaldırdık — kullanıcı bildirdi: telefonu ele geçiren biri (PIN'i
     bilmese bile) kilidi hiç açmadan profil fotoğrafını değiştirebiliyordu,
     bu da PIN'in koruma amacını anlamsız kılıyordu. Fotoğraf değiştirmek
     artık SADECE uygulamanın içinden (hamburger menüdeki avatar, kilidi
     açtıktan SONRA erişilebilir) yapılabiliyor. Bu satır kasıtlı olarak yok. */

  /* ---- 🫆 Biyometrik (parmak izi/Yüz) kilit: WebAuthn ile PIN'e EK bir hızlı
     açma yolu, PIN'in yerine geçmiyor (PIN her zaman yedek olarak kalıyor).
     Sunucu tarafı doğrulama gerektirmeyen, tamamen CİHAZ ÜZERİNDE çalışan bir
     "yerel açma jesti" olarak kullanılıyor — asıl kimlik doğrulaması zaten
     Firebase Auth ile yapılmış durumda, bu sadece PIN yazmayı hızlandırıyor. */
  const b64Ver = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const b64Al = b64 => { const bin=atob(b64); const by=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) by[i]=bin.charCodeAt(i); return by.buffer; };
  const biyoDesteklerMi = ()=> !!(window.PublicKeyCredential && navigator.credentials);
  async function biyoPlatformVarMi(){
    if(!biyoDesteklerMi()) return false;
    try{ return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); }catch(e){ return false; }
  }
  function biyoKayitliMi(){ try{ return !!localStorage.getItem("biyoKimlikId"); }catch(e){ return false; } }

  async function biyoKurulumYap(){
    if(!(await biyoPlatformVarMi())){ toast("Bu cihaz/tarayıcı parmak izi/Yüz kilidini desteklemiyor"); return; }
    try{
      const kimlik = await navigator.credentials.create({
        publicKey:{
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp:{ name:"Puantaj Defterim" },
          user:{ id: crypto.getRandomValues(new Uint8Array(16)), name: (kullanici&&kullanici.email)||"kullanici", displayName:(kullanici&&kullanici.displayName)||"Kullanıcı" },
          pubKeyCredParams:[{alg:-7,type:"public-key"},{alg:-257,type:"public-key"}],
          authenticatorSelection:{ authenticatorAttachment:"platform", userVerification:"required" },
          timeout:60000
        }
      });
      localStorage.setItem("biyoKimlikId", b64Ver(kimlik.rawId));
      toast("🫆 Parmak izi/Yüz ile açma etkinleştirildi");
      $("#btn-biyometrik-ac").classList.add("gizli");
    }catch(e){ toast("Kurulum iptal edildi veya başarısız oldu"); }
  }
  async function biyoDene(){
    if(!biyoKayitliMi()) return;
    try{
      await navigator.credentials.get({
        publicKey:{
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials:[{ id: b64Al(localStorage.getItem("biyoKimlikId")), type:"public-key" }],
          userVerification:"required", timeout:60000
        }
      });
      $("#pin-ekran").classList.remove("acik");   /* jest başarılı — PIN yazmadan aç */
    }catch(e){ /* iptal/başarısız — kullanıcı PIN'i elle girmeye devam eder */ }
  }
  $("#btn-pin-biyometrik").addEventListener("click", biyoDene);
  $("#btn-biyometrik-ac").addEventListener("click", biyoKurulumYap);
  (async ()=>{
    if(await biyoPlatformVarMi()) $("#btn-biyometrik-ac").classList.remove("gizli");
  })();
  $("#btn-pin-unuttum").addEventListener("click", ()=>{
    /* "Site verilerini temizle" gibi ağır/mantıksız bir çözüm yerine: hesap
       şifresi zaten kimlik kanıtı olduğundan, çıkış yapıp e-posta+şifreyle
       tekrar giriş yapması isteniyor — bu sırada PIN sıfırlanıyor, tekrar
       girişte yeni bir PIN oluşturması isteniyor. Diğer hiçbir verisi
       (puantaj, ödeme, ayar vs.) silinmiyor, hepsi bulutta zaten güvende. */
    if(!confirm("PIN'in sıfırlanacak. Çıkış yapıp e-posta/şifrenle tekrar giriş yapman gerekecek — sonra yeni bir PIN oluşturursun. Diğer hiçbir verin silinmiyor. Devam edilsin mi?")) return;
    try{ localStorage.removeItem("pin"); }catch(e){}
    $("#pin-ekran").classList.remove("acik");
    auth.signOut();
  });

  /* ---- Cüzdan tarihi varsayılanı ---- */
  /* $("#cuzdan-tarih") kaldırıldı — Cüzdan özelliği tamamen kaldırıldı */

  /* ---- Not arama ---- */
  $("#not-ara").addEventListener("input", notCiz);
  $("#odeme-ara").addEventListener("input", odemeListesiCiz);

  /* SGK kaydet */
  $("#btn-sgk-kaydet").addEventListener("click", async ()=>{
    try{
      await kokRef().set({
        sgkGun: sayi($("#ayar-sgk").value)||0,
        sgkHedef: sayi($("#ayar-sgk-hedef").value)||0
      },{merge:true});
      toast("SGK bilgileri kaydedildi 🏖️");
      anaYukle();
    }catch(e){ hataGoster(e); }
  });

  /* Not: "Rozetler kısayolu" düğmesi kaldırıldı — seviye kartı artık zaten
     doğrudan Başarımlarım ekranının içinde, ayrıca bir bağlantıya gerek yok. */

  /* Şirket hesap kartı → dokununca "Maaşlar"a git (tüm ayların ayrı ayrı dökümü orada) */
  $("#sirket-alt").style.cursor = "pointer";
  $("#sirket-alt").addEventListener("click", ()=>{
    document.querySelector('[data-goruntu="maaslar"]').click();
  });

  /* ---- ⏳ Beklenen ödemeler ---- */
  $("#beklenen-tarih").value = tarihId(new Date());
  $("#btn-beklenen-ekle").addEventListener("click", async ()=>{
    const tutar = sinirla(sayi($("#beklenen-tutar").value), SINIR.tutar, "Tutar", "TL");
    const tarih = $("#beklenen-tarih").value || tarihId(new Date());
    if(!tutar || tutar<=0){ toast("Tutarı yaz kanka"); return; }
    const btn = $("#btn-beklenen-ekle");
    if(btn.disabled) return;
    btn.disabled = true;
    try{
      await kokRef().collection("beklenenler").add({
        tutar, tarih, not: $("#beklenen-not").value.trim(),
        tur: $("#beklenen-tur").value || "avans",
        olusturma: firebase.firestore.FieldValue.serverTimestamp()
      });
      $("#beklenen-tutar").value=""; $("#beklenen-not").value="";
      $("#beklenen-tur").value = "avans";
      $("#beklenen-tarih").value = tarihId(new Date());
      toast("⏳ Beklenen ödeme eklendi, tahsil edince ✔'ye bas");
    }catch(e){ hataGoster(e); }
    finally{ btn.disabled = false; }
  });

  /* ---- İş masrafları ---- */
  $("#masraf-tarih").value = tarihId(new Date());
  masrafKategoriCizGoster();
  $("#btn-masraf-ekle").addEventListener("click", async ()=>{
    const tutar = sinirla(sayi($("#masraf-tutar").value), SINIR.tutar, "Masraf tutarı", "TL");
    const tarih = $("#masraf-tarih").value || tarihId(new Date());
    if(!tutar || tutar<=0){ toast("Tutarı yaz kanka"); return; }
    /* Not: ödemelerde olduğu gibi burada da "ay kilitli" engeli BİLEREK yok —
       kilit sadece ÇALIŞMA kayıtlarını korur; bir masrafı (fiş, malzeme
       parası) o ayı kapattıktan sonra fark edip girmek gayet normal, bunu
       engellemek gereksiz bir kısıtlamaydı. */
    /* ÇİFT KAYIT KORUMASI: ".add()" her tıklamada yeni kayıt oluşturuyor,
       hızlı çift tıklamaya karşı düğme geçici olarak kapatılıyor. */
    const btn = $("#btn-masraf-ekle");
    if(btn.disabled) return;
    btn.disabled = true;
    try{
      const veri = {
        tarih, tutar,
        aciklama: $("#masraf-aciklama").value.trim(),
        kategori: masrafSeciliKategori,
        odendi: false,
        olusturma: firebase.firestore.FieldValue.serverTimestamp()
      };
      if(masrafFoto) veri.fisli = true;   /* listeye sadece bayrak; fotoğraf ayrı bölmede */
      const ref = await kokRef().collection("masraflar").add(veri);
      if(masrafFoto){
        try{ await kokRef().collection("fisler").doc(ref.id).set({veri: masrafFoto}); }
        catch(fe){ toast("Masraf kaydedildi ama fiş fotoğrafı yüklenemedi 😕"); }
      }
      masrafFoto = null;
      $("#masraf-foto-onizle").classList.add("gizli");
      $("#masraf-tutar").value=""; $("#masraf-aciklama").value="";
      const t2 = new Date(tarih+"T12:00:00");
      if(t2.getFullYear()!==aktifYil || t2.getMonth()!==aktifAy){
        toast("🧾 Masraf "+AYLAR[t2.getMonth()]+" "+t2.getFullYear()+" ayına yazıldı ✓");
        aktifYil = t2.getFullYear(); aktifAy = t2.getMonth();
        ayiYukle(); ayBarCiz();
      }else{
        toast("Masraf kaydedildi 🧾 Hesabına alacak olarak eklendi");
      }
    }catch(e){ hataGoster(e); }
    finally{ btn.disabled = false; }
  });
  let masrafFoto = null;
  $("#btn-masraf-foto").addEventListener("click", ()=> $("#masraf-foto-sec").click());
  $("#masraf-foto-sec").addEventListener("change", async e=>{
    const dosya = e.target.files && e.target.files[0];
    e.target.value = "";
    if(!dosya) return;
    toast("Fiş küçültülüyor...");
    try{
      masrafFoto = await fotoSikistir(dosya);
      const im = $("#masraf-foto-onizle");
      im.src = masrafFoto; im.classList.remove("gizli");
      toast("Fiş hazır, Kaydet'e bas 🧾");
      $("#masraf-ocr-oneriler").innerHTML = ""; $("#masraf-ocr-durum").textContent = "";
      /* Fiş okuma düğmesi artık HER ZAMAN gösteriliyor.
         Eskiden `window.Tesseract` varsa gösteriliyordu; kütüphane açılışta
         yükleniyordu ve hep hazırdı. Artık talep üzerine yüklendiği için
         (0.0.9.2) bu kontrol düğmeyi kalıcı olarak gizlerdi.
         Kütüphane, düğmeye basıldığında yükleniyor. */
      $("#btn-masraf-ocr").classList.remove("gizli");
    }catch(err){ toast("Fotoğraf eklenemedi, başka dene"); }
  });

  /* ---- 🔍 Fişten tutar okuma (DENEYSEL): sadece ÖNERİ üretir, hiçbir zaman
     otomatik doldurmaz/kaydetmez — kullanıcı önerilen rakamlardan birine
     dokunursa tutar alanına yazılır, yanlış okursa hiçbir şeye dokunmadan
     elle yazmaya devam edebilir. */
  $("#btn-masraf-ocr").addEventListener("click", async ()=>{
    /* Fiş okuma kütüphanesi ilk kullanımda yükleniyor (~250 KB) */
    if(typeof Tesseract === "undefined"){
      toast("Fiş okuyucu hazırlanıyor... 📄");
      await kutuphaneYukle("tesseract");
      if(typeof Tesseract === "undefined"){
        toast("Fiş okuyucu yüklenemedi — internetini kontrol et 📡"); return;
      }
    }
    if(!window.Tesseract || !masrafFoto) return;
    const durum = $("#masraf-ocr-durum"), oneriler = $("#masraf-ocr-oneriler");
    oneriler.innerHTML = "";
    durum.textContent = "🔍 Fiş okunuyor, biraz sürebilir...";
    $("#btn-masraf-ocr").disabled = true;
    try{
      const sonuc = await Tesseract.recognize(masrafFoto, "tur+eng");
      const metin = (sonuc && sonuc.data && sonuc.data.text) || "";
      /* Fiş üzerindeki, para tutarına benzeyen sayıları (1.234,56 / 350 / 45,00 gibi)
         yakalayıp tekilleştiriyoruz — hangisinin "toplam" olduğunu tahmin etmeye
         çalışmıyoruz, hepsini öneri olarak sunuyoruz, seçim kullanıcıda kalıyor. */
      const bulunanlar = [...new Set((metin.match(/\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?/g)||[])
        .map(s=> s.replace(/\./g,"").replace(",", "."))
        .map(Number)
        .filter(n=> n>=1 && n<=100000)
      )];
      if(!bulunanlar.length){
        durum.textContent = "Fişte okunabilir bir tutar bulunamadı, elle yazabilirsin.";
      }else{
        durum.textContent = "Bulunan tutarlardan birine dokun (hiçbiri doğru değilse elle yaz):";
        bulunanlar.slice(0,6).forEach(n=>{
          const b = document.createElement("button");
          b.className = "eksik-cip"; b.textContent = paraFmt(n);
          b.addEventListener("click", ()=>{ $("#masraf-tutar").value = String(n).replace(".", ","); toast("Tutar dolduruldu, kontrol etmeyi unutma"); });
          oneriler.appendChild(b);
        });
      }
    }catch(e){
      durum.textContent = "Fiş okunamadı (deneysel özellik) — elle yazabilirsin.";
    }finally{
      $("#btn-masraf-ocr").disabled = false;
    }
  });

  /* ---- Ekip ---- */
  $("#ekip-tarih").value = tarihId(new Date());
  $("#ekip-tarih").addEventListener("change", ekipYoklamaYukle);
  $("#btn-isci-ekle").addEventListener("click", async ()=>{
    const ad = $("#isci-ad").value.trim();
    const yevmiye = sayi($("#isci-yevmiye").value)||0;
    const mesaiUcret = sayi($("#isci-mesai").value)||0;
    if(!ad || !yevmiye){ toast("İşçinin adını ve yevmiyesini yaz"); return; }
    try{
      if(duzenlenenIsciId){
        await kokRef().collection("ekip").doc(duzenlenenIsciId).update({ad, yevmiye, mesaiUcret});
        toast(ad+" güncellendi ✏️ (yeni yoklamalar yeni ücretten)");
      }else{
        await kokRef().collection("ekip").add({ad, yevmiye, mesaiUcret});
        toast(ad+" ekibe eklendi 👥");
      }
      duzenlenenIsciId = null;
      $("#btn-isci-ekle").textContent = "➕ İşçi ekle";
      $("#isci-ad").value=""; $("#isci-yevmiye").value=""; $("#isci-mesai").value="";
    }catch(e){ hataGoster(e); }
  });
  $("#btn-yoklama-kaydet").addEventListener("click", async ()=>{
    const tarih = $("#ekip-tarih").value;
    if(!tarih){ toast("Tarih seç"); return; }
    try{
      const batch = db.batch();
      ekipListe.forEach(i=>{
        const y = yoklama[i.id] || {durum:"yok", mesai:0};
        const ref = kokRef().collection("ekipGun").doc(i.id+"_"+tarih);
        if(y.durum==="yok" && !(Number(y.mesai)>0)){
          batch.delete(ref);
        }else{
          batch.set(ref, {
            iscId: i.id, tarih,
            durum: y.durum, mesai: Number(y.mesai)||0,
            uYevmiye: Number(i.yevmiye)||0, uMesai: Number(i.mesaiUcret)||0
          });
        }
      });
      await batch.commit();
      tik();
      let maliyet = 0;
      ekipListe.forEach(i=>{
        const y = yoklama[i.id]; if(!y) return;
        if(y.durum==="tam") maliyet += Number(i.yevmiye)||0;
        else if(y.durum==="yarim") maliyet += (Number(i.yevmiye)||0)/2;
        maliyet += (Number(y.mesai)||0)*(Number(i.mesaiUcret)||0);
      });
      toast("Yoklama kaydedildi ✅" + (maliyet>0 ? " · Günün maliyeti: "+paraFmt(maliyet) : ""));
      ekipOzetYukle();
    }catch(e){ hataGoster(e); }
  });

  /* ---- Konum damgası ---- */
  $("#btn-konum").addEventListener("click", ()=>{
    if(!navigator.geolocation){ toast("Bu tarayıcı konum desteklemiyor"); return; }
    $("#gun-konum-yazi").textContent = "📡 Konum alınıyor...";
    navigator.geolocation.getCurrentPosition(async p=>{
      let adres = p.coords.latitude.toFixed(4)+", "+p.coords.longitude.toFixed(4);
      try{
        const r = await fetch("https://api.bigdatacloud.net/data/reverse-geocode-client?latitude="+
          p.coords.latitude+"&longitude="+p.coords.longitude+"&localityLanguage=tr");
        const d = await r.json();
        const parca = [d.locality, d.principalSubdivision].filter(Boolean);
        if(parca.length) adres = parca.join(", ");
      }catch(e){}
      gunKonum = {adres, lat: Number(p.coords.latitude.toFixed(5)), lng: Number(p.coords.longitude.toFixed(5))};
      $("#gun-konum-yazi").textContent = "📍 " + adres + " damgalandı (kaydetmeyi unutma)";
    }, ()=>{
      $("#gun-konum-yazi").textContent = "";
      toast("Konum alınamadı, izin verdiğinden emin ol");
    }, {timeout:10000, enableHighAccuracy:true});
  });

  /* ---- Kıdem hesaplayıcı ---- */
  const kidemHesapla = ()=>{
    const giris = $("#kidem-giris").value;
    const ucret = sayi($("#kidem-ucret").value)||0;
    if(!giris || !ucret){ return; }
    const yilF = (Date.now() - new Date(giris+"T12:00:00").getTime()) / (365.25*86400000);
    if(yilF < 0){ $("#kidem-sonuc").textContent = "Giriş tarihi gelecekte olamaz 😄"; return; }
    const yil = Math.floor(yilF), ayK = Math.floor((yilF-yil)*12);
    const izin = yilF<1 ? 0 : (yilF<5 ? 14 : (yilF<15 ? 20 : 26));
    let m = "⏳ Kıdemin: <b>"+yil+" yıl "+ayK+" ay</b><br>";
    if(yilF>=1){
      m += "💼 Tahmini kıdem tazminatı: <b>"+paraFmt(yilF*30*ucret)+"</b><br>";
      m += "🏖️ Yıllık izin hakkın: <b>en az "+izin+" gün</b>";
    }else{
      m += "💼 Kıdem tazminatına <b>1 yılı doldurunca</b> hak kazanırsın ("+(12-ayK)+" ay kaldı).";
    }
    $("#kidem-sonuc").innerHTML = m;
  };
  $("#kidem-giris").addEventListener("change", kidemHesapla);
  $("#kidem-ucret").addEventListener("input", kidemHesapla);

  /* ---- Mesai ücreti kontrolü ---- */
  $("#mesai-kontrol").addEventListener("input", ()=>{
    const u = sayi($("#mesai-kontrol").value)||0;
    if(!u){ return; }
    $("#mesai-kontrol-sonuc").innerHTML =
      "Yasal fazla mesai saat ücretin (%50 zamlı): <b>"+paraFmt(u*1.5)+"/saat</b><br>"+
      "<span style='color:var(--soluk);font-size:12px'>Sana bundan azı ödeniyorsa hakkın yeniyor demektir.</span>";
  });

  /* Sıralama düğmesi */
  $("#btn-sirala").addEventListener("click", ()=>{
    kayitSirala = kayitSirala==="yeni" ? "eski" : "yeni";
    $("#btn-sirala").textContent = kayitSirala==="yeni" ? "↓ Yeni" : "↑ Eski";
    gunListesiCiz();
  });

  /* Kişi arama */
  $("#kisi-ara").addEventListener("input", ()=>{
    const q = trKucuk($("#kisi-ara").value).trim();
    $$(".kisi-cip").forEach(c=>{
      c.style.display = !q || c.dataset.ad.includes(q) ? "" : "none";
    });
  });

  /* Liderlik tablosu */
  $("#btn-lider").addEventListener("click", ()=> liderYukle());

  /* Ekip toplu rapor */
  $("#btn-ekip-rapor").addEventListener("click", async ()=>{
    if(!ekipOzetSon || !ekipOzetSon.idler.length){ toast("Bu ay ekip kaydı yok"); return; }
    let m = "👥 *EKİP PUANTAJI — "+AYLAR[aktifAy]+" "+aktifYil+"*\n────────────\n";
    let toplam = 0;
    ekipOzetSon.idler.forEach(id=>{
      const isc = ekipListe.find(x=>x.id===id) || {ad:"(silinmiş)"};
      const g = ekipOzetSon.grup[id];
      toplam += g.hak;
      m += "👷 "+isc.ad+": "+g.gun+" gün · "+g.mesai+"s mesai · "+paraFmt(g.hak)+"\n";
    });
    m += "────────────\n💰 TOPLAM: "+paraFmt(toplam);
    try{
      if(navigator.share) await navigator.share({text:m});
      else{ await navigator.clipboard.writeText(m); toast("Ekip raporu kopyalandı 📋"); }
    }catch(e){}
  });

  /* Herkes: yenile */
  $("#btn-kisiler-yenile").addEventListener("click", kisilerYukle);

  /* ---- Kronometre ---- */
  kronoYaz();
  $("#btn-krono").addEventListener("click", ()=>{
    let bas = 0;
    try{ bas = Number(localStorage.getItem("kronoBas"))||0; }catch(e){}
    if(bas){ kronoDurdur(bas); return; }
    try{ localStorage.setItem("kronoBas", Date.now()); }catch(e){ toast("Bu tarayıcıda çalışmadı"); return; }
    kronoYaz();
    if(navigator.wakeLock){ navigator.wakeLock.request("screen").then(w=>{ window._kilit=w; }).catch(()=>{}); }
    toast("Kronometre başladı ⏱ Uygulamayı kapatsan da saymaya devam eder");
  });

  /* ---- Sesli not ---- */
  $("#btn-sesli-not").addEventListener("click", ()=>{
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR){ toast("Bu tarayıcı sesli yazmayı desteklemiyor"); return; }
    const r = new SR();
    r.lang = "tr-TR"; r.interimResults = false;
    $("#btn-sesli-not").textContent = "🔴 Dinliyorum...";
    r.onresult = e=>{
      const soz = e.results[0][0].transcript;
      const ta = $("#gun-not");
      ta.value = ta.value ? ta.value + " " + soz : soz;
    };
    r.onend = ()=>{ $("#btn-sesli-not").textContent = "🎤 Konuş"; };
    r.onerror = ()=>{ $("#btn-sesli-not").textContent = "🎤 Konuş"; toast("Ses alınamadı, mikrofon izni verdiğinden emin ol"); };
    try{ r.start(); }catch(e){ $("#btn-sesli-not").textContent = "🎤 Konuş"; }
  });

  /* ---- Namaz vakitleri ---- */
  $("#btn-namaz").addEventListener("click", ()=>{
    if(!navigator.geolocation){ toast("Konum desteklenmiyor"); return; }
    $("#namaz-sonuc").innerHTML = '<div class="bos-mesaj">📡 Konum alınıyor...</div>';
    navigator.geolocation.getCurrentPosition(async p=>{
      try{
        const r = await fetch("https://api.aladhan.com/v1/timings?latitude="+p.coords.latitude+
          "&longitude="+p.coords.longitude+"&method=13");
        const d = await r.json();
        const v = d.data && d.data.timings;
        if(!v) throw new Error();
        const sira = [["Fajr","İmsak/Sabah"],["Dhuhr","Öğle"],["Asr","İkindi"],["Maghrib","Akşam"],["Isha","Yatsı"]];
        $("#namaz-sonuc").innerHTML = '<div class="ozet-grid">'+
          sira.map(([k,ad])=> '<div class="ozet-kut"><div class="et">'+ad+'</div><div class="deger" style="font-size:22px">'+String(v[k]).slice(0,5)+'</div></div>').join("")+
          '</div><p style="font-size:11px;color:var(--soluk);margin-top:8px">Diyanet metoduna göre, konumundan hesaplandı.</p>';
      }catch(e){
        $("#namaz-sonuc").innerHTML = '<div class="bos-mesaj">Vakitler alınamadı, interneti kontrol et.</div>';
      }
    }, ()=> $("#namaz-sonuc").innerHTML = '<div class="bos-mesaj">Konum izni gerekli.</div>', {timeout:10000});
  });

  /* ---- Sigara hesabı ---- */
  const sigHesap = ()=>{
    const f = sayi($("#sig-fiyat").value)||0, pk = sayi($("#sig-paket").value)||0;
    if(!f || !pk) return;
    const aylik = f*pk*30, yillik = f*pk*365;
    const yevmiyeSay = ayarlar.yevmiye>0 ? " = <b>"+(aylik/ayarlar.yevmiye).toFixed(1)+" yevmiye</b>" : "";
    $("#sig-sonuc").innerHTML =
      "Aylık: <b>"+paraFmt(aylik)+"</b>"+yevmiyeSay+"<br>"+
      "Yıllık: <b>"+paraFmt(yillik)+"</b> 💨<br>"+
      "<span style='color:var(--soluk);font-size:12px'>Bu para cüzdanda dursa fena mı olurdu usta? 😄</span>";
  };
  $("#sig-fiyat").addEventListener("input", sigHesap);
  $("#sig-paket").addEventListener("input", sigHesap);

  /* ---- Çevrimdışı bandı ---- */
  const cevrimYaz = ()=>{
    $("#cevrim-bant").style.display = navigator.onLine ? "none" : "block";
    if(navigator.onLine===false) toast("İnternet gitti 📴 Merak etme, kayıtların telefonda birikiyor");
  };
  /* İnternet dönünce: "eşitleniyor" demek YETMEZ, gerçekten eşitlendiğini
     doğrulamak gerekir. Eskiden bu mesaj gösterilip geçiliyordu; kullanıcı
     mesaja güvenip uygulamayı kapatıyordu ama yazmalar hâlâ beklemede
     olabiliyordu (sunucu yavaşsa, oturum düştüyse, kural hatası varsa).
     Firestore'un waitForPendingWrites() metodu tam bunun için var:
     bekleyen tüm yazmalar sunucuya ULAŞINCA çözülüyor. */
  window.addEventListener("online", async ()=>{
    $("#cevrim-bant").style.display = "none";
    toast("İnternet geldi, kayıtların gönderiliyor 🔄");
    try{
      if(db && db.waitForPendingWrites){
        /* Süre sınırı: sunucu cevap vermezse kullanıcı sonsuza kadar
           "gönderiliyor" mesajıyla kalmasın. */
        await Promise.race([
          db.waitForPendingWrites(),
          new Promise((_,red)=> setTimeout(()=> red(new Error("zaman aşımı")), 20000))
        ]);
        toast("✅ Tüm kayıtların sunucuya ulaştı");
      }
    }catch(e){
      toast("⚠️ Bazı kayıtlar hâlâ gönderilemedi. Uygulamayı açık tut, tekrar denenecek.");
      try{ hataKaydet("esitleme", e); }catch(_){}
    }
  });
  window.addEventListener("offline", cevrimYaz);
  if(!navigator.onLine) $("#cevrim-bant").style.display = "block";

  /* "Aşağı çekerek yenile" özelliği kaldırıldı — normal kaydırma hareketini
     bile "çekme" gibi algılayıp gereksiz/sürekli "Yenileniyor" bildirimi
     gösteriyordu. Veriler zaten Firestore ile canlı senkronize olduğu için
     bu özelliğin gerçek bir faydası yoktu, sadece riski vardı. */

  /* ---- Ripple efekti (Material dokunma dalgası) ---- */
  document.addEventListener("pointerdown", e=>{
    const hedef = e.target.closest(".btn, .eksik-cip, .durum-secim button");
    if(!hedef) return;
    const r = hedef.getBoundingClientRect();
    const boyut = Math.max(r.width, r.height);
    const dalga = document.createElement("span");
    dalga.className = "ripple";
    dalga.style.width = dalga.style.height = boyut+"px";
    dalga.style.left = (e.clientX - r.left - boyut/2)+"px";
    dalga.style.top = (e.clientY - r.top - boyut/2)+"px";
    hedef.appendChild(dalga);
    setTimeout(()=> dalga.remove(), 520);
  }, {passive:true});

  /* ---- Takvimde kaydırarak ay değiştirme ---- */
  let kayX = null;
  $("#takvim").addEventListener("touchstart", e=>{ kayX = e.touches[0].clientX; }, {passive:true});
  $("#takvim").addEventListener("touchend", e=>{
    if(kayX===null) return;
    const fark = e.changedTouches[0].clientX - kayX;
    kayX = null;
    if(Math.abs(fark) < 70) return;
    if(fark < 0) $("#btn-sonraki-ay").click(); else $("#btn-onceki-ay").click();
  }, {passive:true});

  /* ---- Ses efekti ayarı ---- */
  try{ $("#ayar-ses").checked = localStorage.getItem("ses")==="1"; }catch(e){}
  $("#ayar-ses").addEventListener("change", ()=>{
    try{ localStorage.setItem("ses", $("#ayar-ses").checked?"1":"0"); }catch(e){}
    if($("#ayar-ses").checked) tik();
  });

  /* ---- Gün modalı: seyrek alanları aç/kapa ----
     Kapalıyken içeride dolu alan varsa düğmede sayı gösteriliyor;
     kullanıcı bir şey girdiğini unutmasın diye. */
  const gunDetayRozetGuncelle = ()=>{
    try{
      const alanlar = ["gun-bas-saat","gun-bit-saat","gun-gece-mesai","gun-parca-miktar"];
      let dolu = alanlar.filter(id=>{
        const el = document.getElementById(id);
        if(!el) return false;
        const d = (el.value||"").trim();
        return d && d!=="0" && d!=="0.0";
      }).length;
      if(gunKonum) dolu++;
      const rz = $("#gun-detay-rozet");
      if(rz){
        rz.textContent = dolu ? dolu+" dolu" : "";
        rz.classList.toggle("gizli", dolu===0);
      }
    }catch(e){}
  };
  window.gunDetayRozetGuncelle = gunDetayRozetGuncelle;

  /* Alanlar değiştikçe rozet güncellensin */
  ["gun-bas-saat","gun-bit-saat","gun-gece-mesai","gun-parca-miktar"].forEach(aid=>{
    const el = document.getElementById(aid);
    if(el) el.addEventListener("input", gunDetayRozetGuncelle);
  });

  $("#btn-gun-detay").addEventListener("click", ()=>{
    const kap = $("#gun-detay-alanlar"), btn = $("#btn-gun-detay");
    const acildi = kap.classList.toggle("gizli") === false;
    btn.classList.toggle("acik", acildi);
    titret(8);
    if(acildi) setTimeout(()=>{
      try{ kap.scrollIntoView({behavior:"smooth", block:"nearest"}); }catch(e){}
    }, 180);
  });

  /* ---- 🔧 Tanı / test ---- */
  /* Düğme bağlantısı: hata olursa SESSİZ KALMASIN, ekranda görünsün.
     Bir tanı aracının kendisi sessizce çökerse hiçbir işe yaramaz. */
  $("#btn-tani-calistir").addEventListener("click", async ()=>{
    const kutu = $("#tani-sonuc"), kart = $("#tani-sonuc-kart");
    try{
      await taniCalistir();
    }catch(e){
      if(kutu){
        kutu.textContent = "❌ TANI ARACININ KENDİSİ ÇÖKTÜ\n\n" +
          (e && e.message ? e.message : String(e)) + "\n\n" +
          ((e && e.stack) ? e.stack.split("\n").slice(0,5).join("\n") : "");
        if(kart) kart.classList.remove("gizli");
      }
      const b = $("#btn-tani-calistir");
      if(b){ b.disabled = false; b.textContent = "▶ Tekrar dene"; }
    }
  });
  $("#btn-tani-kopyala").addEventListener("click", async ()=>{
    if(!taniSatirlar.length){ toast("Önce testi çalıştır"); return; }
    try{ await navigator.clipboard.writeText(taniRaporMetni()); toast("Rapor kopyalandı 📋"); }
    catch(e){ toast("Kopyalanamadı — raporu elle seçip kopyala"); }
  });
  $("#btn-tani-paylas").addEventListener("click", async ()=>{
    if(!taniSatirlar.length){ toast("Önce testi çalıştır"); return; }
    try{
      if(navigator.share) await navigator.share({text: taniRaporMetni()});
      else{ await navigator.clipboard.writeText(taniRaporMetni()); toast("Rapor kopyalandı 📋"); }
    }catch(e){}
  });

  /* ---- 📏 Görünüm ölçeği ---- */
  olcekUygula();
  document.querySelectorAll("#olcek-secim button").forEach(b=>{
    b.addEventListener("click", ()=>{
      const d = b.dataset.olcek;
      try{ localStorage.setItem("olcek", d); }catch(e){}
      olcekUygula();
      titret(10);
      toast(d==="kucuk" ? "📏 Küçük — ekrana daha çok bilgi sığar"
          : d==="buyuk" ? "📏 Büyük — yazılar iri"
          : "📏 Normal");
    });
  });

  /* ---- ⚡ Hafif mod ---- */
  hafifModUygula();   /* kutuyu mevcut duruma göre işaretler (otomatik ya da kayıtlı tercih) */
  $("#ayar-hafif").addEventListener("change", ()=>{
    const acik = $("#ayar-hafif").checked;
    /* Kullanıcı bir kez dokunduysa artık otomatik algılama devreye girmez,
       tercihi kalıcı olarak saklanır. */
    try{ localStorage.setItem("hafifMod", acik?"1":"0"); }catch(e){}
    document.documentElement.setAttribute("data-hafif", acik?"1":"0");
    toast(acik ? "⚡ Hafif mod açık — süsler kapandı, kaydırma hızlanmalı"
               : "✨ Hafif mod kapalı — tüm görsel efektler geri geldi");
  });

  /* ---- Kişi linki kopyala + derin link ---- */
  $("#btn-kisi-link").addEventListener("click", async ()=>{
    try{
      await navigator.clipboard.writeText(location.href.split("#")[0] + "#kisi=" + (seciliKisi?seciliKisi.uid:""));
      toast("Link kopyalandı 🔗 Arkadaşına at, direkt bu puantaj açılır");
    }catch(e){ toast("Kopyalanamadı"); }
  });

  /* Son yedek hatırlatması (30 gün) */
  try{
    const sy = Number(localStorage.getItem("yedekZaman"))||0;
    if(sy && Date.now()-sy > 30*86400000){
      setTimeout(()=> toast("📦 30 gündür yedek almadın, Ayarlar'dan bir yedek al usta"), 4000);
    }
  }catch(e){}

  /* Gece yarısı: ekran kendiliğinden yeni güne geçsin */
  let sonGunNo = new Date().getDate();
  setInterval(()=>{
    const simdi = new Date();
    if(simdi.getDate() !== sonGunNo){
      sonGunNo = simdi.getDate();
      if(kullanici) hepsiniCiz();
    }
  }, 60000);

  /* Alt navigasyon */
  $$(".alt-nav [data-nav]").forEach(n=>{
    n.addEventListener("click", ()=>{
      const hedefBtn = document.querySelector('[data-goruntu="'+n.dataset.nav+'"]');
      if(hedefBtn) hedefBtn.click();
    });
  });
  $("#nav-arti").addEventListener("click", ()=>{
    document.querySelector('[data-goruntu="puantaj"]').click();
    $("#btn-bugun").click();
  });

  /* FAB'a basılı tutunca hızlı kısayol menüsü (akıllı kısayollar) */
  (function(){
    const fab = $("#nav-arti"), menu = $("#fab-kisayol-menu"), perde = $("#fab-kisayol-perde");
    let lpZaman = null, lpAtesledi = false;
    const ac = ()=>{
      lpAtesledi = true;
      titret(30);
      menu.classList.remove("gizli"); perde.classList.remove("gizli");
    };
    const kapat = ()=>{
      menu.classList.add("gizli"); perde.classList.add("gizli");
    };
    fab.addEventListener("pointerdown", ()=>{ lpAtesledi=false; lpZaman = setTimeout(ac, 420); });
    ["pointerup","pointerleave","pointercancel"].forEach(ev=> fab.addEventListener(ev, ()=> clearTimeout(lpZaman)));
    fab.addEventListener("click", e=>{ if(lpAtesledi){ e.stopImmediatePropagation(); lpAtesledi=false; } }, true);
    perde.addEventListener("click", kapat);
    $("#fab-k-not").addEventListener("click", ()=>{ kapat(); $("#btn-ana-not").click(); });
    $("#fab-k-avans").addEventListener("click", ()=>{ kapat(); $("#btn-ana-avans").click(); });
    $("#fab-k-dun").addEventListener("click", ()=>{ kapat(); document.querySelector('[data-goruntu="ana"]').click(); setTimeout(()=> $("#btn-dun-isle").click(), 250); });
  })();

  /* Ana ekran hızlı işlemler */
  $("#btn-ana-bugun").addEventListener("click", ()=>{
    document.querySelector('[data-goruntu="puantaj"]').click();
    $("#btn-bugun").click();
  });
  $("#btn-ana-avans").addEventListener("click", ()=>{
    document.querySelector('[data-goruntu="odemeler"]').click();
  });
  $("#btn-ana-paylas").addEventListener("click", ()=> donemAc("paylas"));
  $("#btn-ana-not").addEventListener("click", ()=>{
    document.querySelector('[data-goruntu="notlar"]').click();
  });
  $("#btn-takvim-ac").addEventListener("click", ()=>{
    document.querySelector('[data-goruntu="puantaj"]').click();
  });

  /* Gizlilik modu (göz) */
  try{ gizliMod = localStorage.getItem("gizli")==="1"; }catch(e){}
  $("#btn-goz").addEventListener("click", ()=>{
    gizliMod = !gizliMod;
    try{ localStorage.setItem("gizli", gizliMod?"1":"0"); }catch(e){}
    anaYukle();
    toast(gizliMod ? "Bakiyeler gizlendi 🙈" : "Bakiyeler görünür 👁️");
  });

  /* Şirket hesap hareketleri: kart içinde aç/kapa */
  $("#btn-sirket-hareket-ac").addEventListener("click", ()=>{
    const kutu = $("#sirket-hareket-kutu"), ok = $("#sirket-hareket-ok");
    const acikMi = !kutu.classList.contains("gizli");
    kutu.classList.toggle("gizli", acikMi);
    ok.style.transform = acikMi ? "rotate(0deg)" : "rotate(90deg)";
  });

  /* Not: Banka slider (Şirket/Cüzdan kaydırma) kodu kaldırıldı — Cüzdan
     özelliği kalktığı için Şirket Hesap Kartı artık tek başına, kaydırma
     mekanizmasına gerek kalmadı. */

  /* Ay detay modalı (Maaşlar) */
  $("#btn-ay-detay-kapat").addEventListener("click", ayDetayKapat);

  /* Kart detay modalı */
  $("#btn-kart-detay-kapat").addEventListener("click", kartDetayKapat);
  $("#btn-kd-odeme-ekle").addEventListener("click", ()=>{
    $("#kd-odeme-form").classList.remove("gizli");
    formuAcVeOdaklan("#kd-odeme-tutar");
  });
  $("#btn-kd-odeme-vazgec").addEventListener("click", ()=>{
    $("#kd-odeme-form").classList.add("gizli");
  });
  $("#btn-kd-odeme-kaydet").addEventListener("click", async ()=>{
    const k = aktifKartDetay; if(!k) return;
    const x = sayi($("#kd-odeme-tutar").value);
    if(!(x > 0)){ toast("Geçerli bir tutar yaz kanka"); return; }
    const borc = Number(k.borc)||0;
    const yeni2 = Math.max(0, borc - x);
    const yeniOdemeler = [...(k.odemeler||[]), {tutar:x, zaman: Date.now()}];
    try{
      await kokRef().collection("kartlar").doc(k.id).update({borc: yeni2, odemeler: yeniOdemeler});
      toast(yeni2 === 0 ? "Kart borcu SIFIRLANDI 🎉 Helal!" : paraFmt(x)+" işlendi, kalan "+paraFmt(yeni2));
      kartDetayKapat();
    }catch(e){ hataGoster(e); }
  });
  $("#btn-kd-duzenle").addEventListener("click", ()=>{
    const k = aktifKartDetay; if(!k) return;
    kartDetayKapat();
    document.querySelector('[data-goruntu="kartlar"]').click();
    setTimeout(()=>{
      duzenlenenKart = k;
      $("#kart-banka").value = k.banka||"";
      $("#kart-ad").value = k.ad||"";
      $("#kart-gun").value = k.gun||"";
      $("#kart-borc").value = Number(k.borc)||"";
      $("#btn-kart-ekle").textContent = "✏️ Güncelle";
      $("#btn-kart-vazgec").classList.remove("gizli");
      window.scrollTo({top:0, behavior:"smooth"});
    }, 250);
  });
  $("#btn-kd-sil").addEventListener("click", ()=>{
    const k = aktifKartDetay; if(!k) return;
    if(!confirm((k.ad||"Kart")+" kartı silinsin mi?")) return;
    kokRef().collection("kartlar").doc(k.id).delete()
      .then(()=>{ kartDetayKapat(); toast("Kart silindi"); })
      .catch(hataGoster);
  });

  /* Hava durumu tam ekran — doğrudan düğmeye değil, tüm sayfaya bağlı bir
     dinleyici kullanıyoruz (delegasyon). Böylece düğme her ne sebeple olursa
     olsun sayfa ilk yüklenirken anlık olarak bulunamasa bile (ör. bir önceki
     satırda beklenmedik bir hata olsa bile) yine de çalışır — çok daha sağlam. */
  document.addEventListener("click", e=>{
    if(e.target.closest("#btn-hava-menu")){ cekmeceAc(false); havaTamEkranAc(); return; }
    if(e.target.closest("#hava-uyari-satir")){ havaTamEkranAc(); return; }
    if(e.target.closest("#btn-hava-kapat")){ $("#hava-tam-ekran").classList.add("gizli"); return; }
  });
  $("#btn-ay-detay-odeme-ekle").addEventListener("click", ()=>{
    /* Not: Eskiden bu düğme, o an baktığın ayı (ör. Ağustos) ZORLA seçiyordu
       — hangi ayı görüntülüyorsan ödeme oraya gidiyordu. Ama gerçek hayatta
       (inşaatta) yeni gelen para HER ZAMAN en eski ödenmemiş aya yazılmalı,
       hangi ayın sayfasında olduğun önemli değil. Artık bu düğme de, Ana
       ekrandaki "Avans" düğmesiyle birebir aynı otomatik mantığı kullanıyor —
       en eski ödenmemiş ayı kendisi bulup oraya yönlendiriyor. */
    ayDetayKapat();
    document.querySelector('[data-goruntu="odemeler"]').click();
    setTimeout(()=> formuAcVeOdaklan("#odeme-tutar"), 300);
  });

  /* Dünü kopyala */
  $("#btn-dun-kopya").addEventListener("click", ()=>{
    if(!modalTarih) return;
    const d = new Date(modalTarih+"T12:00:00");
    d.setDate(d.getDate()-1);
    const dun = girdiler[tarihId(d)];
    if(!dun){ toast("Dünün kaydı yok ki kopyalayayım 🤷"); return; }
    if(dun.durum!=="saatlik"){ modalDurum = dun.durum; durumButonYenile(); }
    $("#mesai-saat").value = (dun.mesaiYev != null ? dun.mesaiYev : (dun.mesai||0));
    $("#gun-arti").value = Number(dun.arti)||0;
    $("#gun-saat").value = Number(dun.saat)||ayarlar.gunlukSaat||8;
    $("#gun-santiye").value = dun.santiye||"";
    if(dun.santiyeId!=null) $("#gun-santiye-sec").value = dun.santiyeId||"";
    toast("Dünün bilgileri kopyalandı 📋 Kaydet'e basmayı unutma");
  });

  /* Not şablon çipleri artık dinamik — notCipCiz() çiziyor */

  /* Not defteri */
  $("#btn-not-ekle").addEventListener("click", async ()=>{
    const metin = $("#yeni-not").value.trim();
    if(!metin){ toast("Önce bir şeyler yaz kanka"); return; }
    try{
      if(duzenlenenNot){
        await kokRef().collection("notlar").doc(duzenlenenNot.id).update({metin, renk: seciliNotRenk});
        toast("Not güncellendi ✏️");
      }else{
        await kokRef().collection("notlar").add({
          metin, renk: seciliNotRenk, tarih: tarihId(new Date()), sabit: false,
          olusturma: firebase.firestore.FieldValue.serverTimestamp()
        });
        toast("Not kaydedildi 📝");
      }
      duzenlenenNot = null;
      $("#yeni-not").value = "";
      notRenkSec("");
      $("#btn-not-ekle").textContent = "Kaydet";
      $("#btn-not-vazgec").classList.add("gizli");
    }catch(e){ hataGoster(e); }
  });
  $("#btn-not-vazgec").addEventListener("click", ()=>{
    duzenlenenNot = null;
    $("#yeni-not").value = "";
    notRenkSec("");
    $("#btn-not-ekle").textContent = "Kaydet";
    $("#btn-not-vazgec").classList.add("gizli");
  });
  document.querySelectorAll("#not-renk-secim button").forEach(b=>
    b.addEventListener("click", ()=> notRenkSec(b.dataset.renk||"")));

  /* Yıl raporunu paylaş */
  $("#btn-yil-paylas").addEventListener("click", async ()=>{
    if(!yilSon || !yilSon.aylar.length){ toast("Önce yıl verisi yüklensin"); return; }
    let m = "📊 *YIL RAPORU — "+yilSon.yil+"*\n"+((kullanici&&kullanici.displayName)||"")+"\n```\n";
    m += "AY        GÜN  MESAİ  HAKEDİŞ\n";
    yilSon.aylar.forEach(a=>{
      m += String(a.ad).padEnd(10," ") + String(a.gun).padEnd(5," ") + String(a.mesai+"s").padEnd(7," ") + paraFmt(a.hak) + "\n";
    });
    m += "```\n💰 Toplam hakediş: "+paraFmt(yilSon.T.hak)+"\n💵 Alınan: "+paraFmt(yilSon.T.alinan)+"\n🔴 Kalan: "+paraFmt(yilSon.T.hak - yilSon.T.alinan);
    try{
      if(navigator.share) await navigator.share({text:m});
      else{ await navigator.clipboard.writeText(m); toast("Yıl raporu kopyalandı 📋"); }
    }catch(e){}
  });

  /* Şifre değiştir */
  $("#btn-sifre-degistir").addEventListener("click", async ()=>{
    if(!confirm("E-posta adresine şifre değiştirme bağlantısı gönderilsin mi?")) return;
    try{
      await auth.sendPasswordResetEmail(kullanici.email);
      toast("Bağlantı gönderildi, e-postanı kontrol et 📧");
    }catch(e){ hataGoster(e); }
  });

  /* Ay adına dokununca bugüne dön */
  $("#ay-ad").addEventListener("click", ()=> ayModalAc());

  /* Yazı boyutu */
  try{
    const yb = localStorage.getItem("yazi");
    if(yb){ document.body.style.fontSize = yb+"px"; $("#ayar-yazi").value = yb; }
  }catch(e){}
  $("#ayar-yazi").addEventListener("change", ()=>{
    const yb = $("#ayar-yazi").value;
    document.body.style.fontSize = yb+"px";
    try{ localStorage.setItem("yazi", yb); }catch(e){}
    toast("Yazı boyutu değişti 🔤");
  });

  /* Titreşim tercihi */
  try{ $("#ayar-titresim").checked = localStorage.getItem("titresim")!=="0"; }catch(e){}
  $("#ayar-titresim").addEventListener("change", ()=>{
    try{ localStorage.setItem("titresim", $("#ayar-titresim").checked?"1":"0"); }catch(e){}
  });

  /* "Cüzdan hareketi ekle" handler'ı kaldırıldı — Cüzdan özelliği tamamen kaldırıldı */

  /* Ödeme ekle / güncelle */
  $("#odeme-tarih").value = tarihId(new Date());
  $("#odeme-ait-ay").addEventListener("change", odemeTarihiAyaGoreAyarla);
  const odemeFormSifirla = ()=>{
    duzenlenenOdeme = null;
    $("#odeme-tutar").value=""; $("#odeme-not").value="";
    $("#btn-odeme-ekle").textContent = "Kaydet";
    $("#btn-odeme-vazgec").classList.add("gizli");
    odemeAitAySecDoldur();
  };
  $("#btn-odeme-vazgec").addEventListener("click", ()=>{ odemeFormSifirla(); toast("Düzenleme iptal edildi"); });
  let dekontFoto = null;
  $("#btn-dekont-foto").addEventListener("click", ()=> $("#dekont-foto-sec").click());
  $("#dekont-foto-sec").addEventListener("change", async e=>{
    const dosya = e.target.files && e.target.files[0];
    e.target.value = "";
    if(!dosya) return;
    toast("Dekont küçültülüyor...");
    try{
      dekontFoto = await fotoSikistir(dosya);
      const im = $("#dekont-onizle");
      im.src = dekontFoto; im.classList.remove("gizli");
      toast("Dekont hazır, Kaydet'e bas 🏦");
    }catch(err){ toast("Fotoğraf eklenemedi, başka dene"); }
  });
  $("#btn-odeme-ekle").addEventListener("click", async ()=>{
    const tarih = $("#odeme-tarih").value;
    const tutar = sinirla(sayi($("#odeme-tutar").value), SINIR.tutar, "Tutar", "TL");
    const aitAy = ($("#odeme-ait-ay") && $("#odeme-ait-ay").value) || (tarih ? tarih.slice(0,7) : "");
    if(!tarih || !tutar || tutar<=0){ toast("Tarih ve tutarı doldur kanka"); return; }
    /* Not: "Ay kilitli" kontrolü BİLEREK burada yok — kilit, sadece o ayın
       ÇALIŞMA kayıtlarını (gün işaretlemelerini) korumak için var. Avans/
       askeriye/maaş gibi ödemeler ise ayın kapanmasından SONRA da gelebilir
       (inşaatta normal bir şey) — bu yeni ödemeyi engellemek, "ay bitti ama
       parası hâlâ yatmadı" gerçek hayat senaryosunda parayı hiç
       kaydedemeyeceğin, kritik bir hataya yol açıyordu. */
    /* ÇİFT KAYIT KORUMASI: yeni ödeme eklerken ".add()" her tıklamada yeni
       kayıt oluşturuyor (düzenleme modunda zaten ".update()" olduğundan bu
       risk yok, ama yine de tutarlılık için düğme genel olarak kilitleniyor). */
    const btn = $("#btn-odeme-ekle");
    if(btn.disabled) return;
    btn.disabled = true;
    try{
      if(duzenlenenOdeme){
        /* Not: burada duzenlenenOdeme.tarih değil aitAy'a bakıyoruz — kilit,
           bu ödemenin GERÇEKTEN etkilediği ayı (hangi ayın bakiyesini
           değiştirdiğini) korumalı. Bir ödemenin tarihi Ağustos olup
           aitAy'ı Temmuz olabilir; o zaman korunması gereken Temmuz'dur. */
        if(ayKilitli(odemeAyi(duzenlenenOdeme)+"-15")){ toast("Kaydın sayıldığı ay kilitli 🔒"); return; }
        await kokRef().collection("odemeler").doc(duzenlenenOdeme.id).update({
          tarih, tutar, aitAy,
          tur: $("#odeme-tur").value,
          not: $("#odeme-not").value.trim()
        });
        odemeFormSifirla();
        toast("Ödeme güncellendi ✏️");
        return;
      }
      const oVeri = {
        tarih, tutar, aitAy,
        tur: $("#odeme-tur").value,
        not: $("#odeme-not").value.trim(),
        olusturma: firebase.firestore.FieldValue.serverTimestamp()
      };
      if(dekontFoto) oVeri.dekontlu = true;
      const oRef = await kokRef().collection("odemeler").add(oVeri);
      if(dekontFoto){
        try{ await kokRef().collection("dekontlar").doc(oRef.id).set({veri: dekontFoto}); }
        catch(fe){ toast("Ödeme kaydedildi ama dekont yüklenemedi 😕"); }
      }
      dekontFoto = null;
      const dOn = $("#dekont-onizle"); if(dOn) dOn.classList.add("gizli");
      $("#odeme-tutar").value=""; $("#odeme-not").value="";
      const [ay_yy, ay_aa] = aitAy.split("-").map(Number);
      if(ay_yy!==aktifYil || (ay_aa-1)!==aktifAy){
        /* Ödeme (FIFO gereği) başka bir AYA sayıldı — kullanıcıyı orada
           bırakıp sadece toast göstermek yetmiyordu, "hiçbir şey olmadı"
           gibi görünüyordu. Artık doğrudan o ayın ekranına geçiyoruz,
           kullanıcı kaydın gerçekten oraya yazıldığını gözüyle görsün.
           Not: burada TARİH değil AİT AY'a bakıyoruz — parayı bugün alsan
           bile (tarih=bugün), geçen ayın borcuna sayılıyorsa (aitAy=geçen ay)
           doğru olan geçen aya gitmek. */
        toast("💵 "+paraFmt(tutar)+" "+AYLAR[ay_aa-1]+" "+ay_yy+" ayının hesabına yazıldı ✓");
        aktifYil = ay_yy; aktifAy = ay_aa-1;
        ayiYukle(); ayBarCiz();
      }else{
        toast("Para girişi kaydedildi 💵");
      }
    }catch(e){ hataGoster(e); }
    finally{ btn.disabled = false; }
  });

  /* ---------- Tutar onarımı: "5.000" → 5 TL kaydedilmiş kayıtları düzelt ---------- */
  $("#btn-onarim").addEventListener("click", async ()=>{
    const btn = $("#btn-onarim");
    const kFmt = n => String(n).replace(".", ",") + " ₺";
    btn.disabled = true; btn.textContent = "Taranıyor...";
    try{
      const supheli = [];   /* {ref, veri, ac} */
      /* 1) Ayarlardaki yevmiye */
      const kokDoc = await kokRef().get();
      const a = kokDoc.exists ? kokDoc.data() : {};
      if(a.yevmiye>0 && a.yevmiye<100)
        supheli.push({ref:kokRef(), veri:{yevmiye:Math.round(a.yevmiye*1000)},
                      ac:"Ayarlar — yevmiye: "+kFmt(a.yevmiye)+" → "+kFmt(Math.round(a.yevmiye*1000))});
      /* 2) Gün kayıtlarına işlenmiş yevmiyeler */
      const duzgunYev = (a.yevmiye>0 && a.yevmiye<100) ? Math.round(a.yevmiye*1000) : (Number(a.yevmiye)||0);
      const gSnap = await kokRef().collection("girdiler").get();
      gSnap.forEach(doc=>{
        const v = doc.data();
        if(v.uYevmiye==null) return;
        const u = Number(v.uYevmiye)||0;
        if(u>0 && u<100)
          supheli.push({ref:doc.ref, veri:{uYevmiye:Math.round(u*1000)},
                        ac:doc.id+" — yevmiye: "+kFmt(u)+" → "+kFmt(Math.round(u*1000))});
        else if(u===0 && duzgunYev>=100)
          supheli.push({ref:doc.ref, veri:{uYevmiye:duzgunYev},
                        ac:doc.id+" — yevmiye: 0 ₺ → "+kFmt(duzgunYev)+" (ayarlardaki ücret)"});
      });
      /* 3) Ödemeler (avans vb.) */
      const oSnap = await kokRef().collection("odemeler").get();
      oSnap.forEach(doc=>{
        const v = doc.data();
        const t2 = Number(v.tutar)||0;
        if(t2>0 && t2<100)
          supheli.push({ref:doc.ref, veri:{tutar:Math.round(t2*1000)},
                        ac:(v.tarih||"?")+" — "+odemeTurEtiket(v.tur)+": "+kFmt(t2)+" → "+kFmt(Math.round(t2*1000))});
      });
      if(!supheli.length){ toast("Her şey yolunda, bozuk tutar bulamadım ✅"); return; }
      const onizle = supheli.slice(0,8).map(s=>"• "+s.ac).join("\n")
                   + (supheli.length>8 ? "\n… ve "+(supheli.length-8)+" kayıt daha" : "");
      if(!confirm("Nokta yüzünden 1000 kat küçük kaydedilmiş görünen "+supheli.length+" kayıt buldum:\n\n"+onizle+"\n\nHepsini 1000 ile çarpıp düzelteyim mi?\n(100 ₺ altındaki tutar gerçekse düzeltme yapma, bana yaz.)")) return;
      for(let i=0; i<supheli.length; i+=400){
        const batch = db.batch();
        supheli.slice(i, i+400).forEach(s=> batch.set(s.ref, s.veri, {merge:true}));
        await batch.commit();
      }
      toast(supheli.length+" kayıt düzeltildi 🩹 Rakamlar birazdan yenilenir");
      anaYukle();
    }catch(e){ hataGoster(e); }
    finally{ btn.disabled=false; btn.textContent="🩹 Bozuk tutarları tara ve düzelt"; }
  });


  /* Ayarlar */
  /* Çalışma şekli değişince saatlik alanları anında göster/gizle */
  const tipEl = $("#ayar-tip");
  if(tipEl) tipEl.addEventListener("change", ()=>{
    const g = $("#alan-saatlik-grup");
    if(g) g.classList.toggle("gizli", tipEl.value !== "saatlik");
  });

  $("#btn-ayar-kaydet").addEventListener("click", async ()=>{
    try{
      await kokRef().set({
        /* Ücret ayarları en kritik alanlar: yanlış girilen bir yevmiye
           TÜM geçmiş hesabı bozar (yeni kayıtlar bu orandan mühürlenir).
           Bu yüzden burada da sınır var. */
        yevmiye: sinirla(sayi($("#ayar-yevmiye").value), SINIR.yevmiye, "Günlük yevmiye", "TL"),
        mesaiUcret: sinirla(sayi($("#ayar-mesai").value), SINIR.yevmiye, "Mesai ücreti", "TL"),
        ekGunluk: sinirla(sayi($("#ayar-ek").value), SINIR.yevmiye, "Ek günlük", "TL"),
        saatUcret: sinirla(sayi($("#ayar-saat").value), SINIR.yevmiye, "Saat ücreti", "TL"),
        gunlukSaat: sinirla(sayi($("#ayar-gunsaat").value), SINIR.calismaSaat, "Günlük saat", "saat")||8,
        calismaTipi: $("#ayar-tip").value,
        hedef: sayi($("#ayar-hedef").value)||0,
        uyariEsik: sayi($("#ayar-esik").value)||0,
        /* kumbara alanı kaldırıldı — Cüzdan özelliği tamamen kaldırıldı */
        notCipler: $("#ayar-cipler").value.split(",").map(x=>x.trim()).filter(Boolean).slice(0,8),
        santiye: $("#ayar-santiye").value.trim(),
        iseGiris: $("#ayar-giris").value || "",
        maasGunu: Math.max(0, Math.min(31, Math.round(sayi($("#ayar-maas").value))))
        ,pazarZam: Math.max(0, sayi($("#ayar-pazar-zam").value)||0)
        ,tatilZam: Math.max(0, sayi($("#ayar-tatil-zam").value)||0)
        ,geceZam: Math.max(0, sayi($("#ayar-gece-zam").value)||0)
        ,parcaBirim: ($("#ayar-parca-birim").value||"adet").trim().slice(0,12)
        ,parcaFiyat: Math.max(0, sayi($("#ayar-parca-fiyat").value)||0)
      },{merge:true});
      toast("Ayarlar kaydedildi ⚙️");
    }catch(e){ hataGoster(e); }
  });
  $("#btn-ad-kaydet").addEventListener("click", async ()=>{
    const ad = $("#ayar-ad").value.trim();
    if(!ad){ toast("Ad boş olamaz"); return; }
    try{
      await auth.currentUser.updateProfile({displayName:ad});
      kullanici = auth.currentUser; kullaniciBilgiYaz();
      kokRef().set({ad},{merge:true}).catch(()=>{});
      toast("Adın güncellendi 👍");
    }catch(e){ hataGoster(e); }
  });

  /* Rapor paylaş & PDF */
  $("#btn-rapor").addEventListener("click", ()=> donemAc("paylas"));
  $("#btn-pdf").addEventListener("click", ()=> donemAc("pdf"));
  $("#btn-png").addEventListener("click", ()=> donemAc("png"));

  /* Kayıt arama */
  $("#kayit-ara").addEventListener("input", gunListesiCiz);

  /* Şantiye ekle / güncelle */
  $("#yeni-santiye-yevmiye").addEventListener("input", ()=>{
    /* 2026 yasal günlük brüt asgari ücret: 1.101₺ (SGK günlük kazanç alt
       sınırı). Enformel/nakit yevmiyeli çalışmada brüt-net ayrımı genelde
       yapılmadığından kaba bir referans olarak kullanılıyor — engellemiyor,
       sadece bilgilendiriyor, kullanıcı isterse yine de kaydedebiliyor. */
    const y = sayi($("#yeni-santiye-yevmiye").value)||0;
    $("#yevmiye-asgari-uyari").classList.toggle("gizli", !(y>0 && y<1101));
  });
  $("#btn-santiye-ekle").addEventListener("click", async ()=>{
    const ad = $("#yeni-santiye-ad").value.trim();
    const yevmiye = sayi($("#yeni-santiye-yevmiye").value)||0;
    const mesaiUcret = sayi($("#yeni-santiye-mesai").value)||0;
    if(!ad || !yevmiye){ toast("Şantiye adı ve yevmiyesini yaz kanka"); return; }
    try{
      let yeniId = null;
      if(duzenlenenSantiyeId){
        const yeni = ayarlar.santiyeler.map(x=> x.id===duzenlenenSantiyeId ? {...x, ad, yevmiye, mesaiUcret} : x);
        await kokRef().set({santiyeler: yeni},{merge:true});
      }else{
        /* GÜVENLİK/SAĞLAMLIK: eskiden "[...ayarlar.santiyeler, yeni]" ile YEREL
           diziyi okuyup üstüne ekleyip TAMAMINI geri yazıyorduk — eğer kullanıcı
           çok hızlı art arda iki şantiye eklerse (Firestore'un ilk yazmayı
           yerel `ayarlar.santiyeler`'e yansıtması birkaç yüz milisaniye sürebilir),
           ikinci yazma hâlâ ESKİ (birinciyi içermeyen) diziyi baz alıp üzerine
           yazabilir, ilk eklenen şantiye sessizce kaybolabilirdi. Firestore'un
           kendi atomik `arrayUnion` işlemi bu riski tamamen ortadan kaldırıyor —
           sunucu tarafında "diziye ekle" işlemi yapılıyor, yerel diziye hiç
           bakılmıyor, iki hızlı yazma birbirini asla ezemiyor. */
        yeniId = Date.now().toString(36);
        await kokRef().set({
          santiyeler: firebase.firestore.FieldValue.arrayUnion({id: yeniId, ad, yevmiye, mesaiUcret})
        },{merge:true});
      }
      if(yeniId){
        /* Yeni bir şantiye/patron eklendiğinde bunu otomatik "son kullanılan"
           yap — aksi halde bir sonraki gün kaydı hâlâ ESKİ şantiyeyi hatırlar
           (kullanıcı elle seçmeyi unutursa yanlış şantiyeye/ücrete kaydolur,
           bildirilen kritik sorun tam buydu). İşe yeni başlayınca ilk iş
           şantiyeyi eklemek olacağından, akış artık doğal ve güvenli. */
        try{ localStorage.setItem("sonSantiye", yeniId); }catch(e){}
        toast("🏗️ "+ad+" eklendi — bundan sonraki gün kayıtların otomatik buraya yazılacak");
      }else{
        toast("Şantiye güncellendi ✏️ (yeni günler yeni ücretten)");
      }
      duzenlenenSantiyeId = null;
      $("#btn-santiye-ekle").textContent = "➕ Şantiye ekle";
      $("#yeni-santiye-ad").value=""; $("#yeni-santiye-yevmiye").value=""; $("#yeni-santiye-mesai").value="";
    }catch(e){ hataGoster(e); }
  });

  /* Belge / sertifika ekle (ehliyet, SRC, MYK ustalık belgesi vb.) */
  $("#btn-belge-ekle").addEventListener("click", async ()=>{
    const ad = $("#yeni-belge-ad").value.trim();
    const tarih = $("#yeni-belge-tarih").value;
    if(!ad || !tarih){ toast("Belge adı ve son geçerlilik tarihini gir"); return; }
    try{
      /* Yarış durumu düzeltmesi (şantiyeler ile aynı sebep): atomik arrayUnion */
      await kokRef().set({
        belgeler: firebase.firestore.FieldValue.arrayUnion({id: Date.now().toString(36), ad, tarih})
      },{merge:true});
      toast("Belge eklendi 📄 — süresi yaklaşınca haber veririm");
      $("#yeni-belge-ad").value=""; $("#yeni-belge-tarih").value="";
    }catch(e){ hataGoster(e); }
  });

  /* Plan/proje linki ekle (WhatsApp/Drive'dan gelen PDF ve fotoğraflar) */
  $("#btn-plan-ekle").addEventListener("click", async ()=>{
    /* ÇİFT TIKLAMA KORUMASI (0.1.2.0)
       Bu düğme `.add()` ile YENİ kayıt oluşturuyor; hızlı iki dokunuşta
       aynı plan iki kez kaydediliyordu. Ödeme, masraf, borç ve
       beklenen düğmelerinde bu koruma zaten vardı, bu üçü atlanmış. */
    const _dg = document.getElementById("btn-plan-ekle");
    if(_dg && _dg.disabled) return;
    if(_dg) _dg.disabled = true;
    try{
      const ad = $("#plan-ad").value.trim();
      const link = $("#plan-link").value.trim();
      if(!ad || !link){ toast("Plan adı ve linki gir kanka"); return; }
      if(!linkGuvenliMi(link)){ toast("Geçerli bir http(s) linki yapıştır"); return; }
      try{
        const santiyeId = $("#plan-santiye-sec").value || "";
        await kokRef().collection("planlar").add({
          ad, link, santiyeId, eklenme: Date.now()
        });
        toast("Plan eklendi 📐");
        $("#plan-ad").value=""; $("#plan-link").value="";
      }catch(e){ hataGoster(e); }
    
    }finally{
      if(_dg) _dg.disabled = false;
    }
  });

  /* Not: Eskiden burada JS ile (#manifest-link üzerinden) ikinci, ayrı bir
     manifest üretilip sayfaya enjekte ediliyordu — gerçek manifest.webmanifest
     dosyamız zaten var ve daha eksiksiz (düzgün PNG ikonlar, kısayollar vb).
     İki farklı manifest'in aynı anda var olması, Android'in kurulu PWA'yı
     "güvenilir" sayıp saymama kontrolünü şaşırtabiliyordu — bu da ana ekrandan
     açarken bazen Chrome/Google arayüzünün belirip sonra uygulamaya geçmesine
     yol açmış olabilir. Kaldırıldı, artık tek ve gerçek manifest kullanılıyor. */

  /* PWA: "Ana ekrana ekle" butonu — iOS'ta otomatik kurulum sorusu çıkmadığı için
     elle rehber gösteriyoruz, Android/Chrome'da varsa gerçek kurulum penceresini açıyoruz. */
  let ertelenmisKurulum = null;
  try{
    const zatenKurulu = ()=>{
      try{
        return window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
          || window.navigator.standalone === true;
      }catch(e){ return false; }
    };
    const kurSatiri = document.getElementById("li-anaekran-ekle");
    if(kurSatiri){
      if(zatenKurulu()){
        kurSatiri.classList.add("gizli");
      }else{
        kurSatiri.classList.remove("gizli");
      }
    }
    window.addEventListener('beforeinstallprompt', (e)=>{
      try{
        e.preventDefault();
        ertelenmisKurulum = e;
        if(kurSatiri) kurSatiri.classList.remove("gizli");
      }catch(err){}
    });
    window.addEventListener('appinstalled', ()=>{
      try{
        ertelenmisKurulum = null;
        if(kurSatiri) kurSatiri.classList.add("gizli");
        toast("Uygulama ana ekrana eklendi 📲");
      }catch(err){}
    });
  }catch(e){}

  const kurRehberiAc = ()=>{
    try{
      const ua = (navigator.userAgent || navigator.vendor || "").toLowerCase();
      const iosMu = /iphone|ipad|ipod/.test(ua) || (ua.includes("mac") && navigator.maxTouchPoints > 1);
      const iosAdim = document.getElementById("kur-ios-adim");
      const androidAdim = document.getElementById("kur-android-adim");
      if(iosAdim) iosAdim.classList.toggle("gizli", !iosMu);
      if(androidAdim) androidAdim.classList.toggle("gizli", iosMu);
      $("#modal-perde").classList.add("acik");
      $("#kur-modal").classList.add("acik");
    }catch(e){}
  };
  const btnKurElem = document.getElementById("btn-anaekran-ekle");
  if(btnKurElem){
    btnKurElem.addEventListener("click", async ()=>{
      try{
        try{
          const cekEl = document.getElementById("cekmece");
          if(cekEl) cekEl.classList.remove("acik");
          const perEl = document.getElementById("perde");
          if(perEl) perEl.classList.remove("acik");
        }catch(e){}
        if(ertelenmisKurulum){
          try{
            ertelenmisKurulum.prompt();
            await ertelenmisKurulum.userChoice;
          }catch(e){}
          ertelenmisKurulum = null;
        }else{
          kurRehberiAc();
        }
      }catch(e){
        kurRehberiAc();
      }
    });
  }
  /* Ay detayı paylaşım düğmeleri */
  const btnAyWp = document.getElementById("btn-ay-detay-wp");
  if(btnAyWp) btnAyWp.addEventListener("click", ()=> ayDetayPaylas("wp"));
  const btnAyPdf = document.getElementById("btn-ay-detay-pdf");
  if(btnAyPdf) btnAyPdf.addEventListener("click", ()=> ayDetayPaylas("pdf"));

  /* Toplu yoklama düğmeleri */
  const btnYokTam = document.getElementById("btn-yok-hepsi-tam");
  if(btnYokTam) btnYokTam.addEventListener("click", ()=> yoklamaTopluIsaretle("tam"));
  const btnYokYarim = document.getElementById("btn-yok-hepsi-yarim");
  if(btnYokYarim) btnYokYarim.addEventListener("click", ()=> yoklamaTopluIsaretle("yarim"));
  const btnYokTemiz = document.getElementById("btn-yok-temizle");
  if(btnYokTemiz) btnYokTemiz.addEventListener("click", ()=>{
    if(!confirm("Bu günün yoklama seçimlerini temizlemek istiyor musun?\n(Kaydedilmiş yoklama silinmez — sadece ekrandaki seçim sıfırlanır)")) return;
    yoklamaTopluIsaretle("yok");
  });

  /* Masraf raporu düğmeleri */
  const btnMasrafPdf = document.getElementById("btn-masraf-pdf");
  if(btnMasrafPdf) btnMasrafPdf.addEventListener("click", ()=> masrafPdfPaylas(false));
  const btnMasrafPdfFis = document.getElementById("btn-masraf-pdf-fis");
  if(btnMasrafPdfFis) btnMasrafPdfFis.addEventListener("click", ()=> masrafPdfPaylas(true));

  /* İşveren onayı bağlantısı */
  const btnMut = document.getElementById("btn-mutabakat");
  if(btnMut) btnMut.addEventListener("click", mutabakatOlustur);

  const btnKurTamam = document.getElementById("btn-kur-tamam");
  if(btnKurTamam){
    btnKurTamam.addEventListener("click", ()=>{
      try{
        $("#modal-perde").classList.remove("acik");
        $("#kur-modal").classList.remove("acik");
    $("#donem-modal").classList.remove("acik");
    $("#ay-modal").classList.remove("acik");
      }catch(e){}
    });
  }

  /* Toplu işleme */
  const topluAc = ac=>{
    $("#modal-perde").classList.toggle("acik", ac);
    $("#toplu-modal").classList.toggle("acik", ac);
  };
  $("#btn-toplu").addEventListener("click", ()=>{
    const ilk = aktifYil+"-"+pad(aktifAy+1)+"-01";
    const son = aktifYil+"-"+pad(aktifAy+1)+"-"+pad(new Date(aktifYil,aktifAy+1,0).getDate());
    $("#toplu-bas").value = ilk;
    $("#toplu-son").value = son;
    topluAc(true);
  });
  $("#btn-toplu-iptal").addEventListener("click", ()=> topluAc(false));
  $("#btn-toplu-kaydet").addEventListener("click", async ()=>{
    const basT = $("#toplu-bas").value, sonT = $("#toplu-son").value;
    if(!basT || !sonT || basT > sonT){ toast("Tarih aralığını düzgün seç kanka"); return; }
    const b = new Date(basT+"T12:00:00"), s = new Date(sonT+"T12:00:00");
    const gunFarki = Math.round((s-b)/86400000)+1;
    if(gunFarki > 366){ toast("En fazla 1 yıllık aralık seçebilirsin"); return; }
    const durum = $("#toplu-durum").value;
    if(durum==="sil" && !confirm("Bu aralıktaki TÜM puantaj kayıtları silinecek. Emin misin?")) return;
    const mesai = sayi($("#toplu-mesai").value)||0;
    const pazarAtla = $("#toplu-pazar").checked;
    const doluKoru = $("#toplu-koru").checked;
    const koru = new Set();
    if(doluKoru){
      try{
        const snap = await kokRef().collection("girdiler")
          .where(firebase.firestore.FieldPath.documentId(), ">=", basT)
          .where(firebase.firestore.FieldPath.documentId(), "<=", sonT).get();
        snap.forEach(doc=> koru.add(doc.id));
      }catch(e){ hataGoster(e); return; }
    }
    let batch = db.batch(), sayac=0, toplam=0, kilitliAtlanan=0;
    const batches=[batch];
    const saatlikMod = ayarlar.calismaTipi==="saatlik";
    for(let d=new Date(b); d<=s; d.setDate(d.getDate()+1)){
      if(pazarAtla && d.getDay()===0) continue;
      const id = tarihId(d);
      if(ayKilitli(id)){ kilitliAtlanan++; continue; }
      if(durum==="sil"){
        batch.delete(kokRef().collection("girdiler").doc(id));
        sayac++; toplam++;
        if(sayac===450){ batch = db.batch(); batches.push(batch); sayac=0; }
        continue;
      }
      if(koru.has(id)) continue;
      const veri = {
        durum: (saatlikMod && durum!=="gelmedi") ? "saatlik" : durum,
        mesai,
        santiye: ayarlar.santiye||"", santiyeId:"", not:"",
        ...guncelOranlar("", id),
        guncelleme: firebase.firestore.FieldValue.serverTimestamp()
      };
      if(veri.durum==="saatlik"){
        veri.saat = durum==="yarim" ? (ayarlar.gunlukSaat||8)/2 : (ayarlar.gunlukSaat||8);
      }
      batch.set(kokRef().collection("girdiler").doc(id), veri);
      sayac++; toplam++;
      if(sayac===450){ batch = db.batch(); batches.push(batch); sayac=0; }
    }
    if(!toplam){
      toast(kilitliAtlanan ? "Seçtiğin günler kilitli aylarda 🔒" : "İşlenecek gün kalmadı (hepsi dolu ya da pazar)");
      return;
    }
    try{
      for(const bt of batches) await bt.commit();
      topluAc(false);
      toast(toplam + (durum==="sil" ? " gün temizlendi 🗑️" : " gün işlendi ✅") + (kilitliAtlanan ? " ("+kilitliAtlanan+" gün kilitli ayda, atlandı)" : ""));
    }catch(e){ hataGoster(e); }
  });

  /* Tema (varsayılan: koyu) */
  const temaYaz = ()=>{
    const acik = document.documentElement.dataset.tema==="acik";
    $("#btn-tema").textContent = acik ? "🌙 Karanlık moda geç" : "☀️ Aydınlık moda geç";
  };
  try{
    if(localStorage.getItem("tema")==="acik") document.documentElement.dataset.tema="acik";
  }catch(e){}
  temaYaz();
  $("#btn-tema").addEventListener("click", ()=>{
    const acik = document.documentElement.dataset.tema==="acik";
    if(acik) delete document.documentElement.dataset.tema;
    else document.documentElement.dataset.tema="acik";
    try{ localStorage.setItem("tema", acik?"koyu":"acik"); }catch(e){}
    temaYaz();
    toast(acik ? "Karanlık mod açık 🌙" : "Aydınlık mod açık ☀️");
  });

  /* CSV & yedek */
  $("#btn-csv").addEventListener("click", csvIndir);
  $("#btn-xlsx").addEventListener("click", excelIndir);
  $("#btn-yil-pdf").addEventListener("click", async ()=>{
    try{ await yilPdfPaylas(); }
    catch(e){ hataGoster(e); }   /* önceden sessizce başarısız oluyordu — artık hata görünür */
  });

  /* ---------- 💼 İşlerim: giriş / çıkış / detay ---------- */
  /* Profil fotoğrafı değiştirme buradan (hamburger menü avatarı) kaldırıldı —
     kullanıcı isteğiyle artık sadece Ayarlar ekranından yapılıyor, tek ve net
     bir yer olsun diye. Bu avatar artık sadece GÖRÜNTÜLÜYOR, tıklanamıyor. */
  $("#btn-ayar-foto-degistir").addEventListener("click", ()=> $("#profil-foto-input").click());
  $("#profil-foto-input").addEventListener("change", e=>{
    const dosya = e.target.files && e.target.files[0];
    if(dosya) profilFotoSecildi(dosya);
    e.target.value = "";   /* aynı dosyayı art arda seçebilsin diye sıfırla */
  });

  $("#btn-menu-is-giris").addEventListener("click", ()=>{
    cekmeceAc(false);
    if(aktifIs()){ toast("Zaten aktif bir işin var (" + aktifIs().patronAdi + ") — önce ondan çıkış yapmalısın 🚪"); return; }
    const adSoyad = ((kullanici && kullanici.displayName) || "").trim().split(/\s+/);
    $("#is-giris-ad").value = adSoyad.length>1 ? adSoyad.slice(0,-1).join(" ") : (adSoyad[0]||"");
    $("#is-giris-soyad").value = adSoyad.length>1 ? adSoyad[adSoyad.length-1] : "";
    $("#is-giris-santiye").value = "";
    $("#is-giris-patron").value = "";
    $("#is-giris-tarih").value = tarihId(new Date());
    $("#modal-perde").classList.add("acik");
    $("#is-giris-modal").classList.add("acik");
  });
  $("#btn-isler-giris").addEventListener("click", ()=> $("#btn-menu-is-giris").click());
  $("#btn-is-giris-kaydet").addEventListener("click", async ()=>{
    if(aktifIs()){ toast("Zaten aktif bir işin var — önce ondan çıkış yapmalısın 🚪"); return; }
    const ad = $("#is-giris-ad").value.trim();
    const soyad = $("#is-giris-soyad").value.trim();
    const santiyeAdi = $("#is-giris-santiye").value.trim();
    const patronAdi = $("#is-giris-patron").value.trim();
    const girisTarihi = $("#is-giris-tarih").value;
    /* Kullanıcı isteği: bu alanlar KESİNLİKLE zorunlu — hiçbiri boş geçilemez */
    if(!ad || !soyad || !santiyeAdi || !patronAdi || !girisTarihi){
      toast("Ad, soyad, şantiye, patron ve giriş tarihi — hepsi zorunlu kanka ⚠️");
      return;
    }
    try{
      const yeni = {id: Date.now().toString(36), ad, soyad, santiyeAdi, patronAdi, girisTarihi, cikisTarihi: null};
      /* Yarış durumu düzeltmesi: atomik arrayUnion (aynı gerekçe: santiyeler/belgeler) */
      await kokRef().set({isler: firebase.firestore.FieldValue.arrayUnion(yeni)}, {merge:true});
      toast("🏗️ İşe giriş kaydedildi: "+patronAdi);
      $("#is-giris-modal").classList.remove("acik");
      $("#modal-perde").classList.remove("acik");
    }catch(e){ hataGoster(e); }
  });

  $("#btn-menu-is-cikis").addEventListener("click", ()=>{
    cekmeceAc(false);
    const is = aktifIs();
    if(!is){ toast("Aktif bir işin yok, çıkış yapılacak bir şey bulunamadı"); return; }
    $("#is-cikis-bilgi").innerHTML = "<b>"+esc(is.patronAdi)+"</b> — "+esc(is.santiyeAdi)+"<br>Giriş: "+tarihFormatla(is.girisTarihi);
    $("#is-cikis-tarih").value = tarihId(new Date());
    $("#is-cikis-tarih").min = is.girisTarihi;
    $("#is-cikis-sonrasi").classList.add("gizli");
    $("#modal-perde").classList.add("acik");
    $("#is-cikis-modal").classList.add("acik");
  });
  $("#btn-is-cikis-kaydet").addEventListener("click", async ()=>{
    const is = aktifIs();
    if(!is){ toast("Aktif iş bulunamadı"); return; }
    const cikisTarihi = $("#is-cikis-tarih").value;
    if(!cikisTarihi){ toast("Çıkış tarihi zorunlu ⚠️"); return; }
    if(cikisTarihi < is.girisTarihi){ toast("Çıkış tarihi girişten önce olamaz"); return; }
    try{
      const yeni = (ayarlar.isler||[]).map(x=> x.id===is.id ? {...x, cikisTarihi} : x);
      await kokRef().set({isler: yeni}, {merge:true});
      isDetayAktif = {...is, cikisTarihi};
      toast("🚪 İşten çıkış kaydedildi");
      $("#is-cikis-sonrasi").classList.remove("gizli");
      isAySecenekleriCiz("#is-cikis-aylar", isDetayAktif);
    }catch(e){ hataGoster(e); }
  });
  $("#btn-is-cikis-pdf").addEventListener("click", ()=>{ if(isDetayAktif) isPdfPaylas(isDetayAktif); });
  $("#btn-is-detay-pdf").addEventListener("click", ()=>{ if(isDetayAktif) isPdfPaylas(isDetayAktif); });

  $("#btn-yedek").addEventListener("click", yedekAl);

  /* Önbelleği temizle */
  $("#btn-onbellek-temizle").addEventListener("click", async ()=>{
    if(!confirm("Önbellek temizlenip sayfa yenilenecek. Kayıtların bulutta güvende, sadece uygulamanın dosya önbelleği silinir. Devam edilsin mi?")) return;
    try{
      if("caches" in window){
        const adlar = await caches.keys();
        await Promise.all(adlar.map(a=> caches.delete(a)));
      }
      if("serviceWorker" in navigator){
        const kayitlar = await navigator.serviceWorker.getRegistrations();
        await Promise.all(kayitlar.map(k=> k.unregister()));
      }
      toast("Önbellek temizlendi, yenileniyor…");
      setTimeout(()=> location.reload(true), 600);
    }catch(e){
      toast("Temizlenemedi, elle sayfayı yenile");
      hataGoster(e);
    }
  });

  /* Çıkış */
  $("#btn-cikis").addEventListener("click", ()=>{
    if(confirm("Çıkış yapmak istiyor musun?")) auth.signOut();
  });

  basla();
});

/* ---------- Bildirim ---------- */
let toastZaman=null;
function toast(m){
  const t = $("#toast");
  t.textContent = m;
  t.classList.add("goster");
  clearTimeout(toastZaman);
  toastZaman = setTimeout(()=> t.classList.remove("goster"), 2600);
}


/* ═══════════════════════════════════════════════════════════════════
   🔧 TANI / TEST MOTORU

   ⚠️ BU KOD app.js'İ SARAN (function(){...})() BLOĞUNUN İÇİNDE OLMALI.
   0.0.4.2'de dosyanın sonuna, o bloğun DIŞINA eklenmişti; bu yüzden
   $, kullanici, ayarlar gibi uygulama değişkenlerinin hiçbirine
   erişemiyor ve ilk satırda "$ is not defined" hatasıyla çöküyordu.
   Yeni kod eklerken dosyanın en sonundaki "})();" satırının ÜSTÜNDE
   kalmasına dikkat et.
   ───────────────────────────────────────────────────────────────────
   Amaç: "burada sıkıntı var mı?" sorusunu göz kararıyla değil, ölçerek
   yanıtlamak. Uygulama kendi kendini kontrol eder ve kopyalanabilir bir
   rapor üretir.

   Kapsam: YALNIZCA giriş yapmış kullanıcının KENDİ verisi ve kendi
   ekranı. Başka kullanıcının verisine erişmez, hiçbir şey YAZMAZ —
   sadece okur ve karşılaştırır.
   ═══════════════════════════════════════════════════════════════════ */
let taniSatirlar = [];
/* Her kontrol tamamlandığında ekranı ANINDA tazeler.
   Eskiden tüm kontroller bitmeden hiçbir şey yazılmıyordu; 10 ayrı veritabanı
   okuması yapıldığı için yavaş bağlantıda ya da çok kayıtta kullanıcı sonsuza
   kadar "Test ediliyor…" görüyor, hiçbir sonuç alamıyordu. Bir tanı aracının
   en son yapması gereken şey budur — artık her satır anında görünüyor, test
   ortada takılsa bile o ana kadarki sonuçlar ekranda kalıyor. */
function taniYaz(durum, baslik, detay){
  /* detay 0 veya "0" olabilir; `detay||""` bunu boşa çeviriyordu
     ("Kayıt sayısı" satırı bomboş görünüyordu). */
  taniSatirlar.push({durum, baslik, detay: (detay===undefined||detay===null) ? "" : String(detay)});
  try{ taniSonucCiz(); }catch(e){}
}

/* Firestore çağrılarına zaman sınırı koyar. Ağ koparsa Firestore isteği
   SONSUZA KADAR bekleyebilir; bu, testin ortada asılı kalmasının ana sebebiydi.
   Süre dolarsa hata fırlatır, o kontrol "zaman aşımı" olarak işaretlenir ve
   test bir sonrakine geçer. */
function taniSureli(soz, saniye){
  return Promise.race([
    soz,
    new Promise((_,red)=> setTimeout(()=> red(new Error("zaman aşımı ("+saniye+" sn)")), saniye*1000))
  ]);
}

/* Ekranda görünen bir sayıyı, ham veriden yeniden hesaplanan değerle
   karşılaştırır. "Köprü" hatalarını yakalayan asıl kontrol budur:
   ekranda yazan ile verinin söylediği aynı mı? */
function taniSayiCek(id){
  const el = document.getElementById(id);
  if(!el) return null;
  const m = (el.textContent||"").replace(/[^\d,.-]/g,"").trim();
  if(!m) return null;
  return sayi(m);
}

async function taniCalistir(){
  taniSatirlar = [];
  const btn = $("#btn-tani-calistir");
  if(btn){ btn.disabled = true; btn.textContent = "Test ediliyor…"; }
  const t0 = Date.now();

  /* Her bölüm kendi try/catch'inde. Biri çökse bile diğerleri çalışmaya
     devam eder — tek bir hata tüm raporu boş bırakmasın diye. */
  const bolum = async (ad, fn)=>{
    taniYaz("bolum", ad);
    try{ await fn(); }
    catch(e){ taniYaz("hata", ad+" bölümü çöktü", (e&&e.message)||String(e)); }
  };
  const V = v => (v===undefined||v===null||v==="") ? "—" : v;

  /* Ortak veri: bir kez çekilip tüm bölümlerde kullanılır (tekrar okuma maliyeti olmasın) */
  let tumG=[], tumO=[], tumM=[], tumB=[], tumBk=[], tumE=[], tumEg=[], tumN=[], tumK=[], tumP=[];
  const cek = async (ad, sn=12)=>{
    try{ const qs = await taniSureli(kokRef().collection(ad).get(), sn);
         const r=[]; qs.forEach(d=> r.push({id:d.id, ...d.data()})); return r; }
    catch(e){ taniYaz("uyari", "Veri çekilemedi: "+ad, (e&&e.message)||""); return null; }
  };

  /* ═══════ 1. ORTAM ═══════ */
  await bolum("1. ORTAM VE SÜRÜM", async ()=>{
    taniYaz("bilgi", "Uygulama sürümü", V(window.__SURUM));
    try{
      const kayit = await navigator.serviceWorker.getRegistration();
      if(!kayit) taniYaz("uyari","Çevrimdışı motoru","KAYITLI DEĞİL — internet yokken uygulama açılmaz");
      else{
        taniYaz(kayit.active?"ok":"uyari","Çevrimdışı motoru", kayit.active?"aktif":"kayıtlı ama pasif");
        if(kayit.waiting) taniYaz("uyari","Bekleyen güncelleme","Yeni sürüm indirildi, yenilenmeyi bekliyor");
      }
      const kasalar = await caches.keys();
      taniYaz(kasalar.length?"ok":"uyari","Çevrimdışı önbellek", kasalar.length?kasalar.join(", "):"BOŞ — çevrimdışı çalışmaz");
    }catch(e){ taniYaz("uyari","Çevrimdışı motoru", e.message); }
    taniYaz(navigator.onLine?"ok":"uyari","İnternet", navigator.onLine?"bağlı":"YOK (çevrimdışı moddasın)");
    taniYaz("bilgi","Cihaz","RAM "+V(navigator.deviceMemory)+" GB · "+V(navigator.hardwareConcurrency)+" çekirdek · ekran "+screen.width+"×"+screen.height);
    taniYaz("bilgi","Hafif mod", document.documentElement.getAttribute("data-hafif")==="1"?"AÇIK (animasyonlar kısıtlı)":"kapalı");
    try{
      const kota = await navigator.storage.estimate();
      const mb = (kota.usage/1048576).toFixed(1), lim=(kota.quota/1048576).toFixed(0);
      taniYaz(kota.usage/kota.quota>0.9?"hata":"ok","Depolama", mb+" MB kullanılıyor / "+lim+" MB sınır");
    }catch(e){}
    let ls=true; try{ localStorage.setItem("_t","1"); localStorage.removeItem("_t"); }catch(e){ ls=false; }
    taniYaz(ls?"ok":"hata","Yerel depolama", ls?"yazılabiliyor":"YAZILAMIYOR — ayarlar kaydedilmez");
  });

  /* ═══════ 2. GİRİŞ VE GÜVENLİK ═══════ */
  await bolum("2. GİRİŞ VE GÜVENLİK", async ()=>{
    taniYaz(kullanici?"ok":"hata","Oturum", kullanici?kullanici.email:"GİRİŞ YAPILMAMIŞ");
    if(kullanici){
      taniYaz(kullanici.emailVerified?"ok":"uyari","E-posta doğrulama", kullanici.emailVerified?"doğrulanmış":"doğrulanmamış");
      taniYaz("bilgi","Kullanıcı kimliği", kullanici.uid.slice(0,10)+"…");
    }
    /* DÜZELTME: anahtar "pinKod" değil "pin" (bkz. localStorage.setItem("pin", …)).
       Yanlış anahtar yüzünden PIN kurulu olduğu hâlde "KURULU DEĞİL" deniyordu. */
    let pin=false; try{ pin = !!localStorage.getItem("pin"); }catch(e){}
    taniYaz(pin?"ok":"uyari","PIN kilidi", pin?"kurulu":"KURULU DEĞİL — telefonu alan verilerini görür");
    try{
      const t=Date.now(); await taniSureli(kokRef().get(), 10);
      taniYaz("ok","Veritabanı bağlantısı", (Date.now()-t)+" ms");
    }catch(e){ taniYaz("hata","Veritabanı bağlantısı", (e.code||"")+" "+e.message); }
    try{
      /* Başkasının verisine erişilebiliyor mu? Erişebiliyorsa kurallar açık demektir. */
      /* DÜZELTME: "__" ile başlayan doküman kimlikleri Firestore'da REZERVE.
         Bu yüzden test, kural denemesine hiç ulaşamadan biçim hatası veriyordu. */
      await taniSureli(db.collection("kullanicilar").doc("tanitest0000000000").get(), 8);
      /* Bu BEKLENEN davranış (0.1.2.0'da düzeltildi).
         "Herkes" ekranı başkalarının adını ve ücret ayarlarını okuyabilmeli,
         bu yüzden `kullanicilar/{id}` okuması giriş yapmış herkese açık.
         Kritik olan YAZMA — o yalnızca belgenin sahibinde.
         Eskiden bu satır "kuralları gözden geçir" diye uyarı veriyordu ve
         tanı raporunu okuyan kişi olmayan bir açık sanıyordu. */
      taniYaz("bilgi","Güvenlik kuralları",
        "Profil okuma açık (Herkes ekranı için gerekli) · yazma yalnızca sahibinde");
    }catch(e){
      taniYaz(String(e.code||"").includes("permission")?"ok":"bilgi","Güvenlik kuralları",
        String(e.code||"").includes("permission")?"başkasının verisi korunuyor ✓":"kontrol edilemedi: "+e.message);
    }
  });

  /* ═══════ 3. ÜCRET VE ÇALIŞMA AYARLARI ═══════ */
  await bolum("3. ÜCRET VE ÇALIŞMA AYARLARI", async ()=>{
    const tip = ayarlar.calismaTipi||"yevmiye";
    taniYaz("bilgi","Çalışma tipi", tip);
    if(tip==="yevmiye")
      taniYaz(ayarlar.yevmiye>0?"ok":"hata","Günlük yevmiye", ayarlar.yevmiye>0?paraFmt(ayarlar.yevmiye):"GİRİLMEMİŞ — kazançların 0 görünür");
    if(tip==="saatlik")
      taniYaz(ayarlar.saatUcret>0?"ok":"hata","Saat ücreti", ayarlar.saatUcret>0?paraFmt(ayarlar.saatUcret):"GİRİLMEMİŞ");
    if(tip==="parca")
      taniYaz(ayarlar.parcaFiyat>0?"ok":"hata","Parça fiyatı", ayarlar.parcaFiyat>0?paraFmt(ayarlar.parcaFiyat)+" / "+V(ayarlar.parcaBirim):"GİRİLMEMİŞ");
    taniYaz(ayarlar.mesaiUcret>0?"ok":"uyari","Mesai saat ücreti", ayarlar.mesaiUcret>0?paraFmt(ayarlar.mesaiUcret):"girilmemiş — mesai saatleri paraya çevrilmez");
    taniYaz("bilgi","Günlük normal saat", V(ayarlar.gunlukSaat)+" saat");
    taniYaz("bilgi","Zamlar", "Pazar %"+V(ayarlar.pazarZam)+" · Tatil %"+V(ayarlar.tatilZam)+" · Gece %"+V(ayarlar.geceZam));
    taniYaz(ayarlar.hedef>0?"ok":"bilgi","Aylık hedef", ayarlar.hedef>0?paraFmt(ayarlar.hedef):"belirlenmemiş");
    const sant=(ayarlar.santiyeler||[]).length;
    taniYaz("bilgi","Şantiyeler", sant?sant+" tanımlı · aktif: "+V(ayarlar.santiye):"tanımlı şantiye yok");
    const kilit=(ayarlar.kapali||[]).length;
    taniYaz("bilgi","Kilitli aylar", kilit?kilit+" ay kilitli: "+ayarlar.kapali.join(", "):"kilitli ay yok");
    taniYaz("bilgi","İş kayıtları", (ayarlar.isler||[]).length+" iş");
  });

  /* ═══════ 4. PUANTAJ (GÜN KAYITLARI) ═══════ */
  await bolum("4. PUANTAJ — GÜN KAYITLARI", async ()=>{
    tumG = await cek("girdiler", 15); if(!tumG) return;
    taniYaz("bilgi","Toplam gün kaydı", tumG.length+" kayıt");
    if(!tumG.length){ taniYaz("uyari","Puantaj","Hiç gün işlenmemiş"); return; }

    const gecerliDurum=["tam","yarim","gelmedi","izin","saatlik"];
    const bozukTarih=[], bozukDurum=[], negatif=[], oransiz=[], gelecek=[];
    const bugun = tarihId(new Date());
    tumG.forEach(g=>{
      if(!/^\d{4}-\d{2}-\d{2}$/.test(g.id)) bozukTarih.push(g.id);
      if(g.durum && !gecerliDurum.includes(g.durum)) bozukDurum.push(g.id+"→"+g.durum);
      if(Number(g.mesai)<0||Number(g.arti)<0||Number(g.saat)<0) negatif.push(g.id);
      if(g.durum && g.durum!=="gelmedi" && g.durum!=="izin" && !(g.uYevmiye>0||g.uSaat>0||g.uParca>0)) oransiz.push(g.id);
      if(g.id>bugun) gelecek.push(g.id);
    });
    taniYaz(bozukTarih.length?"hata":"ok","Tarih biçimi", bozukTarih.length?bozukTarih.length+" bozuk: "+bozukTarih.slice(0,5).join(", "):"hepsi geçerli");
    taniYaz(bozukDurum.length?"hata":"ok","Gün durumları", bozukDurum.length?bozukDurum.slice(0,5).join(", "):"hepsi tanınan değerde");
    taniYaz(negatif.length?"hata":"ok","Negatif saat/mesai", negatif.length?negatif.slice(0,5).join(", "):"yok");
    taniYaz(oransiz.length?"uyari":"ok","Ücret mühürü", oransiz.length?oransiz.length+" günde ücret kaydedilmemiş (o günler 0 TL sayılır): "+oransiz.slice(0,4).join(", "):"çalışılan her günde ücret mühürlü");
    /* İleri tarihli günler hakedişe DAHİL EDİLİYOR — yani henüz çalışmadığın
       günler bakiyende görünüyor. Bilerek yapıldıysa sorun yok (planlama),
       ama yanlışlıkla işaretlendiyse elindeki parayı olduğundan fazla
       sanırsın. O yüzden tutarını da yazıyoruz. */
    /* DÜZELTME: eskiden ileri tarihli her kayıt için "bakiyen olduğundan
       yüksek görünür" uyarısı veriliyordu. Oysa o günler "gelmedi" ya da
       "izinli" işaretliyse 0 ₺ ediyor, yani bakiyeyi hiç etkilemiyor —
       kullanıcının raporunda tam olarak bu oldu (6 gün ileri tarihli,
       parasal etki 0 ₺) ve gereksiz alarm üretti.
       Artık uyarı yalnızca GERÇEKTEN para etkisi varsa veriliyor. */
    if(gelecek.length){
      let ileriPara=0; gelecek.forEach(id=>{ const g=tumG.find(x=>x.id===id); if(g) ileriPara+=girdiKazanc(g); });
      if(ileriPara > 0){
        taniYaz("uyari","Gelecek tarihli kayıt",
          gelecek.length+" gün ileri tarihli ("+gelecek.slice(0,4).join(", ")+(gelecek.length>4?"…":"")+")"+
          "\n   Bu günler hakedişine DAHİL: "+paraFmt(ileriPara)+" — henüz çalışmadıysan bakiyen olduğundan yüksek görünür");
      }else{
        taniYaz("bilgi","Gelecek tarihli kayıt",
          gelecek.length+" gün ileri tarihli ama hepsi 0 ₺ ediyor (gelmedi/izinli) — bakiyeni etkilemiyor");
      }
    }else taniYaz("ok","Gelecek tarihli kayıt","yok");

    const say={}; gecerliDurum.forEach(d=> say[d]=tumG.filter(g=>g.durum===d).length);
    taniYaz("bilgi","Durum dağılımı", Object.entries(say).filter(([,v])=>v).map(([k,v])=>k+": "+v).join(" · "));
    const mesaili=tumG.filter(g=>Number(g.mesai)>0);
    taniYaz("bilgi","Mesai", mesaili.length+" günde mesai · toplam "+mesaili.reduce((s,g)=>s+Number(g.mesai||0),0)+" saat");
    const fotolu=tumG.filter(g=>g.foto).length;
    taniYaz("bilgi","Gün fotoğrafı", fotolu+" günde fotoğraf var");
    const santiyesiz=tumG.filter(g=>g.durum&&g.durum!=="gelmedi"&&!g.santiye).length;
    if((ayarlar.santiyeler||[]).length>1)
      taniYaz(santiyesiz?"uyari":"ok","Şantiye etiketi", santiyesiz?santiyesiz+" çalışma gününde şantiye seçilmemiş":"hepsinde şantiye var");
  });

  /* ═══════ 5. PARA HESABI VE KÖPRÜ ═══════ */
  await bolum("5. PARA HESABI — EN KRİTİK", async ()=>{
    tumO = await cek("odemeler", 15); if(!tumO) return;
    taniYaz("bilgi","Toplam ödeme kaydı", tumO.length+" kayıt");

    const tutarsiz=tumO.filter(o=>!(Number(o.tutar)>0));
    const tarihsiz=tumO.filter(o=>!o.tarih);
    const aitAysiz=tumO.filter(o=>!o.aitAy);
    const gecerliTur=["avans","askeriye","hakedis","kesinti","diger"];
    const bozukTur=tumO.filter(o=>o.tur&&!gecerliTur.includes(o.tur));
    taniYaz(tutarsiz.length?"hata":"ok","Ödeme tutarları", tutarsiz.length?tutarsiz.length+" kayıtta tutar geçersiz/sıfır":"hepsi geçerli");
    taniYaz(tarihsiz.length?"hata":"ok","Ödeme tarihleri", tarihsiz.length?tarihsiz.length+" kayıtta tarih yok":"hepsinde tarih var");
    taniYaz(bozukTur.length?"hata":"ok","Ödeme türleri", bozukTur.length?bozukTur.map(o=>o.tur).join(", "):"hepsi tanınan türde");
    taniYaz(aitAysiz.length?"uyari":"ok","Ait ay (FIFO)", aitAysiz.length?aitAysiz.length+" ödemede ait-ay yok, tarihten türetiliyor":"hepsinde ait-ay kayıtlı");
    const turSay={}; gecerliTur.forEach(t=> turSay[t]=tumO.filter(o=>(o.tur||"avans")===t).length);
    taniYaz("bilgi","Tür dağılımı", Object.entries(turSay).filter(([,v])=>v).map(([k,v])=>k+": "+v).join(" · "));

    /* KÖPRÜ 1: ana ekrandaki bakiye = veriden hesaplanan mı? */
    const buAy = aktifYil+"-"+pad(aktifAy+1);
    let hk=0, gunSay=0;
    tumG.forEach(g=>{ if(String(g.id).slice(0,7)===buAy){ const k=girdiKazanc(g); if(k>0)gunSay++; hk+=k; } });
    let al=0; tumO.forEach(o=>{ if(odemeAyi(o)===buAy) al+=Number(o.tutar)||0; });
    const hesapKalan = hk-al;
    const ekran = taniSayiCek("sirket-bakiye");
    if(gizliMod) taniYaz("bilgi","KÖPRÜ: ekran ↔ veri","Gizli mod açık (••••), karşılaştırma yapılamadı");
    else if(ekran===null) taniYaz("uyari","KÖPRÜ: ekran ↔ veri","Ana ekran bakiyesi okunamadı");
    else{
      const fark=Math.abs(ekran-hesapKalan);
      taniYaz(fark<2?"ok":"hata","KÖPRÜ: ekran ↔ veri",
        "ekranda "+ekran+" ₺ · hesaplanan "+Math.round(hesapKalan)+" ₺"+(fark>=2?" · FARK "+Math.round(fark)+" ₺":"")+
        "\n   ("+buAy+": "+gunSay+" gün · hakediş "+Math.round(hk)+" − alınan "+Math.round(al)+")");
    }
    /* KÖPRÜ 2: tüm zamanlar toplamı */
    let thk=0; tumG.forEach(g=> thk+=girdiKazanc(g));
    const tal=tumO.reduce((s,o)=>s+(Number(o.tutar)||0),0);
    taniYaz("bilgi","Tüm zamanlar","hakediş "+Math.round(thk)+" ₺ · alınan "+Math.round(tal)+" ₺ · kalan "+Math.round(thk-tal)+" ₺");
    if(tal>thk*1.05 && thk>0) taniYaz("uyari","Fazla ödeme","Aldığın para hakedişini aşıyor — bir ödeme yanlış aya yazılmış olabilir");
    /* KÖPRÜ 3: gelecek aya yazılmış ödeme */
    const ileri=tumO.filter(o=> odemeAyi(o) > tarihId(new Date()).slice(0,7));
    taniYaz(ileri.length?"uyari":"ok","İleri tarihli ödeme", ileri.length?ileri.length+" ödeme gelecek aya yazılmış":"yok");
  });

  /* ═══════ 6. MASRAFLAR ═══════ */
  await bolum("6. MASRAFLAR", async ()=>{
    tumM = await cek("masraflar"); if(!tumM) return;
    taniYaz("bilgi","Toplam masraf", tumM.length+" kayıt · "+paraFmt(tumM.reduce((s,m)=>s+(Number(m.tutar)||0),0)));
    if(!tumM.length) return;
    const tutarsiz=tumM.filter(m=>!(Number(m.tutar)>0));
    const tarihsiz=tumM.filter(m=>!m.tarih);
    taniYaz(tutarsiz.length?"hata":"ok","Masraf tutarları", tutarsiz.length?tutarsiz.length+" geçersiz":"hepsi geçerli");
    taniYaz(tarihsiz.length?"hata":"ok","Masraf tarihleri", tarihsiz.length?tarihsiz.length+" tarihsiz":"hepsinde tarih var");
    const kodlar=(typeof MASRAF_KATEGORI!=="undefined")?MASRAF_KATEGORI.map(k=>k.kod):[];
    const bozukKat=tumM.filter(m=>m.kategori&&kodlar.length&&!kodlar.includes(m.kategori));
    taniYaz(bozukKat.length?"hata":"ok","Kategori kodları", bozukKat.length?bozukKat.map(m=>m.kategori).join(", "):"hepsi geçerli");
    const katsiz=tumM.filter(m=>!m.kategori).length;
    taniYaz("bilgi","Kategori dağılımı", (katsiz?"kategorisiz(eski): "+katsiz+" · ":"")+
      kodlar.map(k=>k+": "+tumM.filter(m=>m.kategori===k).length).filter(x=>!x.endsWith(": 0")).join(" · "));
    taniYaz("bilgi","Ödenme durumu", tumM.filter(m=>m.odendi).length+" ödendi · "+tumM.filter(m=>!m.odendi).length+" bekliyor");
    /* Fiş bağı: fisli:true diyor ama fotoğraf gerçekten var mı? */
    const fisli=tumM.filter(m=>m.fisli);
    if(fisli.length){
      let kayip=0;
      for(const m of fisli.slice(0,20)){
        try{ const d=await taniSureli(kokRef().collection("fisler").doc(m.id).get(),6); if(!d.exists) kayip++; }catch(e){}
      }
      taniYaz(kayip?"hata":"ok","Fiş fotoğrafı bağı", kayip?kayip+" masrafta 'fiş var' yazıyor ama FOTOĞRAF YOK":fisli.length+" fişin bağı sağlam");
    }
  });

  /* ═══════ 7. BORÇ DEFTERİ ═══════ */
  await bolum("7. BORÇ DEFTERİ", async ()=>{
    tumB = await cek("borclar"); if(!tumB) return;
    taniYaz("bilgi","Toplam kayıt", tumB.length);
    if(!tumB.length) return;
    const bozukYon=tumB.filter(b=>b.yon&&!["verdim","aldim"].includes(b.yon));
    const tutarsiz=tumB.filter(b=>!(Number(b.tutar)>0));
    const fazlaOdenen=tumB.filter(b=>Number(b.odenen)>Number(b.tutar));
    taniYaz(bozukYon.length?"hata":"ok","Borç yönü", bozukYon.length?bozukYon.map(b=>b.yon).join(", "):"hepsi geçerli");
    taniYaz(tutarsiz.length?"hata":"ok","Borç tutarları", tutarsiz.length?tutarsiz.length+" geçersiz":"hepsi geçerli");
    taniYaz(fazlaOdenen.length?"hata":"ok","Ödeme tutarlılığı", fazlaOdenen.length?fazlaOdenen.length+" kayıtta ödenen > borç":"tutarlı");
    const alacak=tumB.filter(b=>b.yon==="verdim"&&!b.odendi).reduce((s,b)=>s+Math.max(0,(Number(b.tutar)||0)-(Number(b.odenen)||0)),0);
    const borc=tumB.filter(b=>b.yon==="aldim"&&!b.odendi).reduce((s,b)=>s+Math.max(0,(Number(b.tutar)||0)-(Number(b.odenen)||0)),0);
    taniYaz("bilgi","Bakiye","alacağın "+paraFmt(alacak)+" · borcun "+paraFmt(borc));
    const bugun=tarihId(new Date());
    const geciken=tumB.filter(b=>!b.odendi&&b.vade&&b.vade<bugun);
    taniYaz(geciken.length?"uyari":"ok","Vadesi geçen", geciken.length?geciken.length+" kayıt":"yok");
  });

  /* ═══════ 8. BEKLENEN ÖDEMELER ═══════ */
  await bolum("8. BEKLENEN ÖDEMELER", async ()=>{
    tumBk = await cek("beklenenler"); if(!tumBk) return;
    taniYaz("bilgi","Kayıt sayısı", tumBk.length);
    if(!tumBk.length) return;
    const tutarsiz=tumBk.filter(b=>!(Number(b.tutar)>0));
    taniYaz(tutarsiz.length?"hata":"ok","Tutarlar", tutarsiz.length?tutarsiz.length+" geçersiz":"hepsi geçerli");
    const bugun=tarihId(new Date());
    const gec=tumBk.filter(b=>b.tarih&&b.tarih<bugun);
    taniYaz(gec.length?"uyari":"ok","Vadesi geçen", gec.length?gec.length+" ödeme sözü tutulmamış · "+paraFmt(gec.reduce((s,b)=>s+(Number(b.tutar)||0),0)):"yok");
  });

  /* ═══════ 9. EKİP VE YOKLAMA ═══════ */
  await bolum("9. EKİP VE YOKLAMA", async ()=>{
    tumE = await cek("ekip"); tumEg = await cek("ekipGun");
    if(tumE===null) return;
    taniYaz("bilgi","Ekip üyesi", tumE.length+" kişi");
    if(!tumE.length){ taniYaz("bilgi","Yoklama","Ekip yok, yoklama kullanılmıyor"); return; }
    const adsiz=tumE.filter(i=>!i.ad);
    taniYaz(adsiz.length?"hata":"ok","İşçi adları", adsiz.length?adsiz.length+" kayıtta ad yok":"hepsinde ad var");
    const yevmiyesiz=tumE.filter(i=>!(Number(i.yevmiye)>0));
    taniYaz(yevmiyesiz.length?"uyari":"ok","İşçi yevmiyeleri", yevmiyesiz.length?yevmiyesiz.length+" işçide yevmiye girilmemiş":"hepsinde yevmiye var");
    if(tumEg){
      taniYaz("bilgi","Yoklama kaydı", tumEg.length+" kayıt");
      const idler=tumE.map(i=>i.id);
      const oksuz=tumEg.filter(y=>y.iscId&&!idler.includes(y.iscId));
      taniYaz(oksuz.length?"uyari":"ok","Yoklama bağı", oksuz.length?oksuz.length+" yoklama silinmiş işçiye ait (yetim kayıt)":"tüm yoklamalar mevcut işçilere bağlı");
    }
  });

  /* ═══════ 10. İŞLERİM ═══════ */
  await bolum("10. İŞLERİM", async ()=>{
    const isler=ayarlar.isler||[];
    taniYaz("bilgi","İş kaydı", isler.length+" iş");
    if(!isler.length) return;
    /* DÜZELTME: alan adları yanlıştı. Gerçek alanlar patronAdi / santiyeAdi /
       girisTarihi / cikisTarihi. Yanlış adlar yüzünden bilgileri eksiksiz olan
       bir iş için "patron adı yok" ve "başlangıç tarihi yok" diye SAHTE HATA
       veriliyordu. */
    const aktif=isler.filter(i=>!i.cikisTarihi);
    taniYaz(aktif.length>1?"uyari":"ok","Aktif iş", aktif.length>1?aktif.length+" iş aynı anda 'devam ediyor' — biri kapatılmamış olabilir":aktif.length+" aktif iş");
    const adsiz=isler.filter(i=>!i.patronAdi&&!i.santiyeAdi);
    taniYaz(adsiz.length?"uyari":"ok","İş bilgileri", adsiz.length?adsiz.length+" işte patron/şantiye adı yok":"hepsinde bilgi var");
    const tarihsiz=isler.filter(i=>!i.girisTarihi);
    taniYaz(tarihsiz.length?"hata":"ok","İş tarihleri", tarihsiz.length?tarihsiz.length+" işte giriş tarihi yok":"hepsinde tarih var");
    isler.forEach(i=>{
      if(i.girisTarihi&&i.cikisTarihi&&i.cikisTarihi<i.girisTarihi)
        taniYaz("hata","Tarih çelişkisi", (i.patronAdi||i.santiyeAdi||"iş")+": çıkış, girişten önce");
    });
  });

  /* ═══════ 11. KARTLAR, PLANLAR, NOTLAR ═══════ */
  await bolum("11. KARTLAR / PLANLAR / NOTLAR", async ()=>{
    tumK = await cek("kartlar"); tumP = await cek("planlar"); tumN = await cek("notlar");
    if(tumK){
      taniYaz("bilgi","Kredi kartı", tumK.length+" kart");
      const bozuk=tumK.filter(k=>!(Number(k.gun)>=1&&Number(k.gun)<=31));
      if(tumK.length) taniYaz(bozuk.length?"hata":"ok","Kart son ödeme günü", bozuk.length?bozuk.length+" kartta gün geçersiz":"hepsi geçerli");
      const toplam=tumK.reduce((s,k)=>s+(Number(k.borc)||0),0);
      if(tumK.length) taniYaz("bilgi","Toplam kart borcu", paraFmt(toplam));
    }
    if(tumP) taniYaz("bilgi","Planlar", tumP.length+" plan");
    if(tumN) taniYaz("bilgi","Notlar", tumN.length+" not");
  });

  /* ═══════ 11b. PLATFORM UYUMLULUĞU ═══════
     Bu bölüm, kodu okuyarak BULUNAMAYAN hataları yakalamak için var.
     iOS'ta PDF paylaşım sorunu tam olarak böyleydi: kodda hiçbir şey
     yanlış görünmüyordu ama gerçek cihazda çalışmıyordu. Statik tarama
     bu sınıf hatayı asla bulamaz — cihazın kendi yeteneklerini SORMAK
     gerekiyor. Bu bölüm tanıyı çalıştıran cihazda gerçekten neyin
     çalışıp neyin çalışmadığını rapor ediyor. */
  await bolum("11b. BU CİHAZDA NE ÇALIŞIYOR", async ()=>{
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);
    taniYaz("bilgi","Platform", ios ? "iOS (iPhone/iPad)" : /Android/.test(navigator.userAgent) ? "Android" : "Masaüstü/diğer");

    /* Dosya paylaşımı — PDF/görsel göndermenin temeli */
    let dosyaPaylasim = false;
    try{
      const t = new File(["x"], "t.pdf", {type:"application/pdf"});
      dosyaPaylasim = !!(navigator.canShare && navigator.canShare({files:[t]}));
    }catch(e){}
    taniYaz(dosyaPaylasim ? "ok" : "hata", "PDF/dosya paylaşımı",
      dosyaPaylasim ? "destekleniyor" : "DESTEKLENMİYOR — PDF gönderilemez, yeni sekmede açılır");

    /* İndirme — iOS'ta çalışmaz, kullanıcıya yanlış mesaj vermeyelim */
    const indirmeVar = !ios && "download" in document.createElement("a");
    taniYaz(indirmeVar ? "ok" : "uyari", "Dosya indirme",
      indirmeVar ? "İndirilenler klasörüne kaydedilebiliyor"
                 : ios ? "iOS'ta İndirilenler klasörü yok — dosyalar paylaşım penceresinden gönderilir"
                       : "desteklenmiyor");

    /* iOS'ta paylaşımın kullanıcı dokunuşuna bağlı olması — PDF hatasının sebebi */
    if(ios){
      taniYaz(window.PDF_FONT_REGULAR_B64 ? "ok" : "uyari", "PDF fontu hazır mı",
        window.PDF_FONT_REGULAR_B64
          ? "önceden yüklenmiş — paylaşım gecikmeden açılır"
          : "henüz yüklenmedi. iOS paylaşımı dokunuştan hemen sonra ister; ilk PDF denemesi gecikip engellenebilir. Uygulamayı 15 sn açık bırakınca hazırlanır");
    }

    /* Bildirim — hatırlatmaların çalışıp çalışmayacağı */
    const bildirimVar = "Notification" in window;
    taniYaz(bildirimVar ? "ok" : "uyari", "Bildirim desteği",
      bildirimVar ? "izin durumu: "+Notification.permission : "bu tarayıcıda yok");
    /* BİLDİRİM ZİNCİRİ — her halkayı ayrı test et.
       Bildirimler hiç test edilmemişti. "İzin verildi" demek yetmiyor;
       zincirde beş halka var ve herhangi biri koparsa bildirim gelmiyor
       ama kullanıcı sebebini göremiyor. */
    try{
      const kayit = await navigator.serviceWorker.ready;

      /* 1. Service worker kayıtlı mı */
      taniYaz(kayit ? "ok" : "hata", "Service worker",
        kayit ? "kayıtlı — " + (kayit.active ? "etkin" : "beklemede") : "kayıtlı değil");

      /* 2. Push aboneliği gerçekten var mı (izin verilmiş olsa bile olmayabilir) */
      try{
        const abone = await kayit.pushManager.getSubscription();
        taniYaz(abone ? "ok" : (Notification.permission==="granted" ? "hata" : "bilgi"),
          "Push aboneliği",
          abone ? "aktif — sunucu bu cihaza bildirim gönderebilir"
                : Notification.permission==="granted"
                  ? "İZİN VAR AMA ABONELİK YOK — bildirim gelmez. Ayarlar'dan bildirimleri kapatıp tekrar aç"
                  : "yok (bildirimler kapalı)");
      }catch(e){ taniYaz("uyari","Push aboneliği", e.message); }

      /* 3. Jeton Firestore'a kaydedilmiş mi */
      try{
        if(kullanici){
          const cs = await kokRef().collection("cihazlar").limit(5).get();
          taniYaz(cs.size>0 ? "ok" : (Notification.permission==="granted" ? "uyari" : "bilgi"),
            "Kayıtlı cihaz",
            cs.size>0 ? cs.size+" cihaz kayıtlı" : "hiç cihaz kaydı yok — duyuru ulaşmaz");
        }
      }catch(e){ taniYaz("uyari","Kayıtlı cihaz", e.message); }

      /* 4. Uygulama kapalıyken hatırlatma */
      taniYaz(kayit.periodicSync ? "ok" : "bilgi", "Kapalıyken hatırlatma",
        kayit.periodicSync ? "destekleniyor" : "desteklenmiyor (iOS'ta yok) — hatırlatma yalnızca uygulama açılınca");

      /* 5. Periyodik iş gerçekten kayıtlı mı */
      try{
        if(kayit.periodicSync){
          const etiketler = await kayit.periodicSync.getTags();
          const var_ = etiketler.includes("aksam-hatirlatma");
          taniYaz(var_ ? "ok" : "uyari", "Akşam hatırlatması",
            var_ ? "kayıtlı — tarayıcı uygun gördüğünde tetikler"
                 : "kayıtlı değil. Bildirimleri açıp uygulamayı birkaç kez kullanınca kaydolur");
        }
      }catch(e){}
    }catch(e){ taniYaz("hata","Bildirim zinciri", e.message); }

    /* Çevrimdışı yazma */
    taniYaz("bilgi","Çevrimdışı kayıt","Firestore yerel önbelleği aktif — internet yokken de gün işlenebiliyor");

    /* Depolama kalıcılığı: iOS bazen önbelleği siler */
    try{
      if(navigator.storage && navigator.storage.persisted){
        const kalici = await navigator.storage.persisted();
        taniYaz(kalici ? "ok" : "uyari", "Depolama kalıcılığı",
          kalici ? "korumalı" : "korumasız — telefon yer açmak için önbelleği silebilir (veriler bulutta güvende)");
      }
    }catch(e){}
  });

  /* ═══════ 12. RAPORLAR VE PAYLAŞIM ═══════ */
  await bolum("12. RAPORLAR VE PAYLAŞIM", async ()=>{
    /* Bu kütüphaneler 0.0.9.2'den beri TALEP ÜZERİNE yükleniyor —
       açılışta yüklenmemeleri NORMAL, hatta istenen davranış (uygulama
       daha hızlı açılıyor). Eskiden "YÜKLENMEMİŞ — internet gerekiyor"
       diye UYARI veriyordu ve raporu okuyan kişi bozukluk sanıyordu.
       Artık bilgi olarak gösteriliyor. */
    const k={ "PDF motoru":window.jspdf, "PDF tablo eklentisi":window.jspdf&&window.jspdf.jsPDF&&true,
              "Excel motoru":window.XLSX, "Görsel motoru":window.html2canvas, "Fiş okuma (OCR)":window.Tesseract };
    Object.entries(k).forEach(([ad,v])=> taniYaz(v?"ok":"bilgi", ad,
      v ? "yüklü" : "henüz yüklenmedi — ilk kullanımda iner (normal)"));
    taniYaz(window.PDF_FONT_REGULAR_B64?"ok":"bilgi","PDF Türkçe fontu", window.PDF_FONT_REGULAR_B64?"yüklü":"henüz yüklenmedi (ilk PDF'te yüklenir, normal)");
    taniYaz(navigator.share?"ok":"uyari","Paylaşım desteği", navigator.share?"cihaz paylaşımı çalışıyor":"yok — kopyalama kullanılacak");
    taniYaz(navigator.clipboard?"ok":"uyari","Panoya kopyalama", navigator.clipboard?"çalışıyor":"yok");
  });

  /* ═══════ 13. YEDEKLEME ═══════ */
  await bolum("13. YEDEKLEME", async ()=>{
    /* DÜZELTME: eski mesaj "telefonun bozulursa her şey gider" diyordu — bu YANLIŞ
       ve gereksiz korkutucuydu. Tüm veri Firestore'da (bulutta) tutuluyor; telefon
       bozulsa bile başka cihazdan aynı e-postayla girince veriler gelir.
       Yedek asıl şu üç durum için gerekli:
         1) hesabına erişemezsen (şifre/e-posta kaybı, hesap ele geçirilmesi),
         2) yanlışlıkla kendin silersen (silme de buluta senkronize olur),
         3) Firebase tarafında bir sorun çıkarsa.
       Bu yüzden seviye "hata"dan "uyarı"ya çekildi ve gerekçe doğru yazıldı. */
    taniYaz("ok","Bulut senkronizasyonu","Tüm kayıtların Firestore'da — başka telefondan aynı e-postayla girince gelir");
    let son=null; try{ son=localStorage.getItem("sonYedekTarihi")||localStorage.getItem("yedekZaman"); }catch(e){}
    if(!son) taniYaz("uyari","Yerel yedek","Hiç yedek indirilmemiş. Bulut zaten var; yedek, hesabına erişemezsen ya da yanlışlıkla silersen işe yarar");
    else{
      const gun=Math.floor((Date.now()-Number(son))/86400000);
      taniYaz(gun>60?"uyari":"ok","Yerel yedek", gun+" gün önce alınmış"+(gun>60?" — tazelemekte fayda var":""));
    }
    const fotoSay=(tumM||[]).filter(m=>m.fisli).length+(tumO||[]).filter(o=>o.dekontlu).length+(tumG||[]).filter(g=>g.foto).length;
    taniYaz(fotoSay?"uyari":"ok","Fotoğraflar", fotoSay?fotoSay+" fotoğraf yedeğe DAHİL DEĞİL (dosya çok büyür diye)":"yedeklenecek fotoğraf yok");
  });

  /* ═══════ 13b. UYGULAMANIN KENDİ HATA GÜNLÜĞÜ ═══════ */
  await bolum("13b. GERÇEK ÇÖKME KAYITLARI", async ()=>{
    let g=[]; try{ g=JSON.parse(localStorage.getItem("hataGunlugu")||"[]"); }catch(e){}
    if(!g.length){ taniYaz("ok","Çökme kaydı","Uygulama hiç hata kaydetmemiş — temiz"); return; }
    taniYaz(g.length>5?"hata":"uyari","Çökme kaydı", g.length+" hata kaydı var (aşağıda en son 6'sı)");
    /* Gerçek alan adları (bkz. hataKaydet): z (zaman damgası), kaynak, mesaj, kod, yigin */
    g.slice(-6).reverse().forEach((h,i)=>{
      const z = h.z ? new Date(h.z).toLocaleString("tr-TR") : "?";
      taniYaz("hata","Çökme "+(i+1)+" · "+(h.kaynak||"bilinmeyen yer"),
        z + (h.kod?" · kod: "+h.kod:"") +
        "\n   " + String(h.mesaj||"").slice(0,200) +
        (h.yigin ? "\n   " + String(h.yigin).split("\n")[0].slice(0,140) : ""));
    });
  });

  /* ═══════ 13c. TUTARLILIK VE BAĞ KONTROLLERİ ═══════ */
  await bolum("13c. TUTARLILIK VE BAĞLAR", async ()=>{
    /* Kilitli ayda kayıt var mı — kilit sonrası değişiklik yapılmış olabilir */
    const kilitli = ayarlar.kapali||[];
    if(kilitli.length && tumG && tumG.length){
      const kilitliGun = tumG.filter(g=> kilitli.includes(String(g.id).slice(0,7)));
      taniYaz("bilgi","Kilitli aylardaki kayıt", kilitliGun.length+" gün kilitli ayda (değiştirilemez)");
    }
    /* Girdilerdeki şantiye adları, tanımlı şantiye listesinde var mı */
    const tanimli = (ayarlar.santiyeler||[]).map(x=> typeof x==="string"?x:(x&&x.ad)||"");
    if(tanimli.length && tumG){
      const bilinmeyen=[...new Set(tumG.map(g=>g.santiye).filter(x=>x&&!tanimli.includes(x)))];
      taniYaz(bilinmeyen.length?"uyari":"ok","Şantiye adları",
        bilinmeyen.length?"Listede olmayan şantiye adı kullanılmış: "+bilinmeyen.slice(0,4).join(", "):"hepsi tanımlı listede");
    }
    /* Dekont bağı: dekontlu:true olan ödemenin fotoğrafı gerçekten var mı */
    const dek=(tumO||[]).filter(o=>o.dekontlu);
    if(dek.length){
      let kayip=0;
      for(const o of dek.slice(0,15)){
        try{ const d=await taniSureli(kokRef().collection("dekontlar").doc(o.id).get(),6); if(!d.exists) kayip++; }catch(e){}
      }
      taniYaz(kayip?"hata":"ok","Dekont fotoğrafı bağı", kayip?kayip+" ödemede 'dekont var' yazıyor ama FOTOĞRAF YOK":dek.length+" dekontun bağı sağlam");
    }
    /* Gün fotoğrafı bağı */
    const fg=(tumG||[]).filter(g=>g.foto);
    if(fg.length){
      let kayip=0;
      for(const g of fg.slice(0,15)){
        try{ const d=await taniSureli(kokRef().collection("fotolar").doc(g.id).get(),6); if(!d.exists) kayip++; }catch(e){}
      }
      taniYaz(kayip?"hata":"ok","Gün fotoğrafı bağı", kayip?kayip+" günde 'fotoğraf var' yazıyor ama YOK":fg.length+" fotoğrafın bağı sağlam");
    }
    /* Takılı kalmış kronometre */
    let kb=null; try{ kb=localStorage.getItem("kronoBas"); }catch(e){}
    if(kb){
      const saat=((Date.now()-Number(kb))/3600000);
      taniYaz(saat>16?"uyari":"bilgi","Kronometre", saat.toFixed(1)+" saattir çalışıyor"+(saat>16?" — durdurmayı unutmuş olabilirsin":""));
    }else taniYaz("ok","Kronometre","çalışmıyor");
    /* Bildirim izni */
    try{
      const izin = (typeof Notification!=="undefined") ? Notification.permission : "yok";
      taniYaz(izin==="granted"?"ok":"bilgi","Bildirim izni", izin==="granted"?"verilmiş":izin==="denied"?"REDDEDİLMİŞ — hatırlatmalar gelmez":"henüz sorulmamış");
    }catch(e){}
    /* Kişiler ve kazalar */
    const kz = await cek("kazalar", 8);
    if(kz) taniYaz("bilgi","İş kazası kaydı", kz.length+" kayıt");
    /* Belgeler (ayarlar içinde) */
    const bel=(ayarlar.belgeler||[]);
    if(bel.length){
      const sureli=bel.filter(b=>b.bitis);
      const bugun=tarihId(new Date());
      const dolmus=sureli.filter(b=>b.bitis<bugun);
      taniYaz(dolmus.length?"uyari":"ok","Belgeler", bel.length+" belge"+(dolmus.length?" · "+dolmus.length+" SÜRESİ DOLMUŞ":""));
    }
  });

  /* ═══════ 14. ARAYÜZ BÜTÜNLÜĞÜ ═══════ */
  await bolum("14. ARAYÜZ BÜTÜNLÜĞÜ", async ()=>{
    const ekranlar=["ana","puantaj","odemeler","masraf","borc","ozet","yil","notlar","rozet","ekip",
      "kisiler","arac","ayarlar","kartlar","planlar","maaslar","isler","arama","tani","haber","tv","video"];
    const eksikEkran=ekranlar.filter(e=> !document.getElementById("goruntu-"+e));
    taniYaz(eksikEkran.length?"hata":"ok","Ekranlar", eksikEkran.length?"EKSİK: "+eksikEkran.join(", "):ekranlar.length+" ekranın hepsi mevcut");

    const zorunlu=["sirket-bakiye","sirket-alt","kur-satir","bugun-kazanc-icerik","hafta-serit",
      "tahmin-kart","krono-yazi","takvim","ay-ad","liste-odemeler","liste-masraflar","liste-borclar",
      "liste-beklenen","liste-notlar","liste-isciler","liste-ekip-ozet","ozet-grid","liste-maaslar",
      "toast","bildirim-kutusu","liste-sirket-hareket","liste-santiyeler","yenilik-tam","is-detay-icerik"];
    const eksikOge=zorunlu.filter(i=> !document.getElementById(i));
    taniYaz(eksikOge.length?"hata":"ok","Ekran öğeleri", eksikOge.length?"EKSİK: "+eksikOge.join(", "):zorunlu.length+" öğenin hepsi yerinde");

    const fonkHarita={ girdiKazanc, oranBul, guncelOranlar, hesaplaAralik, sayi, odemeAyi,
      enEskiOdenmemisAy, paraFmt, tarihId, hepsiniCiz, anaYukle, ayiYukle, takvimCiz,
      odemeListesiCiz, masrafCiz, borcCiz, beklenenCiz, ekipYoklamaCiz, pdfFontlariYukle,
      tumOdemeleriGetir, hafifModUygula, trBuyuk, trKucuk, pad, esc, modalAc, gorunumSec };
    const eksikFn=Object.keys(fonkHarita).filter(f=> typeof fonkHarita[f]!=="function");
    taniYaz(eksikFn.length?"hata":"ok","Fonksiyonlar", eksikFn.length?"TANIMSIZ: "+eksikFn.join(", "):Object.keys(fonkHarita).length+" fonksiyonun hepsi çalışır");

    /* Ölü düğme taraması: tıklanabilir ama hiçbir olayı olmayan düğmeler */
    const tumBtn=document.querySelectorAll("#ekran-uygulama button[id]");
    taniYaz("bilgi","Düğmeler", tumBtn.length+" düğme sayfada");

    const dinleyiciler={ "gün kayıtları":dinleyiciGirdi, "ödemeler":dinleyiciOdeme, "ayarlar":dinleyiciAyar,
      "borçlar":dinleyiciBorc, "masraflar":dinleyiciMasraf, "beklenenler":dinleyiciBeklenen,
      "tüm girdiler":dinleyiciTumG, "tüm ödemeler":dinleyiciTumO };
    const kapali=Object.keys(dinleyiciler).filter(k=>!dinleyiciler[k]);
    taniYaz(kapali.length>4?"uyari":"ok","Canlı veri bağlantıları", kapali.length?kapali.length+" kapalı: "+kapali.join(", "):"8 bağlantının hepsi açık");
  });

  /* ═══════ 15. HESAPLAMA DOĞRULUĞU ═══════ */
  await bolum("15. HESAPLAMA DOĞRULUĞU", async ()=>{
    const testler=[
      ["1500",1500],["1.500",1500],["1,5",1.5],["1.500,50",1500.5],
      ["1,000",1000],["0,5",0.5],["2.500.000",2500000],["350 ₺",350],["",0],["abc",0]
    ];
    const hatali=testler.filter(([g,b])=> sayi(g)!==b);
    taniYaz(hatali.length?"hata":"ok","Para çevirici", hatali.length?hatali.map(([g,b])=>'"'+g+'"→'+sayi(g)+" (olmalı "+b+")").join(", "):testler.length+" kenar durumun hepsi doğru");
    const st=[["2.5",2.5],["2,5",2.5],["8",8],["2.500",2.5]];
    const sh=st.filter(([g,b])=> sayi(g,true)!==b);
    taniYaz(sh.length?"hata":"ok","Saat çevirici", sh.length?sh.map(([g,b])=>'"'+g+'"→'+sayi(g,true)).join(", "):"doğru");
    const tr=[["Haziran","HAZİRAN"],["Nisan","NİSAN"],["İstanbul","istanbul"]];
    const trh=[];
    if(trBuyuk("Haziran")!=="HAZİRAN") trh.push("büyük harf");
    if(trKucuk("İstanbul")!=="istanbul") trh.push("küçük harf");
    taniYaz(trh.length?"hata":"ok","Türkçe harf çevirimi", trh.length?trh.join(", ")+" bozuk":"İ/ı doğru çevriliyor");
    try{
      const d=new Date(); const id=tarihId(d);
      taniYaz(/^\d{4}-\d{2}-\d{2}$/.test(id)?"ok":"hata","Tarih biçimlendirici", id);
    }catch(e){ taniYaz("hata","Tarih biçimlendirici", e.message); }

    /* Tarih SINIR DURUMLARI — bu sınıf hata kodu okuyarak bulunamaz,
       ancak gerçekten çalıştırınca ortaya çıkar. Yaz saati geçişinde
       veya artık yılda bir gün kayması, tüm ayın hesabını bozar. */
    /* KAZANÇ HESABI sınır testleri. Para hesabı uygulamanın çekirdeği;
       buradaki sessiz bir sapma aylarca fark edilmeden yanlış bakiye
       üretir. Test, geçici sahte kayıtlarla yapılıyor — hiçbir gerçek
       veriye dokunulmuyor, hiçbir şey kaydedilmiyor. */
    try{
      const ky = Number(ayarlar.yevmiye)||0, km = Number(ayarlar.mesaiUcret)||0;
      if(ky > 0){
        const kt = [
          ["tam gün",            {durum:"tam",   uYevmiye:ky, uMesai:km}, ky],
          ["yarım gün",          {durum:"yarim", uYevmiye:ky, uMesai:km}, ky/2],
          ["gelmedi",            {durum:"gelmedi",uYevmiye:ky, uMesai:km}, 0],
          ["izinli",             {durum:"izin",  uYevmiye:ky, uMesai:km}, 0],
          ["tam + 1 artı",       {durum:"tam",   arti:1, uYevmiye:ky, uMesai:km}, ky*2],
          ["tam + 2 sa mesai",   {durum:"tam",   mesai:2, uYevmiye:ky, uMesai:km}, ky + 2*km]
        ];
        const sapan = kt.filter(([,v,bek])=> Math.abs(girdiKazanc(v)-bek) > 0.01)
                        .map(([ad,v,bek])=> ad+" ("+girdiKazanc(v)+" ≠ "+bek+")");
        taniYaz(sapan.length?"hata":"ok","Kazanç hesabı",
          sapan.length ? "SAPMA: "+sapan.join(", ")
                       : kt.length+" senaryo doğru (tam/yarım/gelmedi/izin/artı/mesai)");
      }else{
        taniYaz("bilgi","Kazanç hesabı","Yevmiye girilmemiş, test yapılamadı");
      }
      /* Ücret mühürlenmemiş gün: BİLİNÇLİ olarak güncel ayara düşülüyor
         ("kimse 0 liraya çalışmaz" — oranBul içinde belgelenmiş).
         Bu davranışın korunduğunu doğrula; sessizce değişirse eski günler
         0 TL olur ve kullanıcı parasını kaybetmiş görünür. */
      if(ky > 0){
        const muhursuz = girdiKazanc({durum:"tam"});
        taniYaz(Math.abs(muhursuz-ky)<0.01 ? "ok":"uyari", "Ücretsiz eski kayıtlar",
          Math.abs(muhursuz-ky)<0.01
            ? "güncel yevmiyeye düşülüyor (doğru davranış)"
            : "beklenmedik: "+muhursuz+" — eski günler yanlış hesaplanabilir");
      }
    }catch(e){ taniYaz("hata","Kazanç hesabı", e.message); }

    /* ÖDEMENİN HANGİ AYA SAYILDIĞI (FIFO çekirdeği).
       Bu mantık bozulursa avanslar yanlış aya yazılır ve bakiye sessizce
       kayar — kullanıcının en çok güvendiği kural bu. */
    try{
      const ot = [
        ["aitAy yazılı",       {aitAy:"2026-07", tarih:"2026-08-01"}, "2026-07"],
        ["aitAy yok",          {tarih:"2026-08-15"},                  "2026-08"],
        ["aitAy boş",          {aitAy:"", tarih:"2026-08-15"},        "2026-08"],
        ["ikisi de yok",       {},                                     ""],
        ["yılbaşı sınırı",     {tarih:"2027-01-01"},                  "2027-01"]
      ];
      const sapan = ot.filter(([,v,bek])=> odemeAyi(v)!==bek).map(([ad])=>ad);
      taniYaz(sapan.length?"hata":"ok","Ödeme ay eşleştirme",
        sapan.length ? "SAPMA: "+sapan.join(", ")
                     : ot.length+" senaryo doğru (ait-ay önceliği, tarihten türetme, yıl sınırı)");
    }catch(e){ taniYaz("hata","Ödeme ay eşleştirme", e.message); }

    try{
      const sinirTest=[
        ["yaz saati",  new Date(2027,2,28,3,0,0)],
        ["yılbaşı",    new Date(2026,11,31,23,59,0)],
        ["artık yıl",  new Date(2028,1,29,12,0,0)],
        ["gece 00:00", new Date(2026,7,15,0,0,0)],
        ["gece 23:59", new Date(2026,7,15,23,59,59)]
      ];
      const bozuk=[];
      sinirTest.forEach(([ad,d])=>{
        const geri=new Date(tarihId(d)+"T12:00:00");
        if(geri.getDate()!==d.getDate() || geri.getMonth()!==d.getMonth() || geri.getFullYear()!==d.getFullYear())
          bozuk.push(ad);
      });
      taniYaz(bozuk.length?"hata":"ok","Tarih sınır durumları",
        bozuk.length ? "GÜN KAYMASI: "+bozuk.join(", ") : sinirTest.length+" sınır durumu doğru (yaz saati, artık yıl, gece yarısı)");
      /* Artık yıl: Şubat gün sayısı */
      const sub2028=new Date(2028,2,0).getDate(), sub2027=new Date(2027,2,0).getDate();
      taniYaz((sub2028===29 && sub2027===28)?"ok":"hata","Artık yıl hesabı",
        "2028 Şubat "+sub2028+" gün · 2027 Şubat "+sub2027+" gün");
      /* Ay sorgusu sınırı: "-31" tüm aylarda güvenli mi */
      const subatSon = "2026-02-28" <= "2026-02-31";
      const martSizmaz = !("2026-03-01" <= "2026-02-31");
      taniYaz((subatSon && martSizmaz)?"ok":"hata","Ay sorgu sınırı",
        subatSon && martSizmaz ? "kısa aylarda son gün dahil, komşu ay sızmıyor" : "SORUNLU");
    }catch(e){ taniYaz("hata","Tarih sınır durumları", e.message); }
  });

  taniYaz("bilgi","Toplam süre", ((Date.now()-t0)/1000).toFixed(1)+" saniye");
  taniSonucCiz();
  if(btn){ btn.disabled=false; btn.textContent="▶ Testi tekrar çalıştır"; }
  try{ $("#tani-ozet-kart").scrollIntoView({behavior:"smooth", block:"start"}); }catch(e){}
}

function taniSonucCiz(){
  const sim = {ok:"✅", hata:"❌", uyari:"⚠️", bilgi:"ℹ️", bolum:"\n━━━"};
  const hata = taniSatirlar.filter(s=>s.durum==="hata").length;
  const uyari = taniSatirlar.filter(s=>s.durum==="uyari").length;
  const kontrol = taniSatirlar.filter(s=>s.durum!=="bolum").length;

  const ozet = $("#tani-ozet");
  if(ozet){
    ozet.innerHTML =
      '<div style="font-size:34px;font-family:\'Saira Condensed\';font-weight:800;color:' +
      (hata ? "var(--gelmedi)" : uyari ? "var(--yarim)" : "var(--tam)") + '">' +
      (hata ? hata + " HATA" : uyari ? uyari + " UYARI" : "TEMİZ") + '</div>' +
      '<div style="font-size:13px;color:var(--soluk);margin-top:4px">' +
      kontrol + " kontrol · " + hata + " hata · " + uyari + " uyarı</div>";
    $("#tani-ozet-kart").classList.remove("gizli");
  }
  const kutu = $("#tani-sonuc");
  if(kutu){
    kutu.textContent = taniSatirlar.map(s=>
      sim[s.durum] + " " + s.baslik + (s.detay ? "\n   " + s.detay : "")).join("\n");
    $("#tani-sonuc-kart").classList.remove("gizli");
  }
}

function taniRaporMetni(){
  const sim = {ok:"[OK]", hata:"[HATA]", uyari:"[UYARI]", bilgi:"[BILGI]", bolum:"\n===="};
  return "PUANTAJ DEFTERIM — TANI RAPORU\n" +
    new Date().toLocaleString("tr-TR") + "\n" +
    "Surum: " + (window.__SURUM||"?") + "\n" +
    "Tarayici: " + navigator.userAgent + "\n" +
    "".padEnd(52,"=") + "\n" +
    taniSatirlar.map(s=> sim[s.durum] + " " + s.baslik + (s.detay ? "\n    " + s.detay : "")).join("\n");
}

})();
