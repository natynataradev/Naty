'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function CreateUserForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', role: 'operator', password: '' });

  function update(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Error al crear usuario');
      }

      router.refresh();
      setForm({ name: '', email: '', role: 'operator', password: '' });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">Nombre</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-gray-600 outline-none focus:border-naty-green/50 focus:bg-white/10 transition-all duration-200"
            placeholder="Nombre completo"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">Correo electrónico</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-gray-600 outline-none focus:border-naty-green/50 focus:bg-white/10 transition-all duration-200"
            placeholder="correo@natara.mx"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">Contraseña inicial</label>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-gray-600 outline-none focus:border-naty-green/50 focus:bg-white/10 transition-all duration-200"
            placeholder="Mínimo 8 caracteres"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-400">Rol</label>
          <select
            value={form.role}
            onChange={(e) => update('role', e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#131322] px-4 py-2.5 text-xs text-white outline-none focus:border-naty-green/50 transition-all duration-200"
          >
            <option value="operator">Operador</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-xs text-red-400 font-semibold border border-red-500/15">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-naty-green hover:scale-[1.02] active:scale-[0.98] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all shadow-md shadow-naty-green/20 disabled:opacity-50 disabled:scale-100"
      >
        {loading ? 'Creando...' : 'Crear usuario'}
      </button>
    </form>
  );
}
