import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/crm-api";
import { fmtDate, money } from "../config";
import { EXPENSE_CATS, INCOME_CATS, Kpi, PeriodPicker, catLabel, downloadCsv, usePeriod } from "./shared";

type Op = {
  id: number;
  kind: "income" | "expense";
  category: string;
  amount: number;
  op_date: string;
  description: string | null;
  counterparty: string | null;
  created_by_name: string | null;
};

type Resp = {
  items: Op[];
  summary: { income: number; expense: number; net: number };
  by_category: { kind: string; category: string; amount: number }[];
};

const today = () => new Date().toISOString().slice(0, 10);
const empty = (kind: "income" | "expense" = "expense") => ({ kind, category: kind === "income" ? "services" : "salary", amount: "", op_date: today(), description: "", counterparty: "" });
const field = "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-foreground/30";

const OpDialog = ({ op, onClose, onSaved }: { op: Op | "new-income" | "new-expense" | null; onClose: () => void; onSaved: () => void }) => {
  const editing = op && typeof op === "object" ? op : null;
  const [f, setF] = useState(() =>
    editing
      ? { kind: editing.kind, category: editing.category, amount: String(editing.amount), op_date: editing.op_date.slice(0, 10), description: editing.description || "", counterparty: editing.counterparty || "" }
      : empty(op === "new-income" ? "income" : "expense"),
  );
  const [busy, setBusy] = useState(false);
  const cats = f.kind === "income" ? INCOME_CATS : EXPENSE_CATS;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...f, amount: Number(String(f.amount).replace(/\s/g, "").replace(",", ".")) };
      await api({ resource: "finance", action: "ops", id: editing?.id }, editing ? "PUT" : "POST", body);
      toast.success(editing ? "Операция обновлена" : "Операция добавлена");
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!op} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{editing ? "Редактировать операцию" : "Новая операция"}</DialogTitle></DialogHeader>
        <form onSubmit={save} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
            {(["income", "expense"] as const).map((k) => (
              <button type="button" key={k} onClick={() => setF({ ...f, kind: k, category: k === "income" ? "services" : "salary" })}
                className={`rounded-full py-1.5 text-sm ${f.kind === k ? (k === "income" ? "bg-emerald-600 font-medium text-white" : "bg-primary font-medium text-primary-foreground") : "text-muted-foreground"}`}>
                {k === "income" ? "Доход" : "Расход"}
              </button>
            ))}
          </div>
          <label className="text-xs text-muted-foreground">Категория
            <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={`${field} mt-1 text-foreground`}>
              {Object.entries(cats).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-muted-foreground">Сумма, ₽
              <input required inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="0" className={`${field} mt-1 text-foreground`} />
            </label>
            <label className="text-xs text-muted-foreground">Дата
              <input required type="date" value={f.op_date} onChange={(e) => setF({ ...f, op_date: e.target.value })} className={`${field} mt-1 text-foreground`} />
            </label>
          </div>
          <label className="text-xs text-muted-foreground">Контрагент
            <input value={f.counterparty} onChange={(e) => setF({ ...f, counterparty: e.target.value })} placeholder="Кому платили / от кого поступление" className={`${field} mt-1 text-foreground`} />
          </label>
          <label className="text-xs text-muted-foreground">Комментарий
            <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={2} className={`${field} mt-1 h-auto py-2 text-foreground`} />
          </label>
          <button disabled={busy} className="mt-1 flex h-11 items-center justify-center gap-2 rounded-full bg-primary font-medium text-primary-foreground disabled:opacity-60">
            {busy && <Icon name="Loader2" size={16} className="animate-spin" />}Сохранить
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const Operations = () => {
  const qc = useQueryClient();
  const p = usePeriod();
  const [kind, setKind] = useState("");
  const [dialog, setDialog] = useState<Op | "new-income" | "new-expense" | null>(null);
  const { data, isLoading } = useQuery<Resp>({
    queryKey: ["crm", "finance", "ops", p.range, kind],
    queryFn: () => api({ resource: "finance", action: "ops", from: p.range[0], to: p.range[1], kind }),
  });
  const reload = () => qc.invalidateQueries({ queryKey: ["crm", "finance"] });
  const s = data?.summary;
  const expenses = data?.by_category.filter((c) => c.kind === "expense") ?? [];
  const maxExp = Math.max(1, ...expenses.map((c) => c.amount));

  const remove = async (op: Op) => {
    if (!confirm(`Удалить операцию на ${money(op.amount)}?`)) return;
    await api({ resource: "finance", action: "ops", id: op.id }, "DELETE");
    toast("Операция удалена");
    reload();
  };

  const exportCsv = () =>
    data &&
    downloadCsv(`operations_${p.range[0]}_${p.range[1]}.csv`, [
      ["Дата", "Тип", "Категория", "Сумма", "Контрагент", "Комментарий", "Добавил"],
      ...data.items.map((o) => [fmtDate(o.op_date), o.kind === "income" ? "Доход" : "Расход", catLabel(o.kind, o.category), o.kind === "income" ? o.amount : -o.amount, o.counterparty || "", o.description || "", o.created_by_name || ""]),
    ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodPicker p={p} />
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCsv} disabled={!data?.items.length} className="inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm hover:bg-secondary disabled:opacity-50"><Icon name="Download" size={14} />CSV</button>
          <button onClick={() => setDialog("new-income")} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-emerald-600 px-4 text-sm font-medium text-white hover:opacity-90"><Icon name="Plus" size={15} />Доход</button>
          <button onClick={() => setDialog("new-expense")} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"><Icon name="Minus" size={15} />Расход</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Доходы (вручную)" value={money(s?.income)} tone="pos" />
        <Kpi label="Расходы" value={money(s?.expense)} tone="neg" />
        <Kpi label="Итого" value={money(s?.net)} tone={(s?.net ?? 0) >= 0 ? "pos" : "neg"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="flex gap-1 border-b p-2">
            {[["", "Все"], ["income", "Доходы"], ["expense", "Расходы"]].map(([k, l]) => (
              <button key={k} onClick={() => setKind(k)} className={`rounded-lg px-3 py-1.5 text-sm ${kind === k ? "bg-secondary font-medium" : "text-muted-foreground"}`}>{l}</button>
            ))}
          </div>
          {isLoading ? (
            <div className="flex h-40 items-center justify-center"><Icon name="Loader2" className="animate-spin text-muted-foreground" /></div>
          ) : !data?.items.length ? (
            <div className="flex h-40 flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground"><Icon name="Receipt" size={22} />Операций за период нет</div>
          ) : (
            <ul className="divide-y">
              {data.items.map((o) => (
                <li key={o.id} className="group flex items-center gap-3 px-4 py-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${o.kind === "income" ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary"}`}>
                    <Icon name={o.kind === "income" ? "ArrowDownLeft" : "ArrowUpRight"} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{catLabel(o.kind, o.category)}{o.counterparty ? ` · ${o.counterparty}` : ""}</p>
                    <p className="truncate text-xs text-muted-foreground">{fmtDate(o.op_date)}{o.description ? ` · ${o.description}` : ""}</p>
                  </div>
                  <span className={`whitespace-nowrap text-sm font-semibold tabular-nums ${o.kind === "income" ? "text-emerald-700" : ""}`}>{o.kind === "income" ? "+" : "−"}{money(o.amount)}</span>
                  <div className="flex gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                    <button onClick={() => setDialog(o)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Изменить"><Icon name="Pencil" size={14} /></button>
                    <button onClick={() => remove(o)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary" aria-label="Удалить"><Icon name="Trash2" size={14} /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="h-fit rounded-xl border bg-card p-4">
          <p className="mb-3 font-medium">Структура расходов</p>
          {!expenses.length ? (
            <p className="text-sm text-muted-foreground">Нет расходов за период</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {expenses.map((c) => (
                <li key={c.category}>
                  <div className="mb-1 flex justify-between gap-2 text-sm"><span>{catLabel("expense", c.category)}</span><span className="tabular-nums text-muted-foreground">{money(c.amount)}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${(c.amount / maxExp) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {dialog && <OpDialog key={typeof dialog === "object" ? dialog.id : dialog} op={dialog} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); reload(); }} />}
    </div>
  );
};

export default Operations;
