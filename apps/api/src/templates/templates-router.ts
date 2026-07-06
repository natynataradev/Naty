import { Router, type Request, type Response, type Router as RouterType } from 'express';
import {
  listTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from './template-repository.js';

export const templatesRouter: RouterType = Router();

// GET /templates — lista todas las plantillas
templatesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const templates = await listTemplates();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /templates/:id — obtiene una plantilla por ID
templatesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const template = await getTemplateById(req.params['id'] as string);
    if (!template) {
      res.status(404).json({ error: 'Plantilla no encontrada' });
      return;
    }
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /templates — crea una nueva plantilla
templatesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, body, created_by } = req.body as {
      name?: string;
      body?: string;
      created_by?: string;
    };

    if (!name || !body || !created_by) {
      res.status(400).json({ error: 'name, body y created_by son requeridos' });
      return;
    }

    const template = await createTemplate({ name, body, created_by });
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH /templates/:id — edita nombre o body
templatesRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { name, body } = req.body as { name?: string; body?: string };
    if (!name && !body) {
      res.status(400).json({ error: 'Debes proporcionar al menos name o body' });
      return;
    }
    const existing = await getTemplateById(req.params['id'] as string);
    if (!existing) {
      res.status(404).json({ error: 'Plantilla no encontrada' });
      return;
    }
    const updated = await updateTemplate(req.params['id'] as string, { name, body });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /templates/:id — elimina una plantilla
templatesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await getTemplateById(req.params['id'] as string);
    if (!existing) {
      res.status(404).json({ error: 'Plantilla no encontrada' });
      return;
    }
    await deleteTemplate(req.params['id'] as string);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
