import { getMailProviderAdapter } from "../providers/ProviderRegistry.js";
import { validateAttachmentOrThrow } from "./MailboxPolicyService.js";

export async function sendOutboundMail(payload) {
  const provider = getMailProviderAdapter();
  const attachments = Array.isArray(payload?.attachments) ? payload.attachments : [];

  for (const attachment of attachments) {
    validateAttachmentOrThrow(attachment);
  }

  const mapped = {
    from: payload.from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    attachments: attachments.map((item) => ({
      filename: item.filename,
      content: item.content,
      type: item.type,
      disposition: "attachment"
    }))
  };

  return provider.sendMail(mapped);
}
