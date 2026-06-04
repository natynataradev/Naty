import { Router, type Request, type Response, type Router as RouterType } from 'express';
import {
  listCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaignStatus,
} from './campaign-repository.js';
import { sendCampaign } from './mass-messaging.js';
import type { CreateCampaignInput } from '@naty/shared';

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

campaignsRouter.post('/:id/schedule', async (req: Request, res: Response) => {
  try {
    const body = req.body as { scheduled_at?: string };
    if (!body.scheduled_at) {
      res.status(400).json({ error: 'scheduled_at es requerido (ISO 8601)' });
      return;
    }
    const campaign = await getCampaignById(req.params['id'] as string);
    if (!campaign) { res.status(404).json({ error: 'Campaña no encontrada' }); return; }
    if (campaign.status !== 'draft') {
      res.status(409).json({ error: 'Solo se pueden programar campañas en estado draft' });
      return;
    }

    await updateCampaignStatus(req.params['id'] as string, 'scheduled');
    res.json({ message: 'Campaña programada', scheduled_at: body.scheduled_at });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

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
