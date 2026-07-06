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
          .catch((err) => {
            console.error('Error fetching user profile:', err);
            supabase.auth.signOut().then(() => {
              router.replace('/login');
              setChecked(true);
            });
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
      <main className="flex-1 overflow-y-auto p-6 pt-20 md:p-8 md:pt-8">{children}</main>
    </div>
  );
}
