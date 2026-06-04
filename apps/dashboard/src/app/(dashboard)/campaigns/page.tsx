import Link from 'next/link';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/badge';
import type { Campaign } from '@naty/shared';

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

async function CampaignsList() {
  let campaigns: Campaign[] = [];
  try {
    campaigns = await api.get<Campaign[]>('/campaigns');
  } catch {
    return <p className="px-6 py-8 text-sm text-gray-500">No se pudo cargar la lista de campañas.</p>;
  }

  if (campaigns.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-gray-500">Aún no hay campañas creadas.</p>
        <Link href="/campaigns/new" className="mt-3 inline-block text-sm text-naty-green hover:underline">
          Crear primera campaña
        </Link>
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-500">
          <th className="px-6 py-3">Nombre</th>
          <th className="px-6 py-3">Estado</th>
          <th className="px-6 py-3">Enviados</th>
          <th className="px-6 py-3">Entregados</th>
          <th className="px-6 py-3">Fallidos</th>
          <th className="px-6 py-3">Fecha</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {campaigns.map((c) => (
          <tr key={c.id} className="group hover:bg-white/5">
            <td className="px-6 py-3">
              <Link href={`/campaigns/${c.id}`} className="font-medium text-white group-hover:text-naty-green transition">
                {c.name}
              </Link>
            </td>
            <td className="px-6 py-3">
              <Badge label={STATUS_LABELS[c.status] ?? c.status} variant={STATUS_VARIANTS[c.status] ?? 'gray'} />
            </td>
            <td className="px-6 py-3 text-gray-400">{c.sent_count}</td>
            <td className="px-6 py-3 text-gray-400">{c.delivered_count}</td>
            <td className="px-6 py-3 text-gray-400">{c.failed_count}</td>
            <td className="px-6 py-3 text-gray-500">
              {c.sent_at
                ? new Date(c.sent_at).toLocaleDateString('es-MX')
                : c.scheduled_at
                ? `Prog. ${new Date(c.scheduled_at).toLocaleDateString('es-MX')}`
                : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function CampaignsPage() {
  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Campañas</h1>
          <p className="mt-1 text-sm text-gray-400">Envíos masivos a segmentos de contactos</p>
        </div>
        <Link
          href="/campaigns/new"
          className="flex items-center gap-2 rounded-lg bg-naty-green px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <Plus size={14} /> Nueva campaña
        </Link>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-x-auto">
        <CampaignsList />
      </div>
    </div>
  );
}
