'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ChevronRight, ChevronLeft, Send, Calendar, Upload, Image, Loader2, X, FileText, Pencil } from 'lucide-react';

interface Segment {
  status: string[];
  source: string[];
}

interface Template {
  id: string;
  name: string;
  body: string;
}

interface FormState {
  name: string;
  segment: Segment;
  messageBody: string;
  selectedTemplateId: string; // UUID de plantilla, o '' si es texto libre
  scheduledAt: string;
  mediaUrl: string;
}

const STEPS = ['Segmento', 'Mensaje', 'Preview & Envío'];

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

export function NewCampaignForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [useTemplate, setUseTemplate] = useState<'template' | 'custom'>('template');
  const [form, setForm] = useState<FormState>({
    name: '',
    segment: { status: [], source: [] },
    messageBody: '',
    selectedTemplateId: '',
    scheduledAt: '',
    mediaUrl: '',
  });

  // Cargar plantillas al montar
  useEffect(() => {
    async function loadTemplates() {
      setLoadingTemplates(true);
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${API_URL}/templates`, {
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json() as Template[];
          setTemplates(data);
        }
      } catch {
        // silencioso — el form sigue funcionando con texto libre
      } finally {
        setLoadingTemplates(false);
      }
    }
    void loadTemplates();
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida (PNG, JPG, GIF, WEBP)');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64String = reader.result as string;

          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const res = await fetch(`${API_URL}/campaigns/upload`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              file: base64String,
              filename: file.name
            })
          });

          if (!res.ok) {
            const body = await res.json() as { error?: string };
            throw new Error(body.error ?? 'Error al subir la imagen');
          }

          const data = await res.json() as { publicUrl: string };
          setForm((prev) => ({ ...prev, mediaUrl: data.publicUrl }));
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setUploading(false);
        }
      };
      reader.onerror = () => {
        setError('Error al leer el archivo');
        setUploading(false);
      };
    } catch (err) {
      setError('Error al procesar el archivo');
      setUploading(false);
    }
  }

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
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const actualUserId = session?.user?.id ?? userId;

      const res = await fetch(`${API_URL}/campaigns`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: form.name,
          // Si se seleccionó una plantilla, enviar su UUID; si no, el texto libre
          template_id: form.selectedTemplateId || form.messageBody,
          segment: {
            status: form.segment.status.length ? form.segment.status : undefined,
            source: form.segment.source.length ? form.segment.source : undefined,
            media_url: form.mediaUrl.trim() ? form.mediaUrl.trim() : undefined,
          },
          created_by: actualUserId,
          scheduled_at: schedule && form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Error al crear campaña');
      }

      const campaign = await res.json() as { id: string };

      if (!schedule) {
        const sendRes = await fetch(`${API_URL}/campaigns/${campaign.id}/send`, { 
          method: 'POST',
          headers
        });
        if (!sendRes.ok) {
          const body = await sendRes.json() as { error?: string };
          throw new Error(body.error ?? 'Error al iniciar envío');
        }
      } else if (form.scheduledAt) {
        const schedRes = await fetch(`${API_URL}/campaigns/${campaign.id}/schedule`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ scheduled_at: new Date(form.scheduledAt).toISOString() }),
        });
        if (!schedRes.ok) {
          const body = await schedRes.json() as { error?: string };
          throw new Error(body.error ?? 'Error al programar campaña');
        }
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
          <div key={label} className="flex items-center gap-2 animate-fadeIn">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              i === step ? 'bg-naty-green text-white shadow-md shadow-naty-green/20' : i < step ? 'bg-naty-green/25 text-naty-green' : 'bg-white/5 text-gray-500 border border-white/5'
            }`}>
              {i + 1}
            </div>
            <span className={`text-xs font-semibold ${i === step ? 'text-white' : 'text-gray-500'}`}>{label}</span>
            {i < STEPS.length - 1 && <div className="h-px w-8 bg-white/10" />}
          </div>
        ))}
      </div>

      <div className="glass-card rounded-[2.5rem] p-6 space-y-6">
        {/* Step 0: Segmento */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">Nombre de la campaña</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ej: Promoción junio 2026"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-gray-600 outline-none focus:border-naty-green/50 focus:bg-white/10 transition-all duration-200"
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Estado del contacto</p>
              <div className="flex flex-wrap gap-2">
                {[
                  ['prospect', 'Prospectos'],
                  ['active', 'Activos'],
                  ['inactive', 'Inactivos'],
                ].map(([val, label]) => {
                  const isSelected = form.segment.status.includes(val);
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => toggleSegmentFilter('status', val)}
                      className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition active:scale-95 duration-200 ${
                        isSelected
                          ? 'border-naty-green bg-naty-green/10 text-naty-green shadow-inner'
                          : 'border-white/10 text-gray-400 hover:border-white/20 bg-white/5'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[10px] text-gray-500 font-medium">Sin selección = todos los estados</p>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Fuente del contacto</p>
              <div className="flex flex-wrap gap-2">
                {[
                  ['whatsapp_inbound', 'WhatsApp'],
                  ['manual', 'Manual'],
                  ['import', 'Importación'],
                ].map(([val, label]) => {
                  const isSelected = form.segment.source.includes(val);
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => toggleSegmentFilter('source', val)}
                      className={`rounded-xl border px-3.5 py-2 text-xs font-semibold transition active:scale-95 duration-200 ${
                        isSelected
                          ? 'border-naty-blue bg-naty-blue/10 text-naty-blue shadow-inner'
                          : 'border-white/10 text-gray-400 hover:border-white/20 bg-white/5'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Mensaje */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Toggle: plantilla vs texto libre */}
            <div className="flex gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setUseTemplate('template')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition ${
                  useTemplate === 'template'
                    ? 'bg-naty-green/20 text-naty-green border border-naty-green/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FileText size={12} /> Usar plantilla
              </button>
              <button
                type="button"
                onClick={() => {
                  setUseTemplate('custom');
                  setForm((p) => ({ ...p, selectedTemplateId: '' }));
                }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition ${
                  useTemplate === 'custom'
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Pencil size={12} /> Escribir mensaje
              </button>
            </div>

            {/* Selector de plantilla */}
            {useTemplate === 'template' && (
              <div className="space-y-3">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-400">
                  Seleccionar plantilla
                </label>
                {loadingTemplates ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500 py-4">
                    <Loader2 size={14} className="animate-spin" /> Cargando plantillas…
                  </div>
                ) : templates.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
                    <p className="text-xs text-gray-500">No tienes plantillas guardadas.</p>
                    <a
                      href="/templates"
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-naty-green hover:underline"
                    >
                      Crear plantillas <span>→</span>
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setForm((p) => ({
                            ...p,
                            selectedTemplateId: t.id,
                            messageBody: t.body,
                          }));
                        }}
                        className={`w-full rounded-2xl border p-4 text-left transition active:scale-[0.99] ${
                          form.selectedTemplateId === t.id
                            ? 'border-naty-green bg-naty-green/10'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <p className="text-xs font-bold text-white">{t.name}</p>
                        <p className="mt-1 text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                          {t.body.replace(/\{\{nombre\}\}/gi, '[nombre]')}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Texto libre */}
            {useTemplate === 'custom' && (
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
                  Cuerpo del mensaje
                </label>
                <p className="mb-2 text-[11px] text-gray-500 font-semibold">
                  Usa{' '}
                  <code className="bg-white/10 px-1.5 py-0.5 rounded text-naty-green text-[10px]">{'{{nombre}}'}</code>
                  {' '}para personalizar con el nombre del contacto.
                </p>
                <textarea
                  rows={5}
                  value={form.messageBody}
                  onChange={(e) => setForm((p) => ({ ...p, messageBody: e.target.value }))}
                  placeholder="Ej: Hola {{nombre}}, te invitamos a nuestra clase de prueba gratuita este fin de semana. ¡Te esperamos en Natara La Cima!"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white placeholder-gray-600 outline-none focus:border-naty-green/50 focus:bg-white/10 resize-none transition-all duration-200"
                />
              </div>
            )}


            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">Imagen de la campaña</label>
              <p className="mb-3 text-[11px] text-gray-500 font-semibold">
                Sube una imagen o proporciona una URL pública para acompañar tu mensaje.
              </p>

              {form.mediaUrl ? (
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-2 flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <img
                      src={form.mediaUrl}
                      alt="Miniatura de campaña"
                      className="h-14 w-14 rounded-lg object-cover border border-white/10"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="overflow-hidden">
                      <p className="text-xs text-white font-semibold truncate">Imagen cargada</p>
                      <p className="text-[10px] text-gray-500 font-mono truncate max-w-[300px]">{form.mediaUrl}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, mediaUrl: '' }))}
                    className="p-2 rounded-xl text-gray-400 hover:bg-white/5 hover:text-red-400 transition"
                    title="Eliminar imagen"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={`relative flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center cursor-pointer hover:border-naty-green/50 hover:bg-white/10 transition group ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {uploading ? (
                      <Loader2 className="mb-2 h-6 w-6 text-naty-green animate-spin" />
                    ) : (
                      <Upload className="mb-2 h-6 w-6 text-gray-400 group-hover:text-naty-green transition" />
                    )}
                    <span className="text-xs font-semibold text-white">Subir archivo</span>
                    <span className="text-[10px] text-gray-500 mt-1">PNG, JPG, GIF o WEBP (máx. 5MB)</span>
                  </label>

                  <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white mb-2">
                      <Image size={14} className="text-gray-400" />
                      <span>URL de imagen externa</span>
                    </div>
                    <input
                      type="url"
                      value={form.mediaUrl}
                      onChange={(e) => setForm((p) => ({ ...p, mediaUrl: e.target.value }))}
                      placeholder="https://ejemplo.com/imagen.jpg"
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-naty-green/50 focus:bg-black/40 transition-all duration-200"
                    />
                    <span className="text-[10px] text-gray-500 mt-2 font-medium">O pega un enlace web directo.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Preview & Envío */}
        {step === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Preview del mensaje</p>
              <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-4 flex justify-start">
                <div className="inline-block max-w-xs rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-xs text-white shadow-md rounded-tl-none">
                  {form.mediaUrl.trim() && (
                    <div className="mb-3 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                      <img
                        src={form.mediaUrl.trim()}
                        alt="Preview de campaña"
                        className="max-h-40 w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <p className="font-semibold text-naty-green">Hola [nombre],</p>
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed text-gray-300">{form.messageBody}</p>
                  <p className="mt-1.5 text-right text-[10px] text-gray-500 font-semibold">Natara La Cima</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-xs space-y-1">
              <p className="text-gray-400">Campaña: <span className="text-white font-bold">{form.name}</span></p>
              <p className="text-gray-400">
                Segmento:{' '}
                <span className="text-white font-semibold">
                  {form.segment.status.length ? form.segment.status.map(s => s.toUpperCase()).join(', ') : 'TODOS'} ·{' '}
                  {form.segment.source.length ? form.segment.source.map(s => s.toUpperCase()).join(', ') : 'TODAS LAS FUENTES'}
                </span>
              </p>
              {form.mediaUrl.trim() && (
                <p className="text-gray-400 truncate">Imagen: <span className="text-naty-sky font-mono">{form.mediaUrl}</span></p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
                Programar envío <span className="text-gray-500 font-normal">(opcional)</span>
              </label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white outline-none focus:border-naty-green/50 transition-all duration-200"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-400 border border-red-500/15">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => handleSend(false)}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-naty-green hover:opacity-90 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition active:scale-95 disabled:opacity-50"
              >
                <Send size={13} /> Enviar ahora
              </button>
              {form.scheduledAt && (
                <button
                  onClick={() => handleSend(true)}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-naty-blue px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-naty-blue hover:bg-naty-blue/10 transition active:scale-95 disabled:opacity-50"
                >
                  <Calendar size={13} /> Programar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={() => step > 0 ? setStep((s) => s - 1) : router.push('/campaigns')}
          className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition"
        >
          <ChevronLeft size={14} /> {step === 0 ? 'Cancelar' : 'Atrás'}
        </button>

        {step < STEPS.length - 1 && (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={
              (step === 0 && !form.name.trim()) ||
              (step === 1 && !form.messageBody.trim() && !form.selectedTemplateId)
            }
            className="flex items-center gap-1 rounded-xl bg-naty-green hover:opacity-90 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition disabled:opacity-50"
          >
            Siguiente <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
