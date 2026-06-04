'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Send, Calendar } from 'lucide-react';

interface Segment {
  status: string[];
  source: string[];
}

interface FormState {
  name: string;
  segment: Segment;
  messageBody: string;
  scheduledAt: string;
}

const STEPS = ['Segmento', 'Mensaje', 'Preview & Envío'];

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

export function NewCampaignForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>({
    name: '',
    segment: { status: [], source: [] },
    messageBody: '',
    scheduledAt: '',
  });

  function toggleSegmentFilter(field: 'status' | 'source', value: string) {
    setForm((prev) => {
      const current = prev.segment[field];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, segment: { ...prev.segment, [field]: updated } };
    });
  }

  async function handleSend(schedule: boolean) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          template_id: form.messageBody,
          segment: {
            status: form.segment.status.length ? form.segment.status : undefined,
            source: form.segment.source.length ? form.segment.source : undefined,
          },
          created_by: userId,
          scheduled_at: schedule && form.scheduledAt ? form.scheduledAt : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Error al crear campaña');
      }

      const campaign = await res.json() as { id: string };

      if (!schedule) {
        await fetch(`${API_URL}/campaigns/${campaign.id}/send`, { method: 'POST' });
      } else if (form.scheduledAt) {
        await fetch(`${API_URL}/campaigns/${campaign.id}/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduled_at: form.scheduledAt }),
        });
      }

      router.push('/campaigns');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Steps */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              i === step ? 'bg-naty-green text-white' : i < step ? 'bg-naty-green/30 text-naty-green' : 'bg-white/10 text-gray-500'
            }`}>
              {i + 1}
            </div>
            <span className={`text-sm ${i === step ? 'text-white' : 'text-gray-500'}`}>{label}</span>
            {i < STEPS.length - 1 && <div className="h-px w-8 bg-white/10" />}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        {/* Step 0: Segmento */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Nombre de la campaña</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej: Promoción junio 2026"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-naty-blue"
              />
            </div>

            <div>
              <p className="mb-2 text-sm text-gray-300">Estado del contacto</p>
              <div className="flex flex-wrap gap-2">
                {[['prospect','Prospectos'],['active','Activos'],['inactive','Inactivos']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => toggleSegmentFilter('status', val)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      form.segment.status.includes(val)
                        ? 'border-naty-green bg-naty-green/20 text-naty-green'
                        : 'border-white/10 text-gray-400 hover:border-white/30'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-gray-600">Sin selección = todos los estados</p>
            </div>

            <div>
              <p className="mb-2 text-sm text-gray-300">Fuente del contacto</p>
              <div className="flex flex-wrap gap-2">
                {[['whatsapp_inbound','WhatsApp'],['manual','Manual'],['import','Importación']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => toggleSegmentFilter('source', val)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      form.segment.source.includes(val)
                        ? 'border-naty-blue bg-naty-blue/20 text-naty-blue'
                        : 'border-white/10 text-gray-400 hover:border-white/30'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Mensaje */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-gray-300">Cuerpo del mensaje</label>
              <p className="mb-3 text-xs text-gray-500">
                El sistema antepone "Hola [nombre]," automáticamente. Escribe el resto del mensaje.
              </p>
              <textarea
                rows={6}
                value={form.messageBody}
                onChange={(e) => setForm((p) => ({ ...p, messageBody: e.target.value }))}
                placeholder="Ej: queremos invitarte a nuestra clase de prueba gratuita este fin de semana. ¡Te esperamos en Natara La Cima!"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-naty-blue resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 2: Preview & Envío */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm text-gray-400">Preview del mensaje</p>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="inline-block max-w-xs rounded-xl bg-naty-green/20 px-4 py-3 text-sm text-naty-green">
                  <p className="font-medium">Hola [nombre],</p>
                  <p className="mt-1 whitespace-pre-wrap">{form.messageBody}</p>
                  <p className="mt-1 text-right text-xs opacity-50">Natara La Cima</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm">
              <p className="text-gray-400">Campaña: <span className="text-white">{form.name}</span></p>
              <p className="mt-1 text-gray-400">
                Segmento:{' '}
                <span className="text-white">
                  {form.segment.status.length ? form.segment.status.join(', ') : 'todos'} ·{' '}
                  {form.segment.source.length ? form.segment.source.join(', ') : 'todas las fuentes'}
                </span>
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-300">
                Programar envío <span className="text-gray-500">(opcional)</span>
              </label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-naty-blue"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => handleSend(false)}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-naty-green px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                <Send size={14} /> Enviar ahora
              </button>
              {form.scheduledAt && (
                <button
                  onClick={() => handleSend(true)}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-naty-blue px-4 py-2.5 text-sm font-semibold text-naty-blue transition hover:bg-naty-blue/10 disabled:opacity-50"
                >
                  <Calendar size={14} /> Programar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-4 flex justify-between">
        <button
          onClick={() => step > 0 ? setStep((s) => s - 1) : router.push('/campaigns')}
          className="flex items-center gap-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-400 transition hover:bg-white/5"
        >
          <ChevronLeft size={14} /> {step === 0 ? 'Cancelar' : 'Atrás'}
        </button>

        {step < STEPS.length - 1 && (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={
              (step === 0 && !form.name.trim()) ||
              (step === 1 && !form.messageBody.trim())
            }
            className="flex items-center gap-1 rounded-lg bg-naty-green px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            Siguiente <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
