import Link from 'next/link';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { AutoRefresh } from './_components/auto-refresh';

// Lee datos frescos en cada carga — nunca cacheada.
export const dynamic = 'force-dynamic';

interface PendingPaymentItem {
  contact_id: string;
  name: string | null;
  phone: string;
  last_paid_month: string; // "YYYY-MM"
  months_owed: number;
  payment_status: 'pending' | 'overdue';
  over_notice: boolean;
}

interface PendingPaymentsResponse {
  items: PendingPaymentItem[];
  active_without_payments: number;
}

function formatPeriodMonth(periodMonth: string): string {
  const [year, month] = periodMonth.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(date);
}

function formatMonthsOwed(n: number): string {
  return `Debe ${n} ${n === 1 ? 'mes' : 'meses'}`;
}

async function PendingPaymentsList() {
  let data: PendingPaymentsResponse;
  try {
    data = await api.get<PendingPaymentsResponse>('/payments/pending');
  } catch {
    return (
      <div className="glass-card rounded-[2.5rem] px-6 py-16 text-center">
        <p className="text-sm text-gray-500">No se pudo cargar la lista de pagos pendientes.</p>
      </div>
    );
  }

  return (
    <>
      {data.items.length === 0 ? (
        <div className="glass-card rounded-[2.5rem] px-6 py-16 text-center">
          <p className="text-sm text-gray-500">No hay pagos pendientes registrados.</p>
        </div>
      ) : (
        <div className="glass-card rounded-[2.5rem] overflow-hidden divide-y divide-white/5">
          {data.items.map((item) => (
            <Link
              key={item.contact_id}
              href={`/contacts/${item.contact_id}`}
              className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-white/[0.02]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{item.name ?? item.phone}</p>
                <p className="mt-0.5 font-mono text-xs text-gray-500">{item.phone}</p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                <p className="text-xs text-gray-400">
                  Último pago: {formatPeriodMonth(item.last_paid_month)}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-300">
                    {formatMonthsOwed(item.months_owed)}
                  </span>
                  {item.over_notice && (
                    <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400">
                      Más de 2 meses
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {data.active_without_payments > 0 && (
        <p className="mt-4 text-xs text-gray-500">
          {data.active_without_payments === 1
            ? '1 alumno activo no tiene ningún pago registrado.'
            : `${data.active_without_payments} alumnos activos no tienen ningún pago registrado.`}
        </p>
      )}
    </>
  );
}

export default function PaymentsPendingPage() {
  return (
    <div className="space-y-8 animate-fadeIn">
      <AutoRefresh />
      <PageHeader
        title="Pagos pendientes"
        description="Alumnos activos que no han pagado desde el día 7 del mes."
        breadcrumbs={[{ label: 'Pagos pendientes' }]}
      />
      <PendingPaymentsList />
    </div>
  );
}
