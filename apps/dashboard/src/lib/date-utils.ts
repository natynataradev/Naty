/**
 * Safe date formatting utilities that prevent rendering crashes
 * when database timestamps are invalid, null, or undefined.
 */

export function safeLocaleDateString(
  dateInput: any,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  },
  fallback = 'Sin fecha'
): string {
  if (!dateInput) return fallback;
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString('es-MX', options);
  } catch (err) {
    console.error('Error formatting date:', err);
    return fallback;
  }
}

export function safeLocaleTimeString(
  dateInput: any,
  options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  },
  fallback = '--:--'
): string {
  if (!dateInput) return fallback;
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleTimeString('es-MX', options);
  } catch (err) {
    console.error('Error formatting time:', err);
    return fallback;
  }
}

export function safeLocaleString(
  dateInput: any,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
  fallback = 'Fecha no válida'
): string {
  if (!dateInput) return fallback;
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleString('es-MX', options);
  } catch (err) {
    console.error('Error formatting datetime:', err);
    return fallback;
  }
}
