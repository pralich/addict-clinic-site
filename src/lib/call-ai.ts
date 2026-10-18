import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import func2url from "../../backend/func2url.json";
import { getToken } from "./crm-api";

const AI_URL = (func2url as Record<string, string>)["call-ai"];

export function useCallAiQueue(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled || !AI_URL) return;
    let busy = false;
    const tick = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const res = await fetch(`${AI_URL}?action=queue`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Auth-Token": getToken() || "" },
          body: "{}",
        });
        const r = await res.json().catch(() => ({}));
        if (r.processed) qc.invalidateQueries({ queryKey: ["crm", "calls"] });
      } catch {
        /* следующая попытка через минуту */
      } finally {
        busy = false;
      }
    };
    const first = setTimeout(tick, 15000);
    const timer = setInterval(tick, 60000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [enabled, qc]);
}
