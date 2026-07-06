import { supabase } from '../db/client.js';
import { env } from '../config/env.js';
import type { CalendarEvent, CreateEventInput } from '@naty/shared';

const SCHOOL_ID = env.DEFAULT_SCHOOL_ID;

export async function listEvents(from: string, to: string): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('school_id', SCHOOL_ID)
    .gte('start_at', from)
    .lte('start_at', to)
    .order('start_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as CalendarEvent[];
}

export async function createEvent(input: CreateEventInput, createdBy: string): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('events')
    .insert({ ...input, school_id: SCHOOL_ID, created_by: createdBy })
    .select()
    .single();

  if (error) throw error;
  return data as CalendarEvent;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
    .eq('school_id', SCHOOL_ID);

  if (error) throw error;
}
