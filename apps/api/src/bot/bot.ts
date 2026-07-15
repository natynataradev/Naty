import { supabase } from '../db/client.js';
import { env } from '../config/env.js';
import { handleGeneralAttention } from './flows/general-attention.js';
import type { BotContext, BotFlowResult } from './types.js';

const DEFAULT_SCHOOL_ID = env.DEFAULT_SCHOOL_ID;

const NAME_REQUEST =
  '¡Hola! Soy Naty 😊 Antes de empezar, ¿me dices tu nombre? Solo lo usamos para darte una mejor atención y no lo compartiremos con nadie.';

export async function processMessage(phone: string, body: string): Promise<BotFlowResult> {
  let ctx = await buildContext(phone, body);

  await persistInboundMessage(ctx, body);

  // Captura de nombre al inicio de la conversación
  if (!ctx.contactName) {
    const inboundCount = await countInboundMessages(ctx.conversationId);

    if (inboundCount === 1) {
      // Primer mensaje — pedir nombre antes de cualquier cosa
      const result: BotFlowResult = { action: 'responded', message: NAME_REQUEST };
      await persistOutboundIfResponded(ctx, result);
      return result;
    }

    if (inboundCount === 2) {
      // Segunda respuesta — guardar el nombre y continuar
      const name = extractName(ctx.messageBody);
      if (name && ctx.contactId) {
        await supabase.from('contacts').update({ name }).eq('id', ctx.contactId);
        ctx = { ...ctx, contactName: name };
      }
      // El LLM ve el historial y saluda con el nombre naturalmente
    }
  }

  const isHandoff = ctx.conversationStatus === 'handoff';
  const result = await handleGeneralAttention(ctx, isHandoff);
  await persistOutboundIfResponded(ctx, result);
  return result;
}

async function buildContext(phone: string, body: string): Promise<BotContext> {
  const { data: contact } = await supabase
    .from('contacts')
    .select('id, accepted_privacy, accepted_at, name')
    .eq('school_id', DEFAULT_SCHOOL_ID)
    .eq('phone', phone)
    .maybeSingle();

  if (!contact) {
    const { data: newContact } = await supabase
      .from('contacts')
      .insert({
        school_id: DEFAULT_SCHOOL_ID,
        phone,
        source: 'whatsapp_inbound',
        status: 'prospect',
        accepted_privacy: true,
        accepted_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    const conv = newContact
      ? await ensureConversation(newContact.id)
      : undefined;

    return {
      phone,
      messageBody: body,
      contactId: newContact?.id,
      conversationId: conv?.id,
      conversationStatus: conv?.status,
    };
  }

  const conv = await ensureConversation(contact.id);

  return {
    phone,
    messageBody: body,
    contactId: contact.id,
    conversationId: conv?.id,
    conversationStatus: conv?.status,
    contactName: contact.name ?? undefined,
  };
}

async function persistInboundMessage(ctx: BotContext, body: string): Promise<void> {
  if (!ctx.conversationId) return;

  await supabase.from('messages').insert({
    conversation_id: ctx.conversationId,
    direction: 'inbound',
    content: body,
    type: 'text',
    status: 'delivered',
  });

  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', ctx.conversationId);
}

async function persistOutboundIfResponded(ctx: BotContext, result: BotFlowResult): Promise<void> {
  if (result.action !== 'responded' || !ctx.conversationId) return;

  await supabase.from('messages').insert({
    conversation_id: ctx.conversationId,
    direction: 'outbound',
    content: result.message,
    type: 'text',
    status: 'sent',
  });
}

async function ensureConversation(contactId: string): Promise<{ id: string; status: string } | undefined> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id, status')
    .eq('contact_id', contactId)
    .in('status', ['active', 'handoff'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return { id: existing.id, status: existing.status };

  const { data: created } = await supabase
    .from('conversations')
    .insert({
      school_id: DEFAULT_SCHOOL_ID,
      contact_id: contactId,
      status: 'active',
    })
    .select('id, status')
    .single();

  return created ? { id: created.id, status: created.status } : undefined;
}

async function countInboundMessages(conversationId?: string): Promise<number> {
  if (!conversationId) return 0;
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('direction', 'inbound');
  return count ?? 0;
}

function extractName(msg: string): string {
  return msg
    .trim()
    .replace(/^(hola,?\s*)?(me llamo|soy|mi nombre es|me dicen|me puedes llamar|mi nombre)\s+/i, '')
    .replace(/[.!?,]$/, '')
    .trim()
    .slice(0, 60);
}
