import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Phone, Mail, Award, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/badge';
import { PageHeader } from '@/components/page-header';
import { SendMessageForm } from './_components/send-message-form';
import { QuickActions } from './_components/quick-actions';
import type { Contact, Conversation, Message } from '@naty/shared';
import { safeLocaleDateString, safeLocaleTimeString } from '@/lib/date-utils';

interface ContactDetail {
  contact: Contact;
  conversations: (Conversation & { messages: Message[] })[];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

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

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params;

  let detail: ContactDetail;
  try {
    detail = await api.get<ContactDetail>(`/contacts/${id}?detail=full`);
  } catch (err) {
    console.error('Error loading contact details:', err);
    notFound();
  }

  const { contact, conversations } = detail;

  // Flatten and sort messages chronologically
  const allMessages = conversations
    .flatMap((c) => c.messages)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Get active conversation (the latest one)
  const activeConversation = conversations[0] || null;

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title={contact.name ?? 'Detalle del Contacto'}
        description={`Conversación de WhatsApp con ${contact.phone}.`}
        breadcrumbs={[
          { label: 'Contactos', href: '/contacts' },
          { label: contact.name ?? contact.phone },
        ]}
      >
        <Link
          href="/contacts"
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft size={14} /> Volver a contactos
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Columna 1: Info del Contacto (3/12) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-card rounded-[2.5rem] p-6 text-center">
            {/* Large Avatar */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-naty-green/20 to-naty-blue/20 font-bold text-white text-2xl border-2 border-white/10 shadow-lg mb-4">
              {(contact.name ?? 'US')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'US'}
            </div>
            <h2 className="text-lg font-bold text-white leading-snug">{contact.name ?? 'Sin nombre'}</h2>
            <p className="text-xs font-mono text-gray-500 mt-1">{contact.phone}</p>

            <div className="mt-4 flex justify-center">
              <Badge
                label={STATUS_LABELS[contact.status] ?? contact.status}
                variant={STATUS_VARIANTS[contact.status] ?? 'gray'}
                showDot={contact.status === 'active'}
              />
            </div>
          </div>

          <div className="glass-card rounded-[2.5rem] p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Información del Perfil</h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Phone size={12} className="text-gray-500" /> Teléfono
                </span>
                <span className="text-white font-mono">{contact.phone}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Mail size={12} className="text-gray-500" /> Email
                </span>
                <span className="text-white truncate max-w-[140px]" title={contact.email ?? '—'}>
                  {contact.email ?? '—'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Award size={12} className="text-gray-500" /> Origen
                </span>
                <span className="text-white font-semibold">
                  {contact.source === 'whatsapp_inbound' ? 'WhatsApp' : contact.source}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Calendar size={12} className="text-gray-500" /> Registro
                </span>
                <span className="text-white">
                  {safeLocaleDateString(contact.created_at)}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-3.5">
                <span className="text-gray-400">Privacidad</span>
                <Badge
                  label={contact.accepted_privacy ? 'Aceptado' : 'Pendiente'}
                  variant={contact.accepted_privacy ? 'green' : 'gray'}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Columna 2: Chat / Historial WhatsApp (6/12) */}
        <div className="lg:col-span-6 flex flex-col glass-card rounded-[2.5rem] overflow-hidden h-[640px]">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-white/5 px-6 py-4 bg-white/[0.01]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-naty-green/20 to-naty-blue/20 font-bold text-white text-xs border border-white/10">
                {(contact.name ?? 'US')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-white text-sm">{contact.name ?? 'WhatsApp User'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-naty-green animate-pulse" />
                  <span className="text-[10px] text-gray-500 font-medium">Conversación Activa</span>
                </div>
              </div>
            </div>
          </div>

          {/* Messages Log */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
            {allMessages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-sm text-gray-500">Sin mensajes registrados en el chat.</p>
              </div>
            ) : (
              allMessages.map((msg) => {
                const isOutbound = msg.direction === 'outbound';
                return (
                  <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-[1.5rem] px-4.5 py-3 shadow-md border ${
                        isOutbound
                          ? 'bg-naty-green/10 border-naty-green/20 text-white rounded-tr-none'
                          : 'bg-white/5 border-white/10 text-white rounded-tl-none'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      <div className="mt-1.5 flex items-center justify-end gap-1 text-[10px] text-gray-500 font-medium">
                        <span>
                          {safeLocaleTimeString(msg.timestamp, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isOutbound && (
                          <span className="text-naty-green font-bold" title={msg.status}>
                            {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat Footer Form */}
          <div className="border-t border-white/5 p-4 bg-white/[0.01]">
            <SendMessageForm contactId={contact.id} phoneNumber={contact.phone} />
          </div>
        </div>

        {/* Columna 3: Acciones Rápidas (3/12) */}
        <div className="lg:col-span-3">
          <QuickActions contact={contact} activeConversation={activeConversation} />
        </div>
      </div>
    </div>
  );
}
