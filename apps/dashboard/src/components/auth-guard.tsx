'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Sidebar } from './sidebar';
import { api } from '@/lib/api';
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
        setChecked(true);
      } else {
        api.get<Profile>('/users/me')
          .then((profileData) => {
            setProfile(profileData);
            setChecked(true);
          })
          .catch(() => {
            setProfile({ name: session.user.email ?? 'Usuario', role: 'admin' as UserRole });
            setChecked(true);
          });
      }
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
    <div className="flex h-screen overflow-hidden bg-naty-dark text-white animate-fadeIn">
      <Sidebar userName={profile.name} userRole={profile.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 pt-20 md:p-8 md:pt-8">{children}</main>
        <footer className="shrink-0 bg-black border-t border-white/5 py-4 px-8 flex items-center justify-center gap-3">
          <span className="text-sm text-gray-500">Naty y Natadash ha sido desarrollado y creado por</span>
          <a
            href="https://www.diavolo.me"
            target="_blank"
            rel="noreferrer"
            className="flex items-center opacity-70 hover:opacity-100 transition-opacity duration-200"
          >
            <img src="/logo_diavolo.png" alt="Diavolo" className="h-6" />
          </a>
        </footer>
      </div>
    </div>
  );
}
