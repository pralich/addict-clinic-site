import { useState } from "react";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import { fmtDate } from "./config";

export type EntityCall = {
  id: number;
  direction: "in" | "out";
  status: string;
  phone: string | null;
  pbx_user: string | null;
  started_at: string | null;
  duration: number;
  record_url: string | null;
  transcript: string | null;
  ai_summary: string | null;
  ai_callback: string | null;
  ai_status: string | null;
};

const dur = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const CallItem = ({ c }: { c: EntityCall }) => {
  const [showText, setShowText] = useState(false);
  const missed = c.status === "missed";
  const icon = missed ? "PhoneMissed" : c.direction === "in" ? "PhoneIncoming" : "PhoneOutgoing";
  const tone = missed ? "bg-red-500/10 text-red-600" : c.direction === "in" ? "bg-emerald-500/10 text-emerald-600" : "bg-sky-500/10 text-sky-600";
  const label = missed ? "Пропущенный" : c.direction === "in" ? "Входящий" : "Исходящий";
  const waiting = !c.ai_summary && c.duration > 0 && c.record_url && c.ai_status !== "error";

  return (
    <div className="rounded-xl border bg-background p-3">
      <div className="flex items-center gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon name={icon} size={15} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{label}{c.duration > 0 && <span className="font-normal text-muted-foreground"> · {dur(c.duration)}</span>}</p>
          <p className="truncate text-xs text-muted-foreground">{fmtDate(c.started_at, true)}{c.pbx_user ? ` · ${c.pbx_user}` : ""}</p>
        </div>
      </div>
      {missed && <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-700">Клиент не дозвонился — перезвоните как можно скорее.</p>}
      {c.record_url && <audio controls preload="none" src={c.record_url} className="mt-3 h-9 w-full" />}
      {c.ai_summary && (
        <div className="mt-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"><Icon name="Sparkles" size={12} />Резюме</p>
          <p className="whitespace-pre-line text-sm leading-relaxed">{c.ai_summary}</p>
        </div>
      )}
      {c.ai_callback && (
        <div className="mt-3 rounded-lg bg-primary/5 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary"><Icon name="Lightbulb" size={12} />Рекомендация</p>
          <p className="whitespace-pre-line text-sm leading-relaxed">{c.ai_callback}</p>
        </div>
      )}
      {waiting && <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Icon name="Loader2" size={12} className="animate-spin" />ИИ готовит расшифровку и резюме</p>}
      {c.transcript && (
        <div className="mt-3">
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => setShowText((v) => !v)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              <Icon name={showText ? "ChevronUp" : "ChevronDown"} size={13} />{showText ? "Скрыть расшифровку" : "Расшифровка разговора"}
            </button>
            {showText && (
              <button onClick={() => navigator.clipboard.writeText(c.transcript!).then(() => toast.success("Скопировано"))} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <Icon name="Copy" size={12} />Копировать
              </button>
            )}
          </div>
          {showText && <p className="mt-2 max-h-80 overflow-y-auto whitespace-pre-line rounded-lg bg-secondary/50 p-3 text-sm leading-relaxed">{c.transcript}</p>}
        </div>
      )}
    </div>
  );
};

const EntityCalls = ({ calls }: { calls: EntityCall[] }) => {
  if (!calls.length) return null;
  const missed = calls.filter((c) => c.status === "missed").length;
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Звонки по обращению · {calls.length}
        {missed > 0 && <span className="rounded-full bg-red-500/10 px-2 py-0.5 normal-case tracking-normal text-red-600">пропущено {missed}</span>}
      </p>
      <div className="flex flex-col gap-2">
        {calls.map((c) => <CallItem key={c.id} c={c} />)}
      </div>
    </div>
  );
};

export default EntityCalls;
