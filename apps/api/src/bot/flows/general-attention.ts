import { supabase } from '../../db/client.js';
import { llm } from '../llm.js';
import { NATY_SYSTEM_PROMPT } from '../system-prompt.js';
import { buildCalendarContext } from '../calendar-context.js';
import type { BotContext, BotFlowResult } from '../types.js';
import type { ChatTurn } from '../llm.js';
import { finalizeHandoff } from './handoff.js';

const MAX_HISTORY_TURNS = 10;
const HANDOFF_TOKEN = 'HANDOFF';
const FAREWELL_TOKEN = 'FAREWELL';
const FAREWELL_INVITE =
  ' Recuerda que nos encuentras en Instagram @natara.la.cima, en Facebook como Natara Escuela de Natacion, o visítanos en Av. La Cima #151, Zapopan. ¡Te esperamos! 🏊';
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
export async function handleGeneralAttention(ctx: BotContext, isHandoff = false): Promise<BotFlowResult> {
  const [history, calendarCtx] = await Promise.all([
    loadHistory(ctx.conversationId),
    buildCalendarContext(90),
  ]);

  const nameNote = ctx.contactName
    ? `\n\nIMPORTANTE: El nombre de la persona con quien hablas es: ${ctx.contactName}. Úsalo ocasionalmente.`
    : '';
  const calendarNote = calendarCtx ? `\n\n${calendarCtx}` : '';
  const handoffNote = isHandoff
    ? '\n\nNOTA DEL SISTEMA: Esta conversación ya fue derivada a un asesor humano. Responde preguntas informativas con normalidad, pero NO incluyas la palabra HANDOFF en tu respuesta.'
    : '';
  const systemPrompt = `${NATY_SYSTEM_PROMPT}${nameNote}${calendarNote}${handoffNote}`;

  let reply: string;
  try {
    reply = await llm.complete(systemPrompt, history, ctx.messageBody);
  } catch (err) {
    console.error('[llm] error:', String(err));
    return { action: 'responded', message: FALLBACK_ERROR };
  }

  if (!reply || reply.trim() === '') {
    return { action: 'responded', message: FALLBACK_ERROR };
  }

  reply = stripFilteringQuestions(reply);

  const replyUpper = reply.toUpperCase();

  // Detección de handoff: por token explícito O por frase espontánea del LLM
  const impliedHandoff = /alguien del equipo natara se pondr[aá]/i.test(reply);
  const wantsHandoff = replyUpper.includes(HANDOFF_TOKEN) || impliedHandoff;

  if (wantsHandoff && !isHandoff) {
    const { finalMessage } = await finalizeHandoff(
      ctx,
      reply,
      `Intención de handoff detectada en: "${ctx.messageBody}"`,
    );
    return { action: 'responded', message: finalMessage };
  }

  // Ya en handoff: el LLM incluyó HANDOFF de todas formas — se limpia y se responde normal
  if (wantsHandoff && isHandoff) {
    const cleanReply = reply.replace(/HANDOFF/gi, '').replace(/\s{2,}/g, ' ').trim();
    return { action: 'responded', message: cleanReply };
  }

  // Cierre de conversación — se agrega invitación a visitar y redes sociales (solo una vez)
  const wantsFarewell = replyUpper.includes(FAREWELL_TOKEN);
  if (wantsFarewell) {
    const cleanReply = reply.replace(/FAREWELL/gi, '').replace(/\s{2,}/g, ' ').trim();
    const alreadySentInvite = history.some(
      (turn) => turn.role === 'assistant' && turn.content.includes('@natara.la.cima'),
    );
    return { action: 'responded', message: alreadySentInvite ? cleanReply : cleanReply + FAREWELL_INVITE };
  }

  return { action: 'responded', message: reply };
}

const FILTERING_KEYWORDS = [
  'cuántas clases', 'cuantas clases',
  'qué horario', 'que horario',
  'cuál horario', 'cual horario',
  'cuál de esos horario', 'cual de esos horario',
  'prefieres horario', 'prefieres entre semana', 'prefieres sábado', 'prefieres sabado',
  'te vendría mejor', 'te vendria mejor',
  'te acomoda mejor', 'te acomodaría mejor', 'te acomodaria mejor',
  'preferencia de horario',
  'entre semana o sábado', 'entre semana o sabado',
  'sábados o entre semana', 'sabados o entre semana',
  'cuál te viene mejor', 'cual te viene mejor',
  'cuál prefieres', 'cual prefieres',
  'qué días', 'que días', 'que dias', 'qué dias',
  'horario te viene', 'horario te gusta', 'horario te queda',
];

function stripFilteringQuestions(text: string): string {
  const lines = text.split('\n');
  const filtered = lines.filter((line) => {
    const lower = line.toLowerCase().trim();
    if (!lower.endsWith('?')) return true;
    return !FILTERING_KEYWORDS.some((kw) => lower.includes(kw));
  });
  return filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function loadHistory(conversationId?: string): Promise<ChatTurn[]> {
  if (!conversationId) return [];

  const { data: messages } = await supabase
    .from('messages')
    .select('direction, content')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: false })
    .limit(MAX_HISTORY_TURNS * 2);

  if (!messages) return [];

  return messages.reverse().map((m) => ({
    role: m.direction === 'inbound' ? 'user' : 'assistant',
    content: m.content,
  }));
}
