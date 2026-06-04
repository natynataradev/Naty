'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
}

export function Pagination({ page, total, limit }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / limit);

  function goTo(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
      <span className="text-sm text-gray-400">
        {total} contacto{total !== 1 ? 's' : ''} · página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-400 transition hover:bg-white/5 disabled:opacity-40"
        >
          <ChevronLeft size={14} /> Anterior
        </button>
        <button
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-400 transition hover:bg-white/5 disabled:opacity-40"
        >
          Siguiente <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
