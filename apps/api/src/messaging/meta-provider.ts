import { env } from '../config/env.js';
import type { IncomingMessage, MessagingProvider, OutgoingMessage } from './types.js';

export class MetaProvider implements MessagingProvider {
  async send(message: OutgoingMessage): Promise<void> {
    if (!env.META_PHONE_NUMBER_ID || !env.META_ACCESS_TOKEN) {
      throw new Error('Meta credentials no configurados');
    }

    const phoneNumber = message.to.replace(/\D/g, '');

    const url = `https://graph.facebook.com/v25.0/${env.META_PHONE_NUMBER_ID}/messages`;

    const requestBody: any = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
    };

    if (message.templateName) {
      requestBody.type = 'template';
      requestBody.template = {
        name: message.templateName,
        language: {
          code: env.META_TEMPLATE_LANGUAGE
        },
        components: []
      };

      if (message.templateParams && message.templateParams.length > 0) {
        requestBody.template.components.push({
          type: 'body',
          parameters: message.templateParams.map(param => ({
            type: 'text',
            text: param
          }))
        });
      }

      if (message.mediaUrl) {
        requestBody.template.components.push({
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: {
                link: message.mediaUrl
              }
            }
          ]
        });
      }
    } else {
      if (message.mediaUrl) {
        requestBody.type = 'image';
        requestBody.image = {
          link: message.mediaUrl,
          caption: message.body,
        };
      } else {
        requestBody.type = 'text';
        requestBody.text = {
          body: message.body,
        };
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.META_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(requestBody),
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

  parseIncoming(payload: any): IncomingMessage {
    try {
      const changeValue = payload?.entry?.[0]?.changes?.[0]?.value;
      const message = changeValue?.messages?.[0];
      const contact = changeValue?.contacts?.[0];

      if (!message) {
        return { from: '', to: '', body: '', messageSid: '' };
      }

      return {
        from: message.from,
        to: changeValue?.metadata?.display_phone_number || '',
        body: message.type === 'text' ? (message.text?.body || '') : `[Mensaje tipo: ${message.type}]`,
        messageSid: message.id,
        profileName: contact?.profile?.name,
      };
    } catch (e) {
      console.error('[MetaProvider] Error parsing incoming payload:', e);
      return { from: '', to: '', body: '', messageSid: '' };
    }
  }

  validateSignature(signature: string, url: string, params: Record<string, string>): boolean {
    // La validación de firma de Meta (X-Hub-Signature-256) se puede implementar en el webhook.
    return true;
  }
}
