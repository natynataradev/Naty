import type { MessagingProvider } from './types.js';
import { MetaProvider } from './meta-provider.js';

export class MessagingService {
  private provider: MessagingProvider;

  constructor(provider?: MessagingProvider) {
    this.provider = provider ?? new MetaProvider();
  }

  async send(to: string, body: string, mediaUrl?: string, templateName?: string, templateParams?: string[]): Promise<void> {
    await this.provider.send({ to, body, mediaUrl, templateName, templateParams });
  }

  parseIncoming(payload: Record<string, string>) {
    return this.provider.parseIncoming(payload);
  }

  validateSignature(signature: string, url: string, params: Record<string, string>): boolean {
    return this.provider.validateSignature(signature, url, params);
  }
}

export const messagingService = new MessagingService();
