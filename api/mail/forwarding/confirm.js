import { getForwardingByToken, updateForwardingStatus, logMailboxEvent } from "../../../lib/mail/core/SupabaseMailRepository.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const token = String(req.body?.token || "").trim();
  if (!token) {
    return res.status(400).json({ error: "MISSING_TOKEN" });
  }

  try {
    const forwarding = await getForwardingByToken(token);
    if (!forwarding) {
      return res.status(404).json({ error: "TOKEN_NOT_FOUND" });
    }

    await updateForwardingStatus({
      mailboxId: forwarding.mailbox_id,
      isVerified: true,
      isEnabled: true
    });

    await logMailboxEvent({
      mailboxId: forwarding.mailbox_id,
      eventType: "forwarding_verified",
      metadata: { forwardToEmail: forwarding.forward_to_email }
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "FORWARDING_CONFIRM_FAILED", details: error.message });
  }
}
