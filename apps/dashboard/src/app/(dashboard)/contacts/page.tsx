import { Suspense } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/badge';
import { ContactsFilters } from './_components/contacts-filters';
import { Pagination } from './_components/pagination';
import type { PaginatedContacts, Contact } from '@naty/shared';

const STATUS_LABELS: Record<string, string> = {
  prospect: 'Prospecto',
  active: 'Activo',
  inactive: 'Inactivo',
};

const STATUS_VARIANTS: Record<string, 'green' | 'blue' | 'gray' | 'red'> = {
  prospect: 'blue',
  active: 'green',
  inactive: 'gray',
};

const SOURCE_LABELS: Record<string, string> = {
  whatsapp_inbound: 'WhatsApp',
  manual: 'Manual',
  import: 'Importación',
};

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

async function ContactsTable({ searchParams }: { searchParams: Record<string, string> }) {
  const params = new URLSearchParams();
  if (searchParams['status']) params.set('status', searchParams['status']);
  if (searchParams['source']) params.set('source', searchParams['source']);
  if (searchParams['search']) params.set('search', searchParams['search']);
  if (searchParams['page']) params.set('page', searchParams['page']);
  params.set('limit', '50');

  let result: PaginatedContacts;
  try {
    result = await api.get<PaginatedContacts>(`/contacts?${params.toString()}`);
  } catch {
    return <p className="px-6 py-8 text-sm text-gray-500">No se pudo cargar la lista de contactos.</p>;
  }

  const page = parseInt(searchParams['page'] ?? '1', 10);

  if (result.data.length === 0) {
    return <p className="px-6 py-8 text-sm text-gray-500">No hay contactos con los filtros seleccionados.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-500">
              <th className="px-6 py-3">Nombre / Teléfono</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3">Fuente</th>
              <th className="px-6 py-3">Privacidad</th>
              <th className="px-6 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {result.data.map((contact: Contact) => (
              <tr key={contact.id} className="group hover:bg-white/5">
                <td className="px-6 py-3">
                  <Link href={`/contacts/${contact.id}`} className="block">
                    <p className="font-medium text-white group-hover:text-naty-green transition">
                      {contact.name ?? '—'}
                    </p>
                    <p className="text-gray-500">{contact.phone}</p>
                  </Link>
                </td>
                <td className="px-6 py-3">
                  <Badge
                    label={STATUS_LABELS[contact.status] ?? contact.status}
                    variant={STATUS_VARIANTS[contact.status] ?? 'gray'}
                  />
                </td>
                <td className="px-6 py-3 text-gray-400">
                  {SOURCE_LABELS[contact.source] ?? contact.source}
                </td>
                <td className="px-6 py-3">
                  <Badge
                    label={contact.accepted_privacy ? 'Aceptado' : 'Pendiente'}
                    variant={contact.accepted_privacy ? 'green' : 'gray'}
                  />
                </td>
                <td className="px-6 py-3 text-gray-500">
                  {new Date(contact.created_at).toLocaleDateString('es-MX')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={result.total} limit={result.limit} />
    </>
  );
}

export default async function ContactsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const exportParams = new URLSearchParams();
  if (params['status']) exportParams.set('status', params['status']);
  if (params['source']) exportParams.set('source', params['source']);
  if (params['search']) exportParams.set('search', params['search']);
  const exportUrl = `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000'}/contacts/export?${exportParams.toString()}`;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Contactos</h1>
          <p className="mt-1 text-sm text-gray-400">Base de datos de contactos de Natara La Cima</p>
        </div>
        <a
          href={exportUrl}
          className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/5"
        >
          <Download size={14} />
          Exportar CSV
        </a>
      </div>

      <div className="mb-4">
        <Suspense>
          <ContactsFilters />
        </Suspense>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5">
        <Suspense fallback={<p className="px-6 py-8 text-sm text-gray-500">Cargando…</p>}>
          <ContactsTable searchParams={params} />
        </Suspense>
      </div>
    </div>
  );
}
