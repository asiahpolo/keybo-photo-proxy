import { enqueueInboundMessage, fetchQueuedMessages, ackQueuedMessage } from "./SupabaseMailRepository.js";

export async function queueInboundMessage(input) {
  return enqueueInboundMessage(input);
}

export async function getQueuedMessages(mailboxId, limit) {
  return fetchQueuedMessages({ mailboxId, limit });
}

export async function ackMessage(queueId) {
  return ackQueuedMessage({ queueId });
}
