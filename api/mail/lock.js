import { findMailboxByAddress, setMailboxStatus, logMailboxEvent } from "../../lib/mail/core/SupabaseMailRepository.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const mailboxAddress = String(req.body?.mailbox || "").trim().toLowerCase();
  const locked = Boolean(req.body?.locked);

  if (!mailboxAddress) {
    return res.status(400).json({ error: "MISSING_MAILBOX" });
  }

  try {
    const mailbox = await findMailboxByAddress(mailboxAddress);
    if (!mailbox) {
      return res.status(404).json({ error: "MAILBOX_NOT_FOUND" });
    }

    const status = locked ? "locked" : "active";
    await setMailboxStatus({ mailboxId: mailbox.id, status });
    await logMailboxEvent({
      mailboxId: mailbox.id,
      eventType: locked ? "mailbox_locked" : "mailbox_unlocked",
      metadata: { source: "api/mail/lock" }
    });

    return res.status(200).json({ ok: true, mailboxId: mailbox.id, status });
  } catch (error) {
    return res.status(500).json({ error: "LOCK_TOGGLE_FAILED", details: error.message });
  }
}
