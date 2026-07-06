import Link from 'next/link';
import { Plus, Megaphone, CheckCircle2, Clock, XOctagon } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/badge';
import { PageHeader } from '@/components/page-header';
import type { Campaign } from '@naty/shared';
import { safeLocaleDateString } from '@/lib/date-utils';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  scheduled: 'Programada',
  sending: 'Enviando',
  completed: 'Completada',
  failed: 'Fallida',
};

const STATUS_VARIANTS: Record<string, 'green' | 'blue' | 'gray' | 'red'> = {
  draft: 'gray',
  scheduled: 'blue',
  sending: 'blue',
  completed: 'green',
  failed: 'red',
};

function DeliveryProgressBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/5 border border-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-naty-green to-naty-blue transition-all duration-500"
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className="text-xs font-semibold font-mono text-gray-400">{rate}%</span>
    </div>
  );
}

export const revalidate = 0;

async function CampaignsList() {
  let campaigns: Campaign[] = [];
  try {
    campaigns = await api.get<Campaign[]>('/campaigns');
  } catch {
    return <p className="px-6 py-8 text-sm text-gray-500">No se pudo cargar la lista de campañas.</p>;
  }

  if (campaigns.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-sm text-gray-500">Aún no hay campañas segmentadas creadas.</p>
        <Link
          href="/campaigns/new"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-naty-green/10 border border-naty-green/20 hover:bg-naty-green/20 hover:border-naty-green/30 px-4 py-2 text-xs font-semibold text-naty-green transition"
        >
          <Plus size={14} /> Crear primera campaña
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
            <th className="px-6 py-4">Campaña</th>
            <th className="px-6 py-4">Estado</th>
            <th className="px-6 py-4">Enviados</th>
            <th className="px-6 py-4">Entregados</th>
            <th className="px-6 py-4">Fallidos</th>
            <th className="px-6 py-4">Tasa de Entrega</th>
            <th className="px-6 py-4">Programación / Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {campaigns.map((c) => {
            const total = (c.sent_count || 0) + (c.failed_count || 0);
            const rate = total > 0 ? Math.round(((c.delivered_count || 0) / total) * 100) : 0;

            return (
              <tr key={c.id} className="group hover:bg-white/[0.02] transition-colors duration-200">
                <td className="px-6 py-4">
                  <Link
                    href={`/campaigns/${c.id}`}
                    className="font-bold text-white group-hover:text-naty-green transition block"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <Badge
                    label={STATUS_LABELS[c.status] ?? c.status}
                    variant={STATUS_VARIANTS[c.status] ?? 'gray'}
                    showDot={c.status === 'sending' || c.status === 'scheduled'}
                  />
                </td>
                <td className="px-6 py-4 text-gray-400 font-mono text-xs">{c.sent_count.toLocaleString('es-MX')}</td>
                <td className="px-6 py-4 text-gray-400 font-mono text-xs">{c.delivered_count.toLocaleString('es-MX')}</td>
                <td className="px-6 py-4 text-gray-400 font-mono text-xs">{c.failed_count.toLocaleString('es-MX')}</td>
                <td className="px-6 py-4">
                  {c.status !== 'draft' ? (
                    <DeliveryProgressBar rate={rate} />
                  ) : (
                    <span className="text-xs text-gray-600">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-500 text-xs font-semibold">
                  {c.sent_at
                    ? safeLocaleDateString(c.sent_at)
                    : c.scheduled_at
                    ? `Prog. ${safeLocaleDateString(c.scheduled_at)}`
                    : 'Borrador'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function CampaignsPage() {
  let campaigns: Campaign[] = [];
  try {
    campaigns = await api.get<Campaign[]>('/campaigns');
  } catch {
    campaigns = [];
  }

  // Calculate statistics for KPIs
  const totalCount = campaigns.length;
  const completedCount = campaigns.filter((c) => c.status === 'completed').length;
  const activeCount = campaigns.filter((c) => c.status === 'sending' || c.status === 'scheduled').length;
  const failedCount = campaigns.filter((c) => c.status === 'failed').length;

  return (
    <div className="space-y-8 animate-fadeIn">
      <PageHeader
        title="Mensajes Segmentados"
        description="Envíos masivos automatizados a grupos o segmentos de contactos."
        breadcrumbs={[{ label: 'Mensajes segmentados' }]}
      >
        <Link
          href="/campaigns/new"
          className="flex items-center gap-2 rounded-xl bg-naty-green hover:opacity-90 px-4 py-2.5 text-xs font-semibold text-white transition active:scale-95 shadow-md shadow-naty-green/20"
        >
          <Plus size={14} /> Nueva campaña
        </Link>
      </PageHeader>

      {/* KPI Panel */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 */}
        <div className="glass-card rounded-[2rem] p-6 hover:border-naty-green/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-400">Total Campañas</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-gray-400 border border-white/10">
              <Megaphone size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-white">{totalCount}</h3>
            <p className="mt-1 text-xs text-gray-500">Campañas registradas en total</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-card rounded-[2rem] p-6 hover:border-naty-green/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-400">Completadas</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-naty-green/10 text-naty-green border border-naty-green/25">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-white">{completedCount}</h3>
            <p className="mt-1 text-xs text-gray-500">Envíos finalizados</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-card rounded-[2rem] p-6 hover:border-naty-blue/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-400">En Proceso / Prog.</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-naty-blue/10 text-naty-blue border border-naty-blue/25">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-white">{activeCount}</h3>
            <p className="mt-1 text-xs text-gray-500">Programadas o enviando</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="glass-card rounded-[2rem] p-6 hover:border-red-500/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-400">Fallidas</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/25">
              <XOctagon size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-white">{failedCount}</h3>
            <p className="mt-1 text-xs text-gray-500">Envíos interrumpidos</p>
          </div>
        </div>
      </div>

      {/* Campaigns Table Area */}
      <div className="glass-card rounded-[2.5rem] overflow-hidden">
        <CampaignsList />
      </div>
    </div>
  );
}
