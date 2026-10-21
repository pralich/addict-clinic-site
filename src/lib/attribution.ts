import { getVisitorId } from "./visit-tracker";
const KEY = "lead_attr_v1";
const TTL = 90 * 24 * 60 * 60 * 1000;
const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
const CLICK_IDS = ["yclid", "gclid", "vkclid", "fbclid", "ysclid"];

type Touch = Partial<Record<(typeof UTM)[number], string>> & {
  click_id?: string;
  referrer?: string;
  landing_url?: string;
  at: number;
};

type Stored = { first: Touch; last: Touch };

const read = (): Stored | null => {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as Stored) : null;
    return v && Date.now() - v.first.at < TTL ? v : null;
  } catch {
    return null;
  }
};

const isOwn = (url: string) => {
  try {
    const h = new URL(url).hostname;
    return h === location.hostname || h.endsWith("addict.clinic") || h.endsWith("poehali.dev");
  } catch {
    return true;
  }
};

const isMeaningful = (t: Touch) => !!(t.utm_source || t.utm_medium || t.click_id || t.referrer);

export const captureAttribution = () => {
  if (location.pathname.startsWith("/admin")) return;
  const p = new URLSearchParams(location.search);
  const touch: Touch = { at: Date.now(), landing_url: location.href.slice(0, 500) };
  UTM.forEach((k) => {
    const v = p.get(k);
    if (v) touch[k] = v.slice(0, 250);
  });
  const click = CLICK_IDS.find((k) => p.get(k) && k !== "ysclid");
  if (click) touch.click_id = `${click}=${p.get(click)}`.slice(0, 250);
  if (document.referrer && !isOwn(document.referrer)) touch.referrer = document.referrer.slice(0, 500);

  const prev = read();
  if (!prev) {
    localStorage.setItem(KEY, JSON.stringify({ first: touch, last: touch }));
    return;
  }
  if (isMeaningful(touch)) localStorage.setItem(KEY, JSON.stringify({ first: prev.first, last: touch }));
};

const ymClientId = (): string | undefined => {
  const m = document.cookie.match(/(?:^|;\s*)_ym_uid=(\d+)/);
  return m?.[1];
};

export const getAttribution = (form: string) => {
  const s = read();
  const src = s ? (isMeaningful(s.last) ? s.last : s.first) : null;
  return {
    form,
    page_url: location.href.slice(0, 500),
    page_title: document.title.slice(0, 300),
    landing_url: src?.landing_url,
    referrer: src?.referrer,
    utm_source: src?.utm_source,
    utm_medium: src?.utm_medium,
    utm_campaign: src?.utm_campaign,
    utm_content: src?.utm_content,
    utm_term: src?.utm_term,
    click_id: src?.click_id,
    ym_client_id: ymClientId(),
    visitor_id: getVisitorId(),
    device: window.matchMedia("(max-width: 767px)").matches ? "mobile" : window.matchMedia("(max-width: 1199px)").matches ? "tablet" : "desktop",
    first_visit_at: s ? new Date(s.first.at).toISOString() : undefined,
  };
};
