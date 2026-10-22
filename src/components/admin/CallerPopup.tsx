import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import { CLIENT_STATUS, DEAL_STAGES, LEAD_STATUS, money } from "./config";
import { dayDiffMsk, fmtMskDate, parseServer } from "@/lib/msk";

type LiveCall = {
  callid: string;
  direction: "in" | "out";
  state: "ringing" | "talking";
  phone: string;
  pbx_user: string | null;
  diversion: string | null;
  lead_id: number | null;
  client_id: number | null;
  started_at: string;
  client_name: string | null;
  client_status: string | null;
  client_notes: string | null;
  lead_name: string | null;
  lead_status: string | null;
  lead_topic: string | null;
  manager_name: string | null;
  prev_calls: number;
  last_call_at: string | null;
  deal: { id: number; title: string; stage: string; amount: number | null } | null;
  last_note: { text: string; kind: string; created_at: string; user_name: string | null } | null;
};

const ago = (s: string | null) => {
  if (!s) return "";
  const days = -dayDiffMsk(s);
  if (days <= 0) return "сегодня";
  if (days === 1) return "вчера";
  return fmtMskDate(s, { day: "numeric", month: "short" });
};

const Timer = ({ from }: { from: string }) => {
  const [, tick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, []);
  const s = Math.max(0, Math.floor((Date.now() - parseServer(from).getTime()) / 1000));
  return <span className="tabular-nums">{Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}</span>;
};

const Card = ({ c, onOpen, onClose }: { c: LiveCall; onOpen: (r: string, id: number) => void; onClose: () => void }) => {
  const known = !!(c.client_id || c.lead_id);
  const name = c.client_name || c.lead_name;
  const status = c.client_id ? CLIENT_STATUS[c.client_status || ""] : c.lead_id ? LEAD_STATUS[c.lead_status || ""] : null;
  const stage = c.deal ? DEAL_STAGES[c.deal.stage] : null;
  const ringing = c.state === "ringing";

  return (
    <div className="pointer-events-auto w-full overflow-hidden rounded-2xl border bg-card shadow-2xl animate-in slide-in-from-right-8 fade-in duration-300">
      <div className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium ${ringing ? "bg-emerald-600 text-white" : "bg-ink text-ink-foreground"}`}>
        <Icon name={c.direction === "in" ? "PhoneIncoming" : "PhoneOutgoing"} size={16} className={ringing ? "animate-pulse" : ""} />
        <span className="flex-1">{ringing ? (c.direction === "in" ? "Входящий звонок" : "Исходящий вызов") : "Идёт разговор"}</span>
        <Timer from={c.started_at} />
        <button onClick={onClose} aria-label="Скрыть" className="ml-1 opacity-80 hover:opacity-100"><Icon name="X" size={16} /></button>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${known ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
            <Icon name={c.client_id ? "UserCheck" : c.lead_id ? "User" : "UserPlus"} size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-lg font-semibold leading-tight">{name || (known ? "Без имени" : "Новый номер")}</p>
            <p className="font-mono text-sm text-muted-foreground">{c.phone || "Скрытый номер"}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{c.client_id ? "Клиент" : c.lead_id ? "Лид" : "Нет в CRM"}</span>
              {status && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.cls}`}>{status.label}</span>}
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-1.5 text-sm">
          {c.lead_topic && !c.client_id && <p className="flex gap-2"><Icon name="MessageSquare" size={15} className="mt-0.5 shrink-0 text-muted-foreground" />{c.lead_topic}</p>}
          {c.deal && (
            <p className="flex gap-2">
              <Icon name="Handshake" size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="font-medium">{c.deal.title}</span>
                {stage && <span className="text-muted-foreground"> · {stage.label}</span>}
                {c.deal.amount ? <span className="text-muted-foreground"> · {money(c.deal.amount)}</span> : null}
              </span>
            </p>
          )}
          {c.manager_name && <p className="flex gap-2"><Icon name="UserCog" size={15} className="mt-0.5 shrink-0 text-muted-foreground" />Менеджер: {c.manager_name}</p>}
          {c.prev_calls > 0 && <p className="flex gap-2"><Icon name="History" size={15} className="mt-0.5 shrink-0 text-muted-foreground" />Звонил {c.prev_calls} раз, последний — {ago(c.last_call_at)}</p>}
          {c.pbx_user && <p className="flex gap-2 text-muted-foreground"><Icon name="Headphones" size={15} className="mt-0.5 shrink-0" />{c.pbx_user}</p>}
          {c.last_note && (
            <div className="rounded-lg bg-secondary/60 p-2.5 text-xs">
              <p className="mb-0.5 text-muted-foreground">{c.last_note.user_name || "Комментарий"} · {ago(c.last_note.created_at)}</p>
              <p className="line-clamp-3">{c.last_note.text}</p>
            </div>
          )}
          {!known && <p className="rounded-lg bg-secondary/60 p-2.5 text-xs text-muted-foreground">Номера нет в базе — после звонка автоматически появится новый лид</p>}
        </div>

        {known && (
          <button
            onClick={() => (c.client_id ? onOpen("clients", c.client_id) : onOpen("leads", c.lead_id!))}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Icon name="ExternalLink" size={16} />Открыть карточку
          </button>
        )}
      </div>
    </div>
  );
};

const CallerPopup = ({ onOpen }: { onOpen: (resource: string, id: number) => void }) => {
  const [hidden, setHidden] = useState<string[]>([]);
  const seen = useRef<Set<string>>(new Set());
  const { data } = useQuery<{ items: LiveCall[] }>({
    queryKey: ["crm-live-calls"],
    queryFn: () => api({ resource: "live_calls" }),
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const items = (data?.items || []).filter((c) => !hidden.includes(c.callid));

  useEffect(() => {
    items.forEach((c) => {
      if (seen.current.has(c.callid)) return;
      seen.current.add(c.callid);
      if (c.direction === "in" && c.state === "ringing" && document.hidden && "Notification" in window && Notification.permission === "granted") {
        new Notification(`Звонит ${c.client_name || c.lead_name || c.phone}`, { body: c.client_id ? "Клиент" : c.lead_id ? "Лид" : "Новый номер", tag: `call-${c.callid}` });
      }
    });
  }, [items]);

  if (!items.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:right-6 lg:bottom-6">
      {items.slice(0, 3).map((c) => (
        <Card
          key={c.callid}
          c={c}
          onOpen={(r, id) => { onOpen(r, id); setHidden((h) => [...h, c.callid]); }}
          onClose={() => setHidden((h) => [...h, c.callid])}
        />
      ))}
    </div>
  );
};

export default CallerPopup;
