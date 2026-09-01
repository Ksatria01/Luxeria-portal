// api/admin-console-token.js
// Ambil token+URL websocket console Pterodactyl (khusus admin). Frontend nanti
// yang konek LANGSUNG ke websocket Wings pakai token ini - bukan lewat sini,
// soalnya koneksi console itu live/terus-menerus, gak cocok lewat serverless function.

const ADMIN_EMAILS = ["luxeriaporse@gmail.com", "herorandomml0@gmail.com"];
const FIREBASE_API_KEY = "AIzaSyAwbIHNg3tZuGDY81DIdN0rxQVlWwKv94c";

const PTERODACTYL_PANEL_URL = process.env.PTERODACTYL_PANEL_URL;
const PTERODACTYL_API_KEY = process.env.PTERODACTYL_API_KEY;
const PTERODACTYL_SERVER_ID = process.env.PTERODACTYL_SERVER_ID;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ error: "idToken wajib diisi." });

  let email;
  try {
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) }
    );
    const verifyData = await verifyRes.json();
    email = verifyData?.users?.[0]?.email;
    if (!email) throw new Error("invalid");
  } catch (e) {
    return res.status(401).json({ error: "Sesi login tidak valid, login ulang." });
  }

  if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
    return res.status(403).json({ error: "Cuma admin yang boleh buka console." });
  }

  if (!PTERODACTYL_PANEL_URL || !PTERODACTYL_API_KEY || !PTERODACTYL_SERVER_ID) {
    return res.status(500).json({ error: "Env var Pterodactyl belum lengkap di Vercel." });
  }

  try {
    const ptRes = await fetch(
      `${PTERODACTYL_PANEL_URL}/api/client/servers/${PTERODACTYL_SERVER_ID}/websocket`,
      {
        headers: {
          Authorization: `Bearer ${PTERODACTYL_API_KEY}`,
          Accept: "application/json",
        },
      }
    );
    if (!ptRes.ok) {
      const t = await ptRes.text();
      return res.status(502).json({ error: `Pterodactyl balas status ${ptRes.status}`, detail: t });
    }
    const data = await ptRes.json();
    return res.status(200).json({ token: data.data.token, socket: data.data.socket });
  } catch (e) {
    return res.status(502).json({ error: "Gagal konek ke panel Pterodactyl.", detail: String(e) });
  }
}
