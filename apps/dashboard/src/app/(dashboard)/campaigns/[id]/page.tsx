import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/badge';
import type { Campaign } from '@naty/shared';

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  scheduled: 'Programada',
  sending: 'Enviando…',
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

function MetricCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-white">{value.toLocaleString('es-MX')}</p>
      {sub && <p className="mt-1 text-xs text-gray-600">{sub}</p>}
    </div>
  );
}

export default async function CampaignDetailPage({ params }: PageProps) {
  const { id } = await params;

  let campaign: Campaign;
  try {
    campaign = await api.get<Campaign>(`/campaigns/${id}`);
  } catch {
    notFound();
  }

  const total = campaign.sent_count + campaign.failed_count;
  const deliveryRate = total > 0 ? Math.round((campaign.delivered_count / total) * 100) : 0;

  return (
    <div className="p-8">
      <Link
        href="/campaigns"
        className="mb-6 flex items-center gap-1 text-sm text-gray-400 transition hover:text-white"
      >
        <ChevronLeft size={14} /> Volver a campañas
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
            <Badge
              label={STATUS_LABELS[campaign.status] ?? campaign.status}
              variant={STATUS_VARIANTS[campaign.status] ?? 'gray'}
            />
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Creada el {new Date(campaign.created_at).toLocaleDateString('es-MX')}
            {campaign.sent_at && ` · Enviada el ${new Date(campaign.sent_at).toLocaleDateString('es-MX')}`}
          </p>
        </div>

        {campaign.status === 'draft' && (
          <form action={`/api/campaigns/${id}/send`} method="POST">
            <Link
              href={`/campaigns/${id}/send`}
              className="flex items-center gap-2 rounded-lg bg-naty-green px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <Send size={14} /> Enviar ahora
            </Link>
          </form>
        )}
      </div>

      {/* Métricas */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Enviados" value={campaign.sent_count} />
        <MetricCard label="Entregados" value={campaign.delivered_count} sub={`${deliveryRate}% tasa de entrega`} />
        <MetricCard label="Fallidos" value={campaign.failed_count} />
        <MetricCard label="Total segmento" value={total} />
      </div>

      {/* Info de segmento */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Configuración
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">Estados del segmento</dt>
            <dd className="mt-1 text-white">
              {(campaign.segment.status as string[] | undefined)?.join(', ') ?? 'Todos'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Fuentes del segmento</dt>
            <dd className="mt-1 text-white">
              {(campaign.segment.source as string[] | undefined)?.join(', ') ?? 'Todas'}
            </dd>
          </div>
          {campaign.scheduled_at && (
            <div>
              <dt className="text-gray-500">Programada para</dt>
              <dd className="mt-1 text-white">
                {new Date(campaign.scheduled_at).toLocaleString('es-MX')}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
