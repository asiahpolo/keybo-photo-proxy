import crypto from "crypto";
import { findMailboxByAddress, upsertForwarding, logMailboxEvent } from "../../../lib/mail/core/SupabaseMailRepository.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const mailboxAddress = String(req.body?.mailbox || "").trim().toLowerCase();
  const forwardToEmail = String(req.body?.forwardToEmail || "").trim().toLowerCase();

  if (!mailboxAddress || !forwardToEmail) {
    return res.status(400).json({ error: "MISSING_FIELDS" });
  }

  try {
    const mailbox = await findMailboxByAddress(mailboxAddress);
    if (!mailbox) {
      return res.status(404).json({ error: "MAILBOX_NOT_FOUND" });
    }

    const verificationToken = crypto.randomBytes(24).toString("hex");
    await upsertForwarding({
      mailboxId: mailbox.id,
      forwardToEmail,
      isVerified: false,
      isEnabled: false,
      verificationToken
    });

    await logMailboxEvent({
      mailboxId: mailbox.id,
      eventType: "forwarding_verification_requested",
      metadata: { forwardToEmail }
    });

    return res.status(200).json({ ok: true, verificationToken });
  } catch (error) {
    return res.status(500).json({ error: "FORWARDING_VERIFY_REQUEST_FAILED", details: error.message });
  }
}
