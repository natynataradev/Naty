'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Pencil, Trash2, Plus, X, Check, Loader2, FileText } from 'lucide-react';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface Template {
  id: string;
  name: string;
  body: string;
  created_at: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

interface TemplatesClientProps {
  initialTemplates: Template[];
  userId: string;
}

type EditingState = { id: string; name: string; body: string } | null;

export function TemplatesClient({ initialTemplates, userId }: TemplatesClientProps) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [editing, setEditing] = useState<EditingState>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBody, setNewBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate() {
    if (!newName.trim() || !newBody.trim()) {
      setError('El nombre y el cuerpo son requeridos');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/templates`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: newName.trim(), body: newBody.trim(), created_by: userId }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Error al crear plantilla');
      }
      const template = await res.json() as Template;
      setTemplates((prev) => [template, ...prev]);
      setNewName('');
      setNewBody('');
      setShowNew(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate() {
    if (!editing || !editing.name.trim() || !editing.body.trim()) return;
    setLoading(true);
    setError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/templates/${editing.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ name: editing.name.trim(), body: editing.body.trim() }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Error al actualizar plantilla');
      }
      const updated = await res.json() as Template;
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditing(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/templates/${id}`, { method: 'DELETE', headers });
      if (!res.ok && res.status !== 204) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Error al eliminar plantilla');
      }
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 font-semibold">
          {templates.length} plantilla{templates.length !== 1 ? 's' : ''} guardada{templates.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => { setShowNew(true); setEditing(null); setError(''); }}
          className="flex items-center gap-2 rounded-xl bg-naty-green hover:opacity-90 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition active:scale-95"
        >
          <Plus size={13} /> Nueva plantilla
        </button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-400 border border-red-500/15">
          {error}
        </p>
      )}

      {/* Formulario de nueva plantilla */}
      {showNew && (
        <div className="glass-card rounded-[2rem] p-6 space-y-4 border border-naty-green/20 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Nueva plantilla</h3>
            <button onClick={() => { setShowNew(false); setError(''); }} className="text-gray-500 hover:text-white transition">
              <X size={16} />
            </button>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
              Nombre de la plantilla
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: Bienvenida, Promo Junio, Recordatorio clase..."
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-gray-600 outline-none focus:border-naty-green/50 focus:bg-white/10 transition-all"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">
              Cuerpo del mensaje
            </label>
            <p className="mb-2 text-[11px] text-gray-500 font-semibold leading-relaxed">
              Usa <code className="bg-white/10 px-1.5 py-0.5 rounded text-naty-green">{'{{nombre}}'}</code> para personalizar con el nombre del contacto.
            </p>
            <textarea
              rows={5}
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Ej: Hola {{nombre}}, te invitamos a nuestra clase de prueba gratuita este fin de semana. ¡Te esperamos en Natara La Cima!"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white placeholder-gray-600 outline-none focus:border-naty-green/50 focus:bg-white/10 resize-none transition-all"
            />
          </div>

          {/* Preview */}
          {newBody.trim() && (
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">Preview</p>
              <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                <p className="text-xs text-white whitespace-pre-wrap leading-relaxed">
                  {newBody.replace(/\{\{nombre\}\}/gi, '[Nombre del contacto]')}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCreate}
              disabled={loading || !newName.trim() || !newBody.trim()}
              className="flex items-center gap-2 rounded-xl bg-naty-green px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Guardar plantilla
            </button>
            <button
              onClick={() => { setShowNew(false); setNewName(''); setNewBody(''); setError(''); }}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de plantillas */}
      {templates.length === 0 && !showNew ? (
        <div className="glass-card rounded-[2.5rem] py-16 text-center">
          <FileText size={32} className="mx-auto mb-3 text-gray-600" />
          <p className="text-sm text-gray-500">Aún no tienes plantillas guardadas.</p>
          <button
            onClick={() => setShowNew(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-naty-green/10 border border-naty-green/20 hover:bg-naty-green/20 px-4 py-2 text-xs font-semibold text-naty-green transition"
          >
            <Plus size={13} /> Crear primera plantilla
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((t) => (
            <div key={t.id} className="glass-card rounded-[2rem] p-6 animate-fadeIn">
              {editing?.id === t.id ? (
                /* Modo edición inline */
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white outline-none focus:border-naty-green/50 transition"
                  />
                  <textarea
                    rows={4}
                    value={editing.body}
                    onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white outline-none focus:border-naty-green/50 resize-none transition"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdate}
                      disabled={loading}
                      className="flex items-center gap-1.5 rounded-xl bg-naty-green px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 transition disabled:opacity-50"
                    >
                      {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Guardar
                    </button>
                    <button
                      onClick={() => { setEditing(null); setError(''); }}
                      className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 transition"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                /* Modo visualización */
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{t.name}</h3>
                      <p className="mt-2 text-xs text-gray-400 whitespace-pre-wrap leading-relaxed line-clamp-3">
                        {t.body.replace(/\{\{nombre\}\}/gi, '[nombre]')}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => { setEditing({ id: t.id, name: t.name, body: t.body }); setShowNew(false); setError(''); }}
                        className="rounded-lg p-2 text-gray-500 hover:bg-white/5 hover:text-naty-green transition"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        className="rounded-lg p-2 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition disabled:opacity-50"
                        title="Eliminar"
                      >
                        {deletingId === t.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <code className="rounded-lg bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-gray-500">
                      ID: {t.id.slice(0, 8)}…
                    </code>
                    <span className="text-[10px] text-gray-600">
                      Creada {new Date(t.created_at).toLocaleDateString('es-MX')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
