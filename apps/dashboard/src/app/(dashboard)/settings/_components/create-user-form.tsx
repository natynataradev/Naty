'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

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
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          <label className="mb-1.5 block text-sm text-gray-300">Nombre</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-naty-blue"
            placeholder="Nombre completo"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-gray-300">Correo electrónico</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-naty-blue"
            placeholder="correo@natara.mx"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-gray-300">Contraseña inicial</label>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-naty-blue"
            placeholder="Mínimo 8 caracteres"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-gray-300">Rol</label>
          <select
            value={form.role}
            onChange={(e) => update('role', e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#1A1A2E] px-4 py-2.5 text-sm text-white outline-none focus:border-naty-blue"
          >
            <option value="operator">Operador</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-naty-green px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? 'Creando…' : 'Crear usuario'}
      </button>
    </form>
  );
}
