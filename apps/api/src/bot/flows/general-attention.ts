import { supabase } from '../../db/client.js';
import { llm } from '../llm.js';
import { NATY_SYSTEM_PROMPT } from '../system-prompt.js';
import type { BotContext, BotFlowResult } from '../types.js';
import type { ChatTurn } from '../llm.js';

const MAX_HISTORY_TURNS = 10;

export async function handleGeneralAttention(ctx: BotContext): Promise<BotFlowResult> {
  const history = await loadHistory(ctx.conversationId);

  let reply: string;
  try {
    reply = await llm.complete(NATY_SYSTEM_PROMPT, history, ctx.messageBody);
  } catch (err) {
    console.error('[llm] error:', String(err));
    return {
      action: 'responded',
      message: 'Disculpa, en este momento tengo un problema técnico. ¿Puedes intentar de nuevo en un momento?',
    };
  }

  if (!reply || reply.trim() === '') {
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
    role: m.direction === 'inbound' ? 'user' : 'assistant',
    content: m.content,
  }));
}
