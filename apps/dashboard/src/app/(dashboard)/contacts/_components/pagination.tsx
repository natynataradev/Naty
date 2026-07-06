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
    <div className="flex flex-col gap-4 items-center justify-between border-t border-white/5 px-6 py-4 sm:flex-row">
      <span className="text-xs text-gray-500 font-medium">
        Mostrando <span className="text-white">{Math.min(total, limit)}</span> de <span className="text-white">{total}</span> contacto{total !== 1 ? 's' : ''} · Página {page} de {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-gray-400 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronLeft size={14} /> Anterior
        </button>
        <div className="flex items-center gap-1.5 px-2">
          {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
            // Simple window pagination to keep it clean
            let pageNum = idx + 1;
            if (page > 3 && totalPages > 5) {
              pageNum = page - 3 + idx;
              if (pageNum + (4 - idx) > totalPages) {
                pageNum = totalPages - 4 + idx;
              }
            }
            return (
              <button
                key={pageNum}
                onClick={() => goTo(pageNum)}
                className={`h-7 w-7 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                  page === pageNum
                    ? 'bg-naty-green text-white shadow-md shadow-naty-green/20'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-gray-400 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
        >
          Siguiente <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
