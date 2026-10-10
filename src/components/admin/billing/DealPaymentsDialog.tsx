import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import { fmtDate, money } from "../config";
import PaymentDialog from "./PaymentDialog";
import { PAY_METHODS, useBillingReload, type Payment } from "./shared";
import type { InvoicePreset } from "./InvoiceDialog";

type Props = { dealId: number; title: string; preset: InvoicePreset; onClose: () => void };

const DealPaymentsDialog = ({ dealId, title, preset, onClose }: Props) => {
  const reload = useBillingReload();
  const { data, isLoading } = useQuery<{ items: Payment[] }>({
    queryKey: ["crm", "billing", "payments", { deal_id: dealId }],
    queryFn: () => api({ resource: "billing", action: "payments", deal_id: dealId }),
  });
  const [edit, setEdit] = useState<Payment | null>(null);
  const [adding, setAdding] = useState(false);
  const items = data?.items ?? [];
  const total = items.reduce((a, p) => a + Number(p.amount), 0);

  const remove = async (p: Payment) => {
    if (!confirm(`Удалить оплату ${money(p.amount)} от ${fmtDate(p.paid_at)}?`)) return;
    try {
      await api({ resource: "billing", action: "payments", id: p.id }, "DELETE");
      toast.success("Платёж удалён");
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <Dialog open={!edit && !adding} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-lg" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="font-heading">Платежи по сделке</DialogTitle>
            <p className="text-sm text-muted-foreground">{title}</p>
          </DialogHeader>
          <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Всего получено</span>
            <b className="tabular-nums text-emerald-700">{money(total)}</b>
          </div>
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Загрузка…</p>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Платежей пока нет</p>
          ) : (
            <ul className="max-h-[50vh] divide-y overflow-y-auto rounded-xl border">
              {items.map((p) => (
                <li key={p.id} className="flex items-center gap-2 px-3 py-2.5 text-sm">
                  <Icon name={PAY_METHODS[p.method]?.icon || "Wallet"} size={15} className="shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block">{fmtDate(p.paid_at)} · {PAY_METHODS[p.method]?.label}{p.invoice_number ? ` · счёт № ${p.invoice_number}` : ""}</span>
                    <span className="block truncate text-xs text-muted-foreground">{p.payer_name}{p.note ? ` · ${p.note}` : ""}</span>
                  </span>
                  <span className="font-medium tabular-nums text-emerald-700">+{money(p.amount)}</span>
                  <button onClick={() => setEdit(p)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Изменить"><Icon name="Pencil" size={14} /></button>
                  <button onClick={() => remove(p)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary" aria-label="Удалить"><Icon name="Trash2" size={14} /></button>
                </li>
              ))}
            </ul>
          )}
          <button onClick={() => setAdding(true)} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border text-sm font-medium hover:bg-secondary">
            <Icon name="Plus" size={15} />Добавить платёж
          </button>
        </DialogContent>
      </Dialog>
      {edit && <div onClick={(e) => e.stopPropagation()}><PaymentDialog payment={edit} onClose={() => setEdit(null)} /></div>}
      {adding && <div onClick={(e) => e.stopPropagation()}><PaymentDialog preset={preset} onClose={() => setAdding(false)} /></div>}
    </>
  );
};

export default DealPaymentsDialog;
