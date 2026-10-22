import { useState } from "react";
import { mskDateKey, mskParts, mskToday } from "@/lib/msk";

export const INCOME_CATS: Record<string, string> = {
  services: "Оплата услуг",
  partner_fee: "Вознаграждение от партнёров",
  grants: "Гранты и пожертвования",
  shop: "Продажи вне сайта",
  other_income: "Прочие доходы",
};

export const EXPENSE_CATS: Record<string, string> = {
  salary: "Зарплата и взносы",
  rent: "Аренда",
  marketing: "Реклама и маркетинг",
  commission: "Комиссии партнёрам",
  taxes: "Налоги",
  software: "Сервисы и ПО",
  telecom: "Связь и телефония",
  bank: "Банк и эквайринг",
  office: "Офис и хозрасходы",
  other_expense: "Прочие расходы",
};

export const catLabel = (kind: string, c: string) => (kind === "income" ? INCOME_CATS : EXPENSE_CATS)[c] || c;

export const MONTHS = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

const PRESETS = [
  { id: "month", label: "Этот месяц", range: () => { const n = mskParts(); return [mskDateKey(n.year, n.month, 1), mskToday()]; } },
  { id: "prev", label: "Прошлый месяц", range: () => { const n = mskParts(); return [mskDateKey(n.year, n.month - 1, 1), mskDateKey(n.year, n.month, 0)]; } },
  { id: "quarter", label: "Квартал", range: () => { const n = mskParts(); return [mskDateKey(n.year, Math.floor(n.month / 3) * 3, 1), mskToday()]; } },
  { id: "year", label: "Год", range: () => { const n = mskParts(); return [mskDateKey(n.year, 0, 1), mskToday()]; } },
];

export const usePeriod = () => {
  const [preset, setPreset] = useState("month");
  const [range, setRange] = useState<[string, string]>(PRESETS[0].range() as [string, string]);
  return { preset, setPreset, range, setRange };
};

export const PeriodPicker = ({ p }: { p: ReturnType<typeof usePeriod> }) => (
  <div className="flex flex-wrap items-center gap-2">
    <div className="flex gap-1 rounded-full bg-secondary p-1">
      {PRESETS.map((x) => (
        <button key={x.id} onClick={() => { p.setPreset(x.id); p.setRange(x.range() as [string, string]); }}
          className={`rounded-full px-3 py-1.5 text-xs ${p.preset === x.id ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>{x.label}</button>
      ))}
    </div>
    <div className="flex items-center gap-1 text-xs">
      <input type="date" value={p.range[0]} onChange={(e) => { p.setPreset(""); p.setRange([e.target.value, p.range[1]]); }} className="h-8 rounded-lg border bg-card px-2" />
      <span className="text-muted-foreground">—</span>
      <input type="date" value={p.range[1]} onChange={(e) => { p.setPreset(""); p.setRange([p.range[0], e.target.value]); }} className="h-8 rounded-lg border bg-card px-2" />
    </div>
  </div>
);

export const Kpi = ({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "pos" | "neg" }) => (
  <div className="rounded-xl border bg-card p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`mt-1 font-heading text-2xl font-semibold tabular-nums ${tone === "pos" ? "text-emerald-700" : tone === "neg" ? "text-primary" : ""}`}>{value}</p>
    {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
  </div>
);

export const downloadCsv = (name: string, rows: (string | number)[][]) => {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};
