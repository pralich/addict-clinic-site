import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import func2url from "../../backend/func2url.json";
import { getToken } from "./crm-api";

const URL = (func2url as Record<string, string>).telephony;
const INTERVAL = 5 * 60 * 1000;
const LAST_KEY = "calls_autosync_at";
const LOCK_KEY = "calls_autosync_lock";
const EVENT = "calls-autosync";

export const CALLS_AUTOSYNC_MIN = INTERVAL / 60000;

export const getLastAutoSync = () => Number(localStorage.getItem(LAST_KEY)) || 0;

export const markSynced = () => {
  localStorage.setItem(LAST_KEY, String(Date.now()));
  window.dispatchEvent(new Event(EVENT));
};

export async function syncCalls(period = "today") {
  let added = 0, leads = 0, pending = 0, received = 0;
  for (let i = 0; i < 6; i++) {
    const res = await fetch(`${URL}?cmd=sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Auth-Token": getToken() || "" },
      body: JSON.stringify({ period }),
    });
    const r = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(r.error || "Не удалось загрузить историю");
    added += r.added || 0;
    leads += r.leads_created || 0;
    pending += r.leads_pending || 0;
    received = r.received || 0;
    if (!r.partial) break;
  }
  markSynced();
  return { added, leads, pending, received };
}

export function useCallsAutoSync(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled || !URL) return;
    let busy = false;
    const tick = async () => {
      if (busy || document.visibilityState !== "visible") return;
      if (Date.now() - getLastAutoSync() < INTERVAL - 5000) return;
      if (Date.now() - (Number(localStorage.getItem(LOCK_KEY)) || 0) < 60000) return;
      localStorage.setItem(LOCK_KEY, String(Date.now()));
      busy = true;
      try {
        const r = await syncCalls("today");
        if (r.added || r.leads) {
          qc.invalidateQueries({ queryKey: ["crm", "calls"] });
          qc.invalidateQueries({ queryKey: ["crm", "dashboard"] });
          qc.invalidateQueries({ queryKey: ["crm", "counters"] });
        }
      } catch {
        /* повтор через 5 минут */
        localStorage.setItem(LAST_KEY, String(Date.now()));
      } finally {
        busy = false;
        localStorage.removeItem(LOCK_KEY);
      }
    };
    const first = setTimeout(tick, 5000);
    const timer = setInterval(tick, 30000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearTimeout(first); clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, [enabled, qc]);
}

export function useLastAutoSync() {
  const [at, setAt] = useState(getLastAutoSync);
  useEffect(() => {
    const upd = () => setAt(getLastAutoSync());
    window.addEventListener(EVENT, upd);
    window.addEventListener("storage", upd);
    return () => { window.removeEventListener(EVENT, upd); window.removeEventListener("storage", upd); };
  }, []);
  return at;
}
