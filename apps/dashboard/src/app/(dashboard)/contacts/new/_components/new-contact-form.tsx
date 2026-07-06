'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { UserRound, GraduationCap, Loader2 } from 'lucide-react';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

type ContactType = 'student' | 'staff';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

interface FormState {
  type: ContactType;
  name: string;
  phone: string;
  email: string;
  birth_date: string;
  emergency_phone: string;
  guardian_name: string;
  address: string;
  blood_type: string;
  notes: string;
  accepted_privacy: boolean;
}

const PRIVACY_URL = 'https://diavolo.me/privacidad-natara';

export function NewContactForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>({
    type: 'student',
    name: '',
    phone: '',
    email: '',
    birth_date: '',
    emergency_phone: '',
    guardian_name: '',
    address: '',
    blood_type: '',
    notes: '',
    accepted_privacy: false,
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.accepted_privacy) {
      setError('El titular debe aceptar el aviso de privacidad antes de continuar.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const body: Record<string, unknown> = {
        type: form.type,
        name: form.name.trim(),
        phone: form.phone.trim(),
        source: 'manual',
        status: 'active',
        accepted_privacy: true,
        accepted_at: new Date().toISOString(),
      };
      if (form.email.trim()) body['email'] = form.email.trim();
      if (form.birth_date) body['birth_date'] = form.birth_date;
      if (form.emergency_phone.trim()) body['emergency_phone'] = form.emergency_phone.trim();
      if (form.guardian_name.trim()) body['guardian_name'] = form.guardian_name.trim();
      if (form.address.trim()) body['address'] = form.address.trim();
      if (form.blood_type) body['blood_type'] = form.blood_type;
      if (form.notes.trim()) body['notes'] = form.notes.trim();

      const res = await fetch(`${API_URL}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      router.push('/contacts');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition focus:border-naty-green/50 focus:bg-white/10';
  const labelClass = 'block text-xs font-semibold text-gray-400 mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Tipo */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Tipo de contacto</p>
        <div className="grid grid-cols-2 gap-3">
          {([['student', 'Alumno', GraduationCap], ['staff', 'Maestro / Administrativo', UserRound]] as const).map(
            ([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => set('type', value)}
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                  form.type === value
                    ? 'border-naty-green bg-naty-green/10 text-white'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={18} className={form.type === value ? 'text-naty-green' : ''} />
                <span className="text-sm font-semibold">{label}</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Datos básicos */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Datos personales</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Nombre completo *</label>
            <input
              required
              type="text"
              placeholder="Ej. Juan Pérez García"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Teléfono *</label>
            <input
              required
              type="tel"
              placeholder="Ej. 3312345678"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Correo electrónico</label>
            <input
              type="email"
              placeholder="Ej. juan@email.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Fecha de nacimiento</label>
            <input
              type="date"
              value={form.birth_date}
              onChange={(e) => set('birth_date', e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Tipo de sangre</label>
            <select
              value={form.blood_type}
              onChange={(e) => set('blood_type', e.target.value)}
              className={`${inputClass} !bg-[#1A1A2E] [&>option]:bg-[#1A1A2E] [&>option]:text-white`}
            >
              <option value="">Sin especificar</option>
              {BLOOD_TYPES.map((bt) => (
                <option key={bt} value={bt}>{bt}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Dirección</label>
            <input
              type="text"
              placeholder="Ej. Av. Vallarta 1234, Col. Americana, Guadalajara"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Datos de emergencia */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Contacto de emergencia</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Teléfono de emergencia</label>
            <input
              type="tel"
              placeholder="Ej. 3398765432"
              value={form.emergency_phone}
              onChange={(e) => set('emergency_phone', e.target.value)}
              className={inputClass}
            />
          </div>
          {form.type === 'student' && (
            <div>
              <label className={labelClass}>Nombre del responsable (si es menor)</label>
              <input
                type="text"
                placeholder="Ej. María García López"
                value={form.guardian_name}
                onChange={(e) => set('guardian_name', e.target.value)}
                className={inputClass}
              />
            </div>
          )}
        </div>
      </div>

      {/* Notas del rol */}
      <div>
        <label className={labelClass}>
          {form.type === 'student' ? 'Categoría / notas' : 'Cargo / notas'}
        </label>
        <input
          type="text"
          placeholder={
            form.type === 'student'
              ? 'Ej. Niños, 2 clases/semana, lunes y miércoles 4:30 pm'
              : 'Ej. Instructora de natación, turno matutino'
          }
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Aviso de privacidad */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={form.accepted_privacy}
            onChange={(e) => set('accepted_privacy', e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded accent-naty-green"
          />
          <span className="text-sm text-gray-300 leading-relaxed">
            El titular ha leído y acepta el{' '}
            <a
              href={PRIVACY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-naty-green underline underline-offset-2 hover:opacity-80"
            >
              aviso de privacidad y protección de datos personales
            </a>{' '}
            de Natara Escuela de Natación.
          </span>
        </label>
      </div>

      {error && (
        <p className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</p>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-2xl bg-naty-green px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-naty-green/20 transition hover:opacity-90 active:scale-95 disabled:opacity-60"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'Guardando...' : 'Dar de alta'}
        </button>
      </div>
    </form>
  );
}
