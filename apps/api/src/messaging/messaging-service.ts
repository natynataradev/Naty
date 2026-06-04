import type { MessagingProvider, OutgoingMessage } from './types.js';
import { TwilioProvider } from './twilio-provider.js';

export class MessagingService {
  private provider: MessagingProvider;

  constructor(provider?: MessagingProvider) {
    this.provider = provider ?? new TwilioProvider();
  }

  async send(to: string, body: string): Promise<void> {
    await this.provider.send({ to, body });
  }

  parseIncoming(payload: Record<string, string>) {
    return this.provider.parseIncoming(payload);
  }

  validateSignature(signature: string, url: string, params: Record<string, string>): boolean {
    return this.provider.validateSignature(signature, url, params);
  }
}

export const messagingService = new MessagingService();
