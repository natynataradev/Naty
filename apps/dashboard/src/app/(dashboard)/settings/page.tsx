import { api } from '@/lib/api';
import { Badge } from '@/components/badge';
import { PageHeader } from '@/components/page-header';
import { CreateUserForm } from './_components/create-user-form';
import { ToggleUserButton } from './_components/toggle-user-button';
import { AdminOnly } from '@/components/admin-only';
import { Shield } from 'lucide-react';
import type { User } from '@naty/shared';

function Section({ title, description, icon, children }: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-card rounded-[2.5rem] p-6 space-y-6">
      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}

async function UsersSection() {
  let users: User[] = [];
  try {
    users = await api.get<User[]>('/users');
  } catch (err) {
    console.error('Error loading users:', err);
    users = [];
  }

  return (
    <Section
      title="Gestión de usuarios"
      description="Controla quiénes tienen acceso al panel administrativo de Naty."
      icon={<Shield size={16} />}
    >
      <div className="space-y-6">
        <div>
          <h3 className="mb-3.5 text-xs font-bold uppercase tracking-widest text-gray-500">Crear nuevo usuario</h3>
          <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-5">
            <CreateUserForm />
          </div>
        </div>

        {users.length > 0 && (
          <div className="border-t border-white/5 pt-6">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">Usuarios registrados</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="pb-3 pr-6">Usuario</th>
                    <th className="pb-3 pr-6">Correo</th>
                    <th className="pb-3 pr-6">Rol</th>
                    <th className="pb-3 pr-6">Estado</th>
                    <th className="pb-3 text-right">Activo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => {
                    const initials = u.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase() || 'US';

                    return (
                      <tr key={u.id} className="group hover:bg-white/[0.01] transition-colors duration-150">
                        <td className="py-3.5 pr-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-naty-green/20 to-naty-blue/20 text-xs font-bold text-white border border-white/10">
                              {initials}
                            </div>
                            <span className="font-semibold text-white">{u.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 pr-6 text-xs text-gray-400 font-mono">{u.email}</td>
                        <td className="py-3.5 pr-6">
                          <Badge
                            label={u.role === 'admin' ? 'Administrador' : 'Operador'}
                            variant={u.role === 'admin' ? 'blue' : 'gray'}
                          />
                        </td>
                        <td className="py-3.5 pr-6">
                          <Badge
                            label={u.active ? 'Activo' : 'Inactivo'}
                            variant={u.active ? 'green' : 'gray'}
                            showDot={u.active}
                          />
                        </td>
                        <td className="py-3.5 text-right">
                          <ToggleUserButton userId={u.id} active={u.active} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}


export default async function SettingsPage() {
  return (
    <AdminOnly>
    <div className="space-y-8 animate-fadeIn">
      <PageHeader
        title="Configuración"
        description="Gestión de accesos y usuarios del panel administrativo."
        breadcrumbs={[{ label: 'Configuración' }]}
      />

      <div className="max-w-4xl">
        <UsersSection />
      </div>
    </div>
    </AdminOnly>
  );
}
