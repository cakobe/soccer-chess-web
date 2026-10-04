// Soccer Chess anket alıcısı (Cloudflare Worker)
// soccer-chess.com/api/anket adresine gelen yanıtları e-posta olarak iletir.
// Alıcı adresi kodda yer almaz; Cloudflare'deki DEST değişkeninde tanımlıdır.

const ALLOWED_ORIGINS = new Set([
  "https://soccer-chess.com",
  "https://www.soccer-chess.com",
]);

const FROM = { email: "anket@soccer-chess.com", name: "Soccer Chess Anket" };
const MAX_BODY = 20000;
const MAX_TEXT = 2000;
const MAX_ANSWERS = 40;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// Satır sonlarını ve kontrol karakterlerini temizleyip kısaltır
function clean(value, max, keepNewlines = false) {
  if (typeof value !== "string") return "";
  let s = value.replace(/\r\n?/g, "\n");
  s = keepNewlines ? s.replace(/[^\S\n]+/g, " ").replace(/\n{3,}/g, "\n\n") : s.replace(/\s+/g, " ");
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "");
  return s.trim().slice(0, max);
}

function trDate() {
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/anket") return json({ ok: false, error: "not_found" }, 404);
    if (request.method !== "POST") return json({ ok: false, error: "method" }, 405);

    const origin = request.headers.get("Origin");
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return json({ ok: false, error: "origin" }, 403);

    if (env.LIMIT) {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const { success } = await env.LIMIT.limit({ key: ip });
      if (!success) return json({ ok: false, error: "rate" }, 429);
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ ok: false, error: "size" }, 413);

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return json({ ok: false, error: "json" }, 400);
    }
    if (!data || typeof data !== "object") return json({ ok: false, error: "json" }, 400);

    // Botların doldurduğu gizli alan: sessizce kabul et, gönderme
    if (data.website) return json({ ok: true });

    const id = clean(data.id, 12).replace(/[^A-Za-z0-9]/g, "") || "------";
    const lines = ["Soccer Chess deneme sürümü anketi", `Yanıt no: ${id}`, `Tarih: ${trDate()}`, ""];
    let subject;

    if (data.type === "secim") {
      const answers = Array.isArray(data.answers) ? data.answers.slice(0, MAX_ANSWERS) : [];
      const rows = answers
        .map((a) => ({ q: clean(a && a.q, 160), a: clean(a && a.a, 400) }))
        .filter((a) => a.q && a.a);
      if (!rows.length) return json({ ok: false, error: "empty" }, 400);
      subject = `Soccer Chess anketi: seçenekli yanıtlar (${id})`;
      for (const r of rows) lines.push(`- ${r.q}: ${r.a}`);
    } else if (data.type === "gorus") {
      const text = clean(data.text, MAX_TEXT, true);
      if (!text) return json({ ok: false, error: "empty" }, 400);
      const name = clean(data.name, 80);
      subject = `Soccer Chess anketi: görüş ve öneri (${id})`;
      if (name) lines.push(`- Ad / iletişim: ${name}`);
      lines.push("- Görüş ve öneri:", "", text);
    } else {
      return json({ ok: false, error: "type" }, 400);
    }

    try {
      await env.EMAIL.send({ to: env.DEST, from: FROM, subject, text: lines.join("\n") });
    } catch (err) {
      console.error("email send failed", err && err.message);
      return json({ ok: false, error: "send" }, 502);
    }
    return json({ ok: true });
  },
};
