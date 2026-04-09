import { getMailProviderAdapter } from "../providers/ProviderRegistry.js";
import { canAcceptInboundForMailbox, computeQueueExpiryISO } from "./MailboxPolicyService.js";
import { resolveMailboxForInboundRecipients } from "./MailboxRoutingService.js";
import { queueInboundMessage } from "./QueueService.js";

export async function ingestInboundRequest(req) {
  const provider = getMailProviderAdapter();

  if (!provider.verifyInboundSignature(req)) {
    return {
      ok: false,
      status: 401,
      error: "INVALID_SIGNATURE"
    };
  }

  const normalized = provider.normalizeInboundPayload(req.body || {});
  const mailbox = await resolveMailboxForInboundRecipients(normalized.to);

  const policy = canAcceptInboundForMailbox(mailbox);
  if (!policy.allowed) {
    return {
      ok: false,
      status: policy.reason === "MAILBOX_NOT_FOUND" ? 404 : 403,
      error: policy.reason
    };
  }

  await queueInboundMessage({
    mailboxId: mailbox.id,
    providerMessageId: normalized.providerMessageId,
    from: normalized.from,
    subjectPreview: (normalized.subject || "").slice(0, 180),
    receivedAt: normalized.receivedAt,
    payloadRef: JSON.stringify({
      textBody: normalized.textBody,
      htmlBody: normalized.htmlBody
    }),
    expiresAt: computeQueueExpiryISO()
  });

  return {
    ok: true,
    status: 200,
    data: {
      mailboxId: mailbox.id,
      providerMessageId: normalized.providerMessageId
    }
  };
}
