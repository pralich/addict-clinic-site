export type VisitPage = { path: string; title?: string; at: number; sec: number };
export type VisitEvent = { type: string; label: string; at: number };
export type VisitSearch = { q: string; at: number; path?: string };

export type Visit = {
  id: number;
  visitor_id: string;
  visit_no: number;
  started_at: string;
  last_seen: string;
  active_seconds: number;
  duration_sec: number;
  idle_sec: number;
  current_path: string | null;
  current_title: string | null;
  landing_url: string | null;
  referrer: string | null;
  channel: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  device: string | null;
  browser: string | null;
  pages: VisitPage[];
  events: VisitEvent[];
  searches: VisitSearch[];
  lead_id: number | null;
  lead_name: string | null;
  lead_contact: string | null;
  lead_status: string | null;
};

export const dur = (s: number) => {
  s = Math.max(0, Math.round(s || 0));
  if (s < 60) return `${s} сек`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} мин ${s % 60 ? `${s % 60} сек` : ""}`.trim();
  return `${Math.floor(m / 60)} ч ${m % 60} мин`;
};

export const utc = (s: string) => new Date(s.endsWith("Z") ? s : `${s}Z`);

export const clock = (v: string | number) =>
  (typeof v === "number" ? new Date(v) : utc(v)).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

export const cleanTitle = (t?: string | null) => (t || "").replace(/\s[—|-]\s[^—|-]*$/, "").trim();

export const host = (url?: string | null) => {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export const DEVICE_ICON: Record<string, string> = { mobile: "Smartphone", tablet: "Tablet", desktop: "Monitor" };

export const EVENT_ICON: Record<string, string> = { phone: "Phone", messenger: "MessageCircle", email: "Mail", form: "Send" };
