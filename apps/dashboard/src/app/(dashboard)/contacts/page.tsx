import { Suspense } from 'react';
import Link from 'next/link';
import { Download, Upload, MessageSquare, Eye, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/badge';
import { PageHeader } from '@/components/page-header';
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

const TYPE_LABELS: Record<string, string> = {
  lead: 'Lead',
  student: 'Alumno',
  staff: 'Equipo',
};

const TYPE_VARIANTS: Record<string, 'green' | 'blue' | 'gray' | 'red'> = {
  lead: 'blue',
  student: 'green',
  staff: 'gray',
};

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

async function ContactsTable({ searchParams }: { searchParams: Record<string, string> }) {
  const params = new URLSearchParams();
  if (searchParams['status']) params.set('status', searchParams['status']);
  if (searchParams['source']) params.set('source', searchParams['source']);
  if (searchParams['type']) params.set('type', searchParams['type']);
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
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-gray-500">No hay contactos con los filtros seleccionados o la tabla está vacía.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-6 py-4">Nombre / Teléfono</th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {result.data.map((contact: Contact) => {
              const initials = (contact.name ?? 'Sin nombre')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'US';

              return (
                <tr key={contact.id} className="group hover:bg-white/[0.02] transition-colors duration-200">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-naty-green/20 to-naty-blue/20 font-bold text-white text-xs border border-white/10 group-hover:scale-105 transition-transform duration-200">
                        {initials}
                      </div>
                      <div>
                        <Link href={`/contacts/${contact.id}`} className="block">
                          <p className="font-semibold text-white group-hover:text-naty-green transition">
                            {contact.name ?? 'Sin nombre'}
                          </p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">{contact.phone}</p>
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      label={TYPE_LABELS[contact.type] ?? contact.type}
                      variant={TYPE_VARIANTS[contact.type] ?? 'gray'}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      label={STATUS_LABELS[contact.status] ?? contact.status}
                      variant={STATUS_VARIANTS[contact.status] ?? 'gray'}
                      showDot={contact.status === 'active'}
                    />
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs font-medium">
                    {new Date(contact.created_at).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-2">
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="p-2 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition duration-200"
                        title="Ver detalles"
                      >
                        <Eye size={15} />
                      </Link>
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="p-2 rounded-xl text-gray-400 hover:bg-white/5 hover:text-naty-green transition duration-200"
                        title="Chat WhatsApp"
                      >
                        <MessageSquare size={15} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
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
  if (params['type']) exportParams.set('type', params['type']);
  if (params['search']) exportParams.set('search', params['search']);
  const exportUrl = `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000'}/contacts/export?${exportParams.toString()}`;

  return (
    <div className="space-y-8 animate-fadeIn">
      <PageHeader
        title="Contactos"
        description="Base de datos y listados de contactos de Natara La Cima."
        breadcrumbs={[{ label: 'Contactos' }]}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/contacts/new"
            className="flex items-center gap-2 rounded-xl bg-naty-green hover:opacity-90 px-4 py-2.5 text-xs font-semibold text-white transition active:scale-95 shadow-md shadow-naty-green/20"
          >
            <UserPlus size={14} />
            Nuevo Contacto
          </Link>
          <Link
            href="/contacts/import"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-gray-300 transition-all hover:bg-white/10 hover:text-white"
          >
            <Upload size={14} />
            Importar
          </Link>
          <a
            href={exportUrl}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-gray-300 transition-all hover:bg-white/10 hover:text-white"
          >
            <Download size={14} />
            Exportar CSV
          </a>
        </div>
      </PageHeader>

      {/* Filtros */}
      <div className="glass-card rounded-[2rem] p-5">
        <Suspense fallback={<div className="h-10 animate-pulse bg-white/5 rounded-xl" />}>
          <ContactsFilters />
        </Suspense>
      </div>

      {/* Tabla */}
      <div className="glass-card rounded-[2.5rem] overflow-hidden">
        <Suspense fallback={<p className="px-6 py-8 text-sm text-gray-500 animate-pulse">Cargando contactos...</p>}>
          <ContactsTable searchParams={params} />
        </Suspense>
      </div>
    </div>
  );
}
