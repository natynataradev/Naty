import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { UserRole } from '@naty/shared';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return null;

  return {
    id: user.id,
    email: user.email ?? '',
    name: profile.name,
    role: profile.role as UserRole,
  };
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== 'admin') redirect('/login');
  return user;
}
