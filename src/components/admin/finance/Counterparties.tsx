import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import { money } from "../config";
import CounterpartyDialog, { type Counterparty } from "../billing/CounterpartyDialog";
import InvoiceDialog from "../billing/InvoiceDialog";
import { CP_KINDS, useBillingReload } from "../billing/shared";

const Counterparties = () => {
  const reload = useBillingReload();
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<Counterparty | "new" | null>(null);
  const [invoiceFor, setInvoiceFor] = useState<number | null>(null);
  const { data, isLoading } = useQuery<{ items: Counterparty[] }>({
    queryKey: ["crm", "billing", "counterparties", search],
    queryFn: () => api({ resource: "billing", action: "counterparties", search }),
  });

  const remove = async (c: Counterparty) => {
    if (!confirm(`Удалить контрагента «${c.name}»?`)) return;
    await api({ resource: "billing", action: "counterparties", id: c.id }, "DELETE");
    toast("Контрагент удалён");
    reload();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Название, ИНН или контакт" className="h-10 w-full rounded-lg border bg-card pl-9 pr-3 text-sm outline-none" />
        </div>
        <button onClick={() => setEdit("new")} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"><Icon name="Plus" size={15} />Контрагент</button>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>
      ) : !data?.items.length ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center text-sm text-muted-foreground">
          <Icon name="Briefcase" size={24} />
          <p>Здесь будут организации и люди, которым вы выставляете счета:<br />страховые, работодатели, фонды, поставщики</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((c) => {
            const debt = Math.max(0, Number(c.invoiced || 0) - Number(c.received || 0));
            return (
              <div key={c.id} className="group flex flex-col rounded-xl border bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary"><Icon name={c.kind === "person" ? "UserRound" : "Building2"} size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{CP_KINDS[c.kind]}{c.inn ? ` · ИНН ${c.inn}` : ""}</p>
                  </div>
                  <div className="flex gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                    <button onClick={() => setEdit(c)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Изменить"><Icon name="Pencil" size={14} /></button>
                    <button onClick={() => remove(c)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary" aria-label="Удалить"><Icon name="Trash2" size={14} /></button>
                  </div>
                </div>
                {(c.contact_person || c.phone || c.email) && (
                  <p className="mt-3 truncate text-sm text-muted-foreground">{[c.contact_person, c.phone, c.email].filter(Boolean).join(" · ")}</p>
                )}
                <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
                  <div><p className="text-muted-foreground">Выставлено</p><p className="font-medium tabular-nums">{money(c.invoiced)}</p></div>
                  <div><p className="text-muted-foreground">Получено</p><p className="font-medium tabular-nums text-emerald-700">{money(c.received)}</p></div>
                  <div><p className="text-muted-foreground">Долг</p><p className={`font-medium tabular-nums ${debt > 0 ? "text-primary" : ""}`}>{money(debt)}</p></div>
                </div>
                <button onClick={() => setInvoiceFor(c.id)} className="mt-3 inline-flex h-8 items-center justify-center gap-1.5 rounded-full border text-xs hover:bg-secondary"><Icon name="FilePlus" size={13} />Выставить счёт</button>
              </div>
            );
          })}
        </div>
      )}

      {edit && <CounterpartyDialog cp={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
      {invoiceFor && <InvoiceDialog preset={{ payer_type: "counterparty", counterparty_id: invoiceFor }} onClose={() => setInvoiceFor(null)} />}
    </div>
  );
};

export default Counterparties;
