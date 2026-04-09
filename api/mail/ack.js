import { ackMessage } from "../../lib/mail/core/QueueService.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const queueId = Number(req.body?.queueId);
  if (!queueId) {
    return res.status(400).json({ error: "MISSING_QUEUE_ID" });
  }

  try {
    await ackMessage(queueId);
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "ACK_FAILED", details: error.message });
  }
}
