import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import { money } from "../config";
import { Kpi, MONTHS, catLabel, downloadCsv } from "./shared";
import { mskParts } from "@/lib/msk";

type Month = { month: number; deals: number; shop: number; family: number; income_manual: number; expense: number; inflow: number; net: number; opening: number; closing: number };
type Resp = { year: number; years: number[]; opening: number; closing: number; months: Month[]; categories: { kind: string; category: string; months: number[]; total: number }[] };

const compact = (v: number) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)} млн` : Math.abs(v) >= 1e3 ? `${Math.round(v / 1e3)} тыс` : String(Math.round(v)));
const cell = (v: number) => (v ? money(v) : "—");

const Cashflow = () => {
  const [year, setYear] = useState(mskParts().year);
  const [details, setDetails] = useState(true);
  const { data, isLoading } = useQuery<Resp>({ queryKey: ["crm", "finance", "cashflow", year], queryFn: () => api({ resource: "finance", action: "cashflow", year }) });

  if (isLoading || !data) return <div className="flex h-60 items-center justify-center"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>;

  const m = data.months;
  const sum = (k: keyof Month) => m.reduce((a, x) => a + Number(x[k]), 0);
  const nowMonth = year === mskParts().year ? mskParts().month : 11;
  const chart = m.map((x, i) => ({ name: MONTHS[i], Поступления: x.inflow, Выплаты: -x.expense, Остаток: i <= nowMonth ? x.closing : null }));
  const incomeCats = data.categories.filter((c) => c.kind === "income");
  const expenseCats = data.categories.filter((c) => c.kind === "expense");

  const rows: { label: string; values: number[]; total: number; kind: "head" | "sub" | "total" | "balance"; tone?: "pos" | "neg" }[] = [
    { label: "Остаток на начало", values: m.map((x) => x.opening), total: data.opening, kind: "balance" },
    { label: "Поступления", values: m.map((x) => x.inflow), total: sum("inflow"), kind: "head", tone: "pos" },
    { label: "Сделки CRM", values: m.map((x) => x.deals), total: sum("deals"), kind: "sub" },
    { label: "Магазин сайта", values: m.map((x) => x.shop), total: sum("shop"), kind: "sub" },
    { label: "Кабинет близких", values: m.map((x) => x.family), total: sum("family"), kind: "sub" },
    ...(details ? incomeCats.map((c) => ({ label: catLabel("income", c.category), values: c.months, total: c.total, kind: "sub" as const })) : [{ label: "Прочие поступления (вручную)", values: m.map((x) => x.income_manual), total: sum("income_manual"), kind: "sub" as const }]),
    { label: "Выплаты", values: m.map((x) => x.expense), total: sum("expense"), kind: "head", tone: "neg" },
    ...(details ? expenseCats.map((c) => ({ label: catLabel("expense", c.category), values: c.months, total: c.total, kind: "sub" as const })) : []),
    { label: "Чистый денежный поток", values: m.map((x) => x.net), total: sum("net"), kind: "total" },
    { label: "Остаток на конец", values: m.map((x) => x.closing), total: data.closing, kind: "balance" },
  ];

  const exportCsv = () =>
    downloadCsv(`cashflow_${year}.csv`, [["Статья", ...MONTHS, "Итого"], ...rows.map((r) => [r.label, ...r.values.map((v) => Math.round(v * 100) / 100), Math.round(r.total * 100) / 100])]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full bg-secondary p-1">
          {data.years.map((y) => (
            <button key={y} onClick={() => setYear(y)} className={`rounded-full px-3.5 py-1.5 text-sm ${year === y ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>{y}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setDetails(!details)} className="inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm hover:bg-secondary">
            <Icon name={details ? "ListCollapse" : "ListTree"} size={14} />{details ? "Свернуть статьи" : "По статьям"}
          </button>
          <button onClick={exportCsv} className="inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm hover:bg-secondary"><Icon name="Download" size={14} />CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label={`Остаток на 01.01.${year}`} value={money(data.opening)} />
        <Kpi label="Поступления за год" value={money(sum("inflow"))} tone="pos" />
        <Kpi label="Выплаты за год" value={money(sum("expense"))} tone="neg" />
        <Kpi label="Остаток на конец" value={money(data.closing)} sub={`Поток за год: ${money(sum("net"))}`} tone={data.closing >= 0 ? "pos" : "neg"} />
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart} stackOffset="sign" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickFormatter={compact} tickLine={false} axisLine={false} fontSize={11} width={60} />
              <Tooltip formatter={(v: number) => money(Math.abs(v))} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Поступления" stackId="a" fill="#059669" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Выплаты" stackId="a" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Line dataKey="Остаток" type="monotone" stroke="hsl(var(--foreground))" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-xs">
            <thead className="bg-secondary/60 text-muted-foreground">
              <tr>
                <th className="sticky left-0 z-10 bg-secondary px-3 py-2.5 text-left font-medium">Статья</th>
                {MONTHS.map((mn, i) => <th key={mn} className={`px-2 py-2.5 text-right font-medium ${i === nowMonth && year === mskParts().year ? "text-foreground" : ""}`}>{mn}</th>)}
                <th className="px-3 py-2.5 text-right font-medium text-foreground">Итого</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const base = r.kind === "head" ? "bg-secondary/30 font-semibold" : r.kind === "total" ? "border-t-2 font-semibold" : r.kind === "balance" ? "bg-secondary/50 font-medium" : "";
                return (
                  <tr key={r.label} className={`border-t ${base}`}>
                    <td className={`sticky left-0 z-10 whitespace-nowrap px-3 py-2 ${r.kind === "sub" ? "bg-card pl-7 text-muted-foreground" : r.kind === "head" ? "bg-[hsl(var(--secondary))]" : r.kind === "balance" ? "bg-[hsl(var(--secondary))]" : "bg-card"} ${r.tone === "pos" ? "text-emerald-700" : r.tone === "neg" ? "text-primary" : ""}`}>{r.label}</td>
                    {r.values.map((v, i) => (
                      <td key={i} className={`whitespace-nowrap px-2 py-2 text-right tabular-nums ${(r.kind === "total" || r.kind === "balance") && v < 0 ? "text-primary" : ""} ${r.kind === "sub" && !v ? "text-muted-foreground/50" : ""}`}>
                        {r.kind === "balance" || r.kind === "total" ? money(v) : cell(v)}
                      </td>
                    ))}
                    <td className={`whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums ${(r.kind === "total" || r.kind === "balance") && r.total < 0 ? "text-primary" : ""}`}>{money(r.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Поступления по сделкам учитываются по дате перевода в «Успешно», магазин и кабинет — по дате оплаты онлайн, ручные операции — по указанной дате. Остаток на начало года считается по всем данным в системе за прошлые периоды.
      </p>
    </div>
  );
};

export default Cashflow;
