import { api } from '@/lib/api';
import { Badge } from '@/components/badge';
import { PageHeader } from '@/components/page-header';
import { Megaphone, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import type { Campaign } from '@naty/shared';
import { safeLocaleDateString } from '@/lib/date-utils';

const SENT_STATUSES = new Set(['completed', 'failed', 'sending']);

function DeliveryBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/5 border border-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-naty-green to-naty-blue transition-all"
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className="text-xs font-mono font-bold text-gray-400">{rate}%</span>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: string | number;
  sub?: string;
  borderColor: string;
  icon: React.ReactNode;
}

function SummaryCard({ label, value, sub, borderColor, icon }: SummaryCardProps) {
  return (
    <div className={`glass-card rounded-[2rem] p-5 border-l-4 ${borderColor} transition-all duration-300 hover:translate-y-[-2px]`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-extrabold text-white leading-none">{value}</p>
          {sub && <p className="mt-2 text-xs font-medium text-gray-400">{sub}</p>}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400">
          {icon}
        </div>
      </div>
    </div>
  );
}

export const revalidate = 0;

async function HistoryContent() {
  let all: Campaign[] = [];
  try {
    all = await api.get<Campaign[]>('/campaigns');
  } catch {
    return <p className="text-sm text-gray-500">No se pudo cargar el historial de campañas.</p>;
  }

  const history = all.filter((c) => SENT_STATUSES.has(c.status));

  const totalSent = history.reduce((s, c) => s + (c.sent_count || 0), 0);
  const totalDelivered = history.reduce((s, c) => s + (c.delivered_count || 0), 0);
  const totalFailed = history.reduce((s, c) => s + (c.failed_count || 0), 0);
  const avgRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;

  return (
    <>
      {/* Resumen global */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Campañas enviadas"
          value={history.length}
          borderColor="border-l-white/20"
          icon={<Megaphone size={16} />}
        />
        <SummaryCard
          label="Mensajes enviados"
          value={totalSent.toLocaleString('es-MX')}
          borderColor="border-l-naty-blue"
          icon={<MessageSquare size={16} />}
        />
        <SummaryCard
          label="Entregados"
          value={totalDelivered.toLocaleString('es-MX')}
          sub={`${avgRate}% tasa promedio`}
          borderColor="border-l-naty-green"
          icon={<CheckCircle size={16} className="text-naty-green" />}
        />
        <SummaryCard
          label="Fallidos"
          value={totalFailed.toLocaleString('es-MX')}
          borderColor="border-l-red-500"
          icon={<XCircle size={16} className="text-red-400" />}
        />
      </div>

      {/* Tabla de historial */}
      {history.length === 0 ? (
        <div className="glass-card rounded-[2.5rem] px-6 py-16 text-center">
          <p className="text-sm text-gray-500">Aún no hay campañas enviadas en el historial.</p>
        </div>
      ) : (
        <div className="glass-card rounded-[2.5rem] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-4">Campaña</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Enviados</th>
                  <th className="px-6 py-4">Entregados</th>
                  <th className="px-6 py-4">Fallidos</th>
                  <th className="px-6 py-4">Entrega</th>
                  <th className="px-6 py-4">Fecha envío</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history.map((c) => {
                  const total = (c.sent_count || 0) + (c.failed_count || 0);
                  const rate = total > 0 ? Math.round(((c.delivered_count || 0) / total) * 100) : 0;
                  return (
                    <tr key={c.id} className="group hover:bg-white/[0.02] transition-colors duration-200">
                      <td className="px-6 py-4 font-bold text-white">{c.name}</td>
                      <td className="px-6 py-4">
                        <Badge
                          label={c.status === 'completed' ? 'Completada' : c.status === 'sending' ? 'Enviando' : 'Fallida'}
                          variant={c.status === 'completed' ? 'green' : c.status === 'sending' ? 'blue' : 'red'}
                          showDot={c.status === 'sending'}
                        />
                      </td>
                      <td className="px-6 py-4 text-gray-400 font-mono text-xs">{(c.sent_count || 0).toLocaleString('es-MX')}</td>
                      <td className="px-6 py-4 text-gray-400 font-mono text-xs">{(c.delivered_count || 0).toLocaleString('es-MX')}</td>
                      <td className="px-6 py-4 text-gray-400 font-mono text-xs">{(c.failed_count || 0).toLocaleString('es-MX')}</td>
                      <td className="px-6 py-4">
                        <DeliveryBar rate={rate} />
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs font-semibold">
                        {safeLocaleDateString(c.sent_at, undefined, '—')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

export default function HistoryPage() {
  return (
    <div className="space-y-8 animate-fadeIn">
      <PageHeader
        title="Historial"
        description="Reportes históricos y telemetrías de campañas transmitidas."
        breadcrumbs={[{ label: 'Historial' }]}
      />
      <HistoryContent />
    </div>
  );
}
