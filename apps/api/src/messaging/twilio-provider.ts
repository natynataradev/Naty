import twilio from 'twilio';
import { env } from '../config/env.js';
import type { IncomingMessage, MessagingProvider, OutgoingMessage } from './types.js';

export class TwilioProvider implements MessagingProvider {
  private _client: ReturnType<typeof twilio> | null = null;

  private get client(): ReturnType<typeof twilio> {
    if (!this._client) {
      this._client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    }
    return this._client;
  }

  async send(message: OutgoingMessage): Promise<void> {
    let toNumber = message.to.replace('whatsapp:', '').trim();
    const fullTo = `whatsapp:${toNumber}`;

    console.log(`[twilio] sending to: ${fullTo}`);

    await this.client.messages.create({
      from: env.TWILIO_WHATSAPP_NUMBER,
      to: fullTo,
      body: message.body,
    });
  }

  parseIncoming(payload: Record<string, string>): IncomingMessage {
    return {
      from: payload['From']?.replace('whatsapp:', '') ?? '',
      to: payload['To']?.replace('whatsapp:', '') ?? '',
      body: payload['Body'] ?? '',
      messageSid: payload['MessageSid'] ?? '',
      profileName: payload['ProfileName'],
    };
  }

  validateSignature(signature: string, url: string, params: Record<string, string>): boolean {
    return twilio.validateRequest(env.TWILIO_AUTH_TOKEN, signature, url, params);
  }
}
