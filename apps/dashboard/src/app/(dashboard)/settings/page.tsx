import { redirect } from 'next/navigation';
// requireAdmin desactivado temporalmente — auth via AuthGuard (cliente)
// import { requireAdmin } from '@/lib/auth';
import { api } from '@/lib/api';
import { Badge } from '@/components/badge';
import { CreateUserForm } from './_components/create-user-form';
import { ToggleUserButton } from './_components/toggle-user-button';
import type { User } from '@naty/shared';

function Section({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-6">
      <div className="mb-5 border-b border-white/10 pb-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
      </div>
      {children}
    </section>
  );
}

async function UsersSection() {
  let users: User[] = [];
  try {
    users = await api.get<User[]>('/users');
  } catch {
    users = [];
  }

  return (
    <Section title="Gestión de usuarios" description="Usuarios con acceso al panel de Naty">
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-medium text-gray-300">Crear nuevo usuario</h3>
        <CreateUserForm />
      </div>

      {users.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-6">
          <h3 className="mb-3 text-sm font-medium text-gray-300">Usuarios actuales</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="pb-3 pr-6">Nombre</th>
                  <th className="pb-3 pr-6">Correo</th>
                  <th className="pb-3 pr-6">Rol</th>
                  <th className="pb-3 pr-6">Estado</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 pr-6 text-white">{u.name}</td>
                    <td className="py-3 pr-6 text-gray-400">{u.email}</td>
                    <td className="py-3 pr-6">
                      <Badge
                        label={u.role === 'admin' ? 'Administrador' : 'Operador'}
                        variant={u.role === 'admin' ? 'blue' : 'gray'}
                      />
                    </td>
                    <td className="py-3 pr-6">
                      <Badge label={u.active ? 'Activo' : 'Inactivo'} variant={u.active ? 'green' : 'gray'} />
                    </td>
                    <td className="py-3 text-right">
                      <ToggleUserButton userId={u.id} active={u.active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-8">
      <dt className="w-44 shrink-0 text-sm text-gray-400">{label}</dt>
      <dd className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-gray-300 break-all">
        {value}
      </dd>
    </div>
  );
}

export default async function SettingsPage() {

  const webhookUrl = `${process.env['NEXT_PUBLIC_API_URL'] ?? 'https://tu-api.railway.app'}/webhook/twilio`;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="mt-1 text-sm text-gray-400">Solo visible para administradores</p>
      </div>

      <div className="space-y-6">
        <UsersSection />

        <Section title="Webhook de WhatsApp" description="Configura este URL en Twilio o Meta Cloud API">
          <dl className="space-y-3">
            <InfoRow label="URL del webhook" value={webhookUrl} />
            <InfoRow label="Método" value="POST" />
          </dl>
          <p className="mt-4 text-xs text-gray-600">
            En producción (Meta Cloud API) configura este URL en Meta Business Manager → WhatsApp → Configuración → URL de webhook.
          </p>
        </Section>

        <Section title="Templates de Meta" description="Los templates deben estar aprobados por Meta antes de usarse en campañas">
          <p className="text-sm text-gray-400">
            Para agregar templates: ingresa a{' '}
            <span className="font-mono text-naty-blue">business.facebook.com</span> → WhatsApp Manager → Plantillas de mensajes.
          </p>
          <p className="mt-2 text-sm text-gray-400">
            Una vez aprobados, usa el nombre exacto del template como <span className="font-mono text-gray-300">template_id</span> al crear campañas.
          </p>
          <div className="mt-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
            Durante la etapa de prueba con Twilio Sandbox, el <span className="font-mono">template_id</span> se usa como texto libre del mensaje.
          </div>
        </Section>
      </div>
    </div>
  );
}
