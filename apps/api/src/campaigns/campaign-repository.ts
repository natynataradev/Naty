import { supabase } from '../db/client.js';
import { env } from '../config/env.js';
import type { Campaign, CreateCampaignInput, CampaignSegment } from '@naty/shared';

const SCHOOL_ID = env.DEFAULT_SCHOOL_ID;

export async function listCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('school_id', SCHOOL_ID)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Campaign[];
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .eq('school_id', SCHOOL_ID)
    .maybeSingle();

  if (error) throw error;
  return data as Campaign | null;
}

export async function createCampaign(input: Omit<CreateCampaignInput, 'school_id'>): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .insert({ ...input, school_id: SCHOOL_ID, status: 'draft' })
    .select()
    .single();

  if (error) throw error;
  return data as Campaign;
}

export async function updateCampaignStatus(
  id: string,
  status: Campaign['status'],
  extra: Partial<Pick<Campaign, 'sent_count' | 'delivered_count' | 'failed_count' | 'sent_at'>> = {}
): Promise<void> {
  const { error } = await supabase
    .from('campaigns')
    .update({ status, ...extra })
    .eq('id', id)
    .eq('school_id', SCHOOL_ID);

  if (error) throw error;
}

export async function getSegmentContacts(segment: CampaignSegment): Promise<{ id: string; phone: string; name: string | null }[]> {
  let query = supabase
    .from('contacts')
    .select('id, phone, name')
    .eq('school_id', SCHOOL_ID)
    .eq('accepted_privacy', true);

  if (segment.status?.length) query = query.in('status', segment.status);
  if (segment.source?.length) query = query.in('source', segment.source);
  if (segment.from) query = query.gte('created_at', segment.from);
  if (segment.to) query = query.lte('created_at', segment.to);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getPendingScheduledCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('school_id', SCHOOL_ID)
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString());

  if (error) throw error;
  return (data ?? []) as Campaign[];
}

export async function updateCampaignSchedule(id: string, scheduled_at: string): Promise<void> {
  const { error } = await supabase
    .from('campaigns')
    .update({ scheduled_at, status: 'scheduled' })
    .eq('id', id)
    .eq('school_id', SCHOOL_ID);

  if (error) throw error;
}

export async function cancelCampaign(id: string): Promise<void> {
  const { error } = await supabase
    .from('campaigns')
    .update({ status: 'draft', scheduled_at: null })
    .eq('id', id)
    .eq('school_id', SCHOOL_ID);

  if (error) throw error;
}

