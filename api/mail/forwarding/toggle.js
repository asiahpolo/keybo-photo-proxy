const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const mailboxId = Number(req.body?.mailboxId);
  const enabled = Boolean(req.body?.enabled);

  if (!mailboxId) {
    return res.status(400).json({ error: "MISSING_MAILBOX_ID" });
  }

  try {
    const url = `${SUPABASE_URL}/rest/v1/mailbox_forwarding?mailbox_id=eq.${mailboxId}`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        is_enabled: enabled,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      return res.status(500).json({ error: "FORWARDING_TOGGLE_FAILED", details: await response.text() });
    }

    return res.status(200).json({ ok: true, enabled });
  } catch (error) {
    return res.status(500).json({ error: "FORWARDING_TOGGLE_FAILED", details: error.message });
  }
}
