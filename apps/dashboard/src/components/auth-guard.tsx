'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Sidebar } from './sidebar';
import type { UserRole } from '@naty/shared';

interface Profile {
  name: string;
  role: UserRole;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
      } else {
        setProfile({
          name: session.user.email?.split('@')[0] ?? 'Usuario',
          role: 'admin',
        });
      }
      setChecked(true);
    });
  }, [router]);

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center bg-naty-dark">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-naty-green border-t-transparent" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-naty-dark text-white">
      <Sidebar userName={profile.name} userRole={profile.role} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
