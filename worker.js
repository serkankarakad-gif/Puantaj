/* ============================================================
   PUANTAJ KÖPRÜSÜ — Cloudflare Worker
   Ne işe yarar: Uygulamanın haber, video arama ve canlı yayın
   bulma isteklerini güvenilir şekilde taşır.
   Kurulum rehberi: KOPRU-KURULUM.md dosyasında.
   ============================================================ */

/* !!! OPSİYONEL SIKILAŞTIRMA !!!
   Uygulamanı yayınladığın adresi (örn. "https://puantaj.senin-adresin.com")
   buraya yazarsan, köprünü SADECE senin uygulaman kullanabilir olur —
   başka siteler bunu ücretsiz proxy olarak kullanıp kotanı tüketemez.
   Boş bırakırsan (aşağıdaki gibi) herkese açık kalır, eskisi gibi çalışır. */
const IZINLI_KAYNAK = ""; // örn: "https://puantaj-defterim.pages.dev"

export default {
  async fetch(istek) {
    const url = new URL(istek.url);
    const hedef = url.searchParams.get("url");
    const gelenKaynak = istek.headers.get("Origin") || "";
    const acaoDeger = IZINLI_KAYNAK ? IZINLI_KAYNAK : "*";

    /* Origin kısıtlaması aktifse ve istek başka bir siteden geliyorsa reddet */
    if (IZINLI_KAYNAK && gelenKaynak && gelenKaynak !== IZINLI_KAYNAK) {
      return new Response("izin yok", { status: 403 });
    }

    /* Güvenlik: köprü sadece bu adreslere gider, başkası kullanamaz */
    const izinli = [
      "https://news.google.com/",
      "https://www.youtube.com/",
      "https://m.youtube.com/"
    ];
    if (!hedef || !izinli.some(k => hedef.startsWith(k))) {
      return new Response("izin yok", { status: 400 });
    }

    try {
      const cevap = await fetch(hedef, {
        headers: {
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "accept-language": "tr-TR,tr;q=0.9",
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      const govde = await cevap.arrayBuffer();
      return new Response(govde, {
        status: cevap.status,
        headers: {
          "content-type": cevap.headers.get("content-type") || "text/plain; charset=utf-8",
          "access-control-allow-origin": acaoDeger,
          "cache-control": "public, max-age=120"
        }
      });
    } catch (e) {
      return new Response("hata", { status: 502 });
    }
  }
};
