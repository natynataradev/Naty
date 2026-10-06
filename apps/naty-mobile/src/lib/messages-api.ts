import { API_URL } from '@/constants/api';
import { supabase } from '@/lib/supabase';

/**
 * Manda un mensaje de texto libre a través de apps/api (POST /messages/send),
 * que guarda el mensaje en Supabase Y lo envía de verdad por WhatsApp Cloud API.
 * Mismo cuerpo y mismo esquema de autorización que usa apps/dashboard
 * (apps/dashboard/src/lib/api.ts + .../contacts/[id]/_components/send-message-form.tsx).
 */
export async function sendTextMessage(contactId: string, body: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`${API_URL}/messages/send`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ contactId, body }),
  });

  if (!res.ok) {
    const errorBody = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errorBody.error ?? `HTTP ${res.status}`);
  }
}
