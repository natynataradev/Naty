import { Router, type Router as RouterType } from 'express';
import { supabase } from '../db/client.js';
import { env } from '../config/env.js';
import { currentMonth } from '../billing/payment-status.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const SCHOOL_ID = env.DEFAULT_SCHOOL_ID;

export const paymentsRouter: RouterType = Router();

// POST /payments — register (or upsert) a payment for a contact
paymentsRouter.post('/', async (req: AuthenticatedRequest, res) => {
  const { contact_id, period_month, amount, notes } = req.body as {
    contact_id?: string;
    period_month?: string;
    amount?: number;
    notes?: string;
  };

  if (!contact_id) {
    res.status(400).json({ error: 'contact_id es requerido' });
    return;
  }

  const month = period_month ?? currentMonth();

  const { data, error } = await supabase
    .from('payments')
    .upsert(
      {
        school_id: SCHOOL_ID,
        contact_id,
        period_month: month,
        amount: amount ?? null,
        notes: notes ?? null,
        paid_at: new Date().toISOString(),
        created_by: req.user?.id ?? null,
      },
      { onConflict: 'contact_id,period_month' }
    )
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

// GET /payments/contact/:id — payment history for a contact
paymentsRouter.get('/contact/:id', async (_req, res) => {
  const { id } = _req.params;

  const { data, error } = await supabase
    .from('payments')
    .select('id, period_month, paid_at, amount, notes, created_at')
    .eq('contact_id', id)
    .eq('school_id', SCHOOL_ID)
    .order('period_month', { ascending: false })
    .limit(24);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data ?? []);
});
