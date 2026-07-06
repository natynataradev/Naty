import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/badge';
import type { Campaign } from '@naty/shared';
import { safeLocaleDateString, safeLocaleString } from '@/lib/date-utils';
import { CampaignActions } from './_components/campaign-actions';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface Recipient {
  id: string;
  name: string | null;
  phone: string;
}

interface RecipientsResponse {
  total: number;
  contacts: Recipient[];
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

export const revalidate = 0;

export default async function CampaignDetailPage({ params }: PageProps) {
  const { id } = await params;

  let campaign: Campaign;
  try {
    campaign = await api.get<Campaign>(`/campaigns/${id}`);
  } catch {
    notFound();
  }

  // Cargar destinatarios del segmento para scheduled/draft/completed
  let recipients: RecipientsResponse = { total: 0, contacts: [] };
  try {
    recipients = await api.get<RecipientsResponse>(`/campaigns/${id}/recipients`);
  } catch {
    // no crítico
  }

  const total = campaign.sent_count + campaign.failed_count;
  const deliveryRate = total > 0 ? Math.round((campaign.delivered_count / total) * 100) : 0;

  // Texto del mensaje (si el template_id no es UUID, es el texto directo)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaign.template_id);
  const messagePreview = isUuid ? '(Cargado desde plantilla)' : campaign.template_id;

  return (
    <div className="p-8 space-y-6">
      <Link
        href="/campaigns"
        className="mb-2 flex items-center gap-1 text-sm text-gray-400 transition hover:text-white"
      >
        <ChevronLeft size={14} /> Volver a campañas
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
            <Badge
              label={STATUS_LABELS[campaign.status] ?? campaign.status}
              variant={STATUS_VARIANTS[campaign.status] ?? 'gray'}
              showDot={campaign.status === 'sending' || campaign.status === 'scheduled'}
            />
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Creada el {safeLocaleDateString(campaign.created_at, { day: 'numeric', month: 'numeric', year: 'numeric' })}
            {campaign.sent_at && ` · Enviada el ${safeLocaleDateString(campaign.sent_at, { day: 'numeric', month: 'numeric', year: 'numeric' })}`}
            {campaign.scheduled_at && campaign.status === 'scheduled' && (
              <span className="ml-2 text-naty-blue font-semibold">
                · Programada para {safeLocaleString(campaign.scheduled_at)}
              </span>
            )}
          </p>
        </div>

        {/* Acciones (cancelar / reprogramar / enviar) */}
        <CampaignActions campaignId={id} status={campaign.status} scheduledAt={campaign.scheduled_at} />
      </div>

      {/* Métricas — solo para campañas con envíos */}
      {(campaign.status === 'completed' || campaign.status === 'sending' || campaign.status === 'failed') && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Enviados" value={campaign.sent_count} />
          <MetricCard label="Entregados" value={campaign.delivered_count} sub={`${deliveryRate}% tasa de entrega`} />
          <MetricCard label="Fallidos" value={campaign.failed_count} />
          <MetricCard label="Total segmento" value={recipients.total || total} />
        </div>
      )}

      {/* Contenido del mensaje */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Contenido del mensaje
        </h2>
        <div className="inline-block max-w-sm rounded-2xl rounded-tl-none border border-white/10 bg-white/5 px-4 py-3 text-xs text-white shadow">
          <p className="text-xs text-gray-400 italic mb-1">Hola [nombre del contacto],</p>
          <p className="whitespace-pre-wrap leading-relaxed text-gray-200">
            {messagePreview}
          </p>
          {(campaign.segment as any)?.media_url && (
            <p className="mt-2 text-[10px] text-naty-blue font-mono truncate">
              📎 Imagen adjunta
            </p>
          )}
        </div>
      </div>

      {/* Configuración del segmento */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Configuración del segmento
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
              <dd className="mt-1 text-white">{safeLocaleString(campaign.scheduled_at)}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Tabla de destinatarios */}
      {recipients.total > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
            <Users size={16} className="text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-300">
              {campaign.status === 'scheduled' || campaign.status === 'draft'
                ? `Destinatarios del segmento (${recipients.total})`
                : `Destinatarios contactados (${recipients.total})`}
            </h2>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0d0d18]">
                <tr className="border-b border-white/5 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-3">Nombre</th>
                  <th className="px-6 py-3">Teléfono</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recipients.contacts.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3 text-white font-medium">
                      {r.name ?? <span className="text-gray-600 italic">Sin nombre</span>}
                    </td>
                    <td className="px-6 py-3 font-mono text-gray-400">{r.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
