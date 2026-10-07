import func2url from "../../backend/func2url.json";

const KEY = "cookie_consent_v1";
const COUNTERS_URL = `${(func2url as Record<string, string>).seo}?action=counters`;
const FALLBACK: Counters = { yandex_metrika: "101026698" };

type Counters = Partial<Record<"yandex_metrika" | "google_analytics" | "vk_pixel" | "top_mail_ru" | "yandex_verification" | "google_verification", string>>;

export type CookieChoice = { analytics: boolean; at: number };

type YmWindow = Window & { ym?: ((...args: unknown[]) => void) & { a?: unknown[]; l?: number }; __ymLoaded?: boolean };

export const getCookieChoice = (): CookieChoice | null => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CookieChoice) : null;
  } catch {
    return null;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyWindow = Window & Record<string, any>;

let countersPromise: Promise<Counters> | null = null;
const fetchCounters = () =>
  (countersPromise ??= fetch(COUNTERS_URL)
    .then((r) => (r.ok ? r.json() : FALLBACK))
    .catch(() => FALLBACK));

const addScript = (src: string) => {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
};

const addMeta = (name: string, content?: string) => {
  if (!content || document.querySelector(`meta[name="${name}"]`)) return;
  const m = document.createElement("meta");
  m.name = name;
  m.content = content;
  document.head.appendChild(m);
};

const loadMetrika = (id: string) => {
  const w = window as YmWindow;
  if (w.__ymLoaded) return;
  w.__ymLoaded = true;
  w.ym =
    w.ym ||
    Object.assign(
      (...args: unknown[]) => {
        (w.ym!.a = w.ym!.a || []).push(args);
      },
      { l: Date.now() },
    );
  addScript("https://mc.yandex.ru/metrika/tag.js");
  w.ym(Number(id), "init", { trustedDomains: ["poehali.dev"], clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true, trackHash: true });
};

const loadGoogle = (id: string) => {
  const w = window as AnyWindow;
  if (w.__gaLoaded) return;
  w.__gaLoaded = true;
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer.push(arguments);
  };
  addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
  w.gtag("js", new Date());
  w.gtag("config", id);
};

const loadVk = (id: string) => {
  const w = window as AnyWindow;
  if (w.__vkLoaded) return;
  w.__vkLoaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://vk.com/js/api/openapi.js?169";
  s.onload = () => {
    w.VK?.Retargeting?.Init(id);
    w.VK?.Retargeting?.Hit();
  };
  document.head.appendChild(s);
};

const loadTopMail = (id: string) => {
  const w = window as AnyWindow;
  if (w.__tmrLoaded) return;
  w.__tmrLoaded = true;
  w._tmr = w._tmr || [];
  w._tmr.push({ id, type: "pageView", start: Date.now() });
  const s = document.createElement("script");
  s.async = true;
  s.id = "topmailru-code";
  s.src = "https://top-fwz1.mail.ru/js/code.js";
  document.head.appendChild(s);
};

const loadAnalytics = async () => {
  const c = await fetchCounters();
  if (c.yandex_metrika) loadMetrika(c.yandex_metrika);
  if (c.google_analytics) loadGoogle(c.google_analytics);
  if (c.vk_pixel) loadVk(c.vk_pixel);
  if (c.top_mail_ru) loadTopMail(c.top_mail_ru);
};

const clearMetrikaCookies = () => {
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0].trim();
    if (/^_ym|^yandexuid|^yabs|^ymex|^_ga|^_gid|^tmr_|^remixretarget/.test(name)) {
      const host = location.hostname;
      [host, `.${host}`, host.split(".").slice(-2).join(".")].forEach((d) => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${d}`;
      });
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  });
};

export const applyCookieChoice = () => {
  if (location.pathname.startsWith("/admin")) return;
  fetchCounters().then((c) => {
    addMeta("yandex-verification", c.yandex_verification);
    addMeta("google-site-verification", c.google_verification);
  });
  if (getCookieChoice()?.analytics) loadAnalytics();
};

export const saveCookieChoice = (analytics: boolean) => {
  const prev = getCookieChoice();
  localStorage.setItem(KEY, JSON.stringify({ analytics, at: Date.now() }));
  if (analytics) loadAnalytics();
  else {
    clearMetrikaCookies();
    if (prev?.analytics) location.reload();
  }
  window.dispatchEvent(new Event("cookie-consent-changed"));
};

export const openCookieSettings = () => window.dispatchEvent(new Event("cookie-settings-open"));
