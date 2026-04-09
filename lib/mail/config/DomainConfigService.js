const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function getHeaders() {
  return {
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    apikey: SUPABASE_SERVICE_KEY,
    "Content-Type": "application/json"
  };
}

function normalizeDomain(value) {
  return (value || "").trim().toLowerCase().replace(/^@+/, "");
}

export async function getActiveMailboxDomain() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return null;
  }

  const url = `${SUPABASE_URL}/rest/v1/mailbox_domains?is_active=eq.true&select=domain&order=updated_at.desc&limit=1`;
  const response = await fetch(url, { headers: getHeaders() });
  if (!response.ok) {
    return null;
  }

  const rows = await response.json();
  return rows?.[0]?.domain || null;
}

export async function setActiveMailboxDomain(domain) {
  const normalized = normalizeDomain(domain);
  if (!normalized) {
    throw new Error("Domain is required");
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("Supabase config missing");
  }

  const deactivateUrl = `${SUPABASE_URL}/rest/v1/mailbox_domains?is_active=eq.true`;
  await fetch(deactivateUrl, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ is_active: false, updated_at: new Date().toISOString() })
  });

  const upsertUrl = `${SUPABASE_URL}/rest/v1/mailbox_domains?on_conflict=domain`;
  const upsertBody = {
    domain: normalized,
    is_active: true,
    updated_at: new Date().toISOString()
  };

  const upsertResponse = await fetch(upsertUrl, {
    method: "POST",
    headers: {
      ...getHeaders(),
      Prefer: "resolution=merge-duplicates"
    },
    body: JSON.stringify(upsertBody)
  });

  if (!upsertResponse.ok) {
    const text = await upsertResponse.text();
    throw new Error(`Failed to set active domain: ${text}`);
  }

  return normalized;
}
