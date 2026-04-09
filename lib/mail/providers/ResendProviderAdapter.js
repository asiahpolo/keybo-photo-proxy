import { MailProviderAdapter } from "./MailProviderAdapter.js";
import { getMailRuntimeConfig } from "../config/MailRuntimeConfig.js";

export class ResendProviderAdapter extends MailProviderAdapter {
  constructor() {
    super();
    this.config = getMailRuntimeConfig();
  }

  verifyInboundSignature(request) {
    const expected = this.config.resendWebhookSecret;
    if (!expected) {
      return true;
    }

    const incoming = request.headers["x-resend-signature"] || request.headers["X-Resend-Signature"];
    return incoming === expected;
  }

  normalizeInboundPayload(requestBody) {
    const from = requestBody?.from || "";
    const toList = Array.isArray(requestBody?.to) ? requestBody.to : (requestBody?.to ? [requestBody.to] : []);
    const to = toList.map((item) => String(item).trim().toLowerCase()).filter(Boolean);

    return {
      providerMessageId: requestBody?.message_id || requestBody?.id || `${Date.now()}`,
      from,
      to,
      subject: requestBody?.subject || "",
      textBody: requestBody?.text || requestBody?.text_body || "",
      htmlBody: requestBody?.html || requestBody?.html_body || "",
      receivedAt: requestBody?.created_at || new Date().toISOString(),
      raw: requestBody || {}
    };
  }

  async sendMail(payload) {
    if (!this.config.resendApiKey) {
      return {
        accepted: false,
        providerMessageId: null,
        error: "RESEND_API_KEY missing"
      };
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        accepted: false,
        providerMessageId: null,
        error: text || `HTTP ${response.status}`
      };
    }

    const json = await response.json();
    return {
      accepted: true,
      providerMessageId: json?.id || null,
      error: null
    };
  }
}
