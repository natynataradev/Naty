import { Router, type Request, type Response, type Router as RouterType } from 'express';
import {
  listCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaignStatus,
  updateCampaignSchedule,
  cancelCampaign,
  getSegmentContacts,
} from './campaign-repository.js';
import { sendCampaign } from './mass-messaging.js';
import type { CreateCampaignInput } from '@naty/shared';
import { supabase } from '../db/client.js';

export const campaignsRouter: RouterType = Router();

campaignsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const campaigns = await listCampaigns();
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

campaignsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await getCampaignById(req.params['id'] as string);
    if (!campaign) { res.status(404).json({ error: 'Campaña no encontrada' }); return; }
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

campaignsRouter.post('/upload', async (req: Request, res: Response) => {
  try {
    const { file, filename } = req.body as { file?: string; filename?: string };
    if (!file || !filename) {
      res.status(400).json({ error: 'file (base64) y filename son requeridos' });
      return;
    }

    const matches = file.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      res.status(400).json({ error: 'Formato de archivo inválido. Debe ser una cadena Base64 Data URL' });
      return;
    }

    const contentType = matches[1];
    const base64Data = matches[2];

    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(contentType)) {
      res.status(400).json({ error: 'Tipo de archivo no permitido. Solo se aceptan imágenes JPG, PNG, GIF y WEBP' });
      return;
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const cleanFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;

    const { error } = await supabase.storage
      .from('campaigns')
      .upload(cleanFilename, buffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('campaigns')
      .getPublicUrl(cleanFilename);

    res.json({ publicUrl: urlData.publicUrl });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

campaignsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<CreateCampaignInput>;
    if (!body.name || !body.template_id || !body.segment || !body.created_by) {
      res.status(400).json({ error: 'name, template_id, segment y created_by son requeridos' });
      return;
    }
    const campaign = await createCampaign(body as Omit<CreateCampaignInput, 'school_id'>);
    res.status(201).json(campaign);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

campaignsRouter.post('/:id/send', async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  try {
    const campaign = await getCampaignById(id);
    if (!campaign) { res.status(404).json({ error: 'Campaña no encontrada' }); return; }

    res.json({ message: 'Envío iniciado', campaignId: id });

    sendCampaign(id).catch((err) => {
      console.error(`[campaigns] error en envío de ${id}:`, err);
      updateCampaignStatus(id, 'failed').catch(() => null);
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /:id/schedule — programa o reprograma una campaña
campaignsRouter.post('/:id/schedule', async (req: Request, res: Response) => {
  try {
    const body = req.body as { scheduled_at?: string };
    if (!body.scheduled_at) {
      res.status(400).json({ error: 'scheduled_at es requerido (ISO 8601)' });
      return;
    }
    const campaign = await getCampaignById(req.params['id'] as string);
    if (!campaign) { res.status(404).json({ error: 'Campaña no encontrada' }); return; }
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      res.status(409).json({ error: 'Solo se pueden programar campañas en estado draft o scheduled' });
      return;
    }

    await updateCampaignSchedule(req.params['id'] as string, body.scheduled_at);
    res.json({ message: 'Campaña programada', scheduled_at: body.scheduled_at });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /:id/cancel — cancela una campaña programada (vuelve a draft)
campaignsRouter.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const campaign = await getCampaignById(req.params['id'] as string);
    if (!campaign) { res.status(404).json({ error: 'Campaña no encontrada' }); return; }
    if (campaign.status !== 'scheduled') {
      res.status(409).json({ error: 'Solo se pueden cancelar campañas programadas' });
      return;
    }
    await cancelCampaign(req.params['id'] as string);
    res.json({ message: 'Campaña cancelada y devuelta a borrador' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /:id/recipients — devuelve la lista de contactos del segmento
campaignsRouter.get('/:id/recipients', async (req: Request, res: Response) => {
  try {
    const campaign = await getCampaignById(req.params['id'] as string);
    if (!campaign) { res.status(404).json({ error: 'Campaña no encontrada' }); return; }
    const contacts = await getSegmentContacts(campaign.segment);
    res.json({ total: contacts.length, contacts });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /:id — elimina una campaña en draft
campaignsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await getCampaignById(req.params['id'] as string);
    if (!campaign) { res.status(404).json({ error: 'Campaña no encontrada' }); return; }
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      res.status(409).json({ error: 'Solo se pueden eliminar campañas en estado draft o scheduled' });
      return;
    }
    await updateCampaignStatus(req.params['id'] as string, 'failed');
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
