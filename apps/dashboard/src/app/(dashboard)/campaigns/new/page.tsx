import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { NewCampaignForm } from './_components/new-campaign-form';

export default async function NewCampaignPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return (
    <div className="p-8">
      <Link
        href="/campaigns"
        className="mb-6 flex items-center gap-1 text-sm text-gray-400 transition hover:text-white"
      >
        <ChevronLeft size={14} /> Volver a campañas
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Nueva campaña</h1>
        <p className="mt-1 text-sm text-gray-400">Configura el segmento, el mensaje y envía</p>
      </div>

      <NewCampaignForm userId={user.id} />
    </div>
  );
}
