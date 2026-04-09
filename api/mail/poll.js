import { findMailboxByAddress } from "../../lib/mail/core/SupabaseMailRepository.js";
import { getQueuedMessages } from "../../lib/mail/core/QueueService.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const mailboxAddress = String(req.query.mailbox || "").trim().toLowerCase();
  const limit = Number(req.query.limit || 20);

  if (!mailboxAddress) {
    return res.status(400).json({ error: "MISSING_MAILBOX" });
  }

  try {
    const mailbox = await findMailboxByAddress(mailboxAddress);
    if (!mailbox) {
      return res.status(404).json({ error: "MAILBOX_NOT_FOUND" });
    }

    const items = await getQueuedMessages(mailbox.id, Math.max(1, Math.min(limit, 100)));
    return res.status(200).json({ ok: true, mailboxId: mailbox.id, items });
  } catch (error) {
    return res.status(500).json({ error: "POLL_FAILED", details: error.message });
  }
}
