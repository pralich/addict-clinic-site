export const TZ = "Europe/Moscow";
const OFFSET = 3 * 60 * 60 * 1000;

export const parseServer = (v: string | number | Date): Date => {
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v);
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00+03:00`);
  const iso = s.replace(" ", "T");
  return new Date(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`);
};

export const parseMskLocal = (v: string): Date => {
  const s = String(v).trim().replace(" ", "T");
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) return new Date(s);
  return new Date(`${s.length === 16 ? `${s}:00` : s}+03:00`);
};

export const fmtMsk = (v: string | number | Date | null | undefined, opts: Intl.DateTimeFormatOptions = {}) =>
  v === null || v === undefined || v === "" ? "" : parseServer(v).toLocaleString("ru-RU", { ...opts, timeZone: TZ });

export const fmtMskDate = (v: string | number | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" }) =>
  v === null || v === undefined || v === "" ? "" : parseServer(v).toLocaleDateString("ru-RU", { ...opts, timeZone: TZ });

export const fmtMskTime = (v: string | number | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" }) =>
  v === null || v === undefined || v === "" ? "" : parseServer(v).toLocaleTimeString("ru-RU", { ...opts, timeZone: TZ });

const shifted = (v: string | number | Date = new Date()) => new Date(parseServer(v).getTime() + OFFSET);

export const mskParts = (v: string | number | Date = new Date()) => {
  const d = shifted(v);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate(), hours: d.getUTCHours(), minutes: d.getUTCMinutes(), weekday: d.getUTCDay() };
};

const pad = (n: number) => String(n).padStart(2, "0");

export const mskDayKey = (v: string | number | Date = new Date()) => shifted(v).toISOString().slice(0, 10);

export const mskToday = () => mskDayKey();

export const mskDateKey = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);

export const dayDiffMsk = (v: string | number | Date, from: string | number | Date = new Date()) =>
  Math.round((Date.parse(`${mskDayKey(v)}T00:00:00Z`) - Date.parse(`${mskDayKey(from)}T00:00:00Z`)) / 86400000);

export const toMskInput = (v: string | number | Date = new Date()) => {
  const p = mskParts(v);
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}T${pad(p.hours)}:${pad(p.minutes)}`;
};

export const fromMskInput = (s: string) => new Date(`${s.length === 16 ? `${s}:00` : s}+03:00`);

export const mskAt = (daysFromToday: number, hour = 10, minute = 0) => {
  const [y, m, d] = mskToday().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + daysFromToday, hour, minute) - OFFSET);
};