const DEFAULT_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

export function getMailRuntimeConfig() {
  return {
    provider: process.env.MAIL_PROVIDER || "resend",
    queueTtlHours: Number(process.env.MAIL_QUEUE_TTL_HOURS || 24),
    attachmentMaxBytes: Number(process.env.MAIL_ATTACH_MAX_BYTES || DEFAULT_ATTACHMENT_MAX_BYTES),
    attachmentAllowedMimePattern: process.env.MAIL_ATTACH_ALLOWED_MIME || "*/*",
    extractionMode: process.env.MAIL_EXTRACTION_MODE || "regex",
    forwardingEnabled: (process.env.MAIL_FORWARDING_ENABLED || "true").toLowerCase() === "true",
    forwardingRequireVerification: (process.env.MAIL_FORWARDING_REQUIRE_VERIFICATION || "true").toLowerCase() === "true",
    resendWebhookSecret: process.env.RESEND_WEBHOOK_SECRET || "",
    resendApiKey: process.env.RESEND_API_KEY || "",
    mailboxConsentVersion: process.env.MAILBOX_CONSENT_VERSION || "1",
    mailboxGraceDays: Number(process.env.MAILBOX_GRACE_DAYS || 90)
  };
}
