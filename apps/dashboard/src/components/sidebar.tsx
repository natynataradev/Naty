'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Megaphone, History, Settings, LogOut, Menu, X, FileText, CalendarDays } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@naty/shared';

interface SidebarProps {
  userName: string;
  userRole: UserRole;
}

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/contacts', label: 'Contactos', icon: Users },
  { href: '/campaigns', label: 'Mensajes segmentados', icon: Megaphone },
  { href: '/templates', label: 'Plantillas', icon: FileText },
  { href: '/calendar', label: 'Calendario', icon: CalendarDays },
  { href: '/history', label: 'Historial', icon: History },
];

const ADMIN_ITEMS = [
  { href: '/settings', label: 'Configuración', icon: Settings },
];

export function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'US';

  return (
    <>
      {/* Botón Hamburguesa en Mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-40 rounded-xl bg-naty-dark border border-white/10 p-2.5 text-gray-400 hover:text-white md:hidden"
      >
        <Menu size={20} />
      </button>

      {/* Overlay en Mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-fadeIn"
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-[#131322] backdrop-blur-xl transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-naty-green to-naty-blue shadow-lg shadow-naty-green/20" />
              <span className="text-xl font-bold tracking-tight text-white">Naty</span>
            </div>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-gray-500">Natara La Cima</p>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-white/5 hover:text-white md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <div className="space-y-6">
            <div>
              <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3">Principal</p>
              <ul className="space-y-1">
                {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
                  const isActive = exact ? pathname === href : pathname.startsWith(href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={() => setIsOpen(false)}
                        className={`group relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-all duration-200 ${
                          isActive
                            ? 'text-naty-green font-semibold bg-gradient-to-r from-naty-green/10 to-transparent'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-naty-green" />
                        )}
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                          isActive ? 'bg-naty-green/20' : 'group-hover:bg-white/5'
                        }`}>
                          <Icon size={16} />
                        </div>
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {userRole === 'admin' && (
              <div>
                <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3">Admin</p>
                <ul className="space-y-1">
                  {ADMIN_ITEMS.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname.startsWith(href);
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          onClick={() => setIsOpen(false)}
                          className={`group relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-all duration-200 ${
                            isActive
                              ? 'text-naty-green font-semibold bg-gradient-to-r from-naty-green/10 to-transparent'
                              : 'text-gray-400 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-naty-green" />
                          )}
                          <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                            isActive ? 'bg-naty-green/20' : 'group-hover:bg-white/5'
                          }`}>
                            <Icon size={16} />
                          </div>
                          {label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </nav>

        {/* Footer User Area */}
        <div className="mt-auto border-t border-white/5 p-4 bg-[#0d0d18]">
          <div className="mb-4 flex items-center gap-3 px-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-naty-green to-naty-blue font-bold text-white text-sm shadow-md shadow-naty-blue/10">
              {initials}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-sm font-semibold text-white">{userName}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {userRole === 'admin' ? 'Administrador' : 'Operador'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-gray-400 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
