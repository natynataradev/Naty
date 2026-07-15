'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api.get<{ role: string }>('/users/me')
      .then((profile) => {
        if (profile.role !== 'admin') {
          router.replace('/contacts');
        } else {
          setReady(true);
        }
      })
      .catch(() => setReady(true));
  }, [router]);

  if (!ready) return null;
  return <>{children}</>;
}
