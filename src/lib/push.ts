import func2url from "../../backend/func2url.json";
import { getFamilyToken } from "./family-api";

const URL_ = (func2url as Record<string, string>)["family-push"];

export type PushState = "unsupported" | "ios-install" | "denied" | "off" | "on";

const isIos = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const api = async (action: string, body?: unknown) => {
  const token = getFamilyToken();
  const res = await fetch(`${URL_}?action=${action}`, {
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
  const existing = await navigator.serviceWorker.getRegistration();
  return existing ?? navigator.serviceWorker.register("/sw.js");
};

export const pushState = async (): Promise<PushState> => {
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) return isIos() && !isStandalone() ? "ios-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
};

export const enablePush = async () => {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Вы не разрешили уведомления в браузере");
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const { public_key } = await api("key");
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(public_key) });
  await api("subscribe", { subscription: sub.toJSON() });
  await api("test", {});
};

export const disablePush = async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await api("unsubscribe", { endpoint: sub.endpoint }).catch(() => null);
  await sub.unsubscribe();
};

export const pushTick = () => fetch(`${URL_}?action=tick`).catch(() => null);
