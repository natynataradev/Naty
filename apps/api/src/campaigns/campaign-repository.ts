import { supabase } from '../db/client.js';
import { env } from '../config/env.js';
import { computePaymentStatus } from '../billing/payment-status.js';
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
  if (segment.contact_type?.length) query = query.in('type', segment.contact_type);
  if (segment.from) query = query.gte('created_at', segment.from);
  if (segment.to) query = query.lte('created_at', segment.to);

  const { data, error } = await query;
  if (error) throw error;

  let contacts = data ?? [];

  if (segment.payment_status?.length && contacts.length > 0) {
    const ids = contacts.map((c) => c.id);

    const { data: payments } = await supabase
      .from('payments')
      .select('contact_id, period_month')
      .eq('school_id', SCHOOL_ID)
      .in('contact_id', ids)
      .order('period_month', { ascending: false });

    // latest payment month per contact
    const lastPayment = new Map<string, string>();
    for (const p of payments ?? []) {
      if (!lastPayment.has(p.contact_id)) lastPayment.set(p.contact_id, p.period_month);
    }

    contacts = contacts.filter((c) => {
      const status = computePaymentStatus(lastPayment.get(c.id) ?? null);
      return segment.payment_status!.includes(status);
    });
  }

  return contacts;
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

