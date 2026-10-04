import { useQuery } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import { fmtDate, money } from "../config";
import { Kpi, PeriodPicker, downloadCsv, usePeriod } from "./shared";

type Deal = {
  id: number;
  title: string;
  program: string | null;
  amount: number;
  closed_at: string;
  client_name: string | null;
  manager_name: string | null;
  partner_name: string | null;
  commission_percent: number;
  commission: number;
};

type Resp = { items: Deal[]; summary: { revenue: number; count: number; avg: number; commission: number; pipeline: number; pipeline_count: number } };

const DealsIncome = ({ onOpen }: { onOpen: (resource: string, id: number) => void }) => {
  const p = usePeriod();
  const { data, isLoading } = useQuery<Resp>({
    queryKey: ["crm", "finance", "deals", p.range],
    queryFn: () => api({ resource: "finance", action: "deals", from: p.range[0], to: p.range[1] }),
  });
  const s = data?.summary;

  const exportCsv = () =>
    data &&
    downloadCsv(`deals_${p.range[0]}_${p.range[1]}.csv`, [
      ["Дата закрытия", "Сделка", "Программа", "Клиент", "Менеджер", "Партнёр", "Сумма", "Комиссия партнёра"],
      ...data.items.map((d) => [fmtDate(d.closed_at), d.title, d.program || "", d.client_name || "", d.manager_name || "", d.partner_name || "", d.amount, d.commission]),
    ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodPicker p={p} />
        <button onClick={exportCsv} disabled={!data?.items.length} className="inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm hover:bg-secondary disabled:opacity-50">
          <Icon name="Download" size={14} />Excel (CSV)
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Выручка по сделкам" value={money(s?.revenue)} sub={`${s?.count ?? 0} успешных сделок`} tone="pos" />
        <Kpi label="Средний чек" value={money(s?.avg)} />
        <Kpi label="Комиссии партнёрам" value={money(s?.commission)} sub="по % из карточки партнёра" tone="neg" />
        <Kpi label="В работе (воронка)" value={money(s?.pipeline)} sub={`${s?.pipeline_count ?? 0} открытых сделок`} />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>
        ) : !data?.items.length ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
            <Icon name="Handshake" size={22} />
            За период нет сделок на этапе «Успешно»
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Закрыта</th>
                  <th className="px-4 py-2.5 font-medium">Сделка</th>
                  <th className="px-4 py-2.5 font-medium">Клиент</th>
                  <th className="px-4 py-2.5 font-medium">Менеджер</th>
                  <th className="px-4 py-2.5 font-medium">Партнёр</th>
                  <th className="px-4 py-2.5 text-right font-medium">Сумма</th>
                  <th className="px-4 py-2.5 text-right font-medium">Комиссия</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((d) => (
                  <tr key={d.id} onClick={() => onOpen("deals", d.id)} className="cursor-pointer border-t hover:bg-secondary/40">
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{fmtDate(d.closed_at)}</td>
                    <td className="px-4 py-2.5"><p className="font-medium">{d.title}</p>{d.program && <p className="text-xs text-muted-foreground">{d.program}</p>}</td>
                    <td className="px-4 py-2.5">{d.client_name || "—"}</td>
                    <td className="px-4 py-2.5">{d.manager_name || "—"}</td>
                    <td className="px-4 py-2.5">{d.partner_name ? `${d.partner_name} · ${Number(d.commission_percent)}%` : "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums">{money(d.amount)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-muted-foreground">{Number(d.commission) ? money(d.commission) : "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-secondary/40 font-medium">
                <tr>
                  <td className="px-4 py-2.5" colSpan={5}>Итого</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{money(s?.revenue)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{money(s?.commission)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DealsIncome;
