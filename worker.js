/* ============================================================
   PUANTAJ KÖPRÜSÜ — Cloudflare Worker
   Ne işe yarar: Uygulamanın haber, video arama ve canlı yayın
   bulma isteklerini güvenilir şekilde taşır.
   Kurulum rehberi: KOPRU-KURULUM.md dosyasında.
   ============================================================ */
export default {
  async fetch(istek) {
    const url = new URL(istek.url);
    const hedef = url.searchParams.get("url");

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
          "access-control-allow-origin": "*",
          "cache-control": "public, max-age=120"
        }
      });
    } catch (e) {
      return new Response("hata", { status: 502 });
    }
  }
};
