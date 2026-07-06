import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { createClient } from '@/lib/supabase/server';
import { TemplatesClient } from './_components/templates-client';

export const revalidate = 0;

interface Template {
  id: string;
  name: string;
  body: string;
  created_at: string;
}

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? '';

  let templates: Template[] = [];
  try {
    templates = await api.get<Template[]>('/templates');
  } catch {
    templates = [];
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      <PageHeader
        title="Plantillas de Mensajes"
        description="Crea y gestiona plantillas reutilizables para tus mensajes segmentados. Usa {{nombre}} para personalizar."
        breadcrumbs={[{ label: 'Plantillas' }]}
      />

      <TemplatesClient initialTemplates={templates} userId={userId} />
    </div>
  );
}
