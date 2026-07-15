export type PaymentStatus = 'current' | 'pending' | 'overdue';

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function prevMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const GRACE_DAY = 6; // primeros 6 días del mes = período de gracia

export function computePaymentStatus(lastPeriodMonth: string | null): PaymentStatus {
  if (!lastPeriodMonth) return 'overdue';

  const curr = currentMonth();
  const prev = prevMonth();
  const today = new Date().getDate();

  if (lastPeriodMonth >= curr) return 'current';
  if (lastPeriodMonth >= prev && today <= GRACE_DAY) return 'current';
  if (lastPeriodMonth >= prev) return 'pending';
  return 'overdue';
}
