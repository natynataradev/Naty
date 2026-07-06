'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Send, X, Calendar, Loader2, RefreshCw } from 'lucide-react';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

interface CampaignActionsProps {
  campaignId: string;
  status: string;
  scheduledAt: string | null;
}

export function CampaignActions({ campaignId, status, scheduledAt }: CampaignActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showReschedule, setShowReschedule] = useState(false);
  const [newScheduledAt, setNewScheduledAt] = useState(
    scheduledAt ? scheduledAt.slice(0, 16) : '' // format for datetime-local input
  );

  async function handleSendNow() {
    setLoading('send');
    setError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers,
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Error al iniciar envío');
      }
      router.push('/campaigns');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  }

  async function handleCancel() {
    setLoading('cancel');
    setError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/campaigns/${campaignId}/cancel`, {
        method: 'POST',
        headers,
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Error al cancelar campaña');
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  }

  async function handleReschedule() {
    if (!newScheduledAt) return;
    setLoading('reschedule');
    setError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/campaigns/${campaignId}/schedule`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ scheduled_at: new Date(newScheduledAt).toISOString() }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? 'Error al reprogramar campaña');
      }
      setShowReschedule(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  }

  if (status === 'completed' || status === 'sending' || status === 'failed') {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-3">
      <div className="flex flex-wrap gap-2 justify-end">
        {/* Enviar ahora — disponible para draft y scheduled */}
        <button
          onClick={handleSendNow}
          disabled={!!loading}
          className="flex items-center gap-2 rounded-xl bg-naty-green px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition disabled:opacity-50"
        >
          {loading === 'send' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          Enviar ahora
        </button>

        {/* Reprogramar — solo para scheduled */}
        {status === 'scheduled' && (
          <button
            onClick={() => setShowReschedule(!showReschedule)}
            disabled={!!loading}
            className="flex items-center gap-2 rounded-xl border border-naty-blue px-4 py-2 text-xs font-bold text-naty-blue hover:bg-naty-blue/10 transition disabled:opacity-50"
          >
            <RefreshCw size={13} />
            Reprogramar
          </button>
        )}

        {/* Cancelar programación — solo para scheduled */}
        {status === 'scheduled' && (
          <button
            onClick={handleCancel}
            disabled={!!loading}
            className="flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
          >
            {loading === 'cancel' ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
            Cancelar programación
          </button>
        )}
      </div>

      {/* Panel de reprogramación inline */}
      {showReschedule && (
        <div className="flex items-center gap-3 rounded-2xl border border-naty-blue/30 bg-naty-blue/5 px-4 py-3 animate-fadeIn">
          <Calendar size={14} className="text-naty-blue shrink-0" />
          <input
            type="datetime-local"
            value={newScheduledAt}
            onChange={(e) => setNewScheduledAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-naty-blue/50 transition"
          />
          <button
            onClick={handleReschedule}
            disabled={!newScheduledAt || !!loading}
            className="rounded-xl bg-naty-blue px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 transition disabled:opacity-50"
          >
            {loading === 'reschedule' ? <Loader2 size={12} className="animate-spin" /> : 'Guardar'}
          </button>
          <button
            onClick={() => setShowReschedule(false)}
            className="text-gray-500 hover:text-white transition"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 border border-red-500/15">
          {error}
        </p>
      )}
    </div>
  );
}
