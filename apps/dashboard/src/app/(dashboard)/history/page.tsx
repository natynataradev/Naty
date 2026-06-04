import { api } from '@/lib/api';
import { Badge } from '@/components/badge';
import type { Campaign } from '@naty/shared';

const SENT_STATUSES = new Set(['completed', 'failed', 'sending']);

function DeliveryBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-naty-green"
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className="text-xs text-gray-400">{rate}%</span>
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-600">{sub}</p>}
    </div>
  );
}

async function HistoryContent() {
  let all: Campaign[] = [];
  try {
    all = await api.get<Campaign[]>('/campaigns');
  } catch {
    return <p className="text-sm text-gray-500">No se pudo cargar el historial.</p>;
  }

  const history = all.filter((c) => SENT_STATUSES.has(c.status));

  const totalSent = history.reduce((s, c) => s + c.sent_count, 0);
  const totalDelivered = history.reduce((s, c) => s + c.delivered_count, 0);
  const totalFailed = history.reduce((s, c) => s + c.failed_count, 0);
  const avgRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;

  return (
    <>
      {/* Resumen global */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Campañas enviadas" value={history.length} />
        <SummaryCard label="Mensajes enviados" value={totalSent.toLocaleString('es-MX')} />
        <SummaryCard label="Entregados" value={totalDelivered.toLocaleString('es-MX')} sub={`${avgRate}% promedio`} />
        <SummaryCard label="Fallidos" value={totalFailed.toLocaleString('es-MX')} />
      </div>

      {/* Tabla de historial */}
      {history.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-12 text-center">
          <p className="text-gray-500">Aún no hay campañas enviadas.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-500">
                <th className="px-6 py-3">Campaña</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Enviados</th>
                <th className="px-6 py-3">Entregados</th>
                <th className="px-6 py-3">Fallidos</th>
                <th className="px-6 py-3">Entrega</th>
                <th className="px-6 py-3">Fecha envío</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {history.map((c) => {
                const total = c.sent_count + c.failed_count;
                const rate = total > 0 ? Math.round((c.delivered_count / total) * 100) : 0;
                return (
                  <tr key={c.id} className="hover:bg-white/5">
                    <td className="px-6 py-3 font-medium text-white">{c.name}</td>
                    <td className="px-6 py-3">
                      <Badge
                        label={c.status === 'completed' ? 'Completada' : c.status === 'sending' ? 'Enviando' : 'Fallida'}
                        variant={c.status === 'completed' ? 'green' : c.status === 'sending' ? 'blue' : 'red'}
                      />
                    </td>
                    <td className="px-6 py-3 text-gray-400">{c.sent_count.toLocaleString('es-MX')}</td>
                    <td className="px-6 py-3 text-gray-400">{c.delivered_count.toLocaleString('es-MX')}</td>
                    <td className="px-6 py-3 text-gray-400">{c.failed_count.toLocaleString('es-MX')}</td>
                    <td className="px-6 py-3">
                      <DeliveryBar rate={rate} />
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {c.sent_at
                        ? new Date(c.sent_at).toLocaleDateString('es-MX', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function HistoryPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Historial</h1>
        <p className="mt-1 text-sm text-gray-400">Métricas de campañas enviadas</p>
      </div>
      <HistoryContent />
    </div>
  );
}
