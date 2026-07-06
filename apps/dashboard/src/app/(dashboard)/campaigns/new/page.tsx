import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { NewCampaignForm } from './_components/new-campaign-form';
import { createClient } from '@/lib/supabase/server';

export default async function NewCampaignPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? 'client-user';

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

      <NewCampaignForm userId={userId} />
    </div>
  );
}
