import func2url from "../../backend/func2url.json";
import { getToken } from "./crm-api";

const URL = (func2url as Record<string, string>).seo;

export const SITEMAP_PUBLIC_URL = "https://addict.clinic/sitemap.xml";
export const SITEMAP_LIVE_URL = `${URL}?action=sitemap.xml`;

export type SitemapUrl = { loc: string; lastmod: string; changefreq: string; priority: string; title: string | null };
export type SitemapRun = { id: number; urls_count: number; articles_count: number; created_at: string; author?: string | null; file_url?: string };
export type SeoStatus = { last: SitemapRun | null; urls: SitemapUrl[]; pending_add: string[]; pending_remove: string[]; history: SitemapRun[] };
export type RegenerateResult = SitemapRun & { added: string[]; removed: string[]; xml: string };

async function req<T>(action: string, method = "GET"): Promise<T> {
  const res = await fetch(`${URL}?action=${action}`, { method, headers: { "Content-Type": "application/json", "X-Auth-Token": getToken() || "" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Ошибка запроса");
  return data as T;
}

export const seoApi = {
  status: () => req<SeoStatus>("status"),
  regenerate: () => req<RegenerateResult>("regenerate", "POST"),
};
