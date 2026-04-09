export class MailProviderAdapter {
  verifyInboundSignature(_request) {
    return true;
  }

  normalizeInboundPayload(_requestBody) {
    throw new Error("normalizeInboundPayload not implemented");
  }

  async sendMail(_payload) {
    throw new Error("sendMail not implemented");
  }
}
