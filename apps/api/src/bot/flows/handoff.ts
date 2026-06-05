import { supabase } from '../../db/client.js';
import { captureProspectData } from './prospect-capture.js';
import type { BotContext, BotFlowResult } from '../types.js';
import type { ChatTurn } from '../llm.js';

const HANDOFF_MESSAGE =
  'Entendido, te voy a conectar con uno de nuestros asesores para que te puedan ayudar mejor. En breve alguien de nuestro equipo se comunicará contigo. ¡Hasta pronto! 😊';

export async function handleHandoff(ctx: BotContext, reason: string): Promise<BotFlowResult> {
  if (ctx.conversationId) {
    await supabase
      .from('conversations')
      .update({
        status: 'handoff',
        handoff_at: new Date().toISOString(),
        handoff_reason: reason,
      })
      .eq('id', ctx.conversationId);

    const history = await loadHistory(ctx.conversationId);
    await captureProspectData(ctx, history);
  }

  console.log(`[handoff] contacto ${ctx.phone} derivado a humano. Razón: ${reason}`);

  return { action: 'responded', message: HANDOFF_MESSAGE };
}

async function loadHistory(conversationId: string): Promise<ChatTurn[]> {
  const { data } = await supabase
    .from('messages')
    .select('direction, content')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: true })
    .limit(20);

  if (!data) return [];

  return data.map((m) => ({
    role: m.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
    content: m.content,
  }));
}
