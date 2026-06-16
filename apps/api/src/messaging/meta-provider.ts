import { env } from '../config/env.js';
import type { IncomingMessage, MessagingProvider, OutgoingMessage } from './types.js';

export class MetaProvider implements MessagingProvider {
  async send(message: OutgoingMessage): Promise<void> {
    if (!env.META_PHONE_NUMBER_ID || !env.META_ACCESS_TOKEN) {
      throw new Error('Meta credentials no configurados');
    }

    const phoneNumber = message.to.replace(/\D/g, '');

    const url = `https://graph.facebook.com/v25.0/${env.META_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.META_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: {
          body: message.body,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Meta API error:', JSON.stringify(error, null, 2));
      console.error('Request to:', phoneNumber);
      throw new Error(`Meta API error: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    console.log('Message sent successfully:', result);
  }

  parseIncoming(payload: Record<string, string>): IncomingMessage {
    return {
      from: '',
      to: '',
      body: '',
      messageSid: '',
    };
  }

  validateSignature(signature: string, url: string, params: Record<string, string>): boolean {
    return true;
  }
}
