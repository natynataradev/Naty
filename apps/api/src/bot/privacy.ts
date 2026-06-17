import { supabase } from '../db/client.js';
import type { BotContext, BotFlowResult } from './types.js';

// Mensaje del primer contacto - debe coincidir con el system prompt
// {LINK_AVISO} se sustituye en runtime por la URL real del aviso de privacidad.
const PRIVACY_NOTICE_TEMPLATE =
  'Antes de poder ayudarte, necesito que respondas con la palabra *ACEPTO* nuestro aviso de privacidad y protección de datos personales que encontrarás en {LINK_AVISO}';

const PRIVACY_LINK = process.env.PRIVACY_POLICY_URL ?? process.env.PRIVACY_NOTICE_URL ?? 'https://natara.mx/privacidad';

const ACCEPT_VARIANTS = ['ACEPTO', 'ACEPT0', 'OK ACEPTO', 'SI ACEPTO', 'SÍ ACEPTO', 'SI', 'SÍ'];
const PRIVACY_TIMEOUT_HOURS = 24;

function buildPrivacyNotice(): string {
  return PRIVACY_NOTICE_TEMPLATE.replace('{LINK_AVISO}', PRIVACY_LINK);
}

function isAcceptance(text: string): boolean {
  const normalized = text.trim().toUpperCase().replace(/\s+/g, ' ');
  if (ACCEPT_VARIANTS.includes(normalized)) return true;
  // Solo aceptar si incluye explícitamente "ACEPTO"
  return normalized.includes('ACEPTO');
}

export async function handlePrivacyFlow(ctx: BotContext): Promise<BotFlowResult> {

  if (ctx.privacySentAt) {
    const hoursSinceSent =
      (Date.now() - ctx.privacySentAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceSent >= PRIVACY_TIMEOUT_HOURS) {
      await closeExpiredPrivacy(ctx);
      // Regla del doc: "cierra la conversación sin procesar ningún dato"
      return { action: 'noop' };
    }

    if (isAcceptance(ctx.messageBody)) {
      await recordPrivacyAccepted(ctx);
      return {
        action: 'responded',
        message:
          '¡Gracias! Soy Naty, asistente virtual de Natara Escuela de Natación — La Cima. ¿Con quién tengo el gusto? 😊',
      };
    }

    // No insistir demasiado: solo redirigir amablemente una vez
    return {
      action: 'responded',
      message:
        'Para poder seguir necesito que respondas ACEPTO al aviso de privacidad. Si tienes dudas del aviso, dime y te conecto con el equipo.',
    };
  }

  await recordPrivacySent(ctx);
  return { action: 'responded', message: buildPrivacyNotice() };
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
