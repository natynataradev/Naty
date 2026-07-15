import { supabase } from '../../db/client.js';
import { llm } from '../llm.js';
import type { ChatTurn } from '../llm.js';
import type { BotContext } from '../types.js';

interface ProspectData {
  name: string | null;
}

const EXTRACTION_PROMPT = `Eres un extractor de datos. A partir de una conversación de WhatsApp, extrae el nombre del usuario.

Responde ÚNICAMENTE con un JSON válido, sin explicaciones:
{"name": "nombre o null"}

Si no puedes inferir el nombre con seguridad, usa null.`;

export async function captureProspectData(ctx: BotContext, history: ChatTurn[]): Promise<void> {
  if (!ctx.contactId || history.length === 0) return;

  let extracted: ProspectData = { name: null };

  try {
    const summary = history.map((t) => `${t.role === 'user' ? 'Usuario' : 'Naty'}: ${t.content}`).join('\n');
    const raw = await llm.complete(EXTRACTION_PROMPT, [], summary);
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as Partial<ProspectData>;
      extracted = {
        name: typeof parsed.name === 'string' ? parsed.name : null,
      };
    }
  } catch {
    // Si falla la extracción no bloqueamos el handoff
  }

  const updates: Record<string, unknown> = { status: 'prospect' };
  if (extracted.name) updates['name'] = extracted.name;

  await supabase.from('contacts').update(updates).eq('id', ctx.contactId);
}
