import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import { ORG } from "@/lib/legal";
import { fmtDate, money } from "../config";
import InvoiceDialog from "./InvoiceDialog";
import PaymentDialog from "./PaymentDialog";
import { PAYER_TYPES, PAY_METHODS, StateBadge, useBillingReload, type Invoice, type Payment } from "./shared";

type Resp = { item: Invoice; payer: Record<string, any> | null; payments: Payment[] };

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const rubWords = (n: number) => {
  const r = Math.floor(n);
  const k = Math.round((n - r) * 100);
  const m10 = r % 10, m100 = r % 100;
  const w = m10 === 1 && m100 !== 11 ? "рубль" : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? "рубля" : "рублей";
  return `${r.toLocaleString("ru-RU")} ${w} ${String(k).padStart(2, "0")} коп.`;
};

const printInvoice = (inv: Invoice, payer: Record<string, any> | null) => {
  const rows = inv.items.map((i, n) => `<tr><td>${n + 1}</td><td>${esc(i.name)}</td><td class="r">${i.qty}</td><td>${esc(i.unit || "усл.")}</td><td class="r">${i.price.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}</td><td class="r">${(i.qty * i.price).toLocaleString("ru-RU", { minimumFractionDigits: 2 })}</td></tr>`).join("");
  const payerLine = payer
    ? [payer.name, payer.inn && `ИНН ${payer.inn}`, payer.kpp && `КПП ${payer.kpp}`, payer.address, payer.phone && `тел. ${payer.phone}`].filter(Boolean).map(esc).join(", ")
    : esc(inv.payer_name);
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Счёт № ${esc(inv.number)}</title>
<style>
body{font:13px/1.4 Arial,sans-serif;color:#111;max-width:780px;margin:24px auto;padding:0 16px}
table{width:100%;border-collapse:collapse}td,th{border:1px solid #333;padding:4px 6px;vertical-align:top}
.bank td{font-size:12px}.r{text-align:right;white-space:nowrap}.nb td{border:none;padding:2px 0}
h1{font-size:20px;margin:24px 0 4px;border-bottom:2px solid #111;padding-bottom:8px}
th{background:#f3f3f3;font-weight:600}.tot td{border:none;text-align:right;font-weight:700}
.sign{margin-top:36px;display:flex;justify-content:space-between;gap:24px}.sign div{flex:1;border-bottom:1px solid #111;padding-bottom:2px}
@media print{body{margin:0}.noprint{display:none}}
</style></head><body>
<button class="noprint" onclick="print()" style="float:right;padding:8px 16px;font-size:14px;cursor:pointer">Печать / PDF</button>
<table class="bank"><tr><td colspan="2" rowspan="2" style="width:60%">${esc(ORG.bank)}<br><small>Банк получателя</small></td><td>БИК</td><td>${esc(ORG.bik)}</td></tr>
<tr><td>Сч. №</td><td>${esc(ORG.corrAccount)}</td></tr>
<tr><td>ИНН ${esc(ORG.inn)}</td><td>КПП ${esc(ORG.kpp)}</td><td rowspan="2">Сч. №</td><td rowspan="2">${esc(ORG.account)}</td></tr>
<tr><td colspan="2">${esc(ORG.fullName)}<br><small>Получатель</small></td></tr></table>
<h1>Счёт на оплату № ${esc(inv.number)} от ${fmtDate(inv.issue_date)}</h1>
<table class="nb"><tr><td style="width:110px">Поставщик:</td><td><b>${esc(ORG.fullName)}</b>, ИНН ${esc(ORG.inn)}, КПП ${esc(ORG.kpp)}, ${esc(ORG.legalAddress)}</td></tr>
<tr><td>Покупатель:</td><td><b>${payerLine}</b></td></tr>
${inv.deal_title ? `<tr><td>Основание:</td><td>${esc(inv.deal_title)}</td></tr>` : ""}</table>
<table style="margin-top:14px"><tr><th>№</th><th>Наименование</th><th>Кол-во</th><th>Ед.</th><th>Цена</th><th>Сумма</th></tr>${rows}</table>
<table style="margin-top:6px" class="tot"><tr><td>Итого:</td><td style="width:140px">${Number(inv.amount).toLocaleString("ru-RU", { minimumFractionDigits: 2 })}</td></tr>
<tr><td>Без налога (НДС)</td><td>—</td></tr><tr><td>Всего к оплате:</td><td>${Number(inv.amount).toLocaleString("ru-RU", { minimumFractionDigits: 2 })}</td></tr></table>
<p>Всего наименований ${inv.items.length}, на сумму ${Number(inv.amount).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} руб.<br><b>${rubWords(Number(inv.amount))}</b></p>
${inv.due_date ? `<p>Оплатить до ${fmtDate(inv.due_date)}.</p>` : ""}${inv.notes ? `<p>${esc(inv.notes)}</p>` : ""}
<div class="sign"><span>${esc(ORG.directorPosition)}</span><div></div><span>${esc(ORG.director)}</span></div>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) return toast.error("Разрешите всплывающие окна для печати");
  w.document.write(html);
  w.document.close();
};

const InvoiceView = ({ id, onClose, onOpen }: { id: number; onClose: () => void; onOpen?: (resource: string, id: number) => void }) => {
  const reload = useBillingReload();
  const { data, isLoading } = useQuery<Resp>({ queryKey: ["crm", "billing", "invoice", id], queryFn: () => api({ resource: "billing", action: "invoices", id }) });
  const [edit, setEdit] = useState(false);
  const [pay, setPay] = useState(false);
  const inv = data?.item;

  const setStatus = async (status: "canceled" | "issued") => {
    if (status === "canceled" && !confirm("Отменить счёт?")) return;
    try {
      await api({ resource: "billing", action: "invoices", id }, "PUT", { status });
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const removePayment = async (p: Payment) => {
    if (!confirm(`Удалить оплату ${money(p.amount)}?`)) return;
    await api({ resource: "billing", action: "payments", id: p.id }, "DELETE");
    reload();
  };
  const removeInvoice = async () => {
    if (!confirm("Удалить счёт?")) return;
    try {
      await api({ resource: "billing", action: "invoices", id }, "DELETE");
      reload();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const payerRes = inv ? ({ client: "clients", partner: "partners", counterparty: "" } as const)[inv.payer_type] : "";
  const payerId = inv ? inv[PAYER_TYPES[inv.payer_type].ref] : null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        {isLoading || !inv ? (
          <div className="flex h-40 items-center justify-center"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2 font-heading">Счёт № {inv.number}<StateBadge state={inv.state} /></DialogTitle>
              <p className="text-sm text-muted-foreground">от {fmtDate(inv.issue_date)}{inv.due_date ? ` · оплатить до ${fmtDate(inv.due_date)}` : ""}</p>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Сумма</p><p className="font-heading text-lg font-semibold tabular-nums">{money(inv.amount)}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Оплачено</p><p className="font-heading text-lg font-semibold tabular-nums text-emerald-700">{money(inv.paid)}</p></div>
              <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Остаток</p><p className={`font-heading text-lg font-semibold tabular-nums ${inv.debt > 0 ? "text-primary" : ""}`}>{money(inv.debt)}</p></div>
            </div>
            {inv.amount > 0 && (
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (inv.paid / inv.amount) * 100)}%` }} /></div>
            )}

            <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{PAYER_TYPES[inv.payer_type].label}</dt>
              <dd>
                {payerRes && onOpen && payerId ? (
                  <button className="text-primary hover:underline" onClick={() => onOpen(payerRes, payerId)}>{inv.payer_name}</button>
                ) : inv.payer_name}
                {data?.payer?.inn && <span className="text-muted-foreground"> · ИНН {data.payer.inn}</span>}
              </dd>
              {inv.deal_title && (
                <>
                  <dt className="text-muted-foreground">Сделка</dt>
                  <dd>{onOpen && inv.deal_id ? <button className="text-primary hover:underline" onClick={() => onOpen("deals", inv.deal_id!)}>{inv.deal_title}</button> : inv.deal_title}</dd>
                </>
              )}
              {inv.notes && (<><dt className="text-muted-foreground">Комментарий</dt><dd className="whitespace-pre-wrap">{inv.notes}</dd></>)}
            </dl>

            <div className="overflow-hidden rounded-xl border text-sm">
              {inv.items.map((i, n) => (
                <div key={n} className="flex items-center gap-3 border-b px-3 py-2 last:border-b-0">
                  <span className="flex-1">{i.name}</span>
                  <span className="whitespace-nowrap text-muted-foreground">{i.qty} {i.unit || "усл."} × {money(i.price)}</span>
                  <span className="w-28 text-right font-medium tabular-nums">{money(i.qty * i.price)}</span>
                </div>
              ))}
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Оплаты · {data.payments.length}</p>
              {data.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Оплат пока нет</p>
              ) : (
                <ul className="divide-y rounded-xl border">
                  {data.payments.map((p) => (
                    <li key={p.id} className="group flex items-center gap-3 px-3 py-2 text-sm">
                      <Icon name={PAY_METHODS[p.method]?.icon || "Wallet"} size={15} className="text-muted-foreground" />
                      <span className="flex-1">{fmtDate(p.paid_at)} · {PAY_METHODS[p.method]?.label}{p.note ? ` · ${p.note}` : ""}</span>
                      <span className="font-medium tabular-nums text-emerald-700">+{money(p.amount)}</span>
                      <button onClick={() => removePayment(p)} className="text-muted-foreground opacity-0 hover:text-primary group-hover:opacity-100" aria-label="Удалить"><Icon name="Trash2" size={14} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-4">
              {inv.state !== "canceled" && inv.state !== "paid" && (
                <button onClick={() => setPay(true)} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-emerald-600 px-4 text-sm font-medium text-white hover:opacity-90"><Icon name="Plus" size={15} />Записать оплату</button>
              )}
              <button onClick={() => printInvoice(inv, data.payer)} className="inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm hover:bg-secondary"><Icon name="Printer" size={15} />Печать / PDF</button>
              {inv.state !== "canceled" && <button onClick={() => setEdit(true)} className="inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm hover:bg-secondary"><Icon name="Pencil" size={14} />Изменить</button>}
              <div className="ml-auto flex gap-2">
                {inv.state === "canceled" ? (
                  <button onClick={() => setStatus("issued")} className="h-10 rounded-full px-3 text-sm text-muted-foreground hover:text-foreground">Восстановить</button>
                ) : (
                  <button onClick={() => setStatus("canceled")} className="h-10 rounded-full px-3 text-sm text-muted-foreground hover:text-primary">Отменить</button>
                )}
                {data.payments.length === 0 && <button onClick={removeInvoice} className="h-10 rounded-full px-3 text-sm text-muted-foreground hover:text-primary" aria-label="Удалить"><Icon name="Trash2" size={15} /></button>}
              </div>
            </div>
          </>
        )}
        {edit && inv && <InvoiceDialog invoice={inv} onClose={() => setEdit(false)} />}
        {pay && inv && <PaymentDialog invoice={inv} onClose={() => setPay(false)} />}
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceView;
