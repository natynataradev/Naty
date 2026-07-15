import { Router, type Router as RouterType } from 'express';
import { supabase } from '../db/client.js';
import { env } from '../config/env.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const SCHOOL_ID = env.DEFAULT_SCHOOL_ID;

export const attendancesRouter: RouterType = Router();

// POST /attendances — register an attendance for a contact
attendancesRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const { contact_id, attended_at, notes } = req.body as {
    contact_id?: string;
    attended_at?: string;
    notes?: string;
  };

  if (!contact_id) {
    res.status(400).json({ error: 'contact_id es requerido' });
    return;
  }

  const { data, error } = await supabase
    .from('attendances')
    .insert({
      school_id: SCHOOL_ID,
      contact_id,
      attended_at: attended_at ?? new Date().toISOString(),
      notes: notes ?? null,
      created_by: req.user?.id ?? null,
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

// GET /attendances/contact/:id — attendance history for a contact
attendancesRouter.get('/contact/:id', async (_req, res) => {
  const { id } = _req.params;

  const { data, error } = await supabase
    .from('attendances')
    .select('id, attended_at, notes, created_at')
    .eq('contact_id', id)
    .eq('school_id', SCHOOL_ID)
    .order('attended_at', { ascending: false })
    .limit(50);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data ?? []);
});
