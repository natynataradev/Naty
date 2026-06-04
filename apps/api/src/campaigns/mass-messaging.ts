import { messagingService } from '../messaging/messaging-service.js';
import { supabase } from '../db/client.js';
import { env } from '../config/env.js';
import {
  getCampaignById,
  getSegmentContacts,
  updateCampaignStatus,
} from './campaign-repository.js';

const SCHOOL_ID = env.DEFAULT_SCHOOL_ID;
const BATCH_DELAY_MS = 200;

export async function sendCampaign(campaignId: string): Promise<void> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) throw new Error('Campaña no encontrada');
  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    throw new Error(`No se puede enviar una campaña en estado "${campaign.status}"`);
  }

  await updateCampaignStatus(campaignId, 'sending');

  const contacts = await getSegmentContacts(campaign.segment);
  console.log(`[campaigns] enviando campaña "${campaign.name}" a ${contacts.length} contactos`);

  let sent = 0;
  let failed = 0;

  for (const contact of contacts) {
    try {
      const body = buildMessageBody(campaign.template_id, contact.name);
      await messagingService.send(contact.phone, body);
      await recordCampaignMessage(campaignId, contact.phone, body, 'sent');
      sent++;
    } catch (err) {
      console.error(`[campaigns] error enviando a ${contact.phone}:`, err);
      await recordCampaignMessage(campaignId, contact.phone, '', 'failed');
      failed++;
    }

    await delay(BATCH_DELAY_MS);
  }

  await updateCampaignStatus(campaignId, failed === contacts.length ? 'failed' : 'completed', {
    sent_count: sent,
    delivered_count: 0,
    failed_count: failed,
    sent_at: new Date().toISOString(),
  });

  console.log(`[campaigns] "${campaign.name}" finalizada — enviados: ${sent}, fallidos: ${failed}`);
}

function buildMessageBody(templateId: string, name: string | null): string {
  const greeting = name ? `Hola ${name}` : 'Hola';
  return `${greeting}, te contactamos de Natara La Cima.\n\n${templateId}`;
}

async function recordCampaignMessage(
  campaignId: string,
  phone: string,
  body: string,
  status: 'sent' | 'failed'
): Promise<void> {
  const { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('school_id', SCHOOL_ID)
    .eq('phone', phone)
    .maybeSingle();

  if (!contact) return;

  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('contact_id', contact.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) return;

  await supabase.from('messages').insert({
    conversation_id: conversation.id,
    direction: 'outbound',
    content: body,
    type: 'template',
    status,
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
