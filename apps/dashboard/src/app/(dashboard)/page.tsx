import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/badge';
import Link from 'next/link';
import { Users, MessageSquare, Megaphone, Activity, CheckCircle, ArrowRight } from 'lucide-react';
import { safeLocaleTimeString } from '@/lib/date-utils';

const STATUS_LABELS: Record<string, string> = {
  prospect: 'Prospecto',
  active: 'Activo',
  inactive: 'Inactivo',
};

const STATUS_VARIANTS: Record<string, 'green' | 'blue' | 'gray' | 'red'> = {
  prospect: 'blue',
  active: 'green',
  inactive: 'gray',
};

export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Fetch KPI metrics
  let totalContacts = 0;
  try {
    const { count } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true });
    totalContacts = count ?? 0;
  } catch (err) {
    console.error('Error fetching total contacts:', err);
  }

  let inboundMessages = 0;
  try {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('direction', 'inbound');
    inboundMessages = count ?? 0;
  } catch (err) {
    console.error('Error fetching inbound messages:', err);
  }

  let totalCampaigns = 0;
  try {
    const { count } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true });
    totalCampaigns = count ?? 0;
  } catch (err) {
    console.error('Error fetching total campaigns:', err);
  }

  let campaignsData: any[] = [];
  try {
    const { data } = await supabase
      .from('campaigns')
      .select('sent_count, delivered_count, failed_count');
    campaignsData = data ?? [];
  } catch (err) {
    console.error('Error fetching campaigns data:', err);
  }

  // Calculate delivery rate
  const totalSent = campaignsData?.reduce((acc, c) => acc + (c.sent_count || 0), 0) || 0;
  const totalDelivered = campaignsData?.reduce((acc, c) => acc + (c.delivered_count || 0), 0) || 0;
  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 100;

  // 2. Fetch last 10 messages for Recent Activity
  let rawMessages: any[] = [];
  try {
    const { data } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        direction,
        timestamp,
        status,
        conversations (
          contacts (
            id,
            name,
            phone
          )
        )
      `)
      .order('timestamp', { ascending: false })
      .limit(10);
    rawMessages = data ?? [];
  } catch (err) {
    console.error('Error fetching raw messages:', err);
  }

  // Type assertion / casting for messages
  const recentMessages = rawMessages.map((m: any) => {
    const contact = m.conversations?.contacts;
    return {
      id: m.id,
      content: m.content,
      direction: m.direction,
      timestamp: m.timestamp,
      status: m.status,
      contact: contact ? {
        id: contact.id,
        name: contact.name || 'Sin nombre',
        phone: contact.phone,
      } : null,
    };
  });

  // 3. Fetch last 5 created contacts
  let recentContactsData: any[] = [];
  try {
    const { data } = await supabase
      .from('contacts')
      .select('id, name, phone, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    recentContactsData = data ?? [];
  } catch (err) {
    console.error('Error fetching recent contacts:', err);
  }

  const recentContacts = recentContactsData;

  return (
    <div className="space-y-8 animate-fadeIn">
      <PageHeader
        title="Dashboard"
        description="Vista general del sistema y métricas en tiempo real."
      />

      {/* Grid de 4 KPIs */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1 */}
        <div className="glass-card rounded-[2rem] p-6 hover:border-naty-green/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-400">Total Contactos</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-naty-green/10 text-naty-green">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-white">{totalContacts ?? 0}</h3>
            <p className="mt-1 text-xs text-gray-500">Contactos registrados en total</p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-card rounded-[2rem] p-6 hover:border-naty-blue/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-400">Mensajes Recibidos</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-naty-blue/10 text-naty-blue">
              <MessageSquare size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-white">{inboundMessages ?? 0}</h3>
            <p className="mt-1 text-xs text-gray-500">Mensajes entrantes por WhatsApp</p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="glass-card rounded-[2rem] p-6 hover:border-naty-sky/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-400">Campañas Creadas</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-naty-sky/10 text-naty-sky">
              <Megaphone size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-white">{totalCampaigns ?? 0}</h3>
            <p className="mt-1 text-xs text-gray-500">Envíos masivos programados o enviados</p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="glass-card rounded-[2rem] p-6 hover:border-naty-green/30 transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-400">Tasa de Entrega</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-naty-green/10 text-naty-green">
              <CheckCircle size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold tracking-tight text-white">{deliveryRate}%</h3>
            <p className="mt-1 text-xs text-gray-500">Porcentaje de entrega exitosa</p>
          </div>
        </div>
      </div>

      {/* Grid Principal: Actividad y Contactos */}
      <div className="grid gap-8 lg:grid-cols-5">
        {/* Actividad Reciente (60%) */}
        <div className="glass-card rounded-[2.5rem] p-6 lg:col-span-3">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-naty-green animate-pulse" />
              <h2 className="text-lg font-bold text-white">Actividad reciente</h2>
            </div>
            <span className="text-xs text-gray-500">Últimos 10 mensajes</span>
          </div>

          {recentMessages.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <p className="text-sm text-gray-500">Aún no hay actividad de mensajería.</p>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto max-h-[420px] pr-2 scrollbar-thin">
              {recentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="flex flex-col justify-between gap-3 border-b border-white/5 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    {msg.contact ? (
                      <Link
                        href={`/contacts/${msg.contact.id}`}
                        className="font-semibold text-white hover:text-naty-green transition text-sm flex items-center gap-1.5"
                      >
                        {msg.contact.name}
                        <span className="text-xs font-normal text-gray-500">({msg.contact.phone})</span>
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold text-white">Sistema</p>
                    )}
                    <p className="text-sm text-gray-300 line-clamp-2 pr-4">{msg.content}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <Badge
                      label={msg.direction === 'inbound' ? 'Recibido' : 'Enviado'}
                      variant={msg.direction === 'inbound' ? 'green' : 'blue'}
                      showDot={msg.direction === 'inbound'}
                    />
                    <span className="text-xs text-gray-500">
                      {safeLocaleTimeString(msg.timestamp, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contactos Recientes (40%) */}
        <div className="glass-card rounded-[2.5rem] p-6 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Contactos recientes</h2>
            <Link
              href="/contacts"
              className="text-xs text-naty-green hover:underline flex items-center gap-1"
            >
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>

          {recentContacts.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <p className="text-sm text-gray-500">Aún no hay contactos registrados.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-0.5">
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="font-semibold text-white hover:text-naty-green transition text-sm block"
                    >
                      {contact.name || 'Sin nombre'}
                    </Link>
                    <p className="text-xs text-gray-500">{contact.phone}</p>
                  </div>
                  <Badge
                    label={STATUS_LABELS[contact.status] ?? contact.status}
                    variant={STATUS_VARIANTS[contact.status] ?? 'gray'}
                    showDot={contact.status === 'active'}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
