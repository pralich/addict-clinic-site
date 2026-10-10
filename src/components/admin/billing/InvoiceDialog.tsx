import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import { money } from "../config";
import { useOptions } from "../useCrm";
import CounterpartyDialog from "./CounterpartyDialog";
import { Combo, PAYER_TYPES, addDays, field, num, today, useBillingReload, type Invoice, type InvoiceItem, type PayerType } from "./shared";

export type InvoicePreset = Partial<Pick<Invoice, "payer_type" | "client_id" | "partner_id" | "counterparty_id" | "deal_id">> & { amount?: number; title?: string };

type Row = { name: string; qty: string; price: string; unit: string };

const toRow = (i: InvoiceItem): Row => ({ name: i.name, qty: String(i.qty), price: String(i.price), unit: i.unit || "усл." });

const InvoiceDialog = ({ invoice, preset, onClose }: { invoice?: Invoice | null; preset?: InvoicePreset; onClose: () => void }) => {
  const { data: opts } = useOptions();
  const reload = useBillingReload();
  const src = invoice || preset || {};
  const [payerType, setPayerType] = useState<PayerType>((src.payer_type as PayerType) || "client");
  const [payer, setPayer] = useState<Record<string, number | null>>({
    client_id: src.client_id ?? null,
    partner_id: src.partner_id ?? null,
    counterparty_id: src.counterparty_id ?? null,
  });
  const [dealId, setDealId] = useState<number | null>(src.deal_id ?? null);
  const [issue, setIssue] = useState(invoice?.issue_date?.slice(0, 10) || today());
  const [due, setDue] = useState(invoice?.due_date?.slice(0, 10) || addDays(today(), 5));
  const [notes, setNotes] = useState(invoice?.notes || "");
  const [rows, setRows] = useState<Row[]>(() =>
    invoice?.items?.length
      ? invoice.items.map(toRow)
      : [{ name: preset?.title ? `Оплата услуг по договору: ${preset.title}` : "", qty: "1", price: preset?.amount ? String(preset.amount) : "", unit: "усл." }],
  );
  const [busy, setBusy] = useState(false);
  const [newCp, setNewCp] = useState(false);

  const meta = PAYER_TYPES[payerType];
  const payerItems = (opts?.[meta.opt] || []).map((o: any) => ({ id: o.id, name: o.name, hint: o.inn ? `ИНН ${o.inn}` : null }));
  const curPayer = payer[meta.ref];
  const deals = (opts?.deals || []).filter((d) => !curPayer || payerType === "counterparty" || d[meta.ref as "client_id" | "partner_id"] === curPayer);
  const total = rows.reduce((a, r) => a + num(r.qty) * num(r.price), 0);

  const setRow = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (i === j ? { ...r, ...patch } : r)));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!curPayer) return toast.error("Выберите плательщика");
    setBusy(true);
    try {
      const body = {
        payer_type: payerType,
        [meta.ref]: curPayer,
        deal_id: dealId,
        issue_date: issue,
        due_date: due || null,
        notes,
        items: rows.filter((r) => r.name.trim()).map((r) => ({ name: r.name, qty: num(r.qty), price: num(r.price), unit: r.unit })),
      };
      const res = await api<{ item: Invoice }>({ resource: "billing", action: "invoices", id: invoice?.id }, invoice ? "PUT" : "POST", body);
      toast.success(invoice ? "Счёт обновлён" : `Счёт № ${res.item.number} выставлен`);
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
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle className="font-heading">{invoice ? `Счёт № ${invoice.number}` : "Новый счёт"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="flex flex-col gap-4">
          <div>
            <p className="mb-1.5 text-sm font-medium">Кому выставляем</p>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
              {(Object.keys(PAYER_TYPES) as PayerType[]).map((k) => (
                <button key={k} type="button" onClick={() => { setPayerType(k); setDealId(null); }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm ${payerType === k ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>
                  <Icon name={PAYER_TYPES[k].icon} size={14} />{PAYER_TYPES[k].label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1.5 block font-medium">{meta.label}<span className="text-primary"> *</span></span>
              <div className="flex gap-1.5">
                <div className="min-w-0 flex-1">
                  <Combo value={curPayer} onChange={(v) => setPayer({ ...payer, [meta.ref]: v })} items={payerItems} placeholder={`Выберите: ${meta.label.toLowerCase()}`} />
                </div>
                {payerType === "counterparty" && (
                  <button type="button" onClick={() => setNewCp(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border hover:bg-secondary" title="Новый контрагент">
                    <Icon name="Plus" size={16} />
                  </button>
                )}
              </div>
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block font-medium">Сделка</span>
              <Combo value={dealId} onChange={setDealId} items={deals} placeholder="Без привязки" allowClear />
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block font-medium">Дата счёта</span>
              <input type="date" value={issue} onChange={(e) => setIssue(e.target.value)} className={field} required />
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block font-medium">Оплатить до</span>
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={field} />
            </label>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium">Позиции</p>
            <div className="overflow-hidden rounded-xl border">
              <div className="hidden grid-cols-[1fr_70px_70px_110px_32px] gap-2 bg-secondary/60 px-3 py-2 text-xs text-muted-foreground sm:grid">
                <span>Наименование</span><span>Кол-во</span><span>Ед.</span><span className="text-right">Цена, ₽</span><span />
              </div>
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_32px] gap-2 border-t px-3 py-2 first:border-t-0 sm:grid-cols-[1fr_70px_70px_110px_32px] sm:first:border-t">
                  <input value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} placeholder="Услуга или товар" className={`${field} h-9`} />
                  <button type="button" onClick={() => setRows(rows.length > 1 ? rows.filter((_, j) => j !== i) : rows)} className="flex h-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-primary sm:order-last" aria-label="Удалить">
                    <Icon name="X" size={14} />
                  </button>
                  <div className="col-span-2 grid grid-cols-3 gap-2 sm:contents">
                    <input value={r.qty} onChange={(e) => setRow(i, { qty: e.target.value })} inputMode="decimal" className={`${field} h-9`} />
                    <input value={r.unit} onChange={(e) => setRow(i, { unit: e.target.value })} className={`${field} h-9`} />
                    <input value={r.price} onChange={(e) => setRow(i, { price: e.target.value })} inputMode="decimal" placeholder="0" className={`${field} h-9 text-right tabular-nums`} />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t bg-secondary/30 px-3 py-2.5">
                <button type="button" onClick={() => setRows([...rows, { name: "", qty: "1", price: "", unit: "усл." }])} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  <Icon name="Plus" size={14} />Добавить позицию
                </button>
                <span className="text-sm">Итого: <b className="font-heading text-base tabular-nums">{money(total)}</b></span>
              </div>
            </div>
          </div>

          <label className="text-sm">
            <span className="mb-1.5 block font-medium">Комментарий</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${field} h-auto py-2`} placeholder="Назначение платежа, условия…" />
          </label>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="h-10 rounded-full border px-5 text-sm hover:bg-secondary">Отмена</button>
            <button disabled={busy || total <= 0} className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {busy && <Icon name="Loader2" size={15} className="animate-spin" />}{invoice ? "Сохранить" : "Выставить счёт"}
            </button>
          </div>
        </form>
        {newCp && (
          <CounterpartyDialog onClose={() => setNewCp(false)} onSaved={(cp) => { setPayer({ ...payer, counterparty_id: cp.id }); setNewCp(false); }} />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDialog;
