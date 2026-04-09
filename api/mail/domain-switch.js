import { setActiveMailboxDomain } from "../../lib/mail/config/DomainConfigService.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const domain = String(req.body?.domain || "").trim();
  if (!domain) {
    return res.status(400).json({ error: "MISSING_DOMAIN" });
  }

  try {
    const activeDomain = await setActiveMailboxDomain(domain);
    return res.status(200).json({ ok: true, activeDomain });
  } catch (error) {
    return res.status(500).json({ error: "DOMAIN_SWITCH_FAILED", details: error.message });
  }
}
