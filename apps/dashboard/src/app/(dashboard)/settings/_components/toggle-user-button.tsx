'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

export function ToggleUserButton({ userId, active }: { userId: string; active: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      await fetch(`${API_URL}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
        active
          ? 'border border-red-500/30 text-red-400 hover:bg-red-500/10'
          : 'border border-naty-green/30 text-naty-green hover:bg-naty-green/10'
      }`}
    >
      {loading ? '…' : active ? 'Desactivar' : 'Activar'}
    </button>
  );
}
