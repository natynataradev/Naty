import { supabase } from '../../db/client.js';
import { llm } from '../llm.js';
import { NATY_SYSTEM_PROMPT } from '../system-prompt.js';
import type { BotContext, BotFlowResult } from '../types.js';
import type { ChatTurn } from '../llm.js';

const MAX_HISTORY_TURNS = 10;

export async function handleGeneralAttention(ctx: BotContext): Promise<BotFlowResult> {
  console.log('[llm] iniciando llamada a Gemini para:', ctx.phone);
  const history = await loadHistory(ctx.conversationId);
  console.log('[llm] historial cargado:', history.length, 'mensajes');

  let reply: string;
  try {
    reply = await llm.complete(NATY_SYSTEM_PROMPT, history, ctx.messageBody);
    console.log('[llm] respuesta recibida:', reply.slice(0, 60));
  } catch (err) {
    console.error('[llm] ERROR llamando Gemini:', String(err));
    return {
      action: 'responded',
      message: 'Disculpa, en este momento tengo un problema técnico. ¿Puedes intentar de nuevo en un momento?',
    };
  }

  if (!reply || reply.trim() === '') {
    console.error('[llm] respuesta vacia de Gemini');
    return {
      action: 'responded',
      message: 'Disculpa, en este momento tengo un problema técnico. ¿Puedes intentar de nuevo en un momento?',
    };
  }

  if (reply.trim().toUpperCase().includes('HANDOFF')) {
    return {
      action: 'handoff',
      reason: `El LLM indicó handoff en respuesta a: "${ctx.messageBody}"`,
    };
  }

  return { action: 'responded', message: reply };
}

async function loadHistory(conversationId?: string): Promise<ChatTurn[]> {
  if (!conversationId) return [];

  const { data: messages } = await supabase
    .from('messages')
    .select('direction, content')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: true })
    .limit(MAX_HISTORY_TURNS * 2);

  if (!messages) return [];

  return messages.map((m) => ({
    role: m.direction === 'inbound' ? 'user' : 'model',
    text: m.content,
  }));
}
