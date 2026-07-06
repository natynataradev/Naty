'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/badge';
import Link from 'next/link';
import { Upload, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, FileSpreadsheet, Eye } from 'lucide-react';

interface ParsedContact {
  phone: string;
  name: string | null;
  email: string | null;
  status: 'prospect' | 'active' | 'inactive';
  source: 'import';
  accepted_privacy: boolean;
}

export default function ImportContactsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'preview' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [fileName, setFileName] = useState('');
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [previewRows, setPreviewRows] = useState<ParsedContact[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Sanitizes phone numbers
  const sanitizePhone = (phoneRaw: string): string => {
    let phone = phoneRaw.replace(/[\s\-\(\)]/g, '');
    if (!phone.startsWith('+')) {
      if (phone.length === 10) {
        phone = `+52${phone}`; // Mexican default sandbox prefix
      } else if (phone.length === 12 && phone.startsWith('52')) {
        phone = `+${phone}`;
      }
    }
    return phone;
  };

  // Parses CSV contents
  const handleParseCSV = (text: string) => {
    try {
      const lines = text.split(/\r?\n/);
      if (lines.length === 0 || !lines[0].trim()) {
        throw new Error('El archivo CSV está vacío.');
      }

      // Detect headers and trim spaces/quotes
      const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

      const nameIdx = headers.findIndex((h) => h.includes('nombre') || h.includes('name'));
      const phoneIdx = headers.findIndex((h) => h.includes('telefono') || h.includes('teléfono') || h.includes('phone') || h.includes('celular'));
      const emailIdx = headers.findIndex((h) => h.includes('correo') || h.includes('email') || h.includes('mail'));
      const statusIdx = headers.findIndex((h) => h.includes('estado') || h.includes('status'));

      if (phoneIdx === -1) {
        throw new Error('No se encontró la columna de teléfono ("telefono", "phone" o "celular") en el archivo CSV.');
      }

      const contacts: ParsedContact[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split by comma, respecting quotes
        const cells: string[] = [];
        let insideQuotes = false;
        let currentCell = '';
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"' || char === "'") {
            insideQuotes = !insideQuotes;
          } else if (char === ',' && !insideQuotes) {
            cells.push(currentCell.trim().replace(/^["']|["']$/g, ''));
            currentCell = '';
          } else {
            currentCell += char;
          }
        }
        cells.push(currentCell.trim().replace(/^["']|["']$/g, ''));

        const phoneRaw = cells[phoneIdx];
        if (!phoneRaw) continue;

        const phone = sanitizePhone(phoneRaw);
        const name = nameIdx !== -1 && cells[nameIdx] ? cells[nameIdx] : null;
        const email = emailIdx !== -1 && cells[emailIdx] ? cells[emailIdx] : null;

        let statusVal: 'prospect' | 'active' | 'inactive' = 'prospect';
        if (statusIdx !== -1 && cells[statusIdx]) {
          const statusRaw = cells[statusIdx].toLowerCase();
          if (statusRaw.includes('activ') || statusRaw === 'active') statusVal = 'active';
          if (statusRaw.includes('inactiv') || statusRaw === 'inactive') statusVal = 'inactive';
        }

        contacts.push({
          phone,
          name,
          email,
          status: statusVal,
          source: 'import',
          accepted_privacy: false,
        });
      }

      if (contacts.length === 0) {
        throw new Error('No se encontraron registros de contactos válidos en el archivo CSV.');
      }

      setParsedContacts(contacts);
      setPreviewRows(contacts.slice(0, 5));
      setStatus('preview');
    } catch (err) {
      setStatus('error');
      setErrorMsg((err as Error).message);
    }
  };

  const handleFileReader = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      handleParseCSV(text);
    };
    reader.readAsText(file);
  };

  // Drag handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        handleFileReader(file);
      } else {
        setStatus('error');
        setErrorMsg('El archivo seleccionado debe tener extensión .csv');
      }
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileReader(e.target.files[0]);
    }
  };

  // Confirm and POST to backend
  const handleConfirmImport = async () => {
    setLoading(true);
    try {
      const result = await api.post<any[]>('/contacts/import', {
        contacts: parsedContacts,
      });

      setStatus('success');
      router.refresh();
    } catch (err) {
      setStatus('error');
      setErrorMsg((err as Error).message || 'Error al procesar la importación en la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  const resetUploader = () => {
    setStatus('idle');
    setFileName('');
    setParsedContacts([]);
    setPreviewRows([]);
    setErrorMsg('');
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl">
      <PageHeader
        title="Importar Base de Datos"
        description="Carga y registra masivamente tus contactos de natación mediante archivos CSV."
        breadcrumbs={[
          { label: 'Contactos', href: '/contacts' },
          { label: 'Importar' },
        ]}
      >
        <Link
          href="/contacts"
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft size={14} /> Volver a contactos
        </Link>
      </PageHeader>

      {/* 1. Drag & Drop Uploader (IDLE) */}
      {status === 'idle' && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[2.5rem] p-12 text-center transition-all ${
            dragActive
              ? 'border-naty-green bg-naty-green/5'
              : 'border-white/15 bg-white/[0.01] hover:border-white/30 hover:bg-white/[0.02]'
          }`}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-400 mb-5 shadow-inner">
            <Upload size={28} className={dragActive ? 'text-naty-green animate-bounce' : ''} />
          </div>

          <h3 className="text-base font-bold text-white mb-2">Importar base de datos (.csv)</h3>
          <p className="text-xs text-gray-500 max-w-md leading-relaxed mb-6">
            Arrastra tu archivo CSV aquí, o haz clic para seleccionarlo desde tu computadora. 
            El archivo debe incluir una columna con el encabezado <span className="font-mono text-gray-300">telefono</span> o <span className="font-mono text-gray-300">phone</span>.
          </p>

          <label className="cursor-pointer rounded-xl bg-naty-green hover:opacity-90 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition active:scale-95 shadow-md shadow-naty-green/20">
            Seleccionar archivo
            <input type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
          </label>
        </div>
      )}

      {/* 2. CSV Data Preview */}
      {status === 'preview' && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="glass-card rounded-[2rem] p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-l-4 border-l-naty-blue">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-naty-blue/10 text-naty-blue border border-naty-blue/20">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{fileName}</h4>
                <p className="text-xs text-gray-500 mt-0.5">Se detectaron {parsedContacts.length} contactos listos para importar.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={resetUploader}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                Cambiar archivo
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-naty-green px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-naty-green/20 hover:opacity-90 transition active:scale-95 disabled:opacity-50"
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : null}
                Confirmar Importación
              </button>
            </div>
          </div>

          {/* Preview Table */}
          <div className="glass-card rounded-[2.5rem] overflow-hidden">
            <div className="border-b border-white/5 px-6 py-4 flex items-center gap-2 bg-white/[0.01]">
              <Eye size={14} className="text-gray-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Previsualización (Primeras 5 filas)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-4">Nombre</th>
                    <th className="px-6 py-4">Teléfono</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {previewRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 font-semibold text-white">{row.name || <span className="text-gray-600 font-normal italic">Sin nombre</span>}</td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-300">{row.phone}</td>
                      <td className="px-6 py-4 text-gray-400">{row.email || <span className="text-gray-600">—</span>}</td>
                      <td className="px-6 py-4">
                        <Badge
                          label={row.status === 'active' ? 'Activo' : row.status === 'prospect' ? 'Prospecto' : 'Inactivo'}
                          variant={row.status === 'active' ? 'green' : row.status === 'prospect' ? 'blue' : 'gray'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Success State */}
      {status === 'success' && (
        <div className="glass-card rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-naty-green/10 text-naty-green border border-naty-green/20 mb-5 shadow-lg shadow-naty-green/10 animate-pulse">
            <CheckCircle2 size={32} />
          </div>

          <h3 className="text-lg font-bold text-white mb-2">¡Importación Completada!</h3>
          <p className="text-xs text-gray-400 max-w-md leading-relaxed mb-6">
            Los {parsedContacts.length} contactos del archivo se han insertado o actualizado exitosamente en la base de datos de la escuela.
          </p>

          <div className="flex items-center gap-3">
            <Link
              href="/contacts"
              className="rounded-xl bg-naty-green px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-naty-green/20 hover:opacity-90 transition active:scale-95"
            >
              Ver contactos
            </Link>
            <button
              onClick={resetUploader}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white hover:bg-white/10 transition"
            >
              Importar otro archivo
            </button>
          </div>
        </div>
      )}

      {/* 4. Error State */}
      {status === 'error' && (
        <div className="glass-card rounded-[2.5rem] p-8 border-l-4 border-l-red-500">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <AlertCircle size={20} />
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Error de Importación</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{errorMsg}</p>
              </div>
              <button
                onClick={resetUploader}
                className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-xs font-semibold text-white transition active:scale-95"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
