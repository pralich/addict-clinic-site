import func2url from "../../backend/func2url.json";
import { getToken } from "./crm-api";

const URL_ = (func2url as Record<string, string>)["crm-push"];
const SCOPE = "/admin";

export type CrmPushState = "unsupported" | "ios-install" | "denied" | "off" | "on";
export type CrmPushPrefs = { notify_leads: boolean; notify_orders: boolean };

const isIos = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const api = async (action: string, body?: unknown, query = "") => {
  const token = getToken();
  const res = await fetch(`${URL_}?action=${action}${query}`, {
    method: body !== undefined ? "POST" : "GET",
    headers: { "Content-Type": "application/json", ...(token ? { "X-Auth-Token": token } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Ошибка уведомлений");
  return data;
};

const toKey = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

const registration = async () => {
  const existing = await navigator.serviceWorker.getRegistration(SCOPE);
  if (existing && existing.scope.endsWith(SCOPE)) return existing;
  return navigator.serviceWorker.register("/admin-sw.js", { scope: SCOPE });
};

const currentSub = async () => {
  const reg = await navigator.serviceWorker.getRegistration(SCOPE);
  if (!reg || !reg.scope.endsWith(SCOPE)) return null;
  return reg.pushManager.getSubscription();
};

export const crmPushState = async (): Promise<{ state: CrmPushState; prefs: CrmPushPrefs }> => {
  const prefs = { notify_leads: true, notify_orders: true };
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) return { state: isIos() && !isStandalone() ? "ios-install" : "unsupported", prefs };
  if (Notification.permission === "denied") return { state: "denied", prefs };
  const sub = await currentSub();
  if (!sub || Notification.permission !== "granted") return { state: "off", prefs };
  const r = await api("status", undefined, `&endpoint=${encodeURIComponent(sub.endpoint)}`).catch(() => null);
  if (!r?.subscribed) return { state: "off", prefs };
  return { state: "on", prefs: { notify_leads: r.notify_leads, notify_orders: r.notify_orders } };
};

export const enableCrmPush = async () => {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Вы не разрешили уведомления в браузере");
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const { public_key } = await api("key");
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(public_key) });
  await api("subscribe", { subscription: sub.toJSON() });
  await api("test", { endpoint: sub.endpoint });
};

export const disableCrmPush = async () => {
  const sub = await currentSub();
  if (!sub) return;
  await api("unsubscribe", { endpoint: sub.endpoint }).catch(() => null);
  await sub.unsubscribe();
};

export const saveCrmPushPrefs = async (prefs: CrmPushPrefs) => {
  const sub = await currentSub();
  if (!sub) return;
  await api("settings", { ...prefs, endpoint: sub.endpoint });
};

export const sendCrmTest = async () => {
  const sub = await currentSub();
  if (sub) await api("test", { endpoint: sub.endpoint });
};
