'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Loader2, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getMexicanHolidays } from '@/lib/mexican-holidays';
import type { CalendarEvent, EventType, CreateEventInput } from '@naty/shared';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const EVENT_TYPES: { value: EventType; label: string; color: string }[] = [
  { value: 'class',    label: 'Clase',     color: 'bg-naty-green text-white' },
  { value: 'event',    label: 'Evento',    color: 'bg-naty-blue text-white' },
  { value: 'meeting',  label: 'Reunión',   color: 'bg-purple-500 text-white' },
  { value: 'reminder', label: 'Recordatorio', color: 'bg-amber-500 text-white' },
];

function typeColor(type: EventType): string {
  return EVENT_TYPES.find(t => t.value === type)?.color ?? 'bg-gray-500 text-white';
}

function typeLabel(type: EventType): string {
  return EVENT_TYPES.find(t => t.value === type)?.label ?? type;
}

function calendarGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  // Monday-first: getDay() is 0=Sun, shift so Mon=0
  const startPad = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface NewEventState {
  title: string;
  type: EventType;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
}

export function CalendarClient() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState<NewEventState>({
    title: '', type: 'class', date: '', startTime: '09:00', endTime: '10:00', description: '',
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const from = new Date(year, month, 1).toISOString();
      const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const res = await fetch(`${API_URL}/events?from=${from}&to=${to}`, {
        headers: { ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      });
      if (res.ok) setEvents(await res.json() as CalendarEvent[]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  function openDayForm(day: Date) {
    setSelectedDay(day);
    setSelectedEvent(null);
    setForm(f => ({ ...f, title: '', date: toLocalDateString(day), description: '' }));
    setFormError('');
    setShowForm(true);
  }

  function openEventDetail(e: React.MouseEvent, event: CalendarEvent) {
    e.stopPropagation();
    setSelectedEvent(event);
    setSelectedDay(null);
    setShowForm(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setFormError('El título es requerido.'); return; }
    setSaving(true); setFormError('');
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const body: CreateEventInput = {
        title: form.title.trim(),
        type: form.type,
        start_at: new Date(`${form.date}T${form.startTime}:00`).toISOString(),
        end_at:   new Date(`${form.date}T${form.endTime}:00`).toISOString(),
        description: form.description.trim() || undefined,
      };
      const res = await fetch(`${API_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      setShowForm(false);
      await fetchEvents();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedEvent) return;
    setDeleting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${API_URL}/events/${selectedEvent.id}`, {
        method: 'DELETE',
        headers: { ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
      });
      setSelectedEvent(null);
      await fetchEvents();
    } finally {
      setDeleting(false);
    }
  }

  const grid = calendarGrid(year, month);
  const holidays = getMexicanHolidays(year);
  const holidayMap = new Map(holidays.map(h => [h.date, h]));
  const inputClass = 'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition focus:border-naty-green/50 focus:bg-white/10';

  return (
    <div className="flex gap-6 items-start">
      {/* Calendar */}
      <div className="flex-1 glass-card rounded-[2rem] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <button onClick={prevMonth} className="p-2 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition">
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-lg font-bold text-white">
            {MONTHS_ES[month]} {year}
            {loading && <span className="ml-2 inline-block h-3 w-3 rounded-full border border-naty-green border-t-transparent animate-spin align-middle" />}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-white/5">
          {DAYS_ES.map(d => (
            <div key={d} className="py-3 text-center text-[10px] font-bold uppercase tracking-widest text-gray-500">{d}</div>
          ))}
        </div>

        {/* Leyenda */}
        <div className="flex items-center gap-4 px-6 py-2 border-b border-white/5">
          <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <span className="h-2.5 w-2.5 rounded-sm bg-red-500/40" />
            Descanso obligatorio
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-500/30" />
            Día festivo
          </span>
          {EVENT_TYPES.map(t => (
            <span key={t.value} className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <span className={`h-2.5 w-2.5 rounded-sm ${t.color}`} />
              {t.label}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7">
          {grid.map((day, i) => {
            if (!day) return <div key={i} className="min-h-[90px] border-b border-r border-white/5 bg-white/[0.01]" />;
            const isToday = isSameDay(day, today);
            const dayEvents = events.filter(ev => isSameDay(new Date(ev.start_at), day));
            const holiday = holidayMap.get(toLocalDateString(day));
            return (
              <div
                key={i}
                onClick={() => openDayForm(day)}
                className={`min-h-[90px] border-b border-r border-white/5 p-2 cursor-pointer transition group ${
                  holiday?.mandatory
                    ? 'bg-red-500/[0.06] hover:bg-red-500/[0.10]'
                    : holiday
                    ? 'bg-amber-500/[0.04] hover:bg-amber-500/[0.08]'
                    : 'hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition ${
                    isToday
                      ? 'bg-naty-green text-white'
                      : holiday?.mandatory
                      ? 'text-red-400 group-hover:text-red-300'
                      : 'text-gray-400 group-hover:text-white'
                  }`}>
                    {day.getDate()}
                  </span>
                  <Plus size={12} className="text-gray-600 opacity-0 group-hover:opacity-100 transition" />
                </div>
                {holiday && (
                  <p className={`text-[9px] font-bold truncate leading-tight mb-1 ${
                    holiday.mandatory ? 'text-red-400/80' : 'text-amber-400/70'
                  }`}>
                    {holiday.name}
                  </p>
                )}
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map(ev => (
                    <button
                      key={ev.id}
                      onClick={e => openEventDetail(e, ev)}
                      className={`w-full text-left text-[10px] font-semibold truncate rounded px-1.5 py-0.5 ${typeColor(ev.type)} hover:opacity-80 transition`}
                    >
                      {ev.title}
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="text-[10px] text-gray-500 px-1">+{dayEvents.length - 3} más</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Side panel */}
      {(showForm || selectedEvent) && (
        <div className="w-80 glass-card rounded-[2rem] p-6 shrink-0">
          {/* New event form */}
          {showForm && selectedDay && (
            <>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-white">Nuevo evento</h3>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-xl text-gray-500 hover:bg-white/5 hover:text-white transition">
                  <X size={16} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                {selectedDay.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Título *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej. Clase de natación bebés"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Tipo</label>
                  <div className="grid grid-cols-2 gap-2">
                    {EVENT_TYPES.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, type: t.value }))}
                        className={`rounded-xl px-3 py-2 text-xs font-semibold transition border ${
                          form.type === t.value
                            ? `${t.color} border-transparent`
                            : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Inicio</label>
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                      className={`${inputClass} !bg-[#1A1A2E]`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Fin</label>
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                      className={`${inputClass} !bg-[#1A1A2E]`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Descripción</label>
                  <textarea
                    rows={2}
                    placeholder="Notas opcionales..."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                {formError && (
                  <p className="rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">{formError}</p>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-naty-green px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-naty-green/20 transition hover:opacity-90 disabled:opacity-60"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? 'Guardando...' : 'Guardar evento'}
                </button>
              </form>
            </>
          )}

          {/* Event detail */}
          {selectedEvent && !showForm && (
            <>
              <div className="flex items-center justify-between mb-5">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${typeColor(selectedEvent.type)}`}>
                  {typeLabel(selectedEvent.type)}
                </span>
                <button onClick={() => setSelectedEvent(null)} className="p-1.5 rounded-xl text-gray-500 hover:bg-white/5 hover:text-white transition">
                  <X size={16} />
                </button>
              </div>
              <h3 className="font-bold text-white text-lg mb-2">{selectedEvent.title}</h3>
              <p className="text-xs text-gray-400 mb-1">
                {new Date(selectedEvent.start_at).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-xs text-gray-400 mb-4">
                {new Date(selectedEvent.start_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                {' — '}
                {new Date(selectedEvent.end_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </p>
              {selectedEvent.description && (
                <p className="text-sm text-gray-300 mb-4">{selectedEvent.description}</p>
              )}
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-60"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? 'Eliminando...' : 'Eliminar evento'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
