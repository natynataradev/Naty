'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { User, ShieldAlert, FileText, Check } from 'lucide-react';
import type { Contact, Conversation } from '@naty/shared';

interface QuickActionsProps {
  contact: Contact;
  activeConversation: Conversation | null;
}

const TEMPLATES = [
  { label: 'Bienvenida', text: '¡Hola! Bienvenido a Natara La Cima. ¿En qué podemos ayudarte hoy? 🏊‍♂️' },
  { label: 'Información clases', text: 'Hola, con gusto te compartimos nuestros horarios de clases de natación de Lunes a Sábado. ¿Qué edad tiene el alumno?' },
  { label: 'Ubicación', text: 'Nos ubicamos en Av. La Cima #151, Zapopan. Puedes ver nuestra ubicación en Google Maps aquí: https://maps.app.goo.gl/natara' },
  { label: 'Horarios', text: 'Nuestros horarios de atención son de Lunes a Viernes de 7:00 AM a 9:00 PM y Sábados de 8:00 AM a 2:00 PM.' },
];

export function QuickActions({ contact, activeConversation }: QuickActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Contact Edit Form State
  const [name, setName] = useState(contact.name || '');
  const [email, setEmail] = useState(contact.email || '');
  const [status, setStatus] = useState(contact.status);
  const [editSuccess, setEditSuccess] = useState(false);

  // Handoff Form State
  const [handoffStatus, setHandoffStatus] = useState(activeConversation?.status || 'active');
  const [reason, setReason] = useState(activeConversation?.handoff_reason || '');
  const [handoffSuccess, setHandoffSuccess] = useState(false);

  // Save Contact Info
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setEditSuccess(false);

    try {
      await api.patch(`/contacts/${contact.id}`, {
        name: name.trim() || null,
        email: email.trim() || null,
        status,
      });
      setEditSuccess(true);
      router.refresh();
      setTimeout(() => setEditSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating contact:', err);
      alert('Error al guardar contacto');
    } finally {
      setLoading(false);
    }
  };

  // Update Handoff status
  const handleUpdateHandoff = async () => {
    if (!activeConversation) {
      alert('No hay una conversación activa para este contacto.');
      return;
    }

    setLoading(true);
    setHandoffSuccess(false);

    try {
      const supabase = createClient();
      const updates: any = {
        status: handoffStatus,
        handoff_reason: handoffStatus === 'handoff' ? reason.trim() || 'Atención manual solicitada' : null,
        handoff_at: handoffStatus === 'handoff' ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from('conversations')
        .update(updates)
        .eq('id', activeConversation.id);

      if (error) throw error;

      setHandoffSuccess(true);
      router.refresh();
      setTimeout(() => setHandoffSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating handoff:', err);
      alert('Error al actualizar handoff');
    } finally {
      setLoading(false);
    }
  };

  // Use templates (inserts text into send message form by searching input field)
  const handleUseTemplate = (text: string) => {
    const inputEl = document.querySelector('input[placeholder^="Responder a"]') as HTMLInputElement;
    if (inputEl) {
      inputEl.value = text;
      // Trigger React state change
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (setter) {
        setter.call(inputEl, text);
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
      inputEl.focus();
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Edit Contact Card */}
      <div className="glass-card rounded-[2rem] p-5">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <User size={15} className="text-naty-green" />
          Editar Contacto
        </h3>
        <form onSubmit={handleSaveContact} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del contacto"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-naty-green/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-naty-green/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-naty-green/50"
            >
              <option value="prospect" className="bg-[#131322] text-white">Prospecto</option>
              <option value="active" className="bg-[#131322] text-white">Activo</option>
              <option value="inactive" className="bg-[#131322] text-white">Inactivo</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white/5 hover:bg-naty-green/20 border border-white/10 hover:border-naty-green/30 py-2 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar Información'}
          </button>

          {editSuccess && (
            <p className="text-[11px] text-naty-green text-center font-medium animate-fadeIn">✓ Datos actualizados</p>
          )}
        </form>
      </div>

      {/* 2. Handoff Card */}
      {activeConversation && (
        <div className="glass-card rounded-[2rem] p-5">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <ShieldAlert size={15} className="text-naty-blue" />
            Atención Humana
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">Modo de Canal</label>
              <select
                value={handoffStatus}
                onChange={(e) => setHandoffStatus(e.target.value as any)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-naty-blue/50"
              >
                <option value="active" className="bg-[#131322] text-white">Bot Activo (Auto)</option>
                <option value="handoff" className="bg-[#131322] text-white">Humano Requerido (Handoff)</option>
                <option value="closed" className="bg-[#131322] text-white">Cerrado / Archivado</option>
              </select>
            </div>

            {handoffStatus === 'handoff' && (
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">Razón del Handoff</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: Quiere agendar clase prueba..."
                  rows={2}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-naty-blue/50"
                />
              </div>
            )}

            <button
              onClick={handleUpdateHandoff}
              disabled={loading}
              className="w-full rounded-xl bg-white/5 hover:bg-naty-blue/20 border border-white/10 hover:border-naty-blue/30 py-2 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Procesando...' : 'Aplicar Handoff'}
            </button>

            {handoffSuccess && (
              <p className="text-[11px] text-naty-blue text-center font-medium animate-fadeIn">✓ Estado de canal guardado</p>
            )}
          </div>
        </div>
      )}

      {/* 3. Message Templates */}
      <div className="glass-card rounded-[2rem] p-5">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <FileText size={15} className="text-naty-sky" />
          Plantillas Rápidas
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
          {TEMPLATES.map((tmpl, idx) => (
            <button
              key={idx}
              onClick={() => handleUseTemplate(tmpl.text)}
              className="w-full text-left rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/5 px-3.5 py-2.5 transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-naty-sky transition">{tmpl.label}</span>
                <Check size={11} className="text-gray-600 opacity-0 group-hover:opacity-100 transition" />
              </div>
              <p className="text-[10px] text-gray-500 truncate mt-1">{tmpl.text}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
