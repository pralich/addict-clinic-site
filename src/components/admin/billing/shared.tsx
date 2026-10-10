import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import Icon from "@/components/ui/icon";

export type PayerType = "client" | "partner" | "counterparty";

export type InvoiceItem = { name: string; qty: number; price: number; unit?: string };

export type Invoice = {
  id: number;
  number: string;
  issue_date: string;
  due_date: string | null;
  payer_type: PayerType;
  client_id: number | null;
  partner_id: number | null;
  counterparty_id: number | null;
  deal_id: number | null;
  items: InvoiceItem[];
  amount: number;
  paid: number;
  debt: number;
  status: string;
  state: InvoiceState;
  notes: string | null;
  payer_name: string | null;
  deal_title: string | null;
  created_by_name?: string | null;
};

export type Payment = {
  id: number;
  invoice_id: number | null;
  invoice_number: string | null;
  payer_type: PayerType;
  payer_name: string | null;
  deal_id: number | null;
  deal_title: string | null;
  amount: number;
  paid_at: string;
  method: string;
  note: string | null;
  created_by_name: string | null;
};

export type InvoiceState = "issued" | "partial" | "paid" | "overdue" | "canceled";

export const INVOICE_STATES: Record<InvoiceState, { label: string; cls: string; icon: string }> = {
  issued: { label: "Выставлен", cls: "bg-sky-100 text-sky-800", icon: "Send" },
  partial: { label: "Частично оплачен", cls: "bg-amber-100 text-amber-800", icon: "CircleDashed" },
  paid: { label: "Оплачен", cls: "bg-emerald-100 text-emerald-800", icon: "CircleCheck" },
  overdue: { label: "Просрочен", cls: "bg-red-100 text-red-700", icon: "AlarmClock" },
  canceled: { label: "Отменён", cls: "bg-neutral-200 text-neutral-600", icon: "Ban" },
};

export const PAYER_TYPES: Record<PayerType, { label: string; icon: string; ref: "client_id" | "partner_id" | "counterparty_id"; opt: "clients" | "partners" | "counterparties" }> = {
  client: { label: "Клиент", icon: "UserRound", ref: "client_id", opt: "clients" },
  partner: { label: "Партнёр", icon: "Building2", ref: "partner_id", opt: "partners" },
  counterparty: { label: "Контрагент", icon: "Briefcase", ref: "counterparty_id", opt: "counterparties" },
};

export const PAY_METHODS: Record<string, { label: string; icon: string }> = {
  bank: { label: "Банковский перевод", icon: "Landmark" },
  card: { label: "Карта / терминал", icon: "CreditCard" },
  cash: { label: "Наличные", icon: "Banknote" },
  online: { label: "Онлайн-оплата", icon: "Globe" },
  other: { label: "Другое", icon: "CircleEllipsis" },
};

export const CP_KINDS: Record<string, string> = { company: "Юрлицо", ip: "ИП", person: "Физлицо" };

export const StateBadge = ({ state }: { state: InvoiceState }) => {
  const s = INVOICE_STATES[state] || INVOICE_STATES.issued;
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${s.cls}`}><Icon name={s.icon} size={11} />{s.label}</span>;
};

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const addDays = (iso: string, n: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const num = (v: string | number) => Number(String(v).replace(/\s/g, "").replace(",", ".")) || 0;

export const field = "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-foreground/30";

export const useBillingReload = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["crm"] });
};

export const Combo = ({ value, onChange, items, placeholder, empty = "Ничего не найдено", allowClear }: {
  value: number | null;
  onChange: (v: number | null) => void;
  items: { id: number; name: string; hint?: string | null }[];
  placeholder: string;
  empty?: string;
  allowClear?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const cur = items.find((i) => i.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={`${field} flex items-center justify-between gap-2 text-left`}>
          <span className={`truncate ${cur ? "" : "text-muted-foreground"}`}>{cur?.name || placeholder}</span>
          <Icon name="ChevronsUpDown" size={14} className="shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Поиск…" />
          <CommandList>
            <CommandEmpty>{empty}</CommandEmpty>
            <CommandGroup>
              {allowClear && value && (
                <CommandItem value="__clear" onSelect={() => { onChange(null); setOpen(false); }} className="text-muted-foreground">Не выбрано</CommandItem>
              )}
              {items.map((i) => (
                <CommandItem key={i.id} value={`${i.name} ${i.hint || ""} #${i.id}`} onSelect={() => { onChange(i.id); setOpen(false); }}>
                  <Icon name="Check" size={14} className={`mr-2 ${i.id === value ? "opacity-100" : "opacity-0"}`} />
                  <span className="flex-1 truncate">{i.name}</span>
                  {i.hint && <span className="ml-2 text-xs text-muted-foreground">{i.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
