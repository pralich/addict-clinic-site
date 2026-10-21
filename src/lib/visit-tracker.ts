import func2url from "../../backend/func2url.json";

const URL = `${(func2url as Record<string, string>)["crm-api"]}?resource=track`;
const VISITOR_KEY = "visitor_id_v1";
const SESSION_KEY = "visit_session_v1";
const SESSION_IDLE = 30 * 60 * 1000;
const HEARTBEAT = 20000;

type Page = { path: string; title: string; at: number; sec: number };
type Ev = { type: string; label: string; at: number };
type Search = { q: string; at: number; path: string };
type Session = { id: string; touched: number; active: number; pages: Page[]; events: Ev[]; searches: Search[] };

const rid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

export const getVisitorId = () => {
  try {
    let v = localStorage.getItem(VISITOR_KEY);
    if (!v) {
      v = rid();
      localStorage.setItem(VISITOR_KEY, v);
    }
    return v;
  } catch {
    return undefined;
  }
};

let state: Session | null = null;
let started = false;
let lastTick = Date.now();

const now = () => Date.now();
const fullPath = () => decodeURIComponent(location.pathname + location.search).slice(0, 300);

const loadSession = (): Session => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const s = raw ? (JSON.parse(raw) as Session) : null;
    if (s && now() - s.touched < SESSION_IDLE) return s;
  } catch {
    /* empty */
  }
  return { id: rid(), touched: now(), active: 0, pages: [], events: [], searches: [] };
};

const save = () => {
  if (!state) return;
  state.touched = now();
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    /* empty */
  }
};

const tick = () => {
  if (!state) return;
  const t = now();
  if (document.visibilityState === "visible") {
    const d = Math.min(t - lastTick, HEARTBEAT + 5000);
    state.active += d / 1000;
    const p = state.pages[state.pages.length - 1];
    if (p) p.sec = Math.round(p.sec + d / 1000);
  }
  lastTick = t;
};

const payload = (final = false) => {
  const s = state!;
  const p = new URLSearchParams(location.search);
  let attr: Record<string, unknown> = {};
  try {
    const a = JSON.parse(localStorage.getItem("lead_attr_v1") || "null");
    const src = a?.last?.utm_source || a?.last?.referrer ? a.last : a?.first;
    if (src) attr = { landing_url: src.landing_url, referrer: src.referrer, utm_source: src.utm_source, utm_medium: src.utm_medium, utm_campaign: src.utm_campaign, utm_term: src.utm_term, click_id: src.click_id };
  } catch {
    /* empty */
  }
  if (!attr.landing_url) attr.landing_url = location.href.slice(0, 500);
  if (p.get("utm_term")) attr.utm_term = p.get("utm_term");
  return JSON.stringify({
    session: s.id,
    visitor: getVisitorId(),
    path: fullPath(),
    title: document.title,
    active_seconds: Math.round(s.active),
    pages: s.pages.slice(-60),
    events: s.events.slice(-40),
    searches: s.searches.slice(-30),
    final,
    attribution: { ...attr, device: window.matchMedia("(max-width: 767px)").matches ? "mobile" : window.matchMedia("(max-width: 1199px)").matches ? "tablet" : "desktop" },
  });
};

const send = (final = false) => {
  if (!state) return;
  tick();
  save();
  const body = payload(final);
  if (final && navigator.sendBeacon) {
    navigator.sendBeacon(URL, new Blob([body], { type: "text/plain" }));
    return;
  }
  fetch(URL, { method: "POST", body, headers: { "Content-Type": "text/plain" }, keepalive: true }).catch(() => null);
};

const onRoute = () => {
  if (!state || location.pathname.startsWith("/admin")) return;
  const path = fullPath();
  const last = state.pages[state.pages.length - 1];
  if (last && last.path === path) return;
  tick();
  state.pages.push({ path, title: document.title.slice(0, 200), at: now(), sec: 0 });
  const q = new URLSearchParams(location.search).get("q");
  if (q) addSearch(q);
  save();
  setTimeout(() => {
    const p = state?.pages[state.pages.length - 1];
    if (p && p.path === path) p.title = document.title.slice(0, 200);
    send();
  }, 1200);
};

const addSearch = (raw: string) => {
  const q = raw.trim().slice(0, 150);
  if (!state || q.length < 2) return;
  const last = state.searches[state.searches.length - 1];
  if (last && (q.startsWith(last.q) || last.q.startsWith(q)) && now() - last.at < 60000) {
    last.q = q;
    last.at = now();
  } else state.searches.push({ q, at: now(), path: fullPath() });
  save();
};

const addEvent = (type: string, label: string) => {
  if (!state) return;
  state.events.push({ type, label: label.trim().slice(0, 150), at: now() });
  save();
  send();
};

const isSearchInput = (el: EventTarget | null): el is HTMLInputElement =>
  el instanceof HTMLInputElement && (el.type === "search" || /поиск|search|найти/i.test(`${el.placeholder} ${el.name} ${el.getAttribute("aria-label") || ""}`));

let searchTimer: number | undefined;

const bind = () => {
  const { pushState, replaceState } = history;
  history.pushState = function (...args) {
    const r = pushState.apply(this, args);
    setTimeout(onRoute, 0);
    return r;
  };
  history.replaceState = function (...args) {
    const r = replaceState.apply(this, args);
    setTimeout(onRoute, 0);
    return r;
  };
  window.addEventListener("popstate", () => setTimeout(onRoute, 0));

  document.addEventListener("input", (e) => {
    if (!isSearchInput(e.target)) return;
    const v = e.target.value;
    clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => addSearch(v), 1500);
  }, true);

  document.addEventListener("click", (e) => {
    const a = (e.target as HTMLElement)?.closest?.("a");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (href.startsWith("tel:")) addEvent("phone", `Нажал на телефон ${href.slice(4)}`);
    else if (/wa\.me|whatsapp/i.test(href)) addEvent("messenger", "Открыл WhatsApp");
    else if (/t\.me|telegram/i.test(href)) addEvent("messenger", "Открыл Telegram");
    else if (/max\.ru/i.test(href)) addEvent("messenger", "Открыл MAX");
    else if (href.startsWith("mailto:")) addEvent("email", `Нажал на email ${href.slice(7)}`);
  }, true);

  document.addEventListener("submit", (e) => {
    const f = e.target as HTMLFormElement;
    const btn = f.querySelector("button[type=submit], button:not([type])");
    addEvent("form", `Отправил форму${btn?.textContent ? ` «${btn.textContent.trim().slice(0, 60)}»` : ""}`);
  }, true);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") send(true);
    else {
      lastTick = now();
      if (state && now() - state.touched > SESSION_IDLE) {
        state = loadSession();
        onRoute();
      }
    }
  });
  window.addEventListener("pagehide", () => send(true));
};

export const startVisitTracker = () => {
  if (started || location.pathname.startsWith("/admin")) return;
  if (/bot|crawl|spider|headless|lighthouse/i.test(navigator.userAgent)) return;
  started = true;
  state = loadSession();
  lastTick = now();
  bind();
  onRoute();
  window.setInterval(() => {
    if (state && document.visibilityState === "visible" && !location.pathname.startsWith("/admin")) send();
  }, HEARTBEAT);
};

export const initVisitTracker = () => {
  startVisitTracker();
};