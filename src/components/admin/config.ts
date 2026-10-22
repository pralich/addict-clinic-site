import { fmtMsk, mskToday } from "@/lib/msk";
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
  api: "API",
  other: "Другое",
};

export const ROLES: Record<string, string> = {
  admin: "Администратор",
  manager: "Менеджер",
  doctor: "Врач",
  leads_only: "Только лиды (скрытые контакты)",
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
  return fmtMsk(v, withTime ? { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "2-digit", year: "numeric" });
};

export const CHANNELS: Record<string, { label: string; icon: string; paid?: boolean }> = {
  yandex_direct: { label: "Яндекс Директ", icon: "Megaphone", paid: true },
  google_ads: { label: "Google Ads", icon: "Megaphone", paid: true },
  vk_ads: { label: "VK Реклама", icon: "Megaphone", paid: true },
  ads_other: { label: "Другая реклама", icon: "Megaphone", paid: true },
  organic_yandex: { label: "Поиск Яндекса", icon: "Search" },
  organic_google: { label: "Поиск Google", icon: "Search" },
  organic_other: { label: "Другой поиск", icon: "Search" },
  ai: { label: "ИИ-ассистенты", icon: "Sparkles" },
  social: { label: "Соцсети и мессенджеры", icon: "MessagesSquare" },
  email: { label: "Рассылка", icon: "Mail" },
  referral: { label: "Переход с сайта", icon: "Link" },
  direct: { label: "Прямой заход", icon: "MousePointerClick" },
  api: { label: "Внешняя система", icon: "Webhook" },
  unknown: { label: "Не определён", icon: "CircleHelp" },
};

export const LEAD_FORMS: Record<string, string> = {
  contacts: "Форма «Контакты»",
  premium: "Форма PREMIUM",
  article_cta: "Форма в статье",
  lead: "Форма сайта",
};

export const REP_RELATIONS: Record<string, string> = {
  self: "Сам пациент",
  spouse: "Супруг(а)",
  parent: "Родитель",
  child: "Сын / дочь",
  sibling: "Брат / сестра",
  relative: "Другой родственник",
  friend: "Друг",
  colleague: "Коллега",
  employer: "Работодатель",
  guardian: "Опекун",
  other: "Другое",
};

export const COMMISSION_TYPES: Record<string, string> = {
  percent: "Процент от суммы сделки",
  fixed: "Фиксированная сумма",
};

export const PAYMENT_SCHEDULES: Record<string, string> = {
  once: "Разовый",
  weekly: "Еженедельно",
  biweekly: "Раз в 2 недели",
  monthly: "Ежемесячно",
};

export const PAY_SCHEDULE_HINT = "Платежи считаются от даты заезда: первый — в день заезда, далее по выбранной периодичности до даты выезда";

export const commissionAmount = (r: { amount?: any; commission_type?: string | null; commission_value?: any }) => {
  const v = Number(r.commission_value || 0);
  if (!r.commission_type || !v) return 0;
  return r.commission_type === "percent" ? Math.round((Number(r.amount || 0) * v) / 100) : v;
};

export const commissionText = (r: { amount?: any; commission_type?: string | null; commission_value?: any }) => {
  const sum = commissionAmount(r);
  if (!sum) return null;
  return r.commission_type === "percent" ? `${money(sum)} · ${String(Number(r.commission_value)).replace(".", ",")}%` : money(sum);
};

export const daysUntil = (iso?: string | null) => {
  if (!iso) return null;
  return Math.round((Date.parse(`${String(iso).slice(0, 10)}T00:00:00Z`) - Date.parse(`${mskToday()}T00:00:00Z`)) / 86400000);
};

export const dueTone = (days: number | null) => {
  if (days === null) return { cls: "bg-secondary text-muted-foreground", dot: "bg-neutral-400", label: "Не запланирован" };
  const word = (n: number) => {
    const m10 = n % 10, m100 = n % 100;
    return m10 === 1 && m100 !== 11 ? "день" : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? "дня" : "дней";
  };
  if (days < 0) return { cls: "bg-primary/10 text-primary", dot: "bg-primary", label: `Просрочен на ${-days} ${word(-days)}` };
  if (days === 0) return { cls: "bg-primary text-primary-foreground", dot: "bg-primary", label: "Сегодня" };
  if (days === 1) return { cls: "bg-amber-100 text-amber-900", dot: "bg-amber-500", label: "Завтра" };
  if (days <= 3) return { cls: "bg-amber-100 text-amber-900", dot: "bg-amber-500", label: `Через ${days} ${word(days)}` };
  if (days <= 7) return { cls: "bg-sky-100 text-sky-900", dot: "bg-sky-500", label: `Через ${days} ${word(days)}` };
  return { cls: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500", label: `Через ${days} ${word(days)}` };
};
