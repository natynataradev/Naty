import { Router, type Request, type Response, type Router as RouterType } from 'express';
import {
  listContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  getContactWithHistory,
  exportContacts,
  bulkUpsertContacts,
} from './contact-repository.js';
import type { ContactFilters } from '@naty/shared';

export const contactsRouter: RouterType = Router();

function parseFilters(query: Record<string, unknown>): ContactFilters {
  return {
    status: query['status'] as ContactFilters['status'],
    source: query['source'] as ContactFilters['source'],
    type: query['type'] as ContactFilters['type'],
    from: query['from'] as string | undefined,
    to: query['to'] as string | undefined,
    search: query['search'] as string | undefined,
    page: query['page'] ? parseInt(query['page'] as string, 10) : undefined,
    limit: query['limit'] ? parseInt(query['limit'] as string, 10) : undefined,
  };
}

function toCsv(contacts: { phone: string; name: string | null; email: string | null; status: string; source: string; accepted_privacy: boolean; created_at: string }[]): string {
  const headers = ['phone', 'name', 'email', 'status', 'source', 'accepted_privacy', 'created_at'];
  const rows = contacts.map((c) =>
    [c.phone, c.name ?? '', c.email ?? '', c.status, c.source, c.accepted_privacy, c.created_at]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

contactsRouter.get('/export', async (req: Request, res: Response) => {
  try {
    const filters = parseFilters(req.query as Record<string, unknown>);
    const contacts = await exportContacts(filters);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="contactos.csv"');
    res.send(toCsv(contacts));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

contactsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const filters = parseFilters(req.query as Record<string, unknown>);
    const result = await listContacts(filters);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

contactsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { detail } = req.query;
    if (detail === 'full') {
      const result = await getContactWithHistory(req.params['id'] as string);
      if (!result) { res.status(404).json({ error: 'Contacto no encontrado' }); return; }
      res.json(result);
      return;
    }
    const contact = await getContactById(req.params['id'] as string);
    if (!contact) { res.status(404).json({ error: 'Contacto no encontrado' }); return; }
    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

contactsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    if (!body['phone'] || !body['source']) {
      res.status(400).json({ error: 'phone y source son requeridos' });
      return;
    }
    const contact = await createContact(body as Parameters<typeof createContact>[0]);
    res.status(201).json(contact);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

contactsRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const contact = await updateContact(req.params['id'] as string, req.body as Record<string, unknown>);
    if (!contact) { res.status(404).json({ error: 'Contacto no encontrado' }); return; }
    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

contactsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteContact(req.params['id'] as string);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

contactsRouter.post('/import', async (req: Request, res: Response) => {
  try {
    const { contacts } = req.body as { contacts?: any[] };
    if (!contacts || !Array.isArray(contacts)) {
      res.status(400).json({ error: 'El cuerpo de la petición debe contener un array "contacts".' });
      return;
    }

    if (contacts.length === 0) {
      res.json([]);
      return;
    }

    // Validate telephone numbers are provided
    for (const c of contacts) {
      if (!c.phone) {
        res.status(400).json({ error: 'Todos los contactos deben incluir un número de teléfono.' });
        return;
      }
    }

    const result = await bulkUpsertContacts(contacts);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
