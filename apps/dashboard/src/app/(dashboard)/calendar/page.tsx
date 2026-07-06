import { PageHeader } from '@/components/page-header';
import { CalendarClient } from './_components/calendar-client';

export default function CalendarPage() {
  return (
    <div className="space-y-8 animate-fadeIn">
      <PageHeader
        title="Calendario"
        description="Agenda de clases, eventos y recordatorios de Natara La Cima."
        breadcrumbs={[{ label: 'Calendario' }]}
      />
      <CalendarClient />
    </div>
  );
}
