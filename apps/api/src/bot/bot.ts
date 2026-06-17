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

    const conversationId = newContact
      ? await ensureConversation(newContact.id)
      : undefined;

    return {
      phone,
      messageBody: body,
      contactId: newContact?.id,
      conversationId,
      acceptedPrivacy: false,
    };
  }

  const conversationId = await ensureConversation(contact.id);

  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, started_at')
    .eq('id', conversationId ?? '')
    .maybeSingle();

  return {
    phone,
    messageBody: body,
    contactId: contact.id,
    conversationId,
    acceptedPrivacy: contact.accepted_privacy,
    privacySentAt: conversation ? new Date(conversation.started_at) : undefined,
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

async function ensureConversation(contactId: string): Promise<string | undefined> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('contact_id', contactId)
    .in('status', ['active'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created } = await supabase
    .from('conversations')
    .insert({
      school_id: DEFAULT_SCHOOL_ID,
      contact_id: contactId,
      status: 'active',
    })
    .select('id')
    .single();

  return created?.id;
}
