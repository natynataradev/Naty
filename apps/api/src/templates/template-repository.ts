import { supabase } from '../db/client.js';
import { env } from '../config/env.js';

const SCHOOL_ID = env.DEFAULT_SCHOOL_ID;

export interface Template {
  id: string;
  school_id: string;
  name: string;
  body: string;
  created_by: string;
  created_at: string;
}

export interface CreateTemplateInput {
  name: string;
  body: string;
  created_by: string;
}

export async function listTemplates(): Promise<Template[]> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('school_id', SCHOOL_ID)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Template[];
}

export async function getTemplateById(id: string): Promise<Template | null> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', id)
    .eq('school_id', SCHOOL_ID)
    .maybeSingle();

  if (error) throw error;
  return data as Template | null;
}

export async function createTemplate(input: CreateTemplateInput): Promise<Template> {
  const { data, error } = await supabase
    .from('templates')
    .insert({ ...input, school_id: SCHOOL_ID })
    .select()
    .single();

  if (error) throw error;
  return data as Template;
}

export async function updateTemplate(
  id: string,
  input: Partial<Pick<Template, 'name' | 'body'>>
): Promise<Template> {
  const { data, error } = await supabase
    .from('templates')
    .update(input)
    .eq('id', id)
    .eq('school_id', SCHOOL_ID)
    .select()
    .single();

  if (error) throw error;
  return data as Template;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', id)
    .eq('school_id', SCHOOL_ID);

  if (error) throw error;
}
