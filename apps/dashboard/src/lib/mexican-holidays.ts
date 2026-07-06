export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  mandatory: boolean; // true = descanso obligatorio (LFT Art. 74)
}

// Algoritmo de Meeus/Jones/Butcher para Domingo de Pascua
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

// n-ésimo lunes del mes (month: 0-based)
function nthMonday(year: number, month: number, n: number): Date {
  const first = new Date(year, month, 1);
  const dow = first.getDay(); // 0=dom
  const daysToFirstMonday = dow === 1 ? 0 : (8 - dow) % 7;
  return new Date(year, month, 1 + daysToFirstMonday + (n - 1) * 7);
}

// n-ésimo domingo del mes
function nthSunday(year: number, month: number, n: number): Date {
  const first = new Date(year, month, 1);
  const dow = first.getDay();
  const daysToFirstSunday = dow === 0 ? 0 : 7 - dow;
  return new Date(year, month, 1 + daysToFirstSunday + (n - 1) * 7);
}

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getMexicanHolidays(year: number): Holiday[] {
  const easter = easterSunday(year);

  const holidays: Holiday[] = [
    // ── Descansos obligatorios (LFT Art. 74) ──────────────────────────────
    { date: `${year}-01-01`, name: 'Año Nuevo',                          mandatory: true },
    { date: fmt(nthMonday(year, 1, 1)),  name: 'Día de la Constitución', mandatory: true },
    { date: fmt(nthMonday(year, 2, 3)),  name: 'Natalicio de Benito Juárez', mandatory: true },
    { date: fmt(addDays(easter, -3)),    name: 'Jueves Santo',           mandatory: true },
    { date: fmt(addDays(easter, -2)),    name: 'Viernes Santo',          mandatory: true },
    { date: `${year}-05-01`, name: 'Día del Trabajo',                    mandatory: true },
    { date: `${year}-09-16`, name: 'Día de la Independencia',            mandatory: true },
    { date: fmt(nthMonday(year, 10, 3)), name: 'Día de la Revolución',   mandatory: true },
    { date: `${year}-12-25`, name: 'Navidad',                            mandatory: true },

    // ── Días festivos y conmemorativos ─────────────────────────────────────
    { date: `${year}-01-06`, name: 'Día de Reyes',                       mandatory: false },
    { date: `${year}-02-02`, name: 'Día de la Candelaria',               mandatory: false },
    { date: `${year}-02-14`, name: 'Día del Amor y la Amistad',          mandatory: false },
    { date: `${year}-02-24`, name: 'Día de la Bandera',                  mandatory: false },
    { date: `${year}-03-08`, name: 'Día Internacional de la Mujer',      mandatory: false },
    { date: fmt(addDays(easter, -7)),    name: 'Domingo de Ramos',       mandatory: false },
    { date: fmt(easter),                 name: 'Domingo de Pascua',      mandatory: false },
    { date: `${year}-04-30`, name: 'Día del Niño',                       mandatory: false },
    { date: `${year}-05-10`, name: 'Día de las Madres',                  mandatory: false },
    { date: `${year}-05-15`, name: 'Día del Maestro',                    mandatory: false },
    { date: `${year}-06-01`, name: 'Día de la Marina',                   mandatory: false },
    { date: fmt(nthSunday(year, 5, 3)),  name: 'Día del Padre',          mandatory: false },
    { date: `${year}-09-15`, name: 'Grito de Independencia',             mandatory: false },
    { date: `${year}-10-12`, name: 'Día de la Hispanidad',               mandatory: false },
    { date: `${year}-10-31`, name: 'Halloween',                          mandatory: false },
    { date: `${year}-11-01`, name: 'Día de Todos Santos',                mandatory: false },
    { date: `${year}-11-02`, name: 'Día de Muertos',                     mandatory: false },
    { date: `${year}-11-20`, name: 'Día de la Revolución (fecha histórica)', mandatory: false },
    { date: `${year}-12-12`, name: 'Día de la Virgen de Guadalupe',      mandatory: false },
    { date: `${year}-12-24`, name: 'Nochebuena',                         mandatory: false },
    { date: `${year}-12-28`, name: 'Día de los Santos Inocentes',        mandatory: false },
    { date: `${year}-12-31`, name: 'Nochevieja',                         mandatory: false },
  ];

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}
