'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Megaphone, History, Settings, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@naty/shared';

interface SidebarProps {
  userName: string;
  userRole: UserRole;
}

const NAV_ITEMS = [
  { href: '/contacts', label: 'Contactos', icon: Users },
  { href: '/campaigns', label: 'Campañas', icon: Megaphone },
  { href: '/history', label: 'Historial', icon: History },
];

const ADMIN_ITEMS = [
  { href: '/settings', label: 'Configuración', icon: Settings },
];

export function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-white/10 bg-white/5">
      <div className="border-b border-white/10 px-6 py-5">
        <span className="text-xl font-bold text-naty-green">Naty</span>
        <p className="mt-0.5 text-xs text-gray-500">Natara La Cima</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  pathname.startsWith(href)
                    ? 'bg-naty-green/20 text-naty-green font-medium'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            </li>
          ))}

          {userRole === 'admin' && (
            <>
              <li className="pt-4">
                <span className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Admin
                </span>
              </li>
              {ADMIN_ITEMS.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                      pathname.startsWith(href)
                        ? 'bg-naty-green/20 text-naty-green font-medium'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </Link>
                </li>
              ))}
            </>
          )}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 px-1">
          <p className="text-sm font-medium text-white">{userName}</p>
          <p className="text-xs capitalize text-gray-500">{userRole === 'admin' ? 'Administrador' : 'Operador'}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition hover:bg-white/5 hover:text-red-400"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
