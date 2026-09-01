// api/admin-restart-bot.js
// Endpoint khusus admin buat restart bot lewat Pterodactyl Client API resmi.
// Verifikasi login dicek di SINI (server-side), bukan cuma di tampilan web -
// jadi walau orang tau URL endpoint-nya, tetap ditolak kalau bukan admin.

const ADMIN_EMAILS = ["luxeriaporse@gmail.com", "herorandomml0@gmail.com"];
const FIREBASE_API_KEY = "AIzaSyAwbIHNg3tZuGDY81DIdN0rxQVlWwKv94c"; // sama kayak di index.html, memang publik

// Isi 3 ini di Vercel -> Project Settings -> Environment Variables
const PTERODACTYL_PANEL_URL = process.env.PTERODACTYL_PANEL_URL; // contoh: https://serverku.lynzzofficial.com
const PTERODACTYL_API_KEY = process.env.PTERODACTYL_API_KEY;     // Client API key (Account Settings > API Credentials)
const PTERODACTYL_SERVER_ID = process.env.PTERODACTYL_SERVER_ID; // identifier pendek server, contoh: 304700db

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { idToken, signal } = req.body || {};
  if (!idToken) {
    return res.status(400).json({ error: "idToken wajib diisi." });
  }
  const allowedSignals = ["start", "restart", "stop", "kill"];
  const finalSignal = allowedSignals.includes(signal) ? signal : "restart";

  // 1) Verifikasi ID token ke Firebase (tanpa perlu firebase-admin/service account)
  let email;
  try {
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );
    const verifyData = await verifyRes.json();
    email = verifyData?.users?.[0]?.email;
    if (!email) throw new Error("Token tidak valid.");
  } catch (e) {
    return res.status(401).json({ error: "Sesi login tidak valid, login ulang." });
  }

  // 2) Cek email-nya beneran admin
  if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
    return res.status(403).json({ error: "Cuma admin yang boleh restart bot." });
  }

  // 3) Panggil Pterodactyl Client API buat kirim signal restart
  if (!PTERODACTYL_PANEL_URL || !PTERODACTYL_API_KEY || !PTERODACTYL_SERVER_ID) {
    return res.status(500).json({ error: "Env var Pterodactyl belum lengkap di Vercel." });
  }

  try {
    const ptRes = await fetch(
      `${PTERODACTYL_PANEL_URL}/api/client/servers/${PTERODACTYL_SERVER_ID}/power`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PTERODACTYL_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ signal: finalSignal }),
      }
    );

    if (ptRes.status === 204 || ptRes.ok) {
      const labels = { start: "Bot dinyalakan.", restart: "Sinyal restart terkirim.", stop: "Bot dimatikan.", kill: "Bot dipaksa berhenti." };
      return res.status(200).json({ ok: true, message: labels[finalSignal] });
    }
    const errText = await ptRes.text();
    return res.status(502).json({ error: `Pterodactyl balas status ${ptRes.status}`, detail: errText });
  } catch (e) {
    return res.status(502).json({ error: "Gagal konek ke panel Pterodactyl.", detail: String(e) });
  }
}
