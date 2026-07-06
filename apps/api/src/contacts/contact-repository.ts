import { supabase } from '../db/client.js';
import { env } from '../config/env.js';
import type {
  Contact,
  ContactFilters,
  CreateContactInput,
  PaginatedContacts,
  UpdateContactInput,
} from '@naty/shared';

const SCHOOL_ID = env.DEFAULT_SCHOOL_ID;

export async function listContacts(filters: ContactFilters): Promise<PaginatedContacts> {
  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 50, 200);
  const offset = (page - 1) * limit;

  let query = supabase
    .from('contacts')
    .select('*', { count: 'exact' })
    .eq('school_id', SCHOOL_ID);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.source) query = query.eq('source', filters.source);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to) query = query.lte('created_at', filters.to);
  if (filters.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
    );
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    data: (data ?? []) as Contact[],
    total: count ?? 0,
    page,
    limit,
  };
}

export async function getContactById(id: string): Promise<Contact | null> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .eq('school_id', SCHOOL_ID)
    .maybeSingle();

  if (error) throw error;
  return data as Contact | null;
}

export async function createContact(input: Omit<CreateContactInput, 'school_id'>): Promise<Contact> {
  const { data, error } = await supabase
    .from('contacts')
    .insert({ ...input, school_id: SCHOOL_ID })
    .select()
    .single();

  if (error) throw error;
  return data as Contact;
}

export async function updateContact(id: string, input: UpdateContactInput): Promise<Contact | null> {
  const { data, error } = await supabase
    .from('contacts')
    .update(input)
    .eq('id', id)
    .eq('school_id', SCHOOL_ID)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as Contact | null;
}

export async function deleteContact(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('contacts')
    .update({ status: 'inactive' })
    .eq('id', id)
    .eq('school_id', SCHOOL_ID);

  if (error) throw error;
  return true;
}

export async function getContactWithHistory(id: string) {
  const contact = await getContactById(id);
  if (!contact) return null;

  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, started_at, last_message_at, status, handoff_at, handoff_reason')
    .eq('contact_id', id)
    .order('started_at', { ascending: false })
    .limit(5);

  const conversationIds = (conversations ?? []).map((c) => c.id);

  const messages =
    conversationIds.length > 0
      ? (
          await supabase
            .from('messages')
            .select('id, conversation_id, direction, content, type, timestamp, status')
            .in('conversation_id', conversationIds)
            .order('timestamp', { ascending: true })
        ).data ?? []
      : [];

  return {
    contact,
    conversations: (conversations ?? []).map((c) => ({
      ...c,
      messages: messages.filter((m) => m.conversation_id === c.id),
    })),
  };
}

export async function exportContacts(filters: ContactFilters): Promise<Contact[]> {
  let query = supabase
    .from('contacts')
    .select('*')
    .eq('school_id', SCHOOL_ID);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.source) query = query.eq('source', filters.source);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to) query = query.lte('created_at', filters.to);
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Contact[];
}

export async function bulkUpsertContacts(contacts: Omit<CreateContactInput, 'school_id'>[]): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .upsert(
      contacts.map((c) => ({
        ...c,
        school_id: SCHOOL_ID,
        source: 'import',
      })),
      { onConflict: 'school_id,phone' }
    )
    .select();

  if (error) throw error;
  return data as Contact[];
}
