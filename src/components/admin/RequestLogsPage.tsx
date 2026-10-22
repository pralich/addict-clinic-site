import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api } from "@/lib/crm-api";
import { fmtMsk } from "@/lib/msk";

type Log = {
  id: number;
  source: "api" | "site" | "telephony" | "vidzhitum";
  direction: "in" | "out";
  method: string | null;
  action: string | null;
  status_code: number | null;
  duration_ms: number | null;
  ip: string | null;
  error: string | null;
  created_at: string;
  api_key_name: string | null;
  user_name: string | null;
  preview?: string | null;
  request?: string | null;
  response?: string | null;
};

type Stat = { total: number; errors: number; last_at: string | null };
type Resp = { items: Log[]; has_more: boolean; page: number; per: number; total: number; stats: Record<string, Stat> };

const sel = "h-9 rounded-full border-0 bg-secondary px-3.5 text-sm outline-none focus:ring-0";

const SOURCES: Record<string, { label: string; icon: string }> = {
  api: { label: "Внешний API", icon: "Webhook" },
  telephony: { label: "Телефония", icon: "PhoneCall" },
  site: { label: "Формы сайта", icon: "Globe" },
  vidzhitum: { label: "Виджитум", icon: "MessageSquareDot" },
};

const dt = (s: string | null, sec = true) =>
  s ? fmtMsk(s, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: sec ? "2-digit" : undefined }) : "—";

const isError = (l: Log) => !l.status_code || l.status_code >= 400 || !!l.error;

const StatusPill = ({ l }: { l: Log }) => {
  const code = l.status_code || 0;
  const cls = !code ? "bg-red-100 text-red-700" : code >= 500 ? "bg-red-100 text-red-700" : code >= 400 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800";
  return <span className={`inline-flex min-w-[42px] justify-center rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold ${cls}`}>{code || "ERR"}</span>;
};

const pretty = (v?: string | null) => {
  if (!v) return "—";
  try {
    return JSON.stringify(JSON.parse(v), null, 2);
  } catch {
    return v;
  }
};

const CodeBlock = ({ title, value }: { title: string; value?: string | null }) => {
  const text = pretty(value);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
        {value && (
          <button onClick={() => navigator.clipboard.writeText(text).then(() => toast.success("Скопировано"))} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <Icon name="Copy" size={12} />Копировать
          </button>
        )}
      </div>
      <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-all rounded-lg bg-ink p-3 font-mono text-xs leading-relaxed text-ink-foreground">{text}</pre>
    </div>
  );
};

const LogDetails = ({ id, onClose }: { id: number; onClose: () => void }) => {
  const { data } = useQuery<{ item: Log }>({ queryKey: ["crm", "request_logs", id], queryFn: () => api({ resource: "request_logs", id }) });
  const l = data?.item;
  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Запрос #{id}</p>
          <SheetTitle className="font-mono text-lg">{l ? `${l.action || l.method}` : "Загрузка…"}</SheetTitle>
        </SheetHeader>
        {!l ? (
          <div className="flex justify-center py-10"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            <dl className="grid grid-cols-[130px_1fr] gap-x-4 gap-y-2 rounded-xl border bg-card p-4 text-sm">
              <dt className="text-muted-foreground">Время</dt><dd>{dt(l.created_at)}</dd>
              <dt className="text-muted-foreground">Источник</dt><dd>{SOURCES[l.source]?.label || l.source} · {l.direction === "out" ? "исходящий из CRM" : "входящий в CRM"}</dd>
              <dt className="text-muted-foreground">Ответ</dt><dd className="flex items-center gap-2"><StatusPill l={l} />{l.duration_ms !== null && <span className="text-muted-foreground">{l.duration_ms} мс</span>}</dd>
              {l.api_key_name && <><dt className="text-muted-foreground">API-ключ</dt><dd>{l.api_key_name}</dd></>}
              {l.user_name && <><dt className="text-muted-foreground">Сотрудник</dt><dd>{l.user_name}</dd></>}
              {l.ip && <><dt className="text-muted-foreground">IP</dt><dd className="font-mono">{l.ip}</dd></>}
            </dl>
            {l.error && <p className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800"><Icon name="CircleAlert" size={16} className="mt-0.5 shrink-0" />{l.error}</p>}
            <CodeBlock title="Запрос" value={l.request} />
            <CodeBlock title="Ответ" value={l.response} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

const RequestLogsPage = () => {
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [direction, setDirection] = useState("all");
  const [period, setPeriod] = useState("all");
  const [per, setPer] = useState(50);
  const [openId, setOpenId] = useState<number | null>(null);

  const params = { resource: "request_logs", source: source === "all" ? undefined : source, status: status === "all" ? undefined : status, q, page, per, direction: direction === "all" ? undefined : direction, period: period === "all" ? undefined : period };

  const { data, isLoading, refetch, isFetching } = useQuery<Resp>({ queryKey: ["crm", "request_logs", params], queryFn: () => api(params), refetchInterval: 15000 });

  const reset = (fn: () => void) => { fn(); setPage(1); };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Журнал запросов</h1>
          <p className="text-sm text-muted-foreground">Обращения к CRM из внешних систем и телефонии. Записи хранятся 3 дня</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-sm hover:bg-secondary/70">
          <Icon name="RefreshCw" size={14} className={isFetching ? "animate-spin" : ""} />Обновить
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(SOURCES).map(([k, s]) => {
          const st = data?.stats?.[k];
          return (
            <button key={k} onClick={() => reset(() => setSource(source === k ? "all" : k))}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${source === k ? "border-primary bg-primary/5" : "bg-card hover:border-foreground/20"}`}>
              <Icon name={s.icon} size={20} className="text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{s.label} · за сутки</p>
                <p className="font-heading text-xl font-semibold">
                  {st?.total ?? 0}
                  {Number(st?.errors) > 0 && <span className="ml-2 text-sm font-medium text-red-600">{st!.errors} ошиб.</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{st?.last_at ? `последний ${dt(st.last_at, false)}` : "запросов не было"}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full bg-secondary p-1">
          {[["all", "Все"], ["ok", "Успешные"], ["error", "С ошибкой"]].map(([k, l]) => (
            <button key={k} onClick={() => reset(() => setStatus(k))} className={`rounded-full px-3.5 py-1.5 text-sm ${status === k ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
        <select value={source} onChange={(e) => reset(() => setSource(e.target.value))} className={sel}>
          <option value="all">Все источники</option>
          {Object.entries(SOURCES).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
        <select value={direction} onChange={(e) => reset(() => setDirection(e.target.value))} className={sel}>
          <option value="all">Любое направление</option>
          <option value="in">Входящие в CRM</option>
          <option value="out">Исходящие из CRM</option>
        </select>
        <select value={period} onChange={(e) => reset(() => setPeriod(e.target.value))} className={sel}>
          <option value="all">За 3 дня</option>
          <option value="24h">За сутки</option>
          <option value="6h">За 6 часов</option>
          <option value="1h">За час</option>
        </select>
        <div className="relative w-full sm:w-72">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => reset(() => setQ(e.target.value))} placeholder="Номер, действие, IP…" className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 flex justify-center"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>
      ) : !data?.items.length ? (
        <p className="mt-16 text-center text-muted-foreground">Запросов пока нет</p>
      ) : (
        <div className="mt-4 divide-y overflow-hidden rounded-xl border bg-card">
          {data.items.map((l) => (
            <button key={l.id} onClick={() => setOpenId(l.id)} className={`flex w-full flex-col gap-1.5 p-3 text-left transition-colors hover:bg-secondary/50 md:flex-row md:items-center md:gap-3 ${isError(l) ? "bg-red-50/40" : ""}`}>
              <div className="flex items-center gap-3 md:w-[300px] md:shrink-0">
                <StatusPill l={l} />
                <Icon name={SOURCES[l.source]?.icon || "Circle"} size={15} className="shrink-0 text-muted-foreground" />
                {l.direction === "out" && <Icon name="ArrowUpRight" size={14} className="-ml-2 shrink-0 text-sky-600" />}
                <span className="truncate font-mono text-sm">{l.action || l.method}</span>
              </div>
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {l.error ? <span className="text-red-700">{l.error}</span> : l.api_key_name ? `Ключ: ${l.api_key_name}` : l.user_name ? `Сотрудник: ${l.user_name}` : l.preview}
              </span>
              <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                {l.duration_ms !== null && <span>{l.duration_ms} мс</span>}
                <span className="tabular-nums">{dt(l.created_at)}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {data && data.total > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Показывать по
            <select value={per} onChange={(e) => reset(() => setPer(Number(e.target.value)))} className={sel}>
              {[20, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span>· всего {data.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-full bg-secondary px-4 py-1.5 text-sm disabled:opacity-40">Назад</button>
            <span className="px-2 py-1.5 text-sm text-muted-foreground">Стр. {page} из {Math.max(1, Math.ceil(data.total / per))}</span>
            <button disabled={!data.has_more} onClick={() => setPage(page + 1)} className="rounded-full bg-secondary px-4 py-1.5 text-sm disabled:opacity-40">Дальше</button>
          </div>
        </div>
      )}

      {openId && <LogDetails id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
};

export default RequestLogsPage;
