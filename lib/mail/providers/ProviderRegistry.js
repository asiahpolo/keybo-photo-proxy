import { getMailRuntimeConfig } from "../config/MailRuntimeConfig.js";
import { ResendProviderAdapter } from "./ResendProviderAdapter.js";

export function getMailProviderAdapter() {
  const config = getMailRuntimeConfig();

  switch ((config.provider || "").toLowerCase()) {
    case "resend":
    default:
      return new ResendProviderAdapter();
  }
}
