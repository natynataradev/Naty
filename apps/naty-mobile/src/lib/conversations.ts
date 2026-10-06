import { SCHOOL_ID } from '@/constants/school';
import { supabase } from '@/lib/supabase';

/**
 * Reutiliza la conversación activa/en handoff más reciente del contacto, o
 * crea una nueva si no tiene ninguna (o la única que tenía está 'closed').
 * Mismo criterio que usa el bot en apps/api/src/bot/bot.ts.
 */
export async function findOrCreateConversation(contactId: string): Promise<string> {
  const { data: existing, error: findError } = await supabase
    .from('conversations')
    .select('id')
    .eq('contact_id', contactId)
    .in('status', ['active', 'handoff'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase
    .from('conversations')
    .insert({
      school_id: SCHOOL_ID,
      contact_id: contactId,
      status: 'active',
    })
    .select('id')
    .single();

  if (createError) throw createError;
  return created.id;
}
