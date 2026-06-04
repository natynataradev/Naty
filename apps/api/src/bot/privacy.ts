import { supabase } from '../db/client.js';
import type { BotContext, BotFlowResult } from './types.js';

const PRIVACY_NOTICE = `¡Hola! Soy Naty, asistente virtual de Natara La Cima 🏊

Antes de continuar, necesito tu autorización para procesar tus datos personales conforme al Aviso de Privacidad de Natara La Cima.

Puedes consultarlo en: https://natara.mx/privacidad

Para continuar, responde *ACEPTO*.

Si no respondes en 24 horas, tu conversación será cerrada automáticamente y no guardaremos ningún dato.`;

const PRIVACY_TIMEOUT_HOURS = 24;

export async function handlePrivacyFlow(ctx: BotContext): Promise<BotFlowResult> {
  if (ctx.acceptedPrivacy) {
    return { action: 'noop' };
  }

  if (ctx.privacySentAt) {
    const hoursSinceSent =
      (Date.now() - ctx.privacySentAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceSent >= PRIVACY_TIMEOUT_HOURS) {
      await closeExpiredPrivacy(ctx);
      return { action: 'noop' };
    }

    const normalized = ctx.messageBody.trim().toUpperCase();
    if (normalized === 'ACEPTO') {
      await recordPrivacyAccepted(ctx);
      return {
        action: 'responded',
        message:
          '¡Gracias por aceptar! Ahora sí, ¿en qué puedo ayudarte? Puedes preguntarme sobre horarios, precios, clases de prueba o inscripciones 😊',
      };
    }

    return {
      action: 'responded',
      message:
        'Para poder ayudarte necesito que respondas *ACEPTO* para confirmar que has leído el Aviso de Privacidad.',
    };
  }

  await recordPrivacySent(ctx);
  return { action: 'responded', message: PRIVACY_NOTICE };
}

async function recordPrivacySent(ctx: BotContext): Promise<void> {
  if (!ctx.contactId) return;

  await supabase
    .from('conversations')
    .update({ status: 'active' })
    .eq('id', ctx.conversationId ?? '');
}

async function recordPrivacyAccepted(ctx: BotContext): Promise<void> {
  if (!ctx.contactId) return;

  await supabase
    .from('contacts')
    .update({ accepted_privacy: true, accepted_at: new Date().toISOString() })
    .eq('id', ctx.contactId);
}

async function closeExpiredPrivacy(ctx: BotContext): Promise<void> {
  if (!ctx.conversationId) return;

  await supabase
    .from('conversations')
    .update({ status: 'closed' })
    .eq('id', ctx.conversationId);
}
