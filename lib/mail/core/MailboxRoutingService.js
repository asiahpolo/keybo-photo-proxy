import { findMailboxByAddress } from "./SupabaseMailRepository.js";

export async function resolveMailboxForInboundRecipients(recipients) {
  for (const address of recipients || []) {
    const mailbox = await findMailboxByAddress(address);
    if (mailbox) {
      return mailbox;
    }
  }
  return null;
}
