import type { MessageDirection } from '@/types/chat';

const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Regla de WhatsApp Cloud API: solo se puede mandar texto libre dentro de las
 * 24h posteriores al último mensaje inbound del contacto. Fuera de esa ventana
 * (o si nunca ha escrito), Meta exige una plantilla pre-aprobada.
 */
export function isWithinServiceWindow(
  messages: { direction: MessageDirection; timestamp: string }[]
): boolean {
  let lastInboundAt: number | null = null;

  for (const message of messages) {
    if (message.direction !== 'inbound') continue;
    const time = new Date(message.timestamp).getTime();
    if (lastInboundAt === null || time > lastInboundAt) {
      lastInboundAt = time;
    }
  }

  if (lastInboundAt === null) return false;
  return Date.now() - lastInboundAt < SERVICE_WINDOW_MS;
}
