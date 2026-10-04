const KEY = "cookie_consent_v1";
const METRIKA_ID = 101026698;

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

const loadMetrika = () => {
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
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://mc.yandex.ru/metrika/tag.js";
  document.head.appendChild(s);
  w.ym(METRIKA_ID, "init", { trustedDomains: ["poehali.dev"], clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true, trackHash: true });
};

const clearMetrikaCookies = () => {
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0].trim();
    if (/^_ym|^yandexuid|^yabs|^ymex/.test(name)) {
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
  if (getCookieChoice()?.analytics) loadMetrika();
};

export const saveCookieChoice = (analytics: boolean) => {
  const prev = getCookieChoice();
  localStorage.setItem(KEY, JSON.stringify({ analytics, at: Date.now() }));
  if (analytics) loadMetrika();
  else {
    clearMetrikaCookies();
    if (prev?.analytics) location.reload();
  }
  window.dispatchEvent(new Event("cookie-consent-changed"));
};

export const openCookieSettings = () => window.dispatchEvent(new Event("cookie-settings-open"));
