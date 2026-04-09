import { ingestInboundRequest } from "../../lib/mail/core/InboundIngestService.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const result = await ingestInboundRequest(req);
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(200).json({ ok: true, data: result.data });
  } catch (error) {
    return res.status(500).json({ error: "INBOUND_INGEST_FAILED", details: error.message });
  }
}
