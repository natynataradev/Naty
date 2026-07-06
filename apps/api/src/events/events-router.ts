import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { listEvents, createEvent, deleteEvent } from './event-repository.js';

export const eventsRouter: RouterType = Router();

eventsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    if (!from || !to) {
      res.status(400).json({ error: 'from y to son requeridos' });
      return;
    }
    const events = await listEvents(from, to);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

eventsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    if (!body['title'] || !body['start_at'] || !body['end_at'] || !body['type']) {
      res.status(400).json({ error: 'title, start_at, end_at y type son requeridos' });
      return;
    }
    const userId = (req as any).userId as string;
    const event = await createEvent(body as any, userId);
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

eventsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteEvent(req.params['id'] as string);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
