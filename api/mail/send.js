import { sendOutboundMail } from "../../lib/mail/core/OutboundMailService.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const body = req.body || {};
  if (!body.from || !body.to || !body.subject) {
    return res.status(400).json({ error: "MISSING_REQUIRED_FIELDS" });
  }

  try {
    const result = await sendOutboundMail(body);
    if (!result.accepted) {
      return res.status(502).json({ error: "SEND_FAILED", details: result.error });
    }
    return res.status(200).json({ ok: true, providerMessageId: result.providerMessageId });
  } catch (error) {
    if (error.code === "ATTACHMENT_TOO_LARGE") {
      return res.status(400).json({ error: "ATTACHMENT_TOO_LARGE", meta: error.meta });
    }
    return res.status(500).json({ error: "SEND_INTERNAL_ERROR", details: error.message });
  }
}
