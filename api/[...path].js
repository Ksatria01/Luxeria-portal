// Taruh file ini di: <root-project-vercel>/api/[...path].js
// Fungsinya: jembatan https (Vercel) -> http (server bot kamu di port 2013),
// supaya browser gak nge-block sebagai "mixed content".
//
// Kalau server bot kamu nanti sudah punya SSL sendiri, file ini boleh
// dihapus dan API_BASE di index.html langsung diisi domain https-nya.

const BOT_ORIGIN = "http://serverku.lynzzofficial.com:2013";

export default async function handler(req, res) {
  // Ambil path apa adanya langsung dari URL request, jangan andalkan
  // req.query.path (kadang nggak konsisten ke-parse tergantung runtime).
  // req.url contoh: "/api/jadibot-list" atau "/api/jadibot-status/6281..."
  const pathAfterApi = req.url.replace(/^\/api\/?/, "");
  const targetUrl = `${BOT_ORIGIN}/api/${pathAfterApi}`;

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body: ["GET", "HEAD"].includes(req.method)
        ? undefined
        : JSON.stringify(req.body ?? {}),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader(
      "Content-Type",
      upstream.headers.get("content-type") || "application/json"
    );
    // Header debug kecil, aman diabaikan browser, cuma buat kita cek kalau perlu.
    res.setHeader("x-luxeria-target", targetUrl);
    res.send(text);
  } catch (err) {
    res.status(502).json({
      error: "Gagal konek ke server bot dari proxy Vercel.",
      target: targetUrl,
      detail: String(err),
    });
  }
}
