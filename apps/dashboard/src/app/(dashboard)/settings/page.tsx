import { requireAdmin } from '@/lib/auth';
import { api } from '@/lib/api';
import { Badge } from '@/components/badge';
import { PageHeader } from '@/components/page-header';
import { CreateUserForm } from './_components/create-user-form';
import { ToggleUserButton } from './_components/toggle-user-button';
import { Shield, Link as LinkIcon, FileText } from 'lucide-react';
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-8 justify-between">
      <dt className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-mono text-xs text-gray-300 break-all select-all">
        {value}
      </dd>
    </div>
  );
}

export default async function SettingsPage() {
  await requireAdmin();

  const webhookUrl = `${process.env['NEXT_PUBLIC_API_URL'] ?? 'https://tu-api.railway.app'}/webhook/twilio`;

  return (
    <div className="space-y-8 animate-fadeIn">
      <PageHeader
        title="Configuración"
        description="Módulo de ajustes generales de la plataforma y webhooks."
        breadcrumbs={[{ label: 'Configuración' }]}
      />

      <div className="space-y-6 max-w-4xl">
        <UsersSection />

        <Section
          title="Webhook de WhatsApp"
          description="Copia este enlace de recepción y configúralo en Twilio Sandbox o Meta Cloud API."
          icon={<LinkIcon size={16} />}
        >
          <div className="space-y-4">
            <dl className="space-y-3 rounded-2xl border border-white/5 bg-white/[0.01] p-5">
              <InfoRow label="URL del webhook" value={webhookUrl} />
              <InfoRow label="Método HTTP" value="POST" />
            </dl>
            <p className="text-[11px] font-semibold text-gray-500 leading-normal px-2">
              En producción (Meta Cloud API), registra esta dirección de webhook en el portal Meta Business Manager → WhatsApp → Configuración de Webhooks.
            </p>
          </div>
        </Section>

        <Section
          title="Templates de Mensajería"
          description="Aprobación de plantillas registradas para campañas masivas de WhatsApp."
          icon={<FileText size={16} />}
        >
          <div className="space-y-4 text-xs leading-relaxed text-gray-400">
            <p>
              Para agregar nuevos templates: ingresa a{' '}
              <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-naty-blue hover:underline">
                business.facebook.com
              </a>{' '}
              → WhatsApp Manager → Plantillas de mensajes.
            </p>
            <p>
              Una vez aprobadas por Meta, utiliza el nombre exacto de la plantilla como el <span className="font-mono text-gray-200">template_id</span> al crear campañas en Naty.
            </p>
            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3.5 text-xs text-yellow-400/90 font-medium">
              Nota de prueba: En entornos sandbox de Twilio, el campo <span className="font-mono">template_id</span> se interpreta como texto libre del mensaje de prueba.
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
