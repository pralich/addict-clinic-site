import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import func2url from "../../../backend/func2url.json";
import { getToken } from "@/lib/crm-api";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Icon from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/crm-api";
import CallAiSheet from "./CallAiSheet";

const SYNC_PERIODS = { today: "Сегодня", yesterday: "Вчера", this_week: "Эту неделю", this_month: "Этот месяц" } as const;
type SyncPeriod = keyof typeof SYNC_PERIODS;

type Call = {
  id: number;
  direction: "in" | "out";
  status: string;
  phone: string;
  pbx_user: string | null;
  ext: string | null;
  group_name: string | null;
  telnum: string | null;
  started_at: string;
  duration: number;
  wait: number | null;
  record_url: string | null;
  lead_id: number | null;
  client_id: number | null;
  lead_created: boolean;
  lead_name: string | null;
  client_name: string | null;
  has_transcript?: boolean;
  has_summary?: boolean;
  ai_applied_at?: string | null;
  ai_status?: string | null;
  ai_fields_count?: number;
};

type Resp = { items: Call[]; has_more: boolean; page: number; stats: { today: number; today_in: number; today_missed: number; week_leads: number } };

const FILTERS = [
  ["all", "Все"],
  ["in", "Входящие"],
  ["out", "Исходящие"],
  ["missed", "Пропущенные"],
  ["new_leads", "Новые лиды"],
  ["with_record", "С записью"],
  ["ai_pending", "Ждут одобрения"],
] as const;

const STATUS: Record<string, string> = {
  success: "Состоялся",
  missed: "Пропущен",
  busy: "Занято",
  notavailable: "Недоступен",
  notallowed: "Запрещён",
  notfound: "Не найден",
  cancel: "Отменён",
  noanswer: "Нет ответа",
};

const dur = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const dt = (s: string) => new Date(s.endsWith("Z") ? s : `${s}Z`).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const CallsPage = ({ onOpen }: { onOpen: (resource: string, id: number) => void }) => {
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [aiCall, setAiCall] = useState<Call | null>(null);

  const params = {
    resource: "calls",
    page,
    q,
    direction: filter === "in" || filter === "out" ? filter : undefined,
    missed: filter === "missed" ? 1 : undefined,
    new_leads: filter === "new_leads" ? 1 : undefined,
    with_record: filter === "with_record" ? 1 : undefined,
    ai_pending: filter === "ai_pending" ? 1 : undefined,
  };
  const { data, isLoading } = useQuery<Resp>({
    queryKey: ["crm", "calls", params],
    queryFn: () => api(params),
    refetchInterval: 30000,
  });

  const pick = (f: string) => { setFilter(f); setPage(1); };

  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [period, setPeriod] = useState<SyncPeriod>("today");
  const sync = async (p: SyncPeriod = period) => {
    setPeriod(p);
    setSyncing(true);
    try {
      let added = 0, leads = 0, received = 0;
      for (let i = 0; i < 6; i++) {
        const res = await fetch(`${(func2url as Record<string, string>).telephony}?cmd=sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Auth-Token": getToken() || "" },
          body: JSON.stringify({ period: p }),
        });
        const r = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(r.error || "Не удалось загрузить историю");
        added += r.added || 0;
        leads += r.leads_created || 0;
        received = r.received || 0;
        if (!r.partial) break;
      }
      const label = SYNC_PERIODS[p].toLowerCase();
      toast.success(added ? `За ${label}: загружено новых звонков ${added}${leads ? `, новых лидов ${leads}` : ""}` : `За ${label} новых звонков нет (в АТС: ${received})`);
      qc.invalidateQueries({ queryKey: ["crm", "calls"] });
      qc.invalidateQueries({ queryKey: ["crm", "dashboard"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Журнал звонков</h1>
          <p className="text-sm text-muted-foreground">Входящие и исходящие звонки из Виртуальной АТС МегаФон</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <div className="flex h-10 overflow-hidden rounded-md bg-primary text-primary-foreground">
          <button onClick={() => sync()} disabled={syncing} className="flex items-center gap-1.5 px-4 text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
            <Icon name="RefreshCw" size={15} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Загружаю…" : <>Обновить<span className="font-normal opacity-80">· {SYNC_PERIODS[period].toLowerCase()}</span></>}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button disabled={syncing} aria-label="Выбрать период" className="flex items-center border-l border-primary-foreground/20 px-2.5 hover:bg-primary/90 disabled:opacity-60">
                <Icon name="ChevronDown" size={15} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Загрузить звонки из АТС за</DropdownMenuLabel>
              {(Object.keys(SYNC_PERIODS) as SyncPeriod[]).map((k) => (
                <DropdownMenuItem key={k} onClick={() => sync(k)} className="justify-between gap-6">
                  {SYNC_PERIODS[k]}
                  {k === period && <Icon name="Check" size={14} />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="relative w-full sm:w-64">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Поиск по номеру" className="pl-9" />
        </div>
        </div>
      </div>

      {data?.stats && (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: "Phone", l: "Звонков за сутки", v: data.stats.today },
            { icon: "PhoneIncoming", l: "Входящих за сутки", v: data.stats.today_in },
            { icon: "PhoneMissed", l: "Пропущено за сутки", v: data.stats.today_missed },
            { icon: "UserPlus", l: "Новых лидов за неделю", v: data.stats.week_leads },
          ].map((s) => (
            <div key={s.l} className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <Icon name={s.icon} size={20} className="text-primary" />
              <div><p className="text-xs text-muted-foreground">{s.l}</p><p className="font-heading text-xl font-semibold">{s.v}</p></div>
            </div>
          ))}
        </div>
      )}

      <div className="-mx-4 mt-6 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:inline-flex sm:flex-wrap sm:rounded-full sm:bg-secondary sm:p-1 sm:px-1">
        {FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => pick(k)} className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm max-sm:border ${filter === k ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-6 flex justify-center"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>
      ) : !data?.items.length ? (
        <p className="mt-16 text-center text-muted-foreground">Звонков пока нет</p>
      ) : (
        <div className="mt-4 divide-y rounded-xl border bg-card">
          {data.items.map((c) => {
            const missed = c.status === "missed";
            const name = c.client_name || c.lead_name;
            return (
              <div key={c.id} className="flex min-w-0 flex-col gap-3 p-4 md:flex-row md:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3 md:items-center">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${missed ? "bg-red-100 text-red-700" : c.direction === "in" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"}`}>
                    <Icon name={missed ? "PhoneMissed" : c.direction === "in" ? "PhoneIncoming" : "PhoneOutgoing"} size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2 md:hidden">
                      <a href={`tel:${c.phone}`} className="shrink-0 whitespace-nowrap font-medium">{c.phone || "Скрытый номер"}</a>
                      <span className="ml-auto shrink-0 whitespace-nowrap text-xs text-muted-foreground">{dt(c.started_at)}</span>
                    </div>
                    {(name || c.lead_created) && (
                      <div className="mt-0.5 flex min-w-0 items-center gap-2 md:hidden">
                        {name && <span className="min-w-0 truncate text-sm">{name}</span>}
                        {c.lead_created && <span className="shrink-0 whitespace-nowrap rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Новый лид</span>}
                      </div>
                    )}
                    <p className="mt-0.5 truncate text-xs text-muted-foreground md:hidden">
                      {STATUS[c.status] || c.status}{c.duration > 0 && ` · ${dur(c.duration)}`}{c.pbx_user && ` · ${c.pbx_user}`}{c.group_name && ` · ${c.group_name}`}
                    </p>
                    <div className="hidden flex-wrap items-center gap-2 md:flex">
                      <a href={`tel:${c.phone}`} className="font-medium hover:underline">{c.phone || "Скрытый номер"}</a>
                      {name && <span className="truncate text-sm text-muted-foreground">· {name}</span>}
                      {c.lead_created && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Новый лид</span>}
                    </div>
                    <p className="mt-0.5 hidden text-xs text-muted-foreground md:block">
                      {dt(c.started_at)} · {c.direction === "in" ? "Входящий" : "Исходящий"} · {STATUS[c.status] || c.status}
                      {c.duration > 0 && ` · ${dur(c.duration)}`}
                      {c.pbx_user && ` · ${c.pbx_user}`}
                      {c.group_name && ` · ${c.group_name}`}
                    </p>
                  </div>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2 [&_button]:whitespace-nowrap md:justify-end">
                  {c.record_url && <audio controls preload="none" src={c.record_url} className="h-9 w-full md:w-64 md:max-w-xs" />}
                  {c.record_url && c.duration > 0 && (
                    <button onClick={() => setAiCall(c)} title="Расшифровка и резюме звонка"
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${c.has_summary && !c.ai_applied_at && c.ai_fields_count ? "bg-primary text-primary-foreground hover:bg-primary/90" : c.has_summary ? "bg-violet-100 text-violet-800 hover:bg-violet-200" : "bg-secondary hover:bg-secondary/70"}`}>
                      <Icon name={c.ai_applied_at ? "CircleCheck" : c.ai_status === "processing" ? "Loader2" : "Sparkles"} size={14} className={c.ai_status === "processing" && !c.has_summary ? "animate-spin" : ""} />
                      {c.has_summary ? (c.ai_applied_at ? "Резюме" : c.ai_fields_count ? `Одобрить поля · ${c.ai_fields_count}` : "Резюме") : c.ai_status === "processing" ? "Разбираю…" : "ИИ-разбор"}
                    </button>
                  )}
                  {c.client_id ? (
                    <button onClick={() => onOpen("clients", c.client_id!)} className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/70"><Icon name="User" size={14} />Клиент</button>
                  ) : c.lead_id ? (
                    <button onClick={() => onOpen("leads", c.lead_id!)} className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/70"><Icon name="Inbox" size={14} />Лид</button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data && (page > 1 || data.has_more) && (
        <div className="mt-4 flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-full bg-secondary px-4 py-1.5 text-sm disabled:opacity-40">Назад</button>
          <span className="px-2 py-1.5 text-sm text-muted-foreground">Стр. {page}</span>
          <button disabled={!data.has_more} onClick={() => setPage(page + 1)} className="rounded-full bg-secondary px-4 py-1.5 text-sm disabled:opacity-40">Дальше</button>
        </div>
      )}

      {aiCall && (
        <CallAiSheet callId={aiCall.id} title={`${aiCall.phone || "Скрытый номер"} · ${dt(aiCall.started_at)}`} onClose={() => setAiCall(null)}
          onOpenLead={(id) => { setAiCall(null); onOpen("leads", id); }} />
      )}
    </div>
  );
};

export default CallsPage;
