import { supabase } from '../db/client.js';
import { env } from '../config/env.js';
import { getMexicanHolidays } from './mexican-holidays.js';

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export async function buildCalendarContext(daysAhead = 90): Promise<string> {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // start of today
  const to = new Date(from.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  // Holidays for this year and next (covers windows that cross year boundary)
  const currentYear = now.getFullYear();
  const allHolidays = [
    ...getMexicanHolidays(currentYear),
    ...getMexicanHolidays(currentYear + 1),
  ].filter(h => h.date >= toYMD(from) && h.date <= toYMD(to));

  // Events from DB
  let dbEvents: { title: string; start_at: string; end_at: string; type: string; description: string | null }[] = [];
  try {
    const { data } = await supabase
      .from('events')
      .select('title, start_at, end_at, type, description')
      .eq('school_id', env.DEFAULT_SCHOOL_ID)
      .gte('start_at', from.toISOString())
      .lte('start_at', to.toISOString())
      .order('start_at', { ascending: true });
    dbEvents = data ?? [];
  } catch {
    // Si falla la BD, continuamos sin eventos
  }

  if (allHolidays.length === 0 && dbEvents.length === 0) {
    return '';
  }

  const lines: string[] = [
    `CALENDARIO DE NATARA (hoy es ${fmtDate(now.toISOString())}, próximos ${daysAhead} días):`,
    '',
  ];

  if (allHolidays.length > 0) {
    lines.push('DÍAS FESTIVOS Y FERIADOS EN ESTE PERÍODO:');
    for (const h of allHolidays) {
      const tag = h.mandatory ? '[DESCANSO OBLIGATORIO]' : '[Festivo]';
      lines.push(`  ${h.date} — ${h.name} ${tag}`);
    }
    lines.push('');
  }

  if (dbEvents.length > 0) {
    lines.push('EVENTOS AGENDADOS EN NATARA:');
    for (const ev of dbEvents) {
      const desc = ev.description ? ` — ${ev.description}` : '';
      lines.push(`  ${fmtDate(ev.start_at)} ${fmtTime(ev.start_at)}-${fmtTime(ev.end_at)}: ${ev.title} (${ev.type})${desc}`);
    }
    lines.push('');
  }

  lines.push(
    'CÓMO USAR ESTE CALENDARIO:',
    '- Si preguntan si habrá clases/labores en una fecha específica:',
    '  • DESCANSO OBLIGATORIO = NO hay clases ese día.',
    '  • Festivo no obligatorio = posiblemente sí hay clases, pero indícalo como festivo y recomienda confirmar con el equipo.',
    '  • Evento agendado = responde según lo registrado.',
    '  • Sin información = no puedes confirmar, escala al equipo.',
    '- Responde siempre con la fecha completa y el nombre del día para evitar confusiones.',
  );

  return lines.join('\n');
}
