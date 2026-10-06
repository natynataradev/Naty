import { supabase } from '../db/client.js';
import { env } from '../config/env.js';
import { sendPushToSchool } from '../notifications/push.js';

const POLL_INTERVAL_MS = 60_000; // cada 60 segundos
const PENDING_RESPONSE_GRACE_MS = 10_000; // 10s después de handoff_at
const PUSH_RELEVANCE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 horas

interface HandoffConversation {
  id: string;
  school_id: string;
  handoff_at: string | null;
  contact: { name: string | null; phone: string } | { name: string | null; phone: string }[] | null;
}

export function startHandoffReview(): void {
  console.log('[handoff-review] iniciado — revisando conversaciones en handoff cada 60s');

  void checkHandoffs();

  setInterval(() => {
    void checkHandoffs();
  }, POLL_INTERVAL_MS);
}

async function checkHandoffs(): Promise<void> {
  const cutoff = new Date(Date.now() - env.HANDOFF_WINDOW_MINUTES * 60 * 1000).toISOString();

  let conversations: HandoffConversation[];
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, school_id, handoff_at, contact:contacts ( name, phone )')
      .eq('status', 'handoff')
      .or(`handoff_at.lt.${cutoff},handoff_at.is.null`);

    if (error) throw error;
    conversations = (data ?? []) as HandoffConversation[];
  } catch (err) {
    console.error('[handoff-review] error buscando conversaciones en handoff:', err);
    return;
  }

  for (const conversation of conversations) {
    try {
      await processConversation(conversation);
    } catch (err) {
      console.error(`[handoff-review] error procesando conversación ${conversation.id}:`, err);
    }
  }
}

async function processConversation(conversation: HandoffConversation): Promise<void> {
  const pending = await hasMessagesPendingResponse(conversation.id, conversation.handoff_at);

  const handoffAtMs = conversation.handoff_at ? new Date(conversation.handoff_at).getTime() : null;
  const withinPushWindow = handoffAtMs !== null && Date.now() - handoffAtMs < PUSH_RELEVANCE_WINDOW_MS;

  if (pending && conversation.handoff_at !== null && withinPushWindow) {
    const contact = Array.isArray(conversation.contact) ? conversation.contact[0] : conversation.contact;
    const contactLabel = contact?.name ?? contact?.phone ?? 'Un contacto';

    void sendPushToSchool(conversation.school_id, {
      title: 'Mensajes esperando respuesta',
      body: `${contactLabel}: lleva más de 12 horas sin respuesta del personal`,
      data: { conversationId: conversation.id, type: 'pending' },
    });
  }

  const { error } = await supabase
    .from('conversations')
    .update({ status: 'active' })
    .eq('id', conversation.id);

  if (error) throw error;
}

async function hasMessagesPendingResponse(
  conversationId: string,
  handoffAt: string | null
): Promise<boolean> {
  const { data: lastMessages, error: lastMessageError } = await supabase
    .from('messages')
    .select('direction')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: false })
    .limit(1);

  if (lastMessageError) throw lastMessageError;

  const lastDirection = lastMessages?.[0]?.direction;
  if (lastDirection === 'inbound') return true;

  if (!handoffAt) return false;

  const graceDeadline = new Date(new Date(handoffAt).getTime() + PENDING_RESPONSE_GRACE_MS).toISOString();

  const { count, error: outboundError } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('direction', 'outbound')
    .gt('timestamp', graceDeadline);

  if (outboundError) throw outboundError;

  return (count ?? 0) === 0;
}
