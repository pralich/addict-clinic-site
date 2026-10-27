import func2url from "../../backend/func2url.json";
import { getToken } from "./crm-api";

const URL = (func2url as Record<string, string>).articles;

export type Article = {
  id: number;
  slug: string;
  title: string;
  meta_title?: string | null;
  meta_description?: string | null;
  excerpt?: string | null;
  category: string;
  cover_url?: string | null;
  cover_alt?: string | null;
  content?: string;
  cta_type: string;
  status: string;
  author?: string | null;
  views: number;
  published_at?: string | null;
  updated_at?: string;
  created_at?: string;
};

export const CATEGORIES: Record<string, { label: string; icon: string }> = {
  rehab: { label: "Реабилитация", icon: "Sprout" },
  alcohol: { label: "Алкоголизм", icon: "Wine" },
  drugs: { label: "Наркомания", icon: "Syringe" },
  meds: { label: "Лекарственная зависимость", icon: "Pill" },
  gambling: { label: "Игромания", icon: "Dices" },
  codependency: { label: "Созависимость", icon: "HeartHandshake" },
  eating: { label: "Пищевое поведение", icon: "Utensils" },
  nicotine: { label: "Никотин", icon: "Cigarette" },
  internet: { label: "Интернет-зависимость", icon: "Smartphone" },
  mental: { label: "Депрессия и тревога", icon: "Brain" },
};

export const CTA_TYPES: Record<string, string> = {
  urgent: "Срочная помощь — вызов врача",
  consult: "Бесплатная консультация специалиста",
  rehab: "Подбор программы реабилитации",
  family: "Консультация для родственников",
  crisis: "Кризисная линия психолога 24/7",
  premium: "Программа PREMIUM",
};

export const ARTICLE_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Черновик", cls: "bg-neutral-200 text-neutral-700" },
  published: { label: "Опубликована", cls: "bg-emerald-100 text-emerald-800" },
  archived: { label: "В архиве", cls: "bg-primary/10 text-primary" },
};

export const readingTime = (text = "") => Math.max(2, Math.round(text.split(/\s+/).length / 180));

async function req<T>(params: Record<string, string | number | undefined>, method = "GET", body?: unknown, auth = false): Promise<T> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== "" && qs.set(k, String(v)));
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = auth ? getToken() : null;
  if (token) headers["X-Auth-Token"] = token;
  const res = await fetch(`${URL}?${qs}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Ошибка запроса");
  return data as T;
}

export const fetchArticles = (category?: string) => req<{ items: Article[] }>({ category });
export const fetchArticle = (slug: string) => req<{ item: Article; related: Article[] }>({ slug });
// Для загрузки страницы на сервере: без учёта просмотра (его считает запрос из браузера).
export const fetchArticleForRender = (slug: string) => req<{ item: Article; related: Article[] }>({ slug, prerender: 1 });

export const adminArticles = {
  list: (search?: string, status?: string) => req<{ items: Article[] }>({ action: "admin", search, status }, "GET", undefined, true),
  get: (id: number) => req<{ item: Article }>({ action: "admin", id }, "GET", undefined, true),
  create: (body: Partial<Article>) => req<{ item: Article }>({}, "POST", body, true),
  update: (id: number, body: Partial<Article>) => req<{ item: Article }>({ id }, "PUT", body, true),
  archive: (id: number) => req({ id }, "DELETE", undefined, true),
  upload: (file: string, contentType: string) => req<{ url: string }>({ action: "upload" }, "POST", { file, contentType }, true),
};