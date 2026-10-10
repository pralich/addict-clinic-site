import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import { fmtDate, money } from "../config";
import InvoiceDialog from "../billing/InvoiceDialog";
import InvoiceView from "../billing/InvoiceView";
import PaymentDialog from "../billing/PaymentDialog";
import { INVOICE_STATES, PAYER_TYPES, PAY_METHODS, StateBadge, type Invoice, type PayerType, type Payment } from "../billing/shared";
import { Kpi, PeriodPicker, downloadCsv, usePeriod } from "./shared";

type Summary = { invoiced: number; invoices: number; received: number; payments: number; debt: number; overdue: number };

const Billing = ({ onOpen }: { onOpen: (resource: string, id: number) => void }) => {
  const p = usePeriod();
  const [tab, setTab] = useState<"invoices" | "payments">("invoices");
  const [state, setState] = useState("");
  const [payerType, setPayerType] = useState("");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<"invoice" | "payment" | null>(null);
  const [view, setView] = useState<number | null>(null);
  const base = { from: p.range[0], to: p.range[1], payer_type: payerType };

  const sum = useQuery<Summary>({ queryKey: ["crm", "billing", "summary", base], queryFn: () => api({ resource: "billing", action: "summary", ...base }) });
  const inv = useQuery<{ items: Invoice[] }>({
    queryKey: ["crm", "billing", "invoices", base, state, search],
    queryFn: () => api({ resource: "billing", action: "invoices", ...base, state, search }),
    enabled: tab === "invoices",
  });
  const pay = useQuery<{ items: Payment[] }>({
    queryKey: ["crm", "billing", "payments", base],
    queryFn: () => api({ resource: "billing", action: "payments", ...base }),
    enabled: tab === "payments",
  });
  const s = sum.data;

  const exportCsv = () => {
    if (tab === "invoices" && inv.data)
      downloadCsv(`invoices_${p.range[0]}_${p.range[1]}.csv`, [
        ["Номер", "Дата", "Срок", "Плательщик", "Тип", "Сделка", "Сумма", "Оплачено", "Долг", "Статус"],
        ...inv.data.items.map((i) => [i.number, fmtDate(i.issue_date), fmtDate(i.due_date), i.payer_name || "", PAYER_TYPES[i.payer_type].label, i.deal_title || "", i.amount, i.paid, i.debt, INVOICE_STATES[i.state].label]),
      ]);
    if (tab === "payments" && pay.data)
      downloadCsv(`payments_${p.range[0]}_${p.range[1]}.csv`, [
        ["Дата", "Плательщик", "Счёт", "Сделка", "Способ", "Сумма", "Комментарий"],
        ...pay.data.items.map((x) => [fmtDate(x.paid_at), x.payer_name || "", x.invoice_number || "", x.deal_title || "", PAY_METHODS[x.method]?.label || x.method, x.amount, x.note || ""]),
      ]);
  };

  const loading = tab === "invoices" ? inv.isLoading : pay.isLoading;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodPicker p={p} />
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCsv} className="inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm hover:bg-secondary"><Icon name="Download" size={14} />CSV</button>
          <button onClick={() => setDialog("payment")} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-emerald-600 px-4 text-sm font-medium text-white hover:opacity-90"><Icon name="Plus" size={15} />Платёж</button>
          <button onClick={() => setDialog("invoice")} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"><Icon name="FilePlus" size={15} />Выставить счёт</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Выставлено" value={money(s?.invoiced)} sub={`${s?.invoices ?? 0} счетов`} />
        <Kpi label="Получено" value={money(s?.received)} sub={`${s?.payments ?? 0} платежей`} tone="pos" />
        <Kpi label="Дебиторка" value={money(s?.debt)} sub="Неоплаченный остаток" />
        <Kpi label="Просрочено" value={money(s?.overdue)} tone={(s?.overdue ?? 0) > 0 ? "neg" : undefined} />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b p-2">
          <div className="flex gap-1">
            {([["invoices", "Счета", "FileText"], ["payments", "Платежи", "Wallet"]] as const).map(([k, l, ic]) => (
              <button key={k} onClick={() => setTab(k)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${tab === k ? "bg-secondary font-medium" : "text-muted-foreground"}`}><Icon name={ic} size={14} />{l}</button>
            ))}
          </div>
          <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
          <select value={payerType} onChange={(e) => setPayerType(e.target.value)} className="h-8 rounded-lg border bg-background px-2 text-sm">
            <option value="">Все плательщики</option>
            {(Object.keys(PAYER_TYPES) as PayerType[]).map((k) => <option key={k} value={k}>{PAYER_TYPES[k].label}</option>)}
          </select>
          {tab === "invoices" && (
            <>
              <select value={state} onChange={(e) => setState(e.target.value)} className="h-8 rounded-lg border bg-background px-2 text-sm">
                <option value="">Все статусы</option>
                <option value="unpaid">Неоплаченные</option>
                {Object.entries(INVOICE_STATES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <div className="relative ml-auto">
                <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Номер или плательщик" className="h-8 w-52 rounded-lg border bg-background pl-8 pr-2 text-sm outline-none" />
              </div>
            </>
          )}
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>
        ) : tab === "invoices" ? (
          !inv.data?.items.length ? (
            <div className="flex h-40 flex-col items-center justify-center gap-1 text-sm text-muted-foreground"><Icon name="FileText" size={22} />Счетов за период нет</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-left text-xs text-muted-foreground">
                  <tr><th className="px-4 py-2 font-medium">Счёт</th><th className="px-4 py-2 font-medium">Плательщик</th><th className="px-4 py-2 font-medium">Сделка</th><th className="px-4 py-2 text-right font-medium">Сумма</th><th className="px-4 py-2 text-right font-medium">Долг</th><th className="px-4 py-2 font-medium">Статус</th></tr>
                </thead>
                <tbody className="divide-y">
                  {inv.data.items.map((i) => (
                    <tr key={i.id} onClick={() => setView(i.id)} className="cursor-pointer hover:bg-secondary/40">
                      <td className="whitespace-nowrap px-4 py-2.5"><p className="font-medium">№ {i.number}</p><p className="text-xs text-muted-foreground">{fmtDate(i.issue_date)}{i.due_date ? ` → ${fmtDate(i.due_date)}` : ""}</p></td>
                      <td className="px-4 py-2.5"><span className="inline-flex items-center gap-1.5"><Icon name={PAYER_TYPES[i.payer_type].icon} size={13} className="text-muted-foreground" />{i.payer_name}</span></td>
                      <td className="max-w-[220px] truncate px-4 py-2.5 text-muted-foreground">{i.deal_title || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums">{money(i.amount)}</td>
                      <td className={`whitespace-nowrap px-4 py-2.5 text-right tabular-nums ${i.debt > 0 ? "text-primary" : "text-muted-foreground"}`}>{i.debt > 0 ? money(i.debt) : "—"}</td>
                      <td className="px-4 py-2.5"><StateBadge state={i.state} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : !pay.data?.items.length ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1 text-sm text-muted-foreground"><Icon name="Wallet" size={22} />Платежей за период нет</div>
        ) : (
          <ul className="divide-y">
            {pay.data.items.map((x) => (
              <li key={x.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Icon name={PAY_METHODS[x.method]?.icon || "Wallet"} size={16} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{x.payer_name}{x.deal_title ? <span className="font-normal text-muted-foreground"> · {x.deal_title}</span> : null}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {fmtDate(x.paid_at)} · {PAY_METHODS[x.method]?.label}
                    {x.invoice_number ? <> · <button onClick={() => setView(x.invoice_id!)} className="text-primary hover:underline">счёт № {x.invoice_number}</button></> : " · без счёта"}
                    {x.note ? ` · ${x.note}` : ""}
                  </p>
                </div>
                <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-emerald-700">+{money(x.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {dialog === "invoice" && <InvoiceDialog onClose={() => setDialog(null)} />}
      {dialog === "payment" && <PaymentDialog onClose={() => setDialog(null)} />}
      {view && <InvoiceView id={view} onClose={() => setView(null)} onOpen={(r, id) => { setView(null); onOpen(r, id); }} />}
    </div>
  );
};

export default Billing;
