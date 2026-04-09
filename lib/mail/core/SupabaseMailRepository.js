const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function headers(extra = {}) {
  return {
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    apikey: SUPABASE_SERVICE_KEY,
    "Content-Type": "application/json",
    ...extra
  };
}

function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("Supabase config missing");
  }
}

export async function findMailboxByAddress(address) {
  assertConfig();
  const normalized = String(address || "").trim().toLowerCase();
  const url = `${SUPABASE_URL}/rest/v1/user_mailboxes?mailbox_address=eq.${encodeURIComponent(normalized)}&select=*&limit=1`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    return null;
  }
  const rows = await res.json();
  return rows?.[0] || null;
}

export async function createOrUpdateMailbox({ userId, mailboxAddress, aliasLocalPart, domain, status = "active" }) {
  assertConfig();
  const body = {
    user_id: userId,
    mailbox_address: String(mailboxAddress || "").toLowerCase(),
    alias_local_part: aliasLocalPart,
    domain,
    status,
    updated_at: new Date().toISOString()
  };
  const url = `${SUPABASE_URL}/rest/v1/user_mailboxes?on_conflict=mailbox_address`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers({ Prefer: "resolution=merge-duplicates" }),
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return body;
}

export async function enqueueInboundMessage({ mailboxId, providerMessageId, from, subjectPreview, receivedAt, payloadRef, expiresAt }) {
  assertConfig();
  const body = {
    mailbox_id: mailboxId,
    provider_message_id: providerMessageId,
    sender: from,
    subject_preview: subjectPreview,
    received_at: receivedAt,
    payload_ref: payloadRef,
    delivery_state: "queued",
    expires_at: expiresAt,
    created_at: new Date().toISOString()
  };
  const url = `${SUPABASE_URL}/rest/v1/mail_queue`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return body;
}

export async function fetchQueuedMessages({ mailboxId, limit = 20 }) {
  assertConfig();
  const query = `mailbox_id=eq.${mailboxId}&delivery_state=eq.queued&order=received_at.asc&limit=${limit}`;
  const url = `${SUPABASE_URL}/rest/v1/mail_queue?${query}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return await res.json();
}

export async function ackQueuedMessage({ queueId }) {
  assertConfig();
  const url = `${SUPABASE_URL}/rest/v1/mail_queue?id=eq.${queueId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ delivery_state: "acked", delivered_at: new Date().toISOString() })
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
}

export async function setMailboxStatus({ mailboxId, status }) {
  assertConfig();
  const url = `${SUPABASE_URL}/rest/v1/user_mailboxes?id=eq.${mailboxId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ status, updated_at: new Date().toISOString() })
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
}

export async function logMailboxEvent({ mailboxId, eventType, metadata = {} }) {
  assertConfig();
  const url = `${SUPABASE_URL}/rest/v1/mailbox_events`;
  const res = await fetch(url, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      mailbox_id: mailboxId,
      event_type: eventType,
      metadata,
      created_at: new Date().toISOString()
    })
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
}

export async function upsertForwarding({ mailboxId, forwardToEmail, isVerified = false, isEnabled = false, verificationToken = null }) {
  assertConfig();
  const url = `${SUPABASE_URL}/rest/v1/mailbox_forwarding?on_conflict=mailbox_id`;
  const body = {
    mailbox_id: mailboxId,
    forward_to_email: String(forwardToEmail || "").toLowerCase(),
    is_verified: isVerified,
    is_enabled: isEnabled,
    verification_token: verificationToken,
    verification_status: isVerified ? "verified" : "pending",
    updated_at: new Date().toISOString()
  };
  const res = await fetch(url, {
    method: "POST",
    headers: headers({ Prefer: "resolution=merge-duplicates" }),
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return body;
}

export async function getForwardingByToken(token) {
  assertConfig();
  const query = `verification_token=eq.${encodeURIComponent(token)}&select=*&limit=1`;
  const url = `${SUPABASE_URL}/rest/v1/mailbox_forwarding?${query}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const rows = await res.json();
  return rows?.[0] || null;
}

export async function updateForwardingStatus({ mailboxId, isVerified, isEnabled }) {
  assertConfig();
  const url = `${SUPABASE_URL}/rest/v1/mailbox_forwarding?mailbox_id=eq.${mailboxId}`;
  const body = {
    is_verified: isVerified,
    is_enabled: isEnabled,
    verification_status: isVerified ? "verified" : "pending",
    updated_at: new Date().toISOString()
  };
  const res = await fetch(url, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
}
