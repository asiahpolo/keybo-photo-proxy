import { getMailRuntimeConfig } from "../config/MailRuntimeConfig.js";

export function canAcceptInboundForMailbox(mailbox) {
  if (!mailbox) {
    return { allowed: false, reason: "MAILBOX_NOT_FOUND" };
  }

  if (mailbox.status === "locked") {
    return { allowed: false, reason: "MAILBOX_LOCKED" };
  }

  if (mailbox.status === "disabled") {
    return { allowed: false, reason: "MAILBOX_DISABLED" };
  }

  return { allowed: true, reason: null };
}

export function computeQueueExpiryISO() {
  const config = getMailRuntimeConfig();
  const expires = new Date(Date.now() + config.queueTtlHours * 60 * 60 * 1000);
  return expires.toISOString();
}

export function validateAttachmentOrThrow(attachment) {
  const config = getMailRuntimeConfig();
  const size = Number(attachment?.size || 0);

  if (size > config.attachmentMaxBytes) {
    const err = new Error("Attachment too large");
    err.code = "ATTACHMENT_TOO_LARGE";
    err.meta = {
      maxBytes: config.attachmentMaxBytes,
      receivedBytes: size,
      filename: attachment?.filename || null
    };
    throw err;
  }
}
