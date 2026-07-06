import { PageHeader } from '@/components/page-header';
import { NewContactForm } from './_components/new-contact-form';

export default function NewContactPage() {
  return (
    <div className="space-y-8 animate-fadeIn">
      <PageHeader
        title="Nuevo contacto"
        description="Registra un alumno o miembro del equipo Natara."
        breadcrumbs={[
          { label: 'Contactos', href: '/contacts' },
          { label: 'Nuevo contacto' },
        ]}
      />
      <div className="glass-card rounded-[2rem] p-8 max-w-2xl">
        <NewContactForm />
      </div>
    </div>
  );
}
