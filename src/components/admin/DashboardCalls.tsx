import Icon from "@/components/ui/icon";

type Stats = {
  incoming: number;
  outgoing: number;
  missed: number;
  missed_in: number;
  leads: number;
  leads_in: number;
  leads_out: number;
  leads_missed: number;
};

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

const DashboardCalls = ({ calls, periodLabel, onNavigate }: { calls?: Stats; periodLabel: string; onNavigate: (page: string) => void }) => {
  if (!calls) return null;
  const s = calls;
  const n = (k: keyof Stats) => Number(s[k] || 0);
  const total = n("incoming") + n("outgoing");

  const tiles = [
    { label: "Входящие", value: n("incoming"), leads: n("leads_in"), icon: "PhoneIncoming", cls: "bg-emerald-100 text-emerald-700" },
    { label: "Исходящие", value: n("outgoing"), leads: n("leads_out"), icon: "PhoneOutgoing", cls: "bg-sky-100 text-sky-700" },
    { label: "Пропущенные", value: n("missed"), leads: n("leads_missed"), icon: "PhoneMissed", cls: "bg-red-100 text-red-700", sub: n("incoming") ? `${pct(n("missed_in"), n("incoming"))}% входящих` : null },
    { label: "Стали лидами", value: n("leads"), icon: "UserPlus", cls: "bg-primary/10 text-primary", sub: total ? `${pct(n("leads"), total)}% звонков` : null },
  ];

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => onNavigate("calls")} className="flex items-center gap-2 font-heading font-semibold hover:text-primary">
          <Icon name="PhoneCall" size={18} />Звонки
          <Icon name="ArrowUpRight" size={14} className="text-muted-foreground" />
        </button>
        <span className="text-xs text-muted-foreground">{periodLabel}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl bg-secondary/50 p-4">
            <div className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${t.cls}`}><Icon name={t.icon} size={16} /></span>
              <span className="text-sm text-muted-foreground">{t.label}</span>
            </div>
            <p className="mt-3 font-heading text-3xl font-semibold tracking-tight">{t.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t.leads !== undefined ? (t.leads ? `${t.leads} → новые лиды` : "новых лидов нет") : t.sub || "—"}
              {t.leads !== undefined && t.sub ? ` · ${t.sub}` : ""}
            </p>
          </div>
        ))}
      </div>

      {total === 0 && <p className="mt-3 text-center text-xs text-muted-foreground">За выбранный период звонков не было</p>}
    </div>
  );
};

export default DashboardCalls;
