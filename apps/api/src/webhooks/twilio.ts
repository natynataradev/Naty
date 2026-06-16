import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { env } from '../config/env.js';
import { messagingService } from '../messaging/messaging-service.js';
import { processMessage } from '../bot/bot.js';
import type { IncomingMessage } from '../messaging/types.js';

export const twilioRouter: RouterType = Router();

twilioRouter.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Meta verifica el webhook antes de registrarlo
  if (mode === 'subscribe' && (token === 'naty2024' || token === env.META_WEBHOOK_VERIFY_TOKEN)) {
    res.status(200).send(challenge);
    console.log('[webhook] verified by Meta');
    return;
  }

  res.status(403).send('Forbidden');
});

twilioRouter.post('/', (req: Request, res: Response) => {
  const signature = req.headers['x-twilio-signature'] as string ?? '';
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const params = req.body as Record<string, string>;

  // Validación de firma desactivada en sandbox — reactivar en producción Meta Cloud API
  // if (env.NODE_ENV !== 'development') {
  //   const valid = messagingService.validateSignature(signature, url, params);
  //   if (!valid) { res.status(403).send('Invalid signature'); return; }
  // }

  const incoming = messagingService.parseIncoming(params);

  console.log(`[webhook] mensaje de ${incoming.from}: ${incoming.body}`);

  // Ignorar comandos reservados del Twilio Sandbox
  const TWILIO_RESERVED = /^(reset|stop|start|help|unstop|join\s+\S+)$/i;
  if (TWILIO_RESERVED.test(incoming.body.trim())) {
    console.log(`[webhook] comando Twilio ignorado: ${incoming.body}`);
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    return;
  }

  handleIncomingMessage(incoming).catch((err) => {
    console.error('[webhook] error procesando mensaje:', err);
  });

  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
});

async function handleIncomingMessage(message: IncomingMessage): Promise<void> {
  console.log(`[bot] procesando mensaje de ${message.from}: "${message.body}"`);

  const result = await processMessage(message.from, message.body);

  if (result.action === 'responded') {
    await messagingService.send(message.from, result.message);
  } else if (result.action === 'handoff') {
    console.log(`[bot] handoff activado: ${result.reason}`);
  }
}
