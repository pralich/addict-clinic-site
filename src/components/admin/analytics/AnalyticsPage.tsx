import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import { CHANNELS } from "../config";
import VisitCard from "./VisitCard";
import VisitorSheet from "./VisitorSheet";
import { dur, type Visit } from "./types";

type Resp = {
  items: Visit[];
  stats: { online: number; visits_today: number; visitors_today: number; with_lead_today: number; avg_seconds_today: number };
  top_pages: { path: string; title: string | null; c: number }[];
  top_searches: { q: string; c: number }[];
};

const PERIODS: [string, string][] = [["online", "Сейчас на сайте"], ["1h", "За час"], ["24h", "За сутки"], ["7d", "За неделю"]];

const AnalyticsPage = ({ onOpen }: { onOpen: (resource: string, id: number) => void }) => {
  const [period, setPeriod] = useState("online");
  const [visitor, setVisitor] = useState<string | null>(null);
  const [onlyLeads, setOnlyLeads] = useState(false);
  const { data, isLoading, isFetching, refetch } = useQuery<Resp>({
    queryKey: ["crm", "analytics", period],
    queryFn: () => api({ resource: "analytics", period }),
    refetchInterval: period === "online" ? 10000 : 60000,
    refetchIntervalInBackground: false,
  });
  const st = data?.stats;
  const items = (data?.items || []).filter((v) => !onlyLeads || v.lead_id);

  const cards: [string, string, string | number][] = [
    ["Radio", "Сейчас на сайте", st?.online ?? "—"],
    ["Users", "Посетителей сегодня", st?.visitors_today ?? "—"],
    ["Clock", "Среднее время сегодня", st ? dur(st.avg_seconds_today) : "—"],
    ["UserCheck", "Оставили контакт", st?.with_lead_today ?? "—"],
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Аналитика</h1>
          <p className="text-sm text-muted-foreground">Посетители сайта в реальном времени: откуда пришли, что смотрят и что ищут</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1.5 text-sm hover:bg-secondary/70">
          <Icon name="RefreshCw" size={14} className={isFetching ? "animate-spin" : ""} />Обновить
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([icon, label, v], i) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {i === 0 ? <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" /></span> : <Icon name={icon} size={14} />}
              {label}
            </div>
            <p className="mt-1.5 font-heading text-2xl font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1 rounded-full bg-secondary p-1">
              {PERIODS.map(([k, l]) => (
                <button key={k} onClick={() => setPeriod(k)} className={`rounded-full px-3.5 py-1.5 text-sm ${period === k ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>{l}</button>
              ))}
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={onlyLeads} onChange={(e) => setOnlyLeads(e.target.checked)} className="accent-primary" />
              Только с контактом
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {isLoading && <div className="flex justify-center py-16"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>}
            {!isLoading && !items.length && (
              <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                <Icon name="Radar" size={28} className="mx-auto mb-2 opacity-50" />
                {period === "online" ? "Сейчас на сайте никого нет. Список обновляется каждые 10 секунд" : "За этот период визитов не было"}
              </div>
            )}
            {items.map((v) => <VisitCard key={v.id} v={v} live={period === "online"} onVisitor={setVisitor} onOpen={onOpen} />)}
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Icon name="FileText" size={15} className="text-primary" />Страницы сейчас</p>
            {data?.top_pages.length ? (
              <ul className="space-y-2 text-sm">
                {data.top_pages.map((p) => (
                  <li key={p.path} className="flex items-start justify-between gap-3">
                    <span className="min-w-0 truncate" title={p.path}>{p.title?.replace(/\s[—|-]\s.*$/, "") || p.path}</span>
                    <span className="shrink-0 rounded-full bg-secondary px-2 text-xs font-semibold tabular-nums">{p.c}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Нет активных посетителей</p>}
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><Icon name="Search" size={15} className="text-primary" />Что ищут · сутки</p>
            {data?.top_searches.length ? (
              <div className="flex flex-wrap gap-1.5">
                {data.top_searches.map((s) => (
                  <span key={s.q} className="rounded-full bg-secondary px-2.5 py-1 text-xs">{s.q}{s.c > 1 && <b className="ml-1">{s.c}</b>}</span>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">Поисковых запросов пока нет. Сюда попадает поиск по сайту и ключевые фразы из рекламы</p>}
          </div>
          <div className="rounded-xl border bg-card p-4 text-xs text-muted-foreground">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><Icon name="Info" size={15} className="text-primary" />Как это работает</p>
            Учитываются все посетители сайта с момента открытия страницы. Телефон и имя появляются, когда человек оставляет заявку на сайте, — тогда все его прошлые и будущие визиты связываются с лидом. Источники трафика: {Object.values(CHANNELS).slice(0, 3).map((c) => c.label).join(", ")} и другие.
          </div>
        </aside>
      </div>

      {visitor && <VisitorSheet visitor={visitor} onClose={() => setVisitor(null)} onOpen={onOpen} />}
    </div>
  );
};

export default AnalyticsPage;