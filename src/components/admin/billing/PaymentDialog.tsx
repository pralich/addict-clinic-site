import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import { money } from "../config";
import { useOptions } from "../useCrm";
import { Combo, PAYER_TYPES, PAY_METHODS, field, num, today, useBillingReload, type Invoice, type PayerType, type Payment } from "./shared";
import type { InvoicePreset } from "./InvoiceDialog";

type Props = { invoice?: Invoice | null; preset?: InvoicePreset; payment?: Payment | null; onClose: () => void };

const PaymentDialog = ({ invoice, preset, payment, onClose }: Props) => {
  const { data: opts } = useOptions();
  const reload = useBillingReload();
  const edit = !!payment;
  const src = payment || preset || {};
  const [amount, setAmount] = useState(payment ? String(Number(payment.amount)) : invoice ? String(invoice.debt || "") : "");
  const [paidAt, setPaidAt] = useState(payment?.paid_at?.slice(0, 10) || today());
  const [method, setMethod] = useState(payment?.method || "bank");
  const [note, setNote] = useState(payment?.note || "");
  const [payerType, setPayerType] = useState<PayerType>((src.payer_type as PayerType) || "client");
  const [payer, setPayer] = useState<Record<string, number | null>>({ client_id: src.client_id ?? null, partner_id: src.partner_id ?? null, counterparty_id: src.counterparty_id ?? null });
  const [dealId, setDealId] = useState<number | null>(src.deal_id ?? null);
  const [invoiceId, setInvoiceId] = useState<number | null>(payment?.invoice_id ?? null);
  const invList = useQuery<{ items: Invoice[] }>({
    queryKey: ["crm", "billing", "invoices", { deal_id: dealId, pick: true }],
    queryFn: () => api({ resource: "billing", action: "invoices", deal_id: dealId }),
    enabled: edit && !!dealId,
  });
  const invoices = (invList.data?.items || []).filter((i) => i.state !== "canceled" || i.id === invoiceId);
  const [busy, setBusy] = useState(false);
  const meta = PAYER_TYPES[payerType];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = edit
        ? { amount: num(amount), paid_at: paidAt, method, note, invoice_id: invoiceId, ...(invoiceId ? {} : { payer_type: payerType, [meta.ref]: payer[meta.ref], deal_id: dealId }) }
        : invoice
          ? { invoice_id: invoice.id, amount: num(amount), paid_at: paidAt, method, note }
          : { payer_type: payerType, [meta.ref]: payer[meta.ref], deal_id: dealId, amount: num(amount), paid_at: paidAt, method, note };
      await api({ resource: "billing", action: "payments", id: payment?.id }, edit ? "PUT" : "POST", body);
      toast.success(edit ? "Платёж обновлён" : "Оплата записана");
      reload();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="font-heading">{edit ? "Редактирование платежа" : invoice ? `Оплата по счёту № ${invoice.number}` : "Новый платёж"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="flex flex-col gap-3">
          {edit ? (
            <>
              {!invoiceId && (
                <>
                  <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
                    {(Object.keys(PAYER_TYPES) as PayerType[]).map((k) => (
                      <button key={k} type="button" onClick={() => setPayerType(k)}
                        className={`rounded-lg py-1.5 text-sm ${payerType === k ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>{PAYER_TYPES[k].label}</button>
                    ))}
                  </div>
                  <Combo value={payer[meta.ref]} onChange={(v) => setPayer({ ...payer, [meta.ref]: v })} items={(opts?.[meta.opt] || []) as any} placeholder={`Плательщик: ${meta.label.toLowerCase()}`} />
                </>
              )}
              {invoiceId && <p className="rounded-xl bg-secondary/60 px-3 py-2 text-sm">{payment?.payer_name}{payment?.deal_title ? <span className="text-muted-foreground"> · {payment.deal_title}</span> : null}</p>}
              {!invoiceId && <Combo value={dealId} onChange={setDealId} items={opts?.deals || []} placeholder="Сделка (необязательно)" allowClear />}
              {dealId ? (
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Счёт</span>
                  <select value={invoiceId ?? ""} onChange={(e) => setInvoiceId(e.target.value ? Number(e.target.value) : null)} className={field}>
                    <option value="">Без счёта</option>
                    {invoices.map((i) => <option key={i.id} value={i.id}>№ {i.number} · {money(i.amount)} · {i.payer_name}</option>)}
                  </select>
                </label>
              ) : null}
            </>
          ) : invoice ? (
            <div className="rounded-xl bg-secondary/60 p-3 text-sm">
              <p className="font-medium">{invoice.payer_name}</p>
              <p className="text-muted-foreground">Сумма счёта {money(invoice.amount)} · оплачено {money(invoice.paid)} · остаток <b className="text-foreground">{money(invoice.debt)}</b></p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
                {(Object.keys(PAYER_TYPES) as PayerType[]).map((k) => (
                  <button key={k} type="button" onClick={() => setPayerType(k)}
                    className={`rounded-lg py-1.5 text-sm ${payerType === k ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>{PAYER_TYPES[k].label}</button>
                ))}
              </div>
              <Combo value={payer[meta.ref]} onChange={(v) => setPayer({ ...payer, [meta.ref]: v })} items={(opts?.[meta.opt] || []) as any} placeholder={`Плательщик: ${meta.label.toLowerCase()}`} />
              <Combo value={dealId} onChange={setDealId} items={opts?.deals || []} placeholder="Сделка (необязательно)" allowClear />
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Сумма, ₽</span>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" required autoFocus className={`${field} tabular-nums`} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Дата оплаты</span>
              <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required className={field} />
            </label>
          </div>
          <div>
            <span className="mb-1 block text-sm font-medium">Способ</span>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(PAY_METHODS).map(([k, m]) => (
                <button key={k} type="button" onClick={() => setMethod(k)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${method === k ? "border-foreground bg-foreground text-background" : "hover:bg-secondary"}`}>
                  <Icon name={m.icon} size={12} />{m.label}
                </button>
              ))}
            </div>
          </div>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Комментарий</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Номер платёжки, кто платил…" className={field} />
          </label>
          <button disabled={busy} className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 font-medium text-white hover:opacity-90 disabled:opacity-60">
            {busy && <Icon name="Loader2" size={16} className="animate-spin" />}{edit ? "Сохранить изменения" : "Записать оплату"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
