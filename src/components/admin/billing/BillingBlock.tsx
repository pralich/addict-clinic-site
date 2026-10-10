import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import { fmtDate, money } from "../config";
import InvoiceDialog, { type InvoicePreset } from "./InvoiceDialog";
import InvoiceView from "./InvoiceView";
import PaymentDialog from "./PaymentDialog";
import { PAY_METHODS, StateBadge, type Invoice, type Payment } from "./shared";

type Props = { resource: "deals" | "clients" | "partners"; item: Record<string, any>; onOpen: (resource: string, id: number) => void };

const BillingBlock = ({ resource, item, onOpen }: Props) => {
  const filterKey = ({ deals: "deal_id", clients: "client_id", partners: "partner_id" } as const)[resource];
  const filter = { [filterKey]: item.id };
  const inv = useQuery<{ items: Invoice[] }>({ queryKey: ["crm", "billing", "invoices", filter], queryFn: () => api({ resource: "billing", action: "invoices", ...filter }) });
  const pay = useQuery<{ items: Payment[] }>({ queryKey: ["crm", "billing", "payments", filter], queryFn: () => api({ resource: "billing", action: "payments", ...filter }) });
  const [dialog, setDialog] = useState<"invoice" | "payment" | null>(null);
  const [view, setView] = useState<number | null>(null);
  const [editPay, setEditPay] = useState<Payment | null>(null);
  const [tab, setTab] = useState<"invoices" | "payments">("invoices");

  const preset: InvoicePreset =
    resource === "deals"
      ? item.partner_id && !item.client_id
        ? { payer_type: "partner", partner_id: item.partner_id, deal_id: item.id, amount: Number(item.amount) || undefined, title: item.title }
        : { payer_type: "client", client_id: item.client_id, deal_id: item.id, amount: Number(item.amount) || undefined, title: item.title }
      : resource === "clients"
        ? { payer_type: "client", client_id: item.id }
        : { payer_type: "partner", partner_id: item.id };

  const invoices = inv.data?.items ?? [];
  const payments = pay.data?.items ?? [];
  const active = invoices.filter((i) => i.state !== "canceled");
  const invoiced = active.reduce((a, i) => a + Number(i.amount), 0);
  const received = payments.reduce((a, p) => a + Number(p.amount), 0);
  const debt = active.reduce((a, i) => a + Number(i.debt), 0);
  const dealAmount = resource === "deals" ? Number(item.amount || 0) : 0;
  const notInvoiced = dealAmount > 0 ? Math.max(0, dealAmount - invoiced) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Счета и платежи</p>
        <div className="flex gap-1">
          <button onClick={() => setDialog("invoice")} className="inline-flex h-7 items-center gap-1 rounded-full bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:opacity-90"><Icon name="FilePlus" size={12} />Счёт</button>
          <button onClick={() => setDialog("payment")} className="inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs hover:bg-secondary"><Icon name="Plus" size={12} />Платёж</button>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="grid grid-cols-3 divide-x border-b text-center">
          <div className="p-2.5"><p className="text-[11px] text-muted-foreground">Выставлено</p><p className="font-heading text-sm font-semibold tabular-nums">{money(invoiced)}</p></div>
          <div className="p-2.5"><p className="text-[11px] text-muted-foreground">Получено</p><p className="font-heading text-sm font-semibold tabular-nums text-emerald-700">{money(received)}</p></div>
          <div className="p-2.5"><p className="text-[11px] text-muted-foreground">Долг</p><p className={`font-heading text-sm font-semibold tabular-nums ${debt > 0 ? "text-primary" : ""}`}>{money(debt)}</p></div>
        </div>
        {notInvoiced > 0 && (
          <button onClick={() => setDialog("invoice")} className="flex w-full items-center gap-2 border-b bg-amber-50 px-3 py-2 text-left text-xs text-amber-900 hover:bg-amber-100">
            <Icon name="Info" size={13} />Не выставлено по сделке: <b>{money(notInvoiced)}</b><span className="ml-auto underline">Выставить</span>
          </button>
        )}
        <div className="flex gap-1 border-b px-2 pt-1.5">
          {([["invoices", `Счета · ${invoices.length}`], ["payments", `Платежи · ${payments.length}`]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`-mb-px border-b-2 px-2.5 pb-1.5 text-xs ${tab === k ? "border-primary font-medium" : "border-transparent text-muted-foreground"}`}>{l}</button>
          ))}
        </div>
        {tab === "invoices" ? (
          invoices.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Счетов пока нет</p>
          ) : (
            <ul className="divide-y">
              {invoices.map((i) => (
                <li key={i.id}>
                  <button onClick={() => setView(i.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary/50">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">№ {i.number} <span className="font-normal text-muted-foreground">от {fmtDate(i.issue_date)}</span></span>
                      {resource !== "deals" && i.deal_title && <span className="block truncate text-xs text-muted-foreground">{i.deal_title}</span>}
                      {resource === "deals" && <span className="block truncate text-xs text-muted-foreground">{i.payer_name}</span>}
                    </span>
                    <span className="flex flex-col items-end gap-0.5">
                      <span className="font-medium tabular-nums">{money(i.amount)}</span>
                      <StateBadge state={i.state} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : payments.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Платежей пока нет</p>
        ) : (
          <ul className="divide-y">
            {payments.map((p) => (
              <li key={p.id} onClick={() => setEditPay(p)} className="group flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-secondary/50">
                <Icon name={PAY_METHODS[p.method]?.icon || "Wallet"} size={14} className="shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block">{fmtDate(p.paid_at)}{p.invoice_number ? ` · счёт № ${p.invoice_number}` : " · без счёта"}</span>
                  {p.note && <span className="block truncate text-xs text-muted-foreground">{p.note}</span>}
                </span>
                <span className="font-medium tabular-nums text-emerald-700">+{money(p.amount)}</span>
                <Icon name="Pencil" size={13} className="shrink-0 text-muted-foreground opacity-40 group-hover:opacity-100" />
              </li>
            ))}
          </ul>
        )}
      </div>

      {dialog === "invoice" && <InvoiceDialog preset={{ ...preset, amount: resource === "deals" ? notInvoiced || preset.amount : undefined }} onClose={() => setDialog(null)} />}
      {dialog === "payment" && <PaymentDialog preset={preset} onClose={() => setDialog(null)} />}
      {editPay && <PaymentDialog payment={editPay} onClose={() => setEditPay(null)} />}
      {view && <InvoiceView id={view} onClose={() => setView(null)} onOpen={(r, id) => { setView(null); onOpen(r, id); }} />}
    </div>
  );
};

export default BillingBlock;
