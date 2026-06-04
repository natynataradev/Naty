import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/badge';
import type { Contact, Conversation, Message } from '@naty/shared';

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

const CONV_STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  closed: 'Cerrada',
  handoff: 'Handoff',
};

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params;

  let detail: ContactDetail;
  try {
    detail = await api.get<ContactDetail>(`/contacts/${id}?detail=full`);
  } catch {
    notFound();
  }

  const { contact, conversations } = detail;

  return (
    <div className="p-8">
      <Link
        href="/contacts"
        className="mb-6 flex items-center gap-1 text-sm text-gray-400 transition hover:text-white"
      >
        <ChevronLeft size={14} /> Volver a contactos
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info del contacto */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            {contact.name ?? 'Sin nombre'}
          </h2>

          <dl className="space-y-3 text-sm">
            <Row label="Teléfono" value={contact.phone} />
            <Row label="Email" value={contact.email ?? '—'} />
            <Row
              label="Estado"
              value={
                <Badge
                  label={STATUS_LABELS[contact.status] ?? contact.status}
                  variant={STATUS_VARIANTS[contact.status] ?? 'gray'}
                />
              }
            />
            <Row
              label="Privacidad"
              value={
                <Badge
                  label={contact.accepted_privacy ? 'Aceptado' : 'Pendiente'}
                  variant={contact.accepted_privacy ? 'green' : 'gray'}
                />
              }
            />
            <Row
              label="Fuente"
              value={contact.source === 'whatsapp_inbound' ? 'WhatsApp' : contact.source}
            />
            <Row
              label="Registro"
              value={new Date(contact.created_at).toLocaleDateString('es-MX')}
            />
          </dl>
        </div>

        {/* Historial de conversaciones */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-white">Historial de conversaciones</h2>

          {conversations.length === 0 && (
            <p className="text-sm text-gray-500">Este contacto no tiene conversaciones.</p>
          )}

          {conversations.map((conv) => (
            <div key={conv.id} className="rounded-xl border border-white/10 bg-white/5">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <span className="text-xs text-gray-500">
                  {new Date(conv.started_at).toLocaleDateString('es-MX', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </span>
                <Badge
                  label={CONV_STATUS_LABELS[conv.status] ?? conv.status}
                  variant={conv.status === 'active' ? 'green' : conv.status === 'handoff' ? 'blue' : 'gray'}
                />
              </div>

              <div className="max-h-72 overflow-y-auto p-4 space-y-2">
                {conv.messages.length === 0 && (
                  <p className="text-xs text-gray-600">Sin mensajes registrados.</p>
                )}
                {conv.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs rounded-xl px-3 py-2 text-sm ${
                        msg.direction === 'outbound'
                          ? 'bg-naty-green/20 text-naty-green'
                          : 'bg-white/10 text-gray-300'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className="mt-1 text-right text-xs opacity-50">
                        {new Date(msg.timestamp).toLocaleTimeString('es-MX', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {conv.handoff_reason && (
                <div className="border-t border-white/10 px-4 py-2 text-xs text-gray-500">
                  Handoff: {conv.handoff_reason}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right text-white">{value}</dd>
    </div>
  );
}
