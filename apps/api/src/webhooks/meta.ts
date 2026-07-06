import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { env } from '../config/env.js';
import { messagingService } from '../messaging/messaging-service.js';
import { processMessage } from '../bot/bot.js';

export const metaRouter: RouterType = Router();

metaRouter.get('/', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.META_WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
    console.log('[meta-webhook] verified by Meta');
    return;
  }

  res.status(403).send('Forbidden');
});

metaRouter.post('/', (req: Request, res: Response) => {
  const payload = req.body;

  if (payload.object === 'whatsapp_business_account') {
    const incoming = messagingService.parseIncoming(payload);
    
    if (incoming.from && incoming.body) {
      handleIncomingMessage(incoming).catch((err) => {
        console.error('[meta-webhook] error procesando mensaje:', err);
      });
    }
  }

  res.status(200).send('EVENT_RECEIVED');
});

async function handleIncomingMessage(message: any): Promise<void> {
  console.log(`[bot-meta] procesando mensaje de ${message.from}: "${message.body}"`);

  const result = await processMessage(message.from, message.body);

  if (result.action === 'responded') {
    await messagingService.send(message.from, result.message);
  } else if (result.action === 'handoff') {
    console.log(`[bot-meta] handoff activado: ${result.reason}`);
  }
}
