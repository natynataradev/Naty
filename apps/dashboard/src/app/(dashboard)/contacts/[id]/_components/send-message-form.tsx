'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, AlertCircle } from 'lucide-react';

interface SendMessageFormProps {
  contactId: string;
  phoneNumber: string;
}

export function SendMessageForm({ contactId, phoneNumber }: SendMessageFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setErrorMsg('El mensaje no puede estar vacío');
      return;
    }

    setLoading(true);
    setStatus('idle');
    setErrorMsg('');

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          body: message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al enviar el mensaje');
      }

      setStatus('success');
      setMessage('');
      router.refresh(); // Automatically re-fetch server data to show the new message
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setStatus('error');
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="relative flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1.5 focus-within:border-naty-green/40 focus-within:bg-white/10 transition-all duration-200">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Responder a ${phoneNumber}...`}
          className="flex-1 bg-transparent px-4 py-2 text-sm text-white placeholder-gray-500 outline-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-naty-green text-white transition hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 disabled:pointer-events-none"
        >
          <Send size={15} />
        </button>
      </form>

      {status === 'success' && (
        <p className="px-4 text-[11px] font-semibold text-naty-green animate-fadeIn">✓ Mensaje enviado exitosamente</p>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-1 px-4 text-[11px] font-semibold text-red-400 animate-fadeIn">
          <AlertCircle size={12} />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
