import { messagingService } from '../messaging/messaging-service.js';
import { supabase } from '../db/client.js';
import { env } from '../config/env.js';
import {
  getCampaignById,
  getSegmentContacts,
  updateCampaignStatus,
} from './campaign-repository.js';
import { getTemplateById } from '../templates/template-repository.js';

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

  // Detectar si es una plantilla de la BD
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaign.template_id);
  let templateName: string | undefined = undefined;
  let templateText = campaign.template_id;

  if (isUuid) {
    const template = await getTemplateById(campaign.template_id);
    if (template) {
      templateName = template.name;
      templateText = template.body;
    }
  }

  let sent = 0;
  let failed = 0;

  for (const contact of contacts) {
    try {
      const nombre = contact.name?.trim() || 'Estimado/a';
      const body = templateText.replace(/\{\{nombre\}\}/gi, nombre);
      const mediaUrl = (campaign.segment as any)?.media_url;

      if (templateName) {
        // Pasar el nombre como el primer parámetro de la plantilla de WhatsApp
        const templateParams = [nombre];
        await messagingService.send(contact.phone, body, mediaUrl, templateName, templateParams);
      } else {
        await messagingService.send(contact.phone, body, mediaUrl);
      }

      await recordCampaignMessage(campaignId, contact.phone, body, 'sent', mediaUrl);
      sent++;
    } catch (err) {
      console.error(`[campaigns] error enviando a ${contact.phone}:`, err);
      const mediaUrl = (campaign.segment as any)?.media_url;
      const errorMessage = err instanceof Error ? err.message : String(err);
      await recordCampaignMessage(campaignId, contact.phone, errorMessage, 'failed', mediaUrl);
      failed++;
    }

    await delay(BATCH_DELAY_MS);
  }

  await updateCampaignStatus(campaignId, failed === contacts.length ? 'failed' : 'completed', {
    sent_count: sent,
    delivered_count: sent,
    failed_count: failed,
    sent_at: new Date().toISOString(),
  });

  console.log(`[campaigns] "${campaign.name}" finalizada — enviados: ${sent}, fallidos: ${failed}`);
}

async function buildMessageBody(templateId: string, contactName: string | null): Promise<string> {
  // Intentar cargar la plantilla por ID (UUID)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(templateId);
  let body = templateId; // fallback: usar el texto directamente

  if (isUuid) {
    const template = await getTemplateById(templateId);
    if (template) {
      body = template.body;
    }
  }

  // Reemplazar variables en el cuerpo
  const nombre = contactName?.trim() || 'Estimado/a';
  return body.replace(/\{\{nombre\}\}/gi, nombre);
}

async function recordCampaignMessage(
  campaignId: string,
  phone: string,
  body: string,
  status: 'sent' | 'failed',
  mediaUrl?: string
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

  let conversationId = conversation?.id;

  if (!conversationId) {
    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({
        school_id: SCHOOL_ID,
        contact_id: contact.id,
        status: 'active',
      })
      .select('id')
      .single();

    if (createError || !newConv) {
      console.error(`[campaigns] error al crear conversación para contacto ${phone}:`, createError);
      return;
    }
    conversationId = newConv.id;
  }

  await supabase.from('messages').insert({
    conversation_id: conversationId,
    direction: 'outbound',
    content: body,
    type: mediaUrl ? 'image' : 'template',
    status,
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
