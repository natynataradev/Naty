'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const REFRESH_INTERVAL_MS = 60_000;

// Mantiene la lista al día mientras la pantalla está abierta, sin que el
// usuario tenga que recargar a mano. Se detiene solo al salir de la pantalla.
export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [router]);

  return null;
}
