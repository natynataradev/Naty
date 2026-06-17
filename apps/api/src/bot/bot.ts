import { supabase } from '../db/client.js';
import { env } from '../config/env.js';
import { handlePrivacyFlow } from './privacy.js';
import { handleGeneralAttention } from './flows/general-attention.js';
import type { BotContext, BotFlowResult } from './types.js';

const DEFAULT_SCHOOL_ID = env.DEFAULT_SCHOOL_ID;

export async function processMessage(phone: string, body: string): Promise<BotFlowResult> {
  const ctx = await buildContext(phone, body);

  await persistInboundMessage(ctx, body);

  if (!ctx.acceptedPrivacy) {
    const result = await handlePrivacyFlow(ctx);
    await persistOutboundIfResponded(ctx, result);
    return result;
  }

  // Conversación en handoff — el equipo humano ya tomó el caso
  if (ctx.conversationStatus === 'handoff') {
    const result: BotFlowResult = {
      action: 'responded',
      message: 'Tu mensaje fue recibido. Alguien del equipo Natara ya está al tanto y en breve se pone en contacto contigo 😊',
    };
    await persistOutboundIfResponded(ctx, result);
    return result;
  }

  // Primer mensaje tras aceptar privacidad — capturar nombre
  if (!ctx.contactName && ctx.contactId) {
    const raw = ctx.messageBody.trim();
    const name = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    await supabase
      .from('contacts')
      .update({ name })
      .eq('id', ctx.contactId);
    const result: BotFlowResult = {
      action: 'responded',
      message: `Mucho gusto, ${name}. ¿En qué te puedo ayudar? 😊`,
    };
    await persistOutboundIfResponded({ ...ctx, contactName: name }, result);
    return result;
  }

  // handleGeneralAttention ya incluye el cierre de handoff (cuando aplique)
  const result = await handleGeneralAttention(ctx);
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
        accepted_privacy: false,
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
      acceptedPrivacy: false,
    };
  }

  const conv = await ensureConversation(contact.id);
  const conversationId = conv?.id;
  const conversationStatus = conv?.status;

  // privacySentAt solo se setea si hay mensajes previos en la conversación,
  // lo que confirma que el aviso ya fue enviado realmente.
  let privacySentAt: Date | undefined;
  if (conversationId) {
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);
    if (count && count > 0) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('started_at')
        .eq('id', conversationId)
        .maybeSingle();
      privacySentAt = conversation ? new Date(conversation.started_at) : undefined;
    }
  }

  return {
    phone,
    messageBody: body,
    contactId: contact.id,
    conversationId,
    conversationStatus,
    acceptedPrivacy: contact.accepted_privacy,
    privacySentAt,
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
