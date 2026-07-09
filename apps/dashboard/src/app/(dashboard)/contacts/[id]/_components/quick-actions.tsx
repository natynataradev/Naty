'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { User, Trash2, CreditCard, CalendarCheck } from 'lucide-react';
import type { Contact } from '@naty/shared';

interface QuickActionsProps {
  contact: Contact;
}

export function QuickActions({ contact }: QuickActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [name, setName] = useState(contact.name || '');
  const [email, setEmail] = useState(contact.email || '');
  const [address, setAddress] = useState(contact.address || '');
  const [memberCode, setMemberCode] = useState(contact.member_code || '');
  const [status, setStatus] = useState(contact.status);
  const [editSuccess, setEditSuccess] = useState(false);

  const [registeringPayment, setRegisteringPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [registeringAttendance, setRegisteringAttendance] = useState(false);
  const [attendanceSuccess, setAttendanceSuccess] = useState(false);

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setEditSuccess(false);
    try {
      await api.patch(`/contacts/${contact.id}`, {
        name: name.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        member_code: memberCode.trim() || null,
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

  const handleRegisterPayment = async () => {
    setRegisteringPayment(true);
    setPaymentSuccess(false);
    try {
      await api.post('/payments', { contact_id: contact.id });
      setPaymentSuccess(true);
      router.refresh();
      setTimeout(() => setPaymentSuccess(false), 4000);
    } catch (err) {
      console.error('Error registrando pago:', err);
      alert('Error al registrar pago');
    } finally {
      setRegisteringPayment(false);
    }
  };

  const handleRegisterAttendance = async () => {
    setRegisteringAttendance(true);
    setAttendanceSuccess(false);
    try {
      await api.post('/attendances', { contact_id: contact.id });
      setAttendanceSuccess(true);
      router.refresh();
      setTimeout(() => setAttendanceSuccess(false), 4000);
    } catch (err) {
      console.error('Error registrando asistencia:', err);
      alert('Error al registrar asistencia');
    } finally {
      setRegisteringAttendance(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/contacts/${contact.id}`);
      window.location.href = '/contacts';
    } catch (err) {
      console.error('Error deleting contact:', err);
      alert('Error al eliminar contacto');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const inputClass = 'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-naty-green/50';
  const labelClass = 'block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1';

  return (
    <div className="space-y-6">
      {/* Editar Contacto */}
      <div className="glass-card rounded-[2rem] p-5">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <User size={15} className="text-naty-green" />
          Editar Contacto
        </h3>
        <form onSubmit={handleSaveContact} className="space-y-3">
          <div>
            <label className={labelClass}>Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del contacto"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Código Natara{' '}
              <span className="normal-case font-normal text-gray-600">(6 dígitos)</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={memberCode}
              onChange={(e) => setMemberCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className={`${inputClass} font-mono text-naty-green placeholder-gray-700 tracking-widest text-sm`}
            />
          </div>

          <div>
            <label className={labelClass}>Domicilio</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Av. Vallarta 1234, Col. Americana"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className={`${inputClass} !bg-[#131322]`}
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

      {/* Membresía */}
      <div className="glass-card rounded-[2rem] p-5">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <CreditCard size={15} className="text-naty-green" />
          Membresía
        </h3>

        <div className="space-y-2">
          <button
            onClick={handleRegisterPayment}
            disabled={registeringPayment}
            className="w-full rounded-xl bg-white/5 hover:bg-naty-green/15 border border-white/10 hover:border-naty-green/30 py-2 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CreditCard size={13} className="text-naty-green" />
            {registeringPayment ? 'Registrando...' : 'Registrar pago del mes'}
          </button>

          <button
            onClick={handleRegisterAttendance}
            disabled={registeringAttendance}
            className="w-full rounded-xl bg-white/5 hover:bg-naty-blue/15 border border-white/10 hover:border-naty-blue/30 py-2 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CalendarCheck size={13} className="text-naty-blue" />
            {registeringAttendance ? 'Registrando...' : 'Registrar asistencia'}
          </button>

          {paymentSuccess && (
            <p className="text-[11px] text-naty-green text-center font-medium animate-fadeIn">✓ Pago del mes registrado</p>
          )}
          {attendanceSuccess && (
            <p className="text-[11px] text-naty-blue text-center font-medium animate-fadeIn">✓ Asistencia registrada</p>
          )}
        </div>
      </div>

      {/* Eliminar Contacto */}
      <div className="glass-card rounded-[2rem] p-5">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-red-400 flex items-center gap-2">
          <Trash2 size={15} className="text-red-400" />
          Zona de Peligro
        </h3>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-full rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 py-2 text-xs font-semibold text-red-400 transition active:scale-95"
          >
            Eliminar Contacto
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-gray-400 text-center">
              ¿Eliminar a <span className="text-white font-semibold">{contact.name || contact.phone}</span>? Esta acción no se puede deshacer.
            </p>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 py-2 text-xs font-semibold text-red-400 transition active:scale-95 disabled:opacity-50"
            >
              {deleting ? 'Eliminando...' : 'Sí, eliminar'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="w-full rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 py-2 text-xs font-semibold text-gray-400 transition"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
