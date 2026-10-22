import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import Icon from "@/components/ui/icon";
import { mskDateKey, mskToday } from "@/lib/msk";

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
  client_id?: number | null;
  partner_id?: number | null;
  counterparty_id?: number | null;
  deal_id: number | null;
  deal_title: string | null;
  amount: number;
  paid_at: string;
  purpose?: "commission" | "treatment";
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

export const today = () => mskToday();

export const addDays = (iso: string, n: number) => {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return mskDateKey(y, m - 1, d + n);
};

export const num = (v: string | number) => Number(String(v).replace(/\s/g, "").replace(",", ".")) || 0;

export const field = "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-foreground/30";

export const useBillingReload = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["crm"] });
};

const ITEM = "group/item mx-1 flex cursor-pointer items-center gap-2.5 rounded-lg border-0 px-2.5 py-2 text-sm shadow-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 aria-selected:bg-secondary data-[selected=true]:bg-secondary";
const initials = (n: string) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

const Avatar = ({ name }: { name: string }) => (
  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-muted-foreground group-data-[selected=true]/item:bg-card">{initials(name) || "?"}</span>
);

const ComboList = ({ items, isOn, onPick, empty, clear, avatars }: {
  items: { id: number; name: string; hint?: string | null }[];
  isOn: (id: number) => boolean;
  onPick: (id: number) => void;
  empty: string;
  clear?: React.ReactNode;
  avatars?: boolean;
}) => (
  <Command className="rounded-xl outline-none focus:outline-none [&_[cmdk-item]]:outline-none">
    <CommandInput placeholder="Поиск…" className="h-10" />
    <CommandList className="max-h-[280px] py-1 outline-none focus:outline-none">
      <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">{empty}</CommandEmpty>
      <CommandGroup className="p-0">
        {clear}
        {items.map((i) => {
          const on = isOn(i.id);
          return (
            <CommandItem key={i.id} value={`${i.name} ${i.hint || ""} #${i.id}`} onSelect={() => onPick(i.id)} className={ITEM}>
              {avatars && <Avatar name={i.name} />}
              <span className={`flex-1 truncate ${on ? "font-medium" : ""}`}>{i.name}</span>
              {i.hint && <span className="shrink-0 text-xs text-muted-foreground">{i.hint}</span>}
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${on ? "bg-primary text-primary-foreground" : ""}`}>
                {on && <Icon name="Check" size={11} />}
              </span>
            </CommandItem>
          );
        })}
      </CommandGroup>
    </CommandList>
  </Command>
);

export const Combo = ({ value, onChange, items, placeholder, empty = "Ничего не найдено", allowClear, avatars }: {
  value: number | null;
  onChange: (v: number | null) => void;
  items: { id: number; name: string; hint?: string | null }[];
  placeholder: string;
  empty?: string;
  allowClear?: boolean;
  avatars?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const cur = items.find((i) => i.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={`${field} flex items-center justify-between gap-2 text-left ${open ? "border-foreground/30" : ""}`}>
          <span className="flex min-w-0 items-center gap-2">
            {avatars && cur && <Avatar name={cur.name} />}
            <span className={`truncate ${cur ? "" : "text-muted-foreground"}`}>{cur?.name || placeholder}</span>
          </span>
          <Icon name="ChevronDown" size={15} className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[220px] overflow-hidden rounded-xl p-0 shadow-lg" align="start" sideOffset={6}>
        <ComboList items={items} empty={empty} avatars={avatars} isOn={(id) => id === value}
          onPick={(id) => { onChange(id); setOpen(false); }}
          clear={allowClear && value ? (
            <CommandItem value="__clear" onSelect={() => { onChange(null); setOpen(false); }} className={`${ITEM} text-muted-foreground`}>
              <Icon name="X" size={14} />Не выбрано
            </CommandItem>
          ) : null} />
      </PopoverContent>
    </Popover>
  );
};

export const MultiCombo = ({ value, onChange, items, placeholder, empty = "Ничего не найдено", avatars }: {
  value: number[];
  onChange: (v: number[]) => void;
  items: { id: number; name: string; hint?: string | null }[];
  placeholder: string;
  empty?: string;
  avatars?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const chosen = value.map((id) => items.find((i) => i.id === id)).filter(Boolean) as typeof items;
  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div role="button" tabIndex={0} className={`${field} flex h-auto min-h-10 cursor-pointer flex-wrap items-center gap-1.5 py-1.5 text-left ${open ? "border-foreground/30" : ""}`}>
          {chosen.length === 0 && <span className="flex-1 text-muted-foreground">{placeholder}</span>}
          {chosen.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-secondary py-0.5 pl-1 pr-1.5 text-xs">
              {avatars && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-card text-[9px] font-semibold">{initials(c.name)}</span>}
              {c.name}
              <button type="button" onClick={(e) => { e.stopPropagation(); toggle(c.id); }} className="text-muted-foreground hover:text-foreground" aria-label="Убрать"><Icon name="X" size={12} /></button>
            </span>
          ))}
          <Icon name="Plus" size={15} className="ml-auto shrink-0 text-muted-foreground" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[220px] overflow-hidden rounded-xl p-0 shadow-lg" align="start" sideOffset={6}>
        <ComboList items={items} empty={empty} avatars={avatars} isOn={(id) => value.includes(id)} onPick={toggle} />
      </PopoverContent>
    </Popover>
  );
};