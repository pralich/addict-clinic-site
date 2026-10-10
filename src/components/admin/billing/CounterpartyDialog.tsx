import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/crm-api";
import { CP_KINDS, field, useBillingReload } from "./shared";

export type Counterparty = {
  id: number;
  name: string;
  kind: string;
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  address: string | null;
  bank: string | null;
  bik: string | null;
  account: string | null;
  corr_account: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  invoiced?: number;
  received?: number;
};

const FIELDS: { k: keyof Counterparty; label: string; full?: boolean; group: string; for?: string[] }[] = [
  { k: "name", label: "Название / ФИО", full: true, group: "main" },
  { k: "inn", label: "ИНН", group: "main" },
  { k: "kpp", label: "КПП", group: "main", for: ["company"] },
  { k: "ogrn", label: "ОГРН / ОГРНИП", group: "main", for: ["company", "ip"] },
  { k: "address", label: "Адрес", full: true, group: "main" },
  { k: "bank", label: "Банк", full: true, group: "bank" },
  { k: "bik", label: "БИК", group: "bank" },
  { k: "account", label: "Расчётный счёт", group: "bank" },
  { k: "corr_account", label: "Корр. счёт", group: "bank" },
  { k: "contact_person", label: "Контактное лицо", group: "contact" },
  { k: "phone", label: "Телефон", group: "contact" },
  { k: "email", label: "Эл. почта", group: "contact" },
];

const GROUPS = [
  { id: "main", label: "Реквизиты" },
  { id: "bank", label: "Банк" },
  { id: "contact", label: "Контакты" },
];

const CounterpartyDialog = ({ cp, onClose, onSaved }: { cp?: Counterparty | null; onClose: () => void; onSaved?: (cp: Counterparty) => void }) => {
  const reload = useBillingReload();
  const [f, setF] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = { kind: cp?.kind || "company", notes: cp?.notes || "" };
    FIELDS.forEach((x) => (d[x.k] = (cp?.[x.k] as string) || ""));
    return d;
  });
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      const res = await api<{ item: Counterparty }>({ resource: "billing", action: "counterparties", id: cp?.id }, cp ? "PUT" : "POST", f);
      toast.success(cp ? "Контрагент обновлён" : "Контрагент добавлен");
      reload();
      onSaved?.(res.item);
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader><DialogTitle className="font-heading">{cp ? cp.name : "Новый контрагент"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-secondary p-1">
            {Object.entries(CP_KINDS).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setF({ ...f, kind: k })}
                className={`rounded-lg py-2 text-sm ${f.kind === k ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}>{l}</button>
            ))}
          </div>
          {GROUPS.map((g) => {
            const list = FIELDS.filter((x) => x.group === g.id && (!x.for || x.for.includes(f.kind)));
            if (f.kind === "person" && g.id === "bank") return null;
            return (
              <div key={g.id}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {list.map((x) => (
                    <label key={x.k} className={`text-sm ${x.full ? "sm:col-span-2" : ""}`}>
                      <span className="mb-1 block text-muted-foreground">{x.label}{x.k === "name" && <span className="text-primary"> *</span>}</span>
                      <input value={f[x.k]} onChange={(e) => setF({ ...f, [x.k]: e.target.value })} required={x.k === "name"} className={field} />
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          <label className="text-sm">
            <span className="mb-1 block text-muted-foreground">Заметки</span>
            <textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} rows={2} className={`${field} h-auto py-2`} />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="h-10 rounded-full border px-5 text-sm hover:bg-secondary">Отмена</button>
            <button disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {busy && <Icon name="Loader2" size={15} className="animate-spin" />}Сохранить
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CounterpartyDialog;
