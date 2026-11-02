import { useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import StatusBadge from "./StatusBadge";
import DashboardCalls from "./DashboardCalls";
import { PROJECTS, ProjectIcon } from "./ProjectBadge";
import { CHANNELS, DEAL_STAGES, ENTITY_LABEL, LEAD_STATUS, fmtDate, money } from "./config";
import { fmtMskDate } from "@/lib/msk";
import { exportElementToPdf } from "@/lib/export-pdf";

type Props = { onOpen: (resource: string, id: number) => void; onNavigate: (page: string) => void };

const PERIODS = { today: "Сегодня", yesterday: "Вчера", week: "Неделя", month: "Месяц" } as const;
type Period = keyof typeof PERIODS;
const PERIOD_TEXT: Record<Period, string> = { today: "за сегодня", yesterday: "за вчера", week: "за 7 дней", month: "с начала месяца" };

const Seg = <T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: [T, ReactNode][] }) => (
  <div className="flex gap-1 rounded-full bg-secondary p-1">
    {items.map(([k, l]) => (
      <button key={k} onClick={() => onChange(k)} className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs ${value === k ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>{l}</button>
    ))}
  </div>
);

const Dashboard = ({ onOpen, onNavigate }: Props) => {
  const [period, setPeriod] = useState<Period>("today");
  const [project, setProject] = useState<string>("all");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useQuery<any>({
    queryKey: ["crm", "dashboard", period, project],
    queryFn: () => api({ resource: "dashboard", period, ...(project !== "all" ? { project } : {}) }),
    refetchInterval: 60000,
    placeholderData: (prev: any) => prev,
  });

  if (!data || !data.byProject) {
    return <div className="flex h-60 items-center justify-center"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>;
  }

  const range = data.from === data.to ? fmtMskDate(data.from, { day: "numeric", month: "long", year: "numeric" }) : `${fmtMskDate(data.from, { day: "numeric", month: "long" })} — ${fmtMskDate(data.to, { day: "numeric", month: "long", year: "numeric" })}`;
  const projectLabel = project === "all" ? "Все проекты" : PROJECTS[project];
  const pText = PERIOD_TEXT[period];

  const exportPdf = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      await exportElementToPdf(ref.current, `svodka_${project}_${data.from}_${data.to}.pdf`);
    } catch {
      toast.error("Не удалось сформировать PDF");
    } finally {
      setBusy(false);
    }
  };

  const funnel = Object.keys(DEAL_STAGES).filter((s) => s !== "lost").map((s) => {
    const f = data.funnel.find((x: any) => x.stage === s);
    return { stage: s, count: Number(f?.count || 0), amount: Number(f?.amount || 0) };
  });
  const maxCount = Math.max(1, ...funnel.map((f) => f.count));
  const closed = Number(data.deals.won) + Number(data.deals.lost);
  const conversion = closed ? Math.round((Number(data.deals.won) / closed) * 100) : 0;

  const kpis = [
    { label: "Лиды", value: data.leads.total, sub: `${data.leads.new} ещё новые · ${data.leads.converted} конвертированы`, icon: "Inbox", page: "leads", accent: true },
    { label: "Новые сделки", value: data.deals.created, sub: `${money(data.deals.created_amount)} · в работе всего ${data.deals.open}`, icon: "Handshake", page: "deals" },
    { label: "Выручка", value: money(data.deals.revenue), sub: `${data.deals.won} успешных · конверсия ${conversion}%`, icon: "TrendingUp", page: "deals" },
    { label: "Новые клиенты", value: data.clients.new, sub: `всего ${data.clients.total}`, icon: "Users", page: "clients" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Сводка</h1>
          <p className="text-sm text-muted-foreground">{fmtMskDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <button onClick={exportPdf} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-full border bg-card px-4 text-sm hover:bg-secondary disabled:opacity-50">
          <Icon name={busy ? "Loader2" : "FileDown"} size={15} className={busy ? "animate-spin" : ""} />{busy ? "Готовим PDF…" : "Скачать PDF"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Seg value={period} onChange={setPeriod} items={Object.entries(PERIODS) as [Period, string][]} />
        <Seg value={project} onChange={setProject} items={[["all", "Все проекты"], ...Object.entries(PROJECTS).map(([k, l]) => [k, <><ProjectIcon project={k} size={16} />{l}</>] as [string, ReactNode])]} />
      </div>

      <div ref={ref} className="flex flex-col gap-5 bg-background">
      <div data-pdf-block className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-3">
        <p className="font-heading text-lg font-semibold">{projectLabel} · {PERIODS[period]}</p>
        <p className="text-sm text-muted-foreground">{range}</p>
      </div>

      <div data-pdf-block className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <button key={k.label} onClick={() => onNavigate(k.page)}
            className={`group rounded-xl p-5 text-left transition-transform hover:-translate-y-0.5 ${k.accent ? "bg-primary text-primary-foreground" : "border bg-card"}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${k.accent ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{k.label}</span>
              <Icon name={k.icon} size={18} className={k.accent ? "" : "text-muted-foreground"} />
            </div>
            <p className="mt-3 font-heading text-3xl font-semibold tracking-tight">{k.value}</p>
            <p className={`mt-1 text-xs ${k.accent ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{k.sub}</p>
          </button>
        ))}
      </div>

      {project === "all" && (
        <div data-pdf-block className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="font-heading font-semibold">По проектам</p>
            <span className="text-xs text-muted-foreground">{pText}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3 font-medium">Проект</th>
                  <th className="px-3 py-2 text-right font-medium">Лиды</th>
                  <th className="px-3 py-2 text-right font-medium">Звонки</th>
                  <th className="px-3 py-2 text-right font-medium">Новые сделки</th>
                  <th className="px-3 py-2 text-right font-medium">Успешные</th>
                  <th className="px-3 py-2 text-right font-medium">Новые клиенты</th>
                  <th className="py-2 pl-3 text-right font-medium">Выручка</th>
                </tr>
              </thead>
              <tbody>
                {data.byProject.map((r: any) => (
                  <tr key={r.p} onClick={() => setProject(r.p)} className="cursor-pointer border-b last:border-0 hover:bg-secondary/40">
                    <td className="py-2.5 pr-3"><span className="flex items-center gap-2 font-medium"><ProjectIcon project={r.p} size={20} />{PROJECTS[r.p]}</span></td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.leads}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.calls}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.deals}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.won}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.clients}</td>
                    <td className="whitespace-nowrap py-2.5 pl-3 text-right font-medium tabular-nums">{money(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div data-pdf-block><DashboardCalls calls={data.calls} periodLabel={pText} onNavigate={onNavigate} /></div>

      <div data-pdf-block className="grid gap-3 lg:grid-cols-5">
        <div className="rounded-xl border bg-card p-5 lg:col-span-3">
          <p className="mb-4 font-heading font-semibold">Лиды {data.from === data.to ? "по часам" : "по дням"} <span className="text-xs font-normal text-muted-foreground">· {pText}</span></p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.leadsByDay} margin={{ left: -20, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v) => [v, "Лидов"]} />
                <Area type="monotone" dataKey="leads" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#lg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 lg:col-span-2">
          <p className="mb-4 font-heading font-semibold">Воронка новых сделок <span className="text-xs font-normal text-muted-foreground">· {pText}</span></p>
          <div className="flex flex-col gap-2.5">
            {funnel.map((f) => (
              <div key={f.stage}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{DEAL_STAGES[f.stage].label}</span>
                  <span className="text-muted-foreground">{f.count} · {money(f.amount)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(f.count / maxCount) * 100}%`, opacity: f.stage === "won" ? 1 : 0.55 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div data-pdf-block className="grid gap-3 lg:grid-cols-5">
        <div className="rounded-xl border bg-card p-5 lg:col-span-3">
          <div className="mb-4 flex items-baseline justify-between">
            <p className="font-heading font-semibold">Откуда приходят лиды</p>
            <span className="text-xs text-muted-foreground">{pText}</span>
          </div>
          {(data.channels ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">За период заявок с источником нет</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {data.channels.map((c: any) => {
                const ch = CHANNELS[c.channel] || CHANNELS.unknown;
                const max = Math.max(...data.channels.map((x: any) => Number(x.leads)));
                return (
                  <div key={c.channel}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                      <span className="flex items-center gap-1.5"><Icon name={ch.icon} size={13} className={ch.paid ? "text-primary" : "text-muted-foreground"} />{ch.label}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {c.leads} лид.{Number(c.won) > 0 && <> · {c.won} оплат · {money(c.revenue)}</>}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div className={`h-full rounded-full ${ch.paid ? "bg-primary" : "bg-foreground/40"}`} style={{ width: `${(Number(c.leads) / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-baseline justify-between">
            <p className="font-heading font-semibold">Рекламные кампании</p>
            <span className="text-xs text-muted-foreground">{pText}</span>
          </div>
          {(data.campaigns ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">За период нет заявок с рекламными метками</p>
          ) : (
            <div className="divide-y">
              {data.campaigns.map((c: any) => (
                <div key={`${c.utm_source}-${c.utm_campaign}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium" title={c.utm_campaign}>{c.utm_campaign}</p>
                    <p className="text-xs text-muted-foreground">{c.utm_source || "—"}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium tabular-nums">{c.leads}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div data-pdf-block className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-heading font-semibold">Последние лиды <span className="text-xs font-normal text-muted-foreground">· {pText}</span></p>
            <button data-pdf-hide onClick={() => onNavigate("leads")} className="text-xs text-primary hover:underline">Все лиды</button>
          </div>
          {data.recentLeads.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">За период заявок нет</p>
          ) : (
            <div className="divide-y">
              {data.recentLeads.map((l: any) => (
                <button key={l.id} onClick={() => onOpen("leads", l.id)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm hover:bg-secondary/40">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate font-medium"><ProjectIcon project={l.project_key} size={16} />{l.name || "Аноним"} <span className="font-normal text-muted-foreground">· {l.topic || "без темы"}</span></p>
                    <p className="text-xs text-muted-foreground">{l.contact} · {fmtDate(l.created_at, true)}</p>
                  </div>
                  <StatusBadge map={LEAD_STATUS} value={l.status} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5">
          <p className="mb-3 font-heading font-semibold">Лента событий <span className="text-xs font-normal text-muted-foreground">· {pText}</span></p>
          {data.activity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">За период событий нет</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.activity.map((a: any) => (
                <button key={a.id} onClick={() => onOpen(a.entity_type, a.entity_id)} className="flex gap-3 text-left text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span className="min-w-0">
                    <span className="font-medium">{ENTITY_LABEL[a.entity_type]} #{a.entity_id}</span>{" "}
                    <span className="text-muted-foreground">— {a.text}</span>
                    <span className="block text-xs text-muted-foreground">{a.user_name || "Сайт"} · {fmtDate(a.created_at, true)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
};

export default Dashboard;
