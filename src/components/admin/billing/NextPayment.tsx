import { useState } from "react";
import Icon from "@/components/ui/icon";
import InvoiceDialog, { type InvoicePreset } from "./InvoiceDialog";
import { PAYMENT_SCHEDULES, PAY_SCHEDULE_HINT, daysUntil, dueTone, fmtDate, money } from "../config";

type Deal = Record<string, any>;

export const nextPaymentPreset = (d: Deal, dealId: number): InvoicePreset => {
  const base = d.partner_id
    ? { payer_type: "partner" as const, partner_id: d.partner_id }
    : { payer_type: "client" as const, client_id: d.client_id };
  const due = d.next_payment_date ? String(d.next_payment_date).slice(0, 10) : undefined;
  return {
    ...base,
    deal_id: dealId,
    title: d.title,
    amount: Number(d.next_payment_amount) || undefined,
    itemName: `Комиссия по сделке «${d.title}»${d.full_name ? `, пациент ${d.full_name}` : ""}${d.payment_index ? `, платёж ${d.payment_index} из ${d.payments_total}` : ""}${due ? ` — до ${fmtDate(due)}` : ""}`,
    dueDate: due,
    periodDate: due,
  };
};

export const DueBadge = ({ date, className = "" }: { date?: string | null; className?: string }) => {
  const t = dueTone(daysUntil(date));
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${t.cls} ${className}`}><i className={`block h-1.5 w-1.5 rounded-full ${t.dot}`} />{t.label}</span>;
};

export const InvoiceButton = ({ deal, dealId, compact = false }: { deal: Deal; dealId: number; compact?: boolean }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-primary font-medium text-primary-foreground hover:opacity-90 ${compact ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-sm"}`}
      >
        <Icon name="FilePlus" size={compact ? 12 : 14} />Выставить счёт
      </button>
      {open && <div onClick={(e) => e.stopPropagation()}><InvoiceDialog preset={nextPaymentPreset(deal, dealId)} onClose={() => setOpen(false)} /></div>}
    </>
  );
};

const NextPayment = ({ deal, onEdit }: { deal: Deal; onEdit: () => void }) => {
  const has = !!deal.next_payment_date;
  const days = daysUntil(deal.next_payment_date);
  const t = dueTone(days);
  const urgent = days !== null && days <= 3;

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Ближайший платёж</p>
      {!has ? (
        deal.check_in_date && deal.payments_total ? (
          <div className="flex items-center gap-3 rounded-xl border bg-emerald-50/60 p-4 text-sm text-emerald-900">
            <Icon name="CircleCheck" size={18} />Все {deal.payments_total} {deal.payments_total === 1 ? "платёж выставлен" : "платежей выставлены"} по графику
          </div>
        ) : (
          <button onClick={onEdit} className="flex w-full items-center gap-3 rounded-xl border border-dashed p-4 text-left text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
            <Icon name="CalendarPlus" size={18} />Укажите дату заезда — график платежей рассчитается от неё
          </button>
        )
      ) : (
        <div className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 ${urgent ? "border-amber-300 bg-amber-50/60" : "bg-card"} ${days !== null && days < 0 ? "border-primary/40 bg-primary/5" : ""}`}>
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.cls}`}><Icon name="CalendarClock" size={20} /></span>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-lg font-semibold leading-tight">{deal.next_payment_amount ? money(deal.next_payment_amount) : "Комиссия не указана"}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              до {fmtDate(deal.next_payment_date)} <DueBadge date={deal.next_payment_date} />
            </p>
            <p className="mt-1 text-xs text-muted-foreground" title={PAY_SCHEDULE_HINT}>
              Платёж {deal.payment_index} из {deal.payments_total} · {(PAYMENT_SCHEDULES[deal.payment_schedule] || "Ежемесячно").toLowerCase()} от заезда {fmtDate(deal.check_in_date)}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <InvoiceButton deal={deal} dealId={deal.id} />
            <button onClick={onEdit} className="text-muted-foreground hover:text-foreground" title="Изменить"><Icon name="Pencil" size={15} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NextPayment;
