import { supabase } from '../db/client.js';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Manda un push a todos los tokens registrados de una escuela vía Expo Push API.
 * Nunca lanza — cualquier fallo se registra en consola con el prefijo '[push]'.
 */
export async function sendPushToSchool(schoolId: string, payload: PushPayload): Promise<void> {
  try {
    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('school_id', schoolId);

    if (error) {
      console.error('[push] error leyendo push_tokens:', error);
      return;
    }

    if (!tokens || tokens.length === 0) return;

    const messages = tokens.map((t) => ({
      to: t.token as string,
      title: payload.title,
      body: payload.body,
      sound: 'default',
      channelId: 'default',
      priority: 'high',
      data: payload.data ?? {},
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.error('[push] error HTTP enviando a Expo:', response.status, await response.text());
      return;
    }

    const result = (await response.json()) as { data?: ExpoPushTicket[] };
    const tickets = result.data ?? [];

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        const token = messages[i]?.to;
        if (!token) continue;

        const { error: deleteError } = await supabase.from('push_tokens').delete().eq('token', token);
        if (deleteError) {
          console.error('[push] error borrando token inválido:', deleteError);
        } else {
          console.log('[push] token eliminado por DeviceNotRegistered:', token.slice(0, 12));
        }
      }
    }
  } catch (err) {
    console.error('[push] error:', err);
  }
}
