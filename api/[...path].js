// Taruh file ini di: <root-project-vercel>/api/[...path].js
// Fungsinya: jembatan https (Vercel) -> http (server bot kamu di port 2013),
// supaya browser gak nge-block sebagai "mixed content".
//
// Kalau server bot kamu nanti sudah punya SSL sendiri, file ini boleh
// dihapus dan API_BASE di index.html langsung diisi domain https-nya.

const BOT_ORIGIN = "http://serverku.lynzzofficial.com:2013";

export default async function handler(req, res) {
  const segments = Array.isArray(req.query.path)
    ? req.query.path
    : req.query.path
    ? [req.query.path]
    : [];
  const targetUrl = `${BOT_ORIGIN}/api/${segments.join("/")}`;

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
    res.send(text);
  } catch (err) {
    res.status(502).json({
      error: "Gagal konek ke server bot dari proxy Vercel.",
      detail: String(err),
    });
  }
      }
