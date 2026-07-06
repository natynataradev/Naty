'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Search } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'prospect', label: 'Prospecto' },
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
];

const SOURCE_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'whatsapp_inbound', label: 'WhatsApp' },
  { value: 'manual', label: 'Manual' },
  { value: 'import', label: 'Importación' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'lead', label: 'Lead' },
  { value: 'student', label: 'Alumno' },
  { value: 'staff', label: 'Equipo' },
];

export function ContactsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get('status') ?? '';
  const currentSource = searchParams.get('source') ?? '';
  const currentType = searchParams.get('type') ?? '';

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
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Buscar nombre o teléfono..."
          defaultValue={searchParams.get('search') ?? ''}
          onChange={(e) => update('search', e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-11 pr-4 text-sm text-white placeholder-gray-500 outline-none transition focus:border-naty-green/50 focus:bg-white/10"
        />
      </div>

      {/* Pill Groups */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Status Pills */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 px-1">Estado</span>
          <div className="flex p-1 rounded-2xl bg-white/5 border border-white/15">
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = currentStatus === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => update('status', opt.value)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-naty-green text-white shadow-md shadow-naty-green/20'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Type Pills */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 px-1">Tipo</span>
          <div className="flex p-1 rounded-2xl bg-white/5 border border-white/15">
            {TYPE_OPTIONS.map((opt) => {
              const isSelected = currentType === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => update('type', opt.value)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-naty-green text-white shadow-md shadow-naty-green/20'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Source Pills */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 px-1">Origen</span>
          <div className="flex p-1 rounded-2xl bg-white/5 border border-white/15">
            {SOURCE_OPTIONS.map((opt) => {
              const isSelected = currentSource === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => update('source', opt.value)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-naty-blue text-white shadow-md shadow-naty-blue/20'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
