import { Router, type Router as RouterType } from 'express';
import { supabase } from '../db/client.js';
import { env } from '../config/env.js';
import { computePaymentStatus, currentMonth } from '../billing/payment-status.js';
import { NOTICE_AFTER_MONTHS } from '../billing/pending-list.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const SCHOOL_ID = env.DEFAULT_SCHOOL_ID;

export const paymentsRouter: RouterType = Router();

const SUPABASE_PAGE_SIZE = 1000;

// Supabase/PostgREST topa cada respuesta en 1000 filas — pagina con .range()
// hasta agotar los resultados, para no perder alumnos ni tomar un pago viejo.
async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await build(from, from + SUPABASE_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (data.length < SUPABASE_PAGE_SIZE) break;
    from += SUPABASE_PAGE_SIZE;
  }

  return rows;
}

function monthsBetween(fromPeriod: string, toPeriod: string): number {
  const [fy, fm] = fromPeriod.split('-').map(Number);
  const [ty, tm] = toPeriod.split('-').map(Number);
  return (ty * 12 + tm) - (fy * 12 + fm);
}

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

// GET /payments/pending — alumnos activos (contacts.status = 'active') con
// pago 'pending' u 'overdue'. Solo lectura: no escribe nada en la base.
paymentsRouter.get('/pending', async (_req, res) => {
  try {
    // 1. Alumnos activos = contacts.status = 'active'.
    const activeContacts = await fetchAllRows<{ id: string; name: string | null; phone: string }>(
      (from, to) =>
        supabase
          .from('contacts')
          .select('id, name, phone')
          .eq('school_id', SCHOOL_ID)
          .eq('status', 'active')
          .range(from, to)
    );

    // 2. Pago más reciente (period_month) por contacto, de TODA la escuela
    //    (sin .in() — con ~500 alumnos la URL de la consulta saldría
    //    demasiado larga). El cruce con los activos se hace en memoria.
    const paymentRows = await fetchAllRows<{ contact_id: string; period_month: string }>(
      (from, to) =>
        supabase
          .from('payments')
          .select('contact_id, period_month')
          .eq('school_id', SCHOOL_ID)
          .range(from, to)
    );

    const lastPaidByContact = new Map<string, string>();
    for (const row of paymentRows) {
      const current = lastPaidByContact.get(row.contact_id);
      if (!current || row.period_month > current) {
        lastPaidByContact.set(row.contact_id, row.period_month);
      }
    }

    const curr = currentMonth();
    let activeWithoutPayments = 0;

    const items = activeContacts
      .map((contact) => {
        const lastPaidMonth = lastPaidByContact.get(contact.id);
        if (!lastPaidMonth) {
          activeWithoutPayments++;
          return null;
        }

        const paymentStatus = computePaymentStatus(lastPaidMonth);
        if (paymentStatus !== 'pending' && paymentStatus !== 'overdue') return null;

        const monthsOwed = monthsBetween(lastPaidMonth, curr);

        return {
          contact_id: contact.id,
          name: contact.name,
          phone: contact.phone,
          last_paid_month: lastPaidMonth,
          months_owed: monthsOwed,
          payment_status: paymentStatus,
          over_notice: monthsOwed > NOTICE_AFTER_MONTHS,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.months_owed - a.months_owed);

    res.json({ items, active_without_payments: activeWithoutPayments });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
