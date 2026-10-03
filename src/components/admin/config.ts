export type Status = { label: string; cls: string };
export type StatusMap = Record<string, Status>;

export const LEAD_STATUS: StatusMap = {
  new: { label: "Новый", cls: "bg-primary/10 text-primary" },
  in_work: { label: "В работе", cls: "bg-amber-100 text-amber-800" },
  qualified: { label: "Квалифицирован", cls: "bg-sky-100 text-sky-800" },
  converted: { label: "Конвертирован", cls: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Отказ", cls: "bg-neutral-200 text-neutral-600" },
};

export const DEAL_STAGES: StatusMap = {
  new: { label: "Новая", cls: "bg-neutral-200 text-neutral-700" },
  consult: { label: "Консультация", cls: "bg-sky-100 text-sky-800" },
  diagnostics: { label: "Диагностика", cls: "bg-indigo-100 text-indigo-800" },
  offer: { label: "Программа согласована", cls: "bg-amber-100 text-amber-800" },
  treatment: { label: "Лечение", cls: "bg-violet-100 text-violet-800" },
  won: { label: "Успешно", cls: "bg-emerald-100 text-emerald-800" },
  lost: { label: "Отказ", cls: "bg-primary/10 text-primary" },
};

export const CLIENT_STATUS: StatusMap = {
  active: { label: "Активный", cls: "bg-emerald-100 text-emerald-800" },
  treatment: { label: "На лечении", cls: "bg-violet-100 text-violet-800" },
  rehab: { label: "Реабилитация", cls: "bg-sky-100 text-sky-800" },
  finished: { label: "Завершил курс", cls: "bg-neutral-200 text-neutral-700" },
  inactive: { label: "Неактивен", cls: "bg-neutral-200 text-neutral-500" },
};

export const PARTNER_STATUS: StatusMap = {
  active: { label: "Активен", cls: "bg-emerald-100 text-emerald-800" },
  paused: { label: "На паузе", cls: "bg-amber-100 text-amber-800" },
  ended: { label: "Завершён", cls: "bg-neutral-200 text-neutral-600" },
};

export const PARTNER_TYPES: Record<string, string> = {
  agent: "Агент",
  clinic: "Клиника",
  doctor: "Частный врач",
  insurance: "Страховая",
  company: "Компания",
  media: "Реклама / медиа",
};

export const SOURCES: Record<string, string> = {
  site: "Сайт",
  phone: "Звонок",
  partner: "Партнёр",
  referral: "Рекомендация",
  ads: "Реклама",
  other: "Другое",
};

export const ROLES: Record<string, string> = {
  admin: "Администратор",
  manager: "Менеджер",
  doctor: "Врач",
};

export const ACTIVITY_KINDS: Record<string, { label: string; icon: string }> = {
  note: { label: "Заметка", icon: "StickyNote" },
  call: { label: "Звонок", icon: "Phone" },
  meeting: { label: "Встреча", icon: "Users" },
  task: { label: "Задача", icon: "CheckSquare" },
  system: { label: "Система", icon: "History" },
};

export const ENTITY_LABEL: Record<string, string> = {
  clients: "Клиент",
  partners: "Партнёр",
  leads: "Лид",
  deals: "Сделка",
};

export const toOptions = (m: Record<string, string | Status>) =>
  Object.entries(m).map(([value, v]) => ({ value, label: typeof v === "string" ? v : v.label }));

export const money = (v: number | string | null | undefined) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(Number(v || 0));

export const fmtDate = (v?: string | null, withTime = false) => {
  if (!v) return "—";
  const d = new Date(v);
  return d.toLocaleString("ru-RU", withTime ? { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "2-digit", year: "numeric" });
};
