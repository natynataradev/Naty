import { supabase } from '../../db/client.js';
import { llm } from '../llm.js';
import { NATY_SYSTEM_PROMPT } from '../system-prompt.js';
import type { BotContext, BotFlowResult } from '../types.js';
import type { ChatTurn } from '../llm.js';
import { finalizeHandoff } from './handoff.js';

const MAX_HISTORY_TURNS = 10;
const HANDOFF_TOKEN = 'HANDOFF';
const FALLBACK_ERROR =
  'Disculpa, ahorita no puedo responderte. ¿Lo intentamos de nuevo en un momento? Si necesitas algo urgente, marca al 33 1908 4177 🙌';

export interface GeneralAttentionResult {
  result: BotFlowResult;
}

/**
 * Maneja la atención general. Si el LLM decide handoff, primero se
 * persiste su respuesta informativa y DESPUÉS se delega al flujo de
 * handoff (que agrega la invitación a Sol/Karla y cierra la conversación).
 */
export async function handleGeneralAttention(ctx: BotContext): Promise<BotFlowResult> {
  const history = await loadHistory(ctx.conversationId);

  let reply: string;
  try {
    reply = await llm.complete(NATY_SYSTEM_PROMPT, history, ctx.messageBody);
  } catch (err) {
    console.error('[llm] error:', String(err));
    return { action: 'responded', message: FALLBACK_ERROR };
  }

  if (!reply || reply.trim() === '') {
    return { action: 'responded', message: FALLBACK_ERROR };
  }

  // Detección de handoff por intención (no por conteo de mensajes)
  const wantsHandoff = reply.toUpperCase().includes(HANDOFF_TOKEN);

  if (wantsHandoff) {
    const { finalMessage } = await finalizeHandoff(
      ctx,
      reply,
      `Intención de handoff detectada en: "${ctx.messageBody}"`,
    );
    return { action: 'responded', message: finalMessage };
  }

  return { action: 'responded', message: reply };
}

async function loadHistory(conversationId?: string): Promise<ChatTurn[]> {
  if (!conversationId) return [];

  const { data: messages } = await supabase
    .from('messages')
    .select('direction, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(MAX_HISTORY_TURNS * 2);

  if (!messages) return [];

  return messages.map((m) => ({
    role: m.direction === 'inbound' ? 'user' : 'assistant',
    content: m.content,
  }));
}
