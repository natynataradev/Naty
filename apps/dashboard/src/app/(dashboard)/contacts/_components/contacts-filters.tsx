'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Search } from 'lucide-react';

export function ContactsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete('page');
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Buscar nombre o teléfono…"
          defaultValue={searchParams.get('search') ?? ''}
          onChange={(e) => update('search', e.target.value)}
          className="w-64 rounded-lg border border-white/10 bg-white/5 py-2 pl-8 pr-4 text-sm text-white placeholder-gray-500 outline-none focus:border-naty-blue"
        />
      </div>

      <select
        defaultValue={searchParams.get('status') ?? ''}
        onChange={(e) => update('status', e.target.value)}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-naty-blue"
      >
        <option value="">Todos los estados</option>
        <option value="prospect">Prospecto</option>
        <option value="active">Activo</option>
        <option value="inactive">Inactivo</option>
      </select>

      <select
        defaultValue={searchParams.get('source') ?? ''}
        onChange={(e) => update('source', e.target.value)}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-naty-blue"
      >
        <option value="">Todas las fuentes</option>
        <option value="whatsapp_inbound">WhatsApp</option>
        <option value="manual">Manual</option>
        <option value="import">Importación</option>
      </select>
    </div>
  );
}
