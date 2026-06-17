import { supabase } from '../../db/client.js';
import { captureProspectData } from './prospect-capture.js';
import type { BotContext } from '../types.js';
import type { ChatTurn } from '../llm.js';

// El doc dice: "SIEMPRE responde primero la duda del usuario y DESPUÉS invita a conectar".
// Por eso el LLM genera la respuesta informativa, y al finalizamos el handoff
// agregamos una invitación natural a Sol/Karla y a la dirección.
const HANDOFF_INVITE =
  ' Sol o Karla del equipo de Natara se pondrán en contacto contigo en breve 🙌 Mientras tanto, puedes conocernos más en Instagram @natara.la.cima o visitarnos en Av. La Cima #151, Zapopan. ¡Te esperamos!';

export interface HandoffOutcome {
  finalMessage: string;
}

/**
 * Cierra la conversación como 'handoff' en BD, captura datos de prospecto
 * y devuelve el mensaje final (respuesta del LLM + invitación a Sol/Karla).
 */
export async function finalizeHandoff(
  ctx: BotContext,
  llmReply: string,
  reason: string,
): Promise<HandoffOutcome> {
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

  // Limpiamos cualquier HANDOFF crudo que el LLM haya podido dejar escapar
  const cleanReply = llmReply.replace(/HANDOFF/gi, '').trim();

  return {
    finalMessage: `${cleanReply}${HANDOFF_INVITE}`,
  };
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
