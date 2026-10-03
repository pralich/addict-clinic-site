import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import StatusBadge from "./StatusBadge";
import { DEAL_STAGES, ENTITY_LABEL, LEAD_STATUS, fmtDate, money } from "./config";

type Props = { onOpen: (resource: string, id: number) => void; onNavigate: (page: string) => void };

const Dashboard = ({ onOpen, onNavigate }: Props) => {
  const { data } = useQuery<any>({ queryKey: ["crm", "dashboard"], queryFn: () => api({ resource: "dashboard" }), refetchInterval: 60000 });

  if (!data) {
    return <div className="flex h-60 items-center justify-center"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>;
  }

  const funnel = Object.keys(DEAL_STAGES).filter((s) => s !== "lost").map((s) => {
    const f = data.funnel.find((x: any) => x.stage === s);
    return { stage: s, count: Number(f?.count || 0), amount: Number(f?.amount || 0) };
  });
  const maxCount = Math.max(1, ...funnel.map((f) => f.count));
  const closed = Number(data.deals.won) + Number(data.deals.lost);
  const conversion = closed ? Math.round((Number(data.deals.won) / closed) * 100) : 0;

  const kpis = [
    { label: "Новые лиды", value: data.leads.new, sub: `${data.leads.week} за 7 дней`, icon: "Inbox", page: "leads", accent: true },
    { label: "Открытые сделки", value: data.deals.open, sub: money(data.deals.open_amount), icon: "Handshake", page: "deals" },
    { label: "Выручка за месяц", value: money(data.deals.won_month), sub: `Конверсия ${conversion}%`, icon: "TrendingUp", page: "deals" },
    { label: "Клиенты", value: data.clients.total, sub: `${data.partners.total} активных партнёров`, icon: "Users", page: "clients" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">Сводка</h1>
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      <div className="grid gap-3 lg:grid-cols-5">
        <div className="rounded-xl border bg-card p-5 lg:col-span-3">
          <p className="mb-4 font-heading font-semibold">Лиды за 14 дней</p>
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
          <p className="mb-4 font-heading font-semibold">Воронка сделок</p>
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

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-heading font-semibold">Последние лиды</p>
            <button onClick={() => onNavigate("leads")} className="text-xs text-primary hover:underline">Все лиды</button>
          </div>
          {data.recentLeads.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Заявки с сайта появятся здесь автоматически</p>
          ) : (
            <div className="divide-y">
              {data.recentLeads.map((l: any) => (
                <button key={l.id} onClick={() => onOpen("leads", l.id)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm hover:bg-secondary/40">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{l.name || "Аноним"} <span className="font-normal text-muted-foreground">· {l.topic || "без темы"}</span></p>
                    <p className="text-xs text-muted-foreground">{l.contact} · {fmtDate(l.created_at, true)}</p>
                  </div>
                  <StatusBadge map={LEAD_STATUS} value={l.status} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5">
          <p className="mb-3 font-heading font-semibold">Лента событий</p>
          {data.activity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Пока тихо</p>
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
  );
};

export default Dashboard;
